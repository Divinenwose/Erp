-- Legal Department records use the existing profiles, departments, RBAC,
-- notification, audit, and approval infrastructure.

CREATE OR REPLACE FUNCTION public.legal_has_permission(p_resource text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.app_has_permission(p_resource, p_action);
$$;

CREATE OR REPLACE FUNCTION public.legal_record_permission_resource(p_record_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_record_type
    WHEN 'request' THEN 'legal.requests'
    WHEN 'contract' THEN 'legal.contracts'
    WHEN 'draft' THEN 'legal.documents'
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

CREATE TABLE IF NOT EXISTS public.legal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN (
    'request', 'contract', 'draft', 'opinion', 'compliance', 'governance',
    'litigation', 'dispute', 'risk', 'intellectual_property', 'employment',
    'counsel', 'policy', 'document', 'obligation'
  )),
  reference text NOT NULL CHECK (length(trim(reference)) > 0),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text,
  category text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'negotiation', 'pending_approval',
    'approved', 'rejected', 'in_progress', 'active', 'compliant',
    'non_compliant', 'partially_compliant', 'pending_evidence', 'resolved',
    'closed', 'expired', 'archived', 'cancelled'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  approval_status text CHECK (approval_status IS NULL OR approval_status IN ('not_required', 'pending', 'approved', 'rejected', 'returned')),
  department_id uuid,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  start_date date,
  end_date date,
  renewal_date date,
  contract_value numeric(15,2) CHECK (contract_value IS NULL OR contract_value >= 0),
  currency text,
  risk_level text CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high', 'critical')),
  likelihood integer CHECK (likelihood IS NULL OR likelihood BETWEEN 1 AND 5),
  impact integer CHECK (impact IS NULL OR impact BETWEEN 1 AND 5),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, reference),
  UNIQUE (id, company_id),
  FOREIGN KEY (department_id, company_id)
    REFERENCES public.departments(id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_legal_records_company_type_status
  ON public.legal_records(company_id, record_type, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_records_owner_due
  ON public.legal_records(company_id, assigned_to, due_date)
  WHERE status NOT IN ('closed', 'archived', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_legal_records_department
  ON public.legal_records(company_id, department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_records_contract_dates
  ON public.legal_records(company_id, end_date, renewal_date)
  WHERE record_type = 'contract';
CREATE INDEX IF NOT EXISTS idx_legal_records_details
  ON public.legal_records USING gin(details);

CREATE TABLE IF NOT EXISTS public.legal_record_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated')),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.legal_records(id, company_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_legal_record_history_record
  ON public.legal_record_history(company_id, record_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.legal_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  object_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.legal_records(id, company_id) ON DELETE CASCADE,
  UNIQUE (company_id, object_path)
);
CREATE INDEX IF NOT EXISTS idx_legal_attachments_record
  ON public.legal_attachments(company_id, record_id, created_at DESC);

ALTER TABLE public.legal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_record_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_records_select ON public.legal_records;
CREATE POLICY legal_records_select ON public.legal_records
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      (
        record_type = 'request'
        AND requester_id = auth.uid()
        AND public.legal_has_permission('legal.requests', 'create')
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'view'
      )
      OR (
        record_type = 'employment'
        AND public.legal_has_permission('hr.employment_matters', 'view')
      )
    )
  );

DROP POLICY IF EXISTS legal_records_insert ON public.legal_records;
CREATE POLICY legal_records_insert ON public.legal_records
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND created_by = auth.uid()
    AND (
      (record_type = 'request' AND requester_id = auth.uid()
        AND public.legal_has_permission('legal.requests', 'create'))
      OR (
        record_type <> 'request'
        AND public.legal_has_permission(
          public.legal_record_permission_resource(record_type), 'create'
        )
      )
      OR (
        record_type = 'employment'
        AND public.legal_has_permission('hr.employment_matters', 'create')
      )
    )
    AND status IN ('draft', 'submitted')
    AND (approval_status IS NULL OR approval_status = 'not_required')
    AND archived_at IS NULL
    AND closed_at IS NULL
  );

DROP POLICY IF EXISTS legal_records_update ON public.legal_records;
CREATE POLICY legal_records_update ON public.legal_records
  FOR UPDATE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'edit'
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'review'
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'approve'
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'archive'
      )
      OR (
        record_type = 'employment'
        AND public.legal_has_permission('hr.employment_matters', 'edit')
      )
      OR (
        record_type = 'request'
        AND requester_id = auth.uid()
        AND status IN ('draft', 'submitted')
        AND public.legal_has_permission('legal.requests', 'create')
      )
    )
  )
  WITH CHECK (
    company_id = public.user_company_id()
    AND (
      public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'edit'
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'review'
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'approve'
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'archive'
      )
      OR (
        record_type = 'employment'
        AND public.legal_has_permission('hr.employment_matters', 'edit')
      )
      OR (
        record_type = 'request'
        AND requester_id = auth.uid()
        AND status IN ('draft', 'submitted')
        AND public.legal_has_permission('legal.requests', 'create')
      )
    )
  );

