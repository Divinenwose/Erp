-- Internal Control domain records, evidence, and permission-scoped audit history.

CREATE TABLE IF NOT EXISTS public.internal_control_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN (
    'risk', 'audit', 'transaction_review', 'compliance_check', 'policy_enforcement',
    'fraud_case', 'incident', 'control_test', 'finding', 'evidence',
    'training', 'request', 'policy'
  )),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text,
  category text,
  amount numeric(15,2) CHECK (amount IS NULL OR amount >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'suspected', 'pending', 'planned', 'in_progress', 'under_review', 'approved',
    'rejected', 'compliant', 'non_compliant', 'substantiated', 'resolved',
    'completed', 'closed', 'archived'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  severity text CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'critical')),
  likelihood integer CHECK (likelihood IS NULL OR likelihood BETWEEN 1 AND 5),
  impact integer CHECK (impact IS NULL OR impact BETWEEN 1 AND 5),
  inherent_score integer GENERATED ALWAYS AS (likelihood * impact) STORED,
  inherent_rating text GENERATED ALWAYS AS (
    CASE
      WHEN likelihood IS NULL OR impact IS NULL THEN NULL
      WHEN likelihood * impact >= 17 THEN 'critical'
      WHEN likelihood * impact >= 10 THEN 'high'
      WHEN likelihood * impact >= 5 THEN 'moderate'
      ELSE 'low'
    END
  ) STORED,
  residual_likelihood integer CHECK (residual_likelihood IS NULL OR residual_likelihood BETWEEN 1 AND 5),
  residual_impact integer CHECK (residual_impact IS NULL OR residual_impact BETWEEN 1 AND 5),
  residual_score integer GENERATED ALWAYS AS (residual_likelihood * residual_impact) STORED,
  residual_rating text GENERATED ALWAYS AS (
    CASE
      WHEN residual_likelihood IS NULL OR residual_impact IS NULL THEN NULL
      WHEN residual_likelihood * residual_impact >= 17 THEN 'critical'
      WHEN residual_likelihood * residual_impact >= 10 THEN 'high'
      WHEN residual_likelihood * residual_impact >= 5 THEN 'moderate'
      ELSE 'low'
    END
  ) STORED,
  control_effectiveness text CHECK (control_effectiveness IS NULL OR control_effectiveness IN ('effective', 'partially_effective', 'ineffective', 'not_tested')),
  mitigation_plan text,
  recommendation text,
  corrective_action text,
  follow_up_result text,
  workflow_stage text NOT NULL DEFAULT 'request_initiation' CHECK (workflow_stage IN (
    'request_initiation', 'internal_review', 'risk_compliance_assessment',
    'supporting_documents', 'authorization', 'execution', 'findings_documentation',
    'corrective_actions', 'follow_up_verification', 'closure'
  )),
  approval_status text CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected')),
  approval_reason text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  due_date date,
  event_date date,
  completed_at timestamptz,
  source_module text,
  source_record_id uuid,
  parent_id uuid REFERENCES public.internal_control_records(id) ON DELETE SET NULL,
  is_confidential boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id),
  CHECK (record_type <> 'fraud_case' OR is_confidential = true),
  CHECK (archived_at IS NULL OR status = 'archived')
);

CREATE INDEX IF NOT EXISTS idx_internal_control_records_company_type_status
  ON public.internal_control_records(company_id, record_type, status);
CREATE INDEX IF NOT EXISTS idx_internal_control_records_due_date
  ON public.internal_control_records(company_id, due_date) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internal_control_records_risk
  ON public.internal_control_records(company_id, inherent_score, residual_score)
  WHERE record_type = 'risk';
CREATE INDEX IF NOT EXISTS idx_internal_control_records_source
  ON public.internal_control_records(company_id, source_module, source_record_id);
