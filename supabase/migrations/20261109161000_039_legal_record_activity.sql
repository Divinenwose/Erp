ALTER TABLE public.legal_records
  DROP CONSTRAINT IF EXISTS legal_records_record_type_check;
ALTER TABLE public.legal_records
  ADD CONSTRAINT legal_records_record_type_check
  CHECK (record_type IN (
    'request', 'contract', 'draft', 'template', 'opinion', 'compliance',
    'governance', 'litigation', 'dispute', 'risk', 'intellectual_property',
    'employment', 'counsel', 'policy', 'document', 'obligation'
  ));

CREATE OR REPLACE FUNCTION public.legal_record_permission_resource(p_record_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_record_type
    WHEN 'request' THEN 'legal.requests'
    WHEN 'contract' THEN 'legal.contracts'
    WHEN 'draft' THEN 'legal.documents'
    WHEN 'template' THEN 'legal.documents'
    WHEN 'opinion' THEN 'legal.advisory'
    WHEN 'compliance' THEN 'legal.compliance'
    WHEN 'governance' THEN 'legal.governance'
    WHEN 'litigation' THEN 'legal.litigation'
    WHEN 'dispute' THEN 'legal.litigation'
    WHEN 'risk' THEN 'legal.risks'
    WHEN 'intellectual_property' THEN 'legal.ip'
    WHEN 'employment' THEN 'legal.employment_matters'
    WHEN 'counsel' THEN 'legal.counsel'
    WHEN 'policy' THEN 'legal.policies'
    WHEN 'document' THEN 'legal.documents'
    WHEN 'obligation' THEN 'legal.compliance'
    ELSE 'legal'
  END;
$$;

CREATE TABLE IF NOT EXISTS public.legal_record_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'comment', 'requested_information', 'assessment', 'recommendation',
    'status_update', 'deadline_update'
  )),
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 12000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.legal_records(id, company_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_legal_record_events_record
  ON public.legal_record_events(company_id, record_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  record_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.legal_records(id, company_id) ON DELETE CASCADE,
  UNIQUE (company_id, record_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_legal_record_versions_record
  ON public.legal_record_versions(company_id, record_id, version_number DESC);

INSERT INTO public.legal_record_versions(
  company_id, record_id, version_number, actor_id, record_snapshot, created_at
)
SELECT
  history.company_id,
  history.record_id,
  row_number() OVER (
    PARTITION BY history.company_id, history.record_id
    ORDER BY history.created_at, history.id
  )::integer,
  history.actor_id,
  history.snapshot,
  history.created_at
FROM public.legal_record_history history
WHERE history.snapshot ->> 'record_type' IN ('contract', 'draft', 'template', 'document', 'policy')
  AND NOT EXISTS (
    SELECT 1
    FROM public.legal_record_versions existing
    WHERE existing.company_id = history.company_id
      AND existing.record_id = history.record_id
  )
ON CONFLICT (company_id, record_id, version_number) DO NOTHING;

ALTER TABLE public.legal_record_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_record_versions_select ON public.legal_record_versions;
CREATE POLICY legal_record_versions_select ON public.legal_record_versions
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.legal_records record
      WHERE record.id = legal_record_versions.record_id
        AND record.company_id = legal_record_versions.company_id
    )
  );

CREATE OR REPLACE FUNCTION public.legal_capture_record_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_version integer;
BEGIN
  IF NEW.record_type IN ('contract', 'draft', 'template', 'document', 'policy')
    AND (TG_OP = 'INSERT' OR to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)) THEN
    SELECT COALESCE(max(version_number), 0) + 1
      INTO next_version
      FROM public.legal_record_versions
      WHERE company_id = NEW.company_id AND record_id = NEW.id;

    INSERT INTO public.legal_record_versions(
      company_id, record_id, version_number, actor_id, record_snapshot
    )
    VALUES (NEW.company_id, NEW.id, next_version, auth.uid(), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_records_capture_version ON public.legal_records;
CREATE TRIGGER legal_records_capture_version
  AFTER INSERT OR UPDATE ON public.legal_records
  FOR EACH ROW EXECUTE FUNCTION public.legal_capture_record_version();

CREATE OR REPLACE FUNCTION public.legal_validate_evidence_and_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  execution_status_changed boolean;
  publication_status_changed boolean;
  registration_verification_changed boolean;
BEGIN
  execution_status_changed := TG_OP = 'INSERT'
    OR OLD.details ->> 'execution_status' IS DISTINCT FROM NEW.details ->> 'execution_status';
  publication_status_changed := TG_OP = 'INSERT'
    OR OLD.details ->> 'publication_status' IS DISTINCT FROM NEW.details ->> 'publication_status';
  registration_verification_changed := TG_OP = 'INSERT'
    OR OLD.details ->> 'registration_verified' IS DISTINCT FROM NEW.details ->> 'registration_verified';

  IF NEW.record_type = 'contract'
    AND execution_status_changed
    AND NEW.details ->> 'execution_status' = 'Executed' THEN
    IF NEW.approval_status IS DISTINCT FROM 'approved'
      OR NOT public.legal_has_permission('legal.contracts', 'approve') THEN
      RAISE EXCEPTION 'Contract execution must be recorded by an authorized approver after approval';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.legal_attachments attachment
      WHERE attachment.company_id = NEW.company_id AND attachment.record_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Upload the signed contract before recording execution';
    END IF;
  END IF;

  IF NEW.record_type IN ('template', 'policy')
    AND publication_status_changed
    AND NEW.details ->> 'publication_status' IN ('Approved', 'Published') THEN
    IF NEW.approval_status IS DISTINCT FROM 'approved'
      OR NOT public.legal_has_permission(
        public.legal_record_permission_resource(NEW.record_type), 'approve'
      ) THEN
      RAISE EXCEPTION 'Legal templates and policies must be approved through the configured workflow before publication';
    END IF;
  END IF;

  IF NEW.record_type = 'intellectual_property'
    AND registration_verification_changed
    AND NEW.details ->> 'registration_verified' = 'Verified' THEN
    IF NOT public.legal_has_permission('legal.ip', 'review')
      AND NOT public.legal_has_permission('legal.ip', 'approve') THEN
      RAISE EXCEPTION 'IP registration verification requires Legal review permission';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.legal_attachments attachment
      WHERE attachment.company_id = NEW.company_id AND attachment.record_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Upload registration evidence before verifying the IP record';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_records_validate_evidence_and_publication ON public.legal_records;
CREATE TRIGGER legal_records_validate_evidence_and_publication
  BEFORE INSERT OR UPDATE OF details, approval_status ON public.legal_records
  FOR EACH ROW EXECUTE FUNCTION public.legal_validate_evidence_and_publication();

ALTER TABLE public.legal_record_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_record_events_select ON public.legal_record_events;
CREATE POLICY legal_record_events_select ON public.legal_record_events
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1
      FROM public.legal_records record
      WHERE record.id = legal_record_events.record_id
        AND record.company_id = legal_record_events.company_id
    )
  );