DROP POLICY IF EXISTS legal_history_select ON public.legal_record_history;
CREATE POLICY legal_history_select ON public.legal_record_history
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.legal_records record
      WHERE record.id = legal_record_history.record_id
        AND record.company_id = legal_record_history.company_id
    )
  );

DROP POLICY IF EXISTS legal_attachments_select ON public.legal_attachments;
CREATE POLICY legal_attachments_select ON public.legal_attachments
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.legal_records record
      WHERE record.id = legal_attachments.record_id
        AND record.company_id = legal_attachments.company_id
    )
  );

DROP POLICY IF EXISTS legal_attachments_insert ON public.legal_attachments;
CREATE POLICY legal_attachments_insert ON public.legal_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND uploaded_by = auth.uid()
    AND object_path LIKE company_id::text || '/' || record_id::text || '/%'
    AND EXISTS (
      SELECT 1 FROM public.legal_records record
      WHERE record.id = legal_attachments.record_id
        AND record.company_id = legal_attachments.company_id
        AND (
          public.legal_has_permission(
            public.legal_record_permission_resource(record.record_type), 'edit'
          )
          OR public.legal_has_permission(
            public.legal_record_permission_resource(record.record_type), 'create'
          )
          OR (
            record.record_type = 'employment'
            AND public.legal_has_permission('hr.employment_matters', 'create')
          )
          OR (
            record.record_type = 'employment'
            AND public.legal_has_permission('hr.employment_matters', 'edit')
          )
          OR (
            record.record_type = 'request'
            AND record.requester_id = auth.uid()
            AND public.legal_has_permission('legal.requests', 'create')
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.legal_validate_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  permission_resource text;
BEGIN
  permission_resource := public.legal_record_permission_resource(NEW.record_type);

  IF TG_OP = 'INSERT' AND NEW.record_type = 'request' THEN
    NEW.department_id := public.app_user_department(auth.uid());
    NEW.owner_id := auth.uid();
  END IF;

  IF NEW.department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.departments department
    WHERE department.id = NEW.department_id AND department.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Legal department reference must belong to the same company';
  END IF;
  IF TG_OP = 'INSERT'
    AND NEW.assigned_to IS NOT NULL
    AND NOT public.legal_has_permission(permission_resource, 'review')
    AND NOT public.legal_has_permission(permission_resource, 'edit') THEN
    RAISE EXCEPTION 'Assigning Legal records requires review or edit permission';
  END IF;
  IF NEW.record_type = 'employment'
    AND TG_OP = 'INSERT'
    AND NOT public.legal_has_permission('legal.employment_matters', 'create')
    AND NOT public.legal_has_permission('hr.employment_matters', 'create') THEN
    RAISE EXCEPTION 'Employment legal matters require explicit Legal or HR permission';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY[NEW.requester_id, NEW.owner_id, NEW.assigned_to, NEW.created_by]) AS linked(profile_id)
    WHERE linked.profile_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles profile
        WHERE profile.id = linked.profile_id AND profile.company_id = NEW.company_id
      )
  ) THEN
    RAISE EXCEPTION 'Legal record users must belong to the same company';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.record_type IS DISTINCT FROM OLD.record_type
      OR NEW.reference IS DISTINCT FROM OLD.reference
      OR NEW.company_id IS DISTINCT FROM OLD.company_id
      OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Legal record identity and ownership cannot be changed';
    END IF;

    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
      AND COALESCE(current_setting('app.legal_workflow_action', true), '') NOT IN ('submit', 'decision') THEN
      RAISE EXCEPTION 'Legal approval status can only be changed through the configured workflow';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
      AND NEW.status IN ('pending_approval', 'approved', 'rejected')
      AND COALESCE(current_setting('app.legal_workflow_action', true), '') NOT IN ('submit', 'decision') THEN
      RAISE EXCEPTION 'Legal workflow stages can only be changed through the configured approval workflow';
    END IF;

    IF OLD.status = 'pending_approval'
      AND NEW.status IS DISTINCT FROM OLD.status
      AND COALESCE(current_setting('app.legal_workflow_action', true), '') <> 'decision' THEN
      RAISE EXCEPTION 'Pending approval records must be completed through the configured approval workflow';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (
        public.legal_has_permission(permission_resource, 'review')
        OR public.legal_has_permission(permission_resource, 'approve')
          OR (
            NEW.status = 'archived'
            AND public.legal_has_permission(permission_resource, 'archive')
          )
        OR (
          NEW.record_type = 'request'
          AND NEW.requester_id = auth.uid()
          AND OLD.status IN ('draft', 'submitted')
          AND NEW.status IN ('draft', 'submitted')
          AND public.legal_has_permission('legal.requests', 'create')
        )
      ) THEN
      RAISE EXCEPTION 'Legal status changes require review permission';
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
      AND NOT public.legal_has_permission(permission_resource, 'review')
      AND NOT public.legal_has_permission(permission_resource, 'edit') THEN
      RAISE EXCEPTION 'Assigning Legal records requires review or edit permission';
    END IF;

    IF NEW.status IN ('active', 'approved') AND NEW.record_type = 'contract'
      AND (
        NEW.approval_status IS DISTINCT FROM 'approved'
        OR NOT public.legal_has_permission(permission_resource, 'approve')
      ) THEN
      RAISE EXCEPTION 'Contracts require an authorized approval before activation';
    END IF;

    NEW.updated_at := now();
  END IF;

  IF NEW.status IN ('closed', 'archived') AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  ELSIF NEW.status NOT IN ('closed', 'archived') THEN
    NEW.closed_at := NULL;
  END IF;

  IF NEW.status = 'archived' AND NEW.archived_at IS NULL THEN
    NEW.archived_at := now();
  ELSIF NEW.status <> 'archived' THEN
    NEW.archived_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_records_validate ON public.legal_records;