CREATE INDEX IF NOT EXISTS idx_internal_control_records_parent
  ON public.internal_control_records(company_id, parent_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_internal_control_departments_id_company
  ON public.departments(id, company_id);

CREATE TABLE IF NOT EXISTS public.internal_control_record_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated')),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.internal_control_records(id, company_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_internal_control_history_record
  ON public.internal_control_record_history(company_id, record_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.internal_control_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  object_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  notes text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.internal_control_records(id, company_id) ON DELETE CASCADE,
  UNIQUE (company_id, object_path)
);

CREATE INDEX IF NOT EXISTS idx_internal_control_evidence_record
  ON public.internal_control_evidence(company_id, record_id, created_at DESC);

ALTER TABLE public.internal_control_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_control_record_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_control_evidence ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.internal_control_has_permission(p_resource text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.resource = p_resource
      AND p.action = p_action
      AND (r.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR r.company_id IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.internal_control_record_permission_resource(p_record_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_record_type
    WHEN 'risk' THEN 'internal_control.risks'
    WHEN 'audit' THEN 'internal_control.audits'
    WHEN 'transaction_review' THEN 'internal_control.transaction_reviews'
    WHEN 'compliance_check' THEN 'internal_control.compliance'
    WHEN 'policy_enforcement' THEN 'internal_control.policy_enforcement'
    WHEN 'fraud_case' THEN 'internal_control.fraud'
    WHEN 'incident' THEN 'internal_control.incidents'
    WHEN 'control_test' THEN 'internal_control.controls'
    WHEN 'finding' THEN 'internal_control.findings'
    WHEN 'evidence' THEN 'internal_control.evidence'
    WHEN 'training' THEN 'internal_control.training'
    WHEN 'request' THEN 'internal_control.requests'
    WHEN 'policy' THEN 'internal_control.policies'
    ELSE 'internal_control'
  END;
$$;

DROP POLICY IF EXISTS internal_control_records_select ON public.internal_control_records;
CREATE POLICY internal_control_records_select ON public.internal_control_records
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.internal_control_has_permission(public.internal_control_record_permission_resource(record_type), 'view')
    AND (NOT is_confidential OR public.internal_control_has_permission('internal_control.fraud', 'view'))
  );

DROP POLICY IF EXISTS internal_control_records_insert ON public.internal_control_records;
CREATE POLICY internal_control_records_insert ON public.internal_control_records
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
    AND public.internal_control_has_permission(public.internal_control_record_permission_resource(record_type), 'create')
    AND (record_type <> 'fraud_case' OR public.internal_control_has_permission('internal_control.fraud', 'create'))
    AND workflow_stage = 'request_initiation'
    AND approval_status IS NULL
    AND archived_at IS NULL
    AND (record_type <> 'fraud_case' OR status IN ('open', 'suspected'))
  );

DROP POLICY IF EXISTS internal_control_records_update ON public.internal_control_records;
CREATE POLICY internal_control_records_update ON public.internal_control_records
  FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.internal_control_has_permission(public.internal_control_record_permission_resource(record_type), 'view')
    AND (
      public.internal_control_has_permission(public.internal_control_record_permission_resource(record_type), 'edit')
      OR public.internal_control_has_permission(public.internal_control_record_permission_resource(record_type), 'approve')
      OR public.internal_control_has_permission(public.internal_control_record_permission_resource(record_type), 'verify')
      OR public.internal_control_has_permission(public.internal_control_record_permission_resource(record_type), 'archive')
    )
    AND (NOT is_confidential OR public.internal_control_has_permission('internal_control.fraud', 'view'))
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (NOT is_confidential OR public.internal_control_has_permission('internal_control.fraud', 'view'))
  );

CREATE POLICY internal_control_history_select ON public.internal_control_record_history
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.internal_control_records r
      WHERE r.id = internal_control_record_history.record_id
        AND r.company_id = internal_control_record_history.company_id
    )
  );

CREATE POLICY internal_control_evidence_select ON public.internal_control_evidence
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.internal_control_has_permission('internal_control.evidence', 'view')
      OR public.internal_control_has_permission('internal_control.fraud', 'view')
    )
    AND EXISTS (
      SELECT 1 FROM public.internal_control_records r
      WHERE r.id = internal_control_evidence.record_id
        AND r.company_id = internal_control_evidence.company_id
        AND (NOT r.is_confidential OR public.internal_control_has_permission('internal_control.fraud', 'view'))
    )
  );