DROP POLICY IF EXISTS legal_record_events_insert ON public.legal_record_events;
CREATE POLICY legal_record_events_insert ON public.legal_record_events
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND actor_id = auth.uid()
    AND length(trim(body)) BETWEEN 1 AND 12000
    AND EXISTS (
      SELECT 1
      FROM public.legal_records record
      WHERE record.id = legal_record_events.record_id
        AND record.company_id = legal_record_events.company_id
        AND (
          public.legal_has_permission(
            public.legal_record_permission_resource(record.record_type), 'edit'
          )
          OR public.legal_has_permission(
            public.legal_record_permission_resource(record.record_type), 'review'
          )
          OR (
            record.record_type = 'request'
            AND record.requester_id = auth.uid()
            AND public.legal_has_permission('legal.requests', 'create')
          )
        )
    )
  );

GRANT SELECT, INSERT ON public.legal_record_events TO authenticated;
GRANT SELECT ON public.legal_record_versions TO authenticated;

ALTER TABLE public.request_approvals
  DROP CONSTRAINT IF EXISTS request_approvals_status_check;
ALTER TABLE public.request_approvals
  ADD CONSTRAINT request_approvals_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'skipped', 'returned'));

CREATE OR REPLACE FUNCTION public.legal_return_approval(
  p_approval_id uuid,
  p_comments text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  approval public.request_approvals%ROWTYPE;
  legal_record public.legal_records%ROWTYPE;
  stage public.approval_stages%ROWTYPE;
BEGIN
  IF p_comments IS NULL OR length(trim(p_comments)) = 0 THEN
    RAISE EXCEPTION 'A correction request comment is required';
  END IF;
  IF length(p_comments) > 12000 THEN
    RAISE EXCEPTION 'Correction request comments are too long';
  END IF;

  SELECT * INTO approval
  FROM public.request_approvals
  WHERE id = p_approval_id
    AND company_id = public.user_company_id()
    AND request_type = 'legal'
  FOR UPDATE;
  IF NOT FOUND OR approval.status <> 'pending' THEN
    RAISE EXCEPTION 'Pending Legal approval not found';
  END IF;

  SELECT * INTO legal_record
  FROM public.legal_records
  WHERE id = approval.request_id AND company_id = approval.company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal record not found';
  END IF;
  SELECT * INTO stage
  FROM public.approval_stages
  WHERE id = approval.stage_id AND company_id = approval.company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal approval stage is invalid for this company';
  END IF;
  IF legal_record.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot return their own Legal records';
  END IF;
  IF NOT public.legal_has_permission(
    public.legal_record_permission_resource(legal_record.record_type), 'approve'
  ) THEN
    RAISE EXCEPTION 'Approval permission is required for this Legal record';
  END IF;
  IF stage.approver_role IS NOT NULL
    AND NOT public.app_is_super_admin()
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles user_role
      JOIN public.roles role_row ON role_row.id = user_role.role_id
      WHERE user_role.user_id = auth.uid()
        AND lower(role_row.name) = lower(stage.approver_role)
        AND (role_row.company_id IS NULL OR role_row.company_id = approval.company_id)
    ) THEN
    RAISE EXCEPTION 'You do not hold the role required for this approval stage';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.request_approvals earlier
    JOIN public.approval_stages earlier_stage ON earlier_stage.id = earlier.stage_id
    WHERE earlier.request_id = approval.request_id
      AND earlier.request_type = 'legal'
      AND earlier.company_id = approval.company_id
      AND earlier.created_at >= approval.created_at
      AND earlier.status <> 'approved'
      AND earlier_stage.stage_order < stage.stage_order
  ) THEN
    RAISE EXCEPTION 'Earlier Legal approval stages must be completed first';
  END IF;

  UPDATE public.request_approvals
  SET status = 'returned',
      approver_id = auth.uid(),
      comments = trim(p_comments),
      approved_at = now(),
      updated_at = now()
  WHERE id = p_approval_id;
  UPDATE public.request_approvals
  SET status = 'skipped',
      comments = 'Approval chain returned for correction',
      approved_at = now(),
      updated_at = now()
  WHERE request_id = approval.request_id
    AND request_type = 'legal'
    AND company_id = approval.company_id
    AND status = 'pending';

  PERFORM set_config('app.legal_workflow_action', 'decision', true);
  UPDATE public.legal_records
  SET status = 'submitted', approval_status = 'returned', updated_at = now()
  WHERE id = legal_record.id;
END;
$$;

REVOKE ALL ON FUNCTION public.legal_return_approval(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.legal_validate_evidence_and_publication() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legal_return_approval(uuid, text) TO authenticated;