CREATE TRIGGER legal_records_validate
  BEFORE INSERT OR UPDATE ON public.legal_records
  FOR EACH ROW EXECUTE FUNCTION public.legal_validate_record();

CREATE OR REPLACE FUNCTION public.legal_capture_record_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.legal_record_history(company_id, record_id, actor_id, action, snapshot)
  VALUES (
    NEW.company_id,
    NEW.id,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_records_capture_history ON public.legal_records;
CREATE TRIGGER legal_records_capture_history
  AFTER INSERT OR UPDATE ON public.legal_records
  FOR EACH ROW EXECUTE FUNCTION public.legal_capture_record_history();

INSERT INTO storage.buckets(id, name, public, file_size_limit)
VALUES ('legal-documents', 'legal-documents', false, 20971520)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS legal_documents_storage_select ON storage.objects;
CREATE POLICY legal_documents_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'legal-documents'
    AND (storage.foldername(name))[1] = public.user_company_id()::text
    AND EXISTS (
      SELECT 1 FROM public.legal_attachments attachment
      JOIN public.legal_records record
        ON record.id = attachment.record_id AND record.company_id = attachment.company_id
      WHERE attachment.object_path = storage.objects.name
        AND attachment.company_id = public.user_company_id()
    )
  );

DROP POLICY IF EXISTS legal_documents_storage_insert ON storage.objects;
CREATE POLICY legal_documents_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'legal-documents'
    AND (storage.foldername(name))[1] = public.user_company_id()::text
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.legal_records record
      WHERE record.id::text = (storage.foldername(name))[2]
        AND record.company_id = public.user_company_id()
        AND (
          public.legal_has_permission(
            public.legal_record_permission_resource(record.record_type), 'create'
          )
          OR public.legal_has_permission(
            public.legal_record_permission_resource(record.record_type), 'edit'
          )
          OR (
            record.record_type = 'employment'
            AND public.legal_has_permission('hr.employment_matters', 'create')
          )
          OR (
            record.record_type = 'employment'
            AND public.legal_has_permission('hr.employment_matters', 'edit')
          )
          OR (
            record.record_type = 'request'
            AND record.requester_id = auth.uid()
            AND public.legal_has_permission('legal.requests', 'create')
          )
        )
    )
  );