CREATE POLICY internal_control_evidence_insert ON public.internal_control_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
    AND public.internal_control_has_permission('internal_control.evidence', 'create')
    AND object_path LIKE company_id::text || '/%'
    AND (storage.foldername(object_path))[2] = record_id::text
    AND EXISTS (
      SELECT 1 FROM public.internal_control_records r
      WHERE r.id = internal_control_evidence.record_id
        AND r.company_id = internal_control_evidence.company_id
        AND (NOT r.is_confidential OR public.internal_control_has_permission('internal_control.fraud', 'view'))
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_internal_control_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  stages text[] := ARRAY[
    'request_initiation', 'internal_review', 'risk_compliance_assessment',
    'supporting_documents', 'authorization', 'execution', 'findings_documentation',
    'corrective_actions', 'follow_up_verification', 'closure'
  ];
  old_position integer;
  new_position integer;
  resource_name text;
BEGIN
  resource_name := public.internal_control_record_permission_resource(OLD.record_type);

  IF OLD.record_type IS DISTINCT FROM NEW.record_type
     OR OLD.company_id IS DISTINCT FROM NEW.company_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'Internal Control record identity fields cannot be changed';
  END IF;

  IF NOT public.internal_control_has_permission(resource_name, 'edit') THEN
    IF public.internal_control_has_permission(resource_name, 'approve')
       AND (to_jsonb(NEW) - ARRAY['approval_status', 'approval_reason', 'approved_by', 'approved_at', 'workflow_stage', 'status', 'updated_at'])
         IS NOT DISTINCT FROM
           (to_jsonb(OLD) - ARRAY['approval_status', 'approval_reason', 'approved_by', 'approved_at', 'workflow_stage', 'status', 'updated_at']) THEN
      NULL;
    ELSIF public.internal_control_has_permission(resource_name, 'verify')
       AND (to_jsonb(NEW) - ARRAY['workflow_stage', 'follow_up_result', 'verified_by', 'verified_at', 'status', 'completed_at', 'updated_at'])
         IS NOT DISTINCT FROM
           (to_jsonb(OLD) - ARRAY['workflow_stage', 'follow_up_result', 'verified_by', 'verified_at', 'status', 'completed_at', 'updated_at']) THEN
      NULL;
    ELSIF public.internal_control_has_permission(resource_name, 'archive')
       AND (to_jsonb(NEW) - ARRAY['archived_at', 'status', 'updated_at'])
         IS NOT DISTINCT FROM
           (to_jsonb(OLD) - ARRAY['archived_at', 'status', 'updated_at']) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Edit permission required for this record';
    END IF;
  END IF;

  IF NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage THEN
    old_position := array_position(stages, OLD.workflow_stage);
    new_position := array_position(stages, NEW.workflow_stage);
    IF new_position <> old_position + 1 THEN
      RAISE EXCEPTION 'Internal Control workflows must advance one stage at a time';
    END IF;

    IF NEW.workflow_stage = 'closure' THEN
      IF NULLIF(trim(NEW.follow_up_result), '') IS NULL THEN
        RAISE EXCEPTION 'Record follow-up verification before closure';
      END IF;
      IF NOT public.internal_control_has_permission(resource_name, 'verify') THEN
        RAISE EXCEPTION 'Follow-up verification permission required to close this record';
      END IF;
      IF OLD.owner_id = auth.uid() OR OLD.assigned_to = auth.uid() THEN
        RAISE EXCEPTION 'The owner or assignee cannot independently verify their own corrective action';
      END IF;
      NEW.verified_by := auth.uid();
      NEW.verified_at := now();
      NEW.status := 'closed';
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSIF NOT public.internal_control_has_permission(resource_name, 'edit') THEN
      RAISE EXCEPTION 'Edit permission required to advance the workflow';
    END IF;

    IF OLD.workflow_stage = 'authorization' AND NEW.workflow_stage = 'execution'
       AND OLD.approval_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'Requests require authorization before execution';
    END IF;

    IF NEW.workflow_stage = 'authorization' AND OLD.workflow_stage <> 'authorization'
       AND NEW.approval_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'Requests must be submitted as pending authorization';
    END IF;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NEW.approval_status = 'pending' THEN
      IF OLD.workflow_stage <> 'supporting_documents'
         OR NEW.workflow_stage <> 'authorization'
         OR NOT public.internal_control_has_permission(resource_name, 'edit') THEN
        RAISE EXCEPTION 'Only an authorized editor can submit a request for authorization';
      END IF;
      NEW.approval_reason := NULL;
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
    ELSE
      IF OLD.workflow_stage <> 'authorization'
         OR NOT public.internal_control_has_permission(resource_name, 'approve') THEN
        RAISE EXCEPTION 'Authorization can only be decided by an authorized reviewer';
      END IF;
      IF OLD.created_by = auth.uid() THEN
        RAISE EXCEPTION 'Request initiators cannot approve their own requests';
      END IF;
      IF NEW.approval_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid authorization decision';
      END IF;
      IF NULLIF(trim(NEW.approval_reason), '') IS NULL THEN
        RAISE EXCEPTION 'An approval or rejection reason is required';
      END IF;
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
      IF NEW.approval_status = 'approved' THEN
        NEW.workflow_stage := 'execution';
        NEW.status := 'in_progress';
      ELSE
        NEW.workflow_stage := 'supporting_documents';
        NEW.status := 'rejected';
      END IF;
    END IF;
  END IF;

  IF NEW.record_type = 'fraud_case' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'substantiated'
       AND (NOT public.internal_control_has_permission(resource_name, 'approve')
         OR OLD.workflow_stage NOT IN ('findings_documentation', 'follow_up_verification')
         OR OLD.created_by = auth.uid()) THEN
      RAISE EXCEPTION 'A suspected case may only be substantiated by an independent authorized reviewer after investigation';
    END IF;
    IF NEW.status = 'resolved' AND NEW.workflow_stage <> 'closure' THEN
      RAISE EXCEPTION 'Fraud investigations must complete follow-up verification before resolution';
    END IF;
  END IF;

  IF NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed'
     AND NEW.workflow_stage <> 'closure' THEN
    RAISE EXCEPTION 'Records can only be closed after follow-up verification';
  END IF;
  IF NEW.status = 'archived' AND NEW.archived_at IS NULL THEN
    RAISE EXCEPTION 'Use the authorized archive action to archive records';
  END IF;

  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    IF NOT public.internal_control_has_permission(resource_name, 'archive') THEN
      RAISE EXCEPTION 'Archive permission required';
    END IF;
    IF NEW.archived_at IS NOT NULL THEN
      IF OLD.workflow_stage <> 'closure' OR OLD.status <> 'closed' THEN
        RAISE EXCEPTION 'Only closed records may be archived';
      END IF;
      NEW.status := 'archived';
    ELSE
      NEW.status := 'closed';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_internal_control_tenant_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.departments WHERE id = NEW.department_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Department must belong to the same company';
  END IF;
  IF NEW.owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.owner_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Record owner must belong to the same company';
  END IF;
  IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.assigned_to AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Record assignee must belong to the same company';
  END IF;
  IF NEW.created_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.created_by AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Record creator must belong to the same company';
  END IF;
  IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.internal_control_records WHERE id = NEW.parent_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Linked Internal Control record must belong to the same company';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS internal_control_tenant_links_guard ON public.internal_control_records;
CREATE TRIGGER internal_control_tenant_links_guard
  BEFORE INSERT OR UPDATE ON public.internal_control_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_internal_control_tenant_links();

CREATE OR REPLACE FUNCTION public.record_internal_control_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.internal_control_record_history(company_id, record_id, action, actor_id, snapshot)
  VALUES (
    NEW.company_id,
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END,
    auth.uid(),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS internal_control_workflow_guard ON public.internal_control_records;
CREATE TRIGGER internal_control_workflow_guard
  BEFORE UPDATE ON public.internal_control_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_internal_control_workflow();

DROP TRIGGER IF EXISTS internal_control_record_history_trigger ON public.internal_control_records;
CREATE TRIGGER internal_control_record_history_trigger
  AFTER INSERT OR UPDATE ON public.internal_control_records
  FOR EACH ROW EXECUTE FUNCTION public.record_internal_control_history();

CREATE OR REPLACE FUNCTION public.queue_internal_control_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  stage_id uuid;
  resource_name text;
BEGIN
  IF NEW.workflow_stage <> 'authorization' OR OLD.workflow_stage = 'authorization' THEN
    RETURN NEW;
  END IF;

  resource_name := public.internal_control_record_permission_resource(NEW.record_type);

  INSERT INTO public.approval_stages(company_id, stage_name, stage_order, approver_role, requires_all, is_final)
  SELECT NEW.company_id, 'Internal Control Authorization', 1, 'Internal Control Manager', false, true
  WHERE NOT EXISTS (
    SELECT 1 FROM public.approval_stages
    WHERE company_id = NEW.company_id AND stage_name = 'Internal Control Authorization'
  );

  SELECT id INTO stage_id
  FROM public.approval_stages
  WHERE company_id = NEW.company_id AND stage_name = 'Internal Control Authorization'
  ORDER BY created_at
  LIMIT 1;

  IF stage_id IS NULL THEN
    RAISE EXCEPTION 'No Internal Control authorization stage is available';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.request_approvals
    WHERE company_id = NEW.company_id AND request_id = NEW.id AND request_type = 'internal_control'
      AND status = 'pending'
  ) THEN
    INSERT INTO public.request_approvals(company_id, request_id, request_type, stage_id, status)
    VALUES (NEW.company_id, NEW.id, 'internal_control', stage_id, 'pending');
  END IF;

  INSERT INTO public.notifications(company_id, user_id, title, message, type, module, reference_id, action_url)
  SELECT DISTINCT NEW.company_id, ur.user_id, 'Internal Control authorization required',
    NEW.title, 'warning', 'internal_control', NEW.id, '/internal-control/requests'
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE p.resource = resource_name AND p.action = 'approve'
    AND (r.company_id = NEW.company_id OR r.company_id IS NULL)
    AND ur.user_id <> NEW.created_by;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_internal_control_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF pg_trigger_depth() > 1 OR NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    UPDATE public.request_approvals
    SET status = NEW.approval_status,
        comments = NEW.approval_reason,
        approver_id = NEW.approved_by,
        approved_at = NEW.approved_at,
        updated_at = now()
    WHERE request_id = NEW.id AND company_id = NEW.company_id
      AND request_type = 'internal_control' AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_internal_control_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  request_record public.internal_control_records%ROWTYPE;
  resource_name text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF NEW.request_type <> 'internal_control' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO request_record
  FROM public.internal_control_records
  WHERE id = NEW.request_id AND company_id = NEW.company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The Internal Control request record no longer exists';
  END IF;

  resource_name := public.internal_control_record_permission_resource(request_record.record_type);
  IF NOT public.internal_control_has_permission(resource_name, 'approve') THEN
    RAISE EXCEPTION 'Internal Control authorization permission required';
  END IF;
  IF request_record.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Request initiators cannot approve their own requests';
  END IF;
  IF request_record.workflow_stage <> 'authorization' OR OLD.status <> 'pending'
     OR NEW.status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Only pending Internal Control authorizations can be decided';
  END IF;
  IF NULLIF(trim(NEW.comments), '') IS NULL THEN
    RAISE EXCEPTION 'An approval or rejection reason is required';
  END IF;

  UPDATE public.internal_control_records
  SET approval_status = NEW.status,
      approval_reason = NEW.comments,
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = NEW.request_id AND company_id = NEW.company_id;

  NEW.approver_id := auth.uid();
  NEW.approved_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS internal_control_queue_approval ON public.internal_control_records;
CREATE TRIGGER internal_control_queue_approval
  AFTER UPDATE OF workflow_stage ON public.internal_control_records
  FOR EACH ROW EXECUTE FUNCTION public.queue_internal_control_approval();

DROP TRIGGER IF EXISTS internal_control_sync_approval ON public.internal_control_records;
CREATE TRIGGER internal_control_sync_approval
  AFTER UPDATE OF approval_status ON public.internal_control_records
  FOR EACH ROW WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION public.sync_internal_control_approval();

DROP TRIGGER IF EXISTS internal_control_approval_guard ON public.request_approvals;
CREATE TRIGGER internal_control_approval_guard
  BEFORE UPDATE ON public.request_approvals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_internal_control_approval();

DROP POLICY IF EXISTS "Users can view own company data" ON public.request_approvals;
CREATE POLICY "Users can view own company data" ON public.request_approvals
  FOR SELECT TO authenticated USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (request_type <> 'internal_control'
      OR EXISTS (
        SELECT 1 FROM public.internal_control_records record
        WHERE record.id = request_approvals.request_id
          AND record.company_id = request_approvals.company_id
          AND public.internal_control_has_permission(
            public.internal_control_record_permission_resource(record.record_type), 'view'
          )
      ))
  );
DROP POLICY IF EXISTS "Users can insert own company data" ON public.request_approvals;
CREATE POLICY "Users can insert own company data" ON public.request_approvals
  FOR INSERT TO authenticated WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND request_type <> 'internal_control'
  );
DROP POLICY IF EXISTS "Users can update own company data" ON public.request_approvals;
CREATE POLICY "Users can update own company data" ON public.request_approvals
  FOR UPDATE TO authenticated USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (request_type <> 'internal_control'
      OR EXISTS (
        SELECT 1 FROM public.internal_control_records record
        WHERE record.id = request_approvals.request_id
          AND record.company_id = request_approvals.company_id
          AND public.internal_control_has_permission(
            public.internal_control_record_permission_resource(record.record_type), 'approve'
          )
      ))
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (request_type <> 'internal_control'
      OR EXISTS (
        SELECT 1 FROM public.internal_control_records record
        WHERE record.id = request_approvals.request_id
          AND record.company_id = request_approvals.company_id
          AND public.internal_control_has_permission(
            public.internal_control_record_permission_resource(record.record_type), 'approve'
          )
      ))
  );
DROP POLICY IF EXISTS "Users can delete own company data" ON public.request_approvals;
CREATE POLICY "Users can delete own company data" ON public.request_approvals
  FOR DELETE TO authenticated USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND request_type <> 'internal_control'
  );