INSERT INTO public.permissions(resource, action, description)
SELECT 'legal.' || module_name, action_name,
  action_name || ' Legal ' || replace(module_name, '_', ' ') || ' records'
FROM (VALUES
  ('dashboard'), ('requests'), ('contracts'), ('documents'), ('advisory'),
  ('compliance'), ('governance'), ('litigation'), ('risks'), ('ip'),
  ('employment_matters'), ('counsel'), ('policies'), ('approvals'), ('reports'), ('settings')
) AS modules(module_name)
CROSS JOIN (VALUES ('view'), ('create'), ('edit'), ('review'), ('approve'), ('archive'), ('export')) AS actions(action_name)
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.permissions(resource, action, description)
VALUES ('legal', 'view', 'View the Legal Department')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.permissions(resource, action, description)
VALUES
  ('hr.employment_matters', 'view', 'View restricted employment legal matters'),
  ('hr.employment_matters', 'create', 'Create restricted employment legal matters'),
  ('hr.employment_matters', 'edit', 'Update restricted employment legal matters')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant permissions only to existing Legal roles; all other grants remain
-- configurable through the ERP's existing role-permission administration.
INSERT INTO public.role_permissions(role_id, permission_id)
SELECT role_row.id, permission_row.id
FROM public.roles role_row
CROSS JOIN public.permissions permission_row
WHERE lower(role_row.name) ~ '(legal|counsel)'
  AND permission_row.resource LIKE 'legal.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Every existing role may submit and track only its own Legal requests.
INSERT INTO public.role_permissions(role_id, permission_id)
SELECT role_row.id, permission_row.id
FROM public.roles role_row
CROSS JOIN public.permissions permission_row
WHERE permission_row.resource = 'legal.requests'
  AND permission_row.action = 'create'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.legal_approval_assignee(p_record_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.app_is_super_admin() OR EXISTS (
    SELECT 1
    FROM public.request_approvals approval
    JOIN public.approval_stages stage
      ON stage.id = approval.stage_id AND stage.company_id = approval.company_id
    JOIN public.legal_records record
      ON record.id = approval.request_id AND record.company_id = approval.company_id
    WHERE approval.request_id = p_record_id
      AND approval.request_type = 'legal'
      AND approval.status = 'pending'
      AND approval.company_id = public.user_company_id()
      AND public.legal_has_permission(
        public.legal_record_permission_resource(record.record_type), 'approve'
      )
      AND (
        stage.approver_role IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.user_roles user_role
          JOIN public.roles role_row ON role_row.id = user_role.role_id
          WHERE user_role.user_id = auth.uid()
            AND lower(role_row.name) = lower(stage.approver_role)
            AND (role_row.company_id IS NULL OR role_row.company_id = public.user_company_id())
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.request_approvals earlier
        JOIN public.approval_stages earlier_stage ON earlier_stage.id = earlier.stage_id
        WHERE earlier.request_id = approval.request_id
          AND earlier.request_type = 'legal'
          AND earlier.company_id = approval.company_id
          AND earlier.created_at >= approval.created_at
          AND earlier.status <> 'approved'
          AND earlier_stage.stage_order < stage.stage_order
      )
  );
$$;

DROP POLICY IF EXISTS legal_records_select ON public.legal_records;
CREATE POLICY legal_records_select ON public.legal_records
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      (
        record_type = 'request'
        AND requester_id = auth.uid()
        AND public.legal_has_permission('legal.requests', 'create')
      )
      OR public.legal_has_permission(
        public.legal_record_permission_resource(record_type), 'view'
      )
      OR (
        record_type = 'employment'
        AND public.legal_has_permission('hr.employment_matters', 'view')
      )
      OR (
        created_by = auth.uid()
        AND (
          public.legal_has_permission(
            public.legal_record_permission_resource(record_type), 'create'
          )
          OR (
            record_type = 'employment'
            AND public.legal_has_permission('hr.employment_matters', 'create')
          )
        )
      )
      OR public.legal_approval_assignee(id)
    )
  );