INSERT INTO public.permissions(resource, action, description)
SELECT 'internal_control.' || module_name, action_name,
       action_name || ' Internal Control ' || replace(module_name, '_', ' ') || ' records'
FROM (VALUES
  ('dashboard'), ('risks'), ('audits'), ('transaction_reviews'), ('compliance'),
  ('policy_enforcement'), ('fraud'), ('incidents'), ('controls'), ('findings'),
  ('evidence'), ('training'), ('requests'), ('policies'), ('reports')
) AS modules(module_name)
CROSS JOIN (VALUES
  ('view'), ('create'), ('edit'), ('delete'), ('approve'), ('assign'),
  ('verify'), ('archive'), ('export')
) AS actions(action_name)
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.permissions(resource, action, description)
VALUES ('internal_control', 'view', 'View Internal Control department')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.roles(name, description, is_system, company_id)
SELECT 'Internal Control Manager', 'Manage Internal Control records, workflows, and reports', false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'Internal Control Manager' AND company_id IS NULL);

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Internal Control Manager'
  AND r.company_id IS NULL
  AND (p.resource = 'internal_control' OR p.resource LIKE 'internal_control.%')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name IN ('Super Admin', 'Company Admin')
  AND (p.resource = 'internal_control' OR p.resource LIKE 'internal_control.%')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO storage.buckets(id, name, public)
VALUES ('internal-control-evidence', 'internal-control-evidence', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS internal_control_evidence_objects_select ON storage.objects;
CREATE POLICY internal_control_evidence_objects_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'internal-control-evidence'
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
    AND (
      public.internal_control_has_permission('internal_control.evidence', 'view')
      OR public.internal_control_has_permission('internal_control.fraud', 'view')
    )
    AND EXISTS (
      SELECT 1 FROM public.internal_control_evidence evidence
      WHERE evidence.object_path = storage.objects.name
        AND evidence.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS internal_control_evidence_objects_insert ON storage.objects;
CREATE POLICY internal_control_evidence_objects_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'internal-control-evidence'
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
    AND (storage.foldername(name))[2] IS NOT NULL
    AND public.internal_control_has_permission('internal_control.evidence', 'create')
    AND EXISTS (
      SELECT 1 FROM public.internal_control_records record
      WHERE record.id::text = (storage.foldername(name))[2]
        AND record.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND (NOT record.is_confidential OR public.internal_control_has_permission('internal_control.fraud', 'view'))
    )
  );