DROP POLICY IF EXISTS "Users can view own company data" ON public.request_approvals;
CREATE POLICY "Users can view own company data" ON public.request_approvals
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      (request_type <> 'legal' AND request_type <> 'internal_control')
      OR EXISTS (
        SELECT 1 FROM public.legal_records record
        WHERE record.id = request_approvals.request_id
          AND record.company_id = request_approvals.company_id
          AND public.legal_approval_assignee(record.id)
      )
      OR (
        request_type = 'internal_control'
        AND EXISTS (
          SELECT 1 FROM public.internal_control_records record
          WHERE record.id = request_approvals.request_id
            AND record.company_id = request_approvals.company_id
            AND public.internal_control_has_permission(
              public.internal_control_record_permission_resource(record.record_type), 'view'
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert own company data" ON public.request_approvals;
CREATE POLICY "Users can insert own company data" ON public.request_approvals
  FOR INSERT TO authenticated WITH CHECK (
    company_id = public.user_company_id()
    AND request_type <> 'legal'
    AND request_type <> 'internal_control'
  );

DROP POLICY IF EXISTS "Users can update own company data" ON public.request_approvals;
CREATE POLICY "Users can update own company data" ON public.request_approvals
  FOR UPDATE TO authenticated USING (
    company_id = public.user_company_id()
    AND (
      (
        request_type <> 'legal'
        AND request_type <> 'internal_control'
      )
      OR (
        request_type = 'internal_control'
        AND EXISTS (
          SELECT 1 FROM public.internal_control_records record
          WHERE record.id = request_approvals.request_id
            AND record.company_id = request_approvals.company_id
            AND public.internal_control_has_permission(
              public.internal_control_record_permission_resource(record.record_type), 'approve'
            )
        )
      )
    )
  ) WITH CHECK (
    company_id = public.user_company_id()
    AND (
      (
        request_type <> 'legal'
        AND request_type <> 'internal_control'
      )
      OR (
        request_type = 'internal_control'
        AND EXISTS (
          SELECT 1 FROM public.internal_control_records record
          WHERE record.id = request_approvals.request_id
            AND record.company_id = request_approvals.company_id
            AND public.internal_control_has_permission(
              public.internal_control_record_permission_resource(record.record_type), 'approve'
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own company data" ON public.request_approvals;
CREATE POLICY "Users can delete own company data" ON public.request_approvals
  FOR DELETE TO authenticated USING (
    company_id = public.user_company_id()
    AND request_type <> 'legal'
    AND request_type <> 'internal_control'
  );

CREATE OR REPLACE FUNCTION public.legal_submit_for_approval(p_record_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  legal_record public.legal_records%ROWTYPE;
  workflow_id uuid;
  first_approval_id uuid;
  stage_total integer;
BEGIN
  SELECT * INTO legal_record
  FROM public.legal_records
  WHERE id = p_record_id AND company_id = public.user_company_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal record not found';
  END IF;
  IF NOT public.legal_has_permission(
    public.legal_record_permission_resource(legal_record.record_type), 'review'
  ) THEN
    RAISE EXCEPTION 'Review permission is required to submit this record for approval';
  END IF;
  IF legal_record.status NOT IN ('draft', 'submitted', 'under_review', 'negotiation') THEN
    RAISE EXCEPTION 'This Legal record is not at a submittable workflow stage';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_record_id::text));
  IF EXISTS (
    SELECT 1 FROM public.request_approvals approval
    WHERE approval.request_id = p_record_id
      AND approval.request_type = 'legal'
      AND approval.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'This Legal record already has a pending approval';
  END IF;

  SELECT workflow.id INTO workflow_id
  FROM public.approval_workflows workflow
  WHERE workflow.company_id = legal_record.company_id
    AND workflow.is_active IS TRUE
    AND workflow.request_type IN ('legal_' || legal_record.record_type, 'legal')
  ORDER BY CASE WHEN workflow.request_type = 'legal_' || legal_record.record_type THEN 0 ELSE 1 END
  LIMIT 1;
  IF workflow_id IS NULL THEN
    RAISE EXCEPTION 'No active Legal approval workflow is configured for this record type';
  END IF;

  SELECT count(*) INTO stage_total
  FROM public.approval_workflow_stages workflow_stage
  JOIN public.approval_stages stage
    ON stage.id = workflow_stage.stage_id AND stage.company_id = legal_record.company_id
  WHERE workflow_stage.workflow_id = workflow_id;
  IF stage_total = 0 THEN
    RAISE EXCEPTION 'The configured Legal approval workflow has no stages';
  END IF;

  INSERT INTO public.request_approvals(company_id, request_id, request_type, stage_id, status)
  SELECT legal_record.company_id, p_record_id, 'legal', workflow_stage.stage_id, 'pending'
  FROM public.approval_workflow_stages workflow_stage
  JOIN public.approval_stages stage
    ON stage.id = workflow_stage.stage_id AND stage.company_id = legal_record.company_id
  WHERE workflow_stage.workflow_id = workflow_id
  ORDER BY workflow_stage.stage_order;

  SELECT approval.id INTO first_approval_id
  FROM public.request_approvals approval
  JOIN public.approval_stages stage ON stage.id = approval.stage_id
  WHERE approval.request_id = p_record_id
    AND approval.request_type = 'legal'
    AND approval.status = 'pending'
  ORDER BY stage.stage_order, approval.created_at
  LIMIT 1;

  PERFORM set_config('app.legal_workflow_action', 'submit', true);
  UPDATE public.legal_records
  SET status = 'pending_approval', approval_status = 'pending', updated_at = now()
  WHERE id = p_record_id;

  RETURN first_approval_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.legal_decide_approval(
  p_approval_id uuid,
  p_decision text,
  p_comments text DEFAULT NULL
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
  permission_resource text;
  has_prior_pending boolean;
  has_pending boolean;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
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
  WHERE id = approval.request_id
    AND company_id = approval.company_id
  FOR UPDATE;
  SELECT * INTO stage
  FROM public.approval_stages
  WHERE id = approval.stage_id
    AND company_id = approval.company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legal approval stage is invalid for this company';
  END IF;
  permission_resource := public.legal_record_permission_resource(legal_record.record_type);

  IF legal_record.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot approve their own Legal records';
  END IF;
  IF NOT public.legal_has_permission(permission_resource, 'approve') THEN
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

  SELECT EXISTS (
    SELECT 1
    FROM public.request_approvals earlier
    JOIN public.approval_stages earlier_stage ON earlier_stage.id = earlier.stage_id
    WHERE earlier.request_id = approval.request_id
      AND earlier.request_type = 'legal'
      AND earlier.company_id = approval.company_id
      AND earlier.created_at >= approval.created_at
      AND earlier.status <> 'approved'
      AND earlier_stage.stage_order < stage.stage_order
  ) INTO has_prior_pending;
  IF has_prior_pending THEN
    RAISE EXCEPTION 'Earlier Legal approval stages must be completed first';
  END IF;

  UPDATE public.request_approvals
  SET status = p_decision,
      approver_id = auth.uid(),
      comments = NULLIF(trim(p_comments), ''),
      approved_at = now(),
      updated_at = now()
  WHERE id = p_approval_id;

  IF p_decision = 'rejected' THEN
    UPDATE public.request_approvals
    SET status = 'skipped', comments = 'Approval chain closed after rejection', approved_at = now(), updated_at = now()
    WHERE request_id = approval.request_id
      AND request_type = 'legal'
      AND company_id = approval.company_id
      AND status = 'pending';
    PERFORM set_config('app.legal_workflow_action', 'decision', true);
    UPDATE public.legal_records
    SET status = 'rejected', approval_status = 'rejected', updated_at = now()
    WHERE id = legal_record.id;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.request_approvals pending
    WHERE pending.request_id = approval.request_id
      AND pending.request_type = 'legal'
      AND pending.company_id = approval.company_id
      AND pending.status = 'pending'
  ) INTO has_pending;

  IF NOT has_pending THEN
    PERFORM set_config('app.legal_workflow_action', 'decision', true);
    UPDATE public.legal_records
    SET status = 'approved', approval_status = 'approved', updated_at = now()
    WHERE id = legal_record.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.legal_has_permission(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.legal_record_permission_resource(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.legal_approval_assignee(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.legal_submit_for_approval(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.legal_decide_approval(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.legal_has_permission(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.legal_record_permission_resource(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.legal_approval_assignee(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.legal_submit_for_approval(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.legal_decide_approval(uuid, text, text) TO authenticated;
