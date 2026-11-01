-- QC/QA department records and controlled access to shared manufacturing inspections.

CREATE OR REPLACE FUNCTION public.quality_has_permission(p_resource text, p_action text)
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

CREATE OR REPLACE FUNCTION public.quality_record_permission_resource(p_record_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_record_type
    WHEN 'defect' THEN 'quality.defects'
    WHEN 'non_conformance' THEN 'quality.non_conformances'
    WHEN 'test' THEN 'quality.tests'
    WHEN 'specification' THEN 'quality.specifications'
    WHEN 'checklist' THEN 'quality.checklists'
    WHEN 'process_review' THEN 'quality.process_reviews'
    WHEN 'audit' THEN 'quality.audits'
    WHEN 'compliance' THEN 'quality.compliance'
    WHEN 'risk' THEN 'quality.risks'
    WHEN 'standard' THEN 'quality.standards'
    WHEN 'training' THEN 'quality.training'
    WHEN 'improvement' THEN 'quality.improvement'
    WHEN 'capa' THEN 'quality.capa'
    WHEN 'incident' THEN 'quality.incidents'
    WHEN 'document' THEN 'quality.documents'
    WHEN 'request' THEN 'quality.requests'
    WHEN 'monitoring' THEN 'quality.monitoring'
    ELSE 'quality'
  END;
$$;

CREATE TABLE IF NOT EXISTS public.quality_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN (
    'defect', 'non_conformance', 'test', 'specification', 'checklist',
    'process_review', 'audit', 'compliance', 'risk', 'standard', 'training',
    'improvement', 'capa', 'incident', 'document', 'request', 'monitoring'
  )),
  record_number text NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'draft', 'open', 'pending', 'scheduled', 'under_review', 'approved',
    'rejected', 'in_progress', 'contained', 'awaiting_verification',
    'passed', 'failed', 'compliant', 'non_compliant', 'resolved',
    'closed', 'reopened', 'archived', 'cancelled'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  severity text CHECK (severity IS NULL OR severity IN ('observation', 'minor', 'major', 'critical')),
  category text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  source_module text,
  source_record_id uuid,
  parent_id uuid,
  approval_reason text,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  verification_result text,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  detected_at timestamptz,
  closed_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, record_number),
  UNIQUE (id, company_id),
  FOREIGN KEY (parent_id, company_id)
    REFERENCES public.quality_records(id, company_id),
  CHECK (record_type <> 'capa' OR parent_id IS NOT NULL OR source_record_id IS NOT NULL),
  CHECK ((status IN ('closed', 'archived') AND closed_at IS NOT NULL) OR status NOT IN ('closed', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_quality_records_company_type_status
  ON public.quality_records(company_id, record_type, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_records_owner_due
  ON public.quality_records(company_id, owner_id, due_date) WHERE status NOT IN ('closed', 'archived');
CREATE INDEX IF NOT EXISTS idx_quality_records_source
  ON public.quality_records(company_id, source_module, source_record_id);
CREATE INDEX IF NOT EXISTS idx_quality_records_product
  ON public.quality_records(company_id, product_id, detected_at DESC);

CREATE TABLE IF NOT EXISTS public.quality_record_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated')),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.quality_records(id, company_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_quality_record_history_record
  ON public.quality_record_history(company_id, record_id, created_at DESC);

ALTER TABLE public.quality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_record_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quality_records_select ON public.quality_records;
CREATE POLICY quality_records_select ON public.quality_records
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.quality_has_permission(public.quality_record_permission_resource(record_type), 'view')
  );

DROP POLICY IF EXISTS quality_records_insert ON public.quality_records;
CREATE POLICY quality_records_insert ON public.quality_records
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
    AND public.quality_has_permission(public.quality_record_permission_resource(record_type), 'create')
    AND status IN ('draft', 'open', 'pending')
    AND closed_at IS NULL
  );

DROP POLICY IF EXISTS quality_records_update ON public.quality_records;
CREATE POLICY quality_records_update ON public.quality_records
  FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.quality_has_permission(public.quality_record_permission_resource(record_type), 'view')
    AND (
      public.quality_has_permission(public.quality_record_permission_resource(record_type), 'edit')
      OR public.quality_has_permission(public.quality_record_permission_resource(record_type), 'approve')
      OR public.quality_has_permission(public.quality_record_permission_resource(record_type), 'verify')
      OR public.quality_has_permission(public.quality_record_permission_resource(record_type), 'archive')
    )
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.quality_has_permission(public.quality_record_permission_resource(record_type), 'view')
  );

CREATE OR REPLACE FUNCTION public.validate_quality_record_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = NEW.product_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Product must belong to the same company';
  END IF;
  IF NEW.owner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.owner_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Quality record owner must belong to the same company';
  END IF;
  IF NEW.created_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.created_by AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Quality record creator must belong to the same company';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS quality_record_tenant_links_guard ON public.quality_records;
CREATE TRIGGER quality_record_tenant_links_guard
  BEFORE INSERT OR UPDATE ON public.quality_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_quality_record_links();

DROP POLICY IF EXISTS quality_history_select ON public.quality_record_history;
CREATE POLICY quality_history_select ON public.quality_record_history
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.quality_records record
      WHERE record.id = quality_record_history.record_id
        AND record.company_id = quality_record_history.company_id
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_quality_record_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resource_name text;
  allowed_transition boolean := false;
BEGIN
  resource_name := public.quality_record_permission_resource(OLD.record_type);
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.record_type IS DISTINCT FROM OLD.record_type
     OR NEW.record_number IS DISTINCT FROM OLD.record_number
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Quality record identity fields cannot be changed';
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND (
       NEW.closed_at IS DISTINCT FROM OLD.closed_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
       OR NEW.verification_result IS DISTINCT FROM OLD.verification_result
     ) THEN
    RAISE EXCEPTION 'Quality review and closure fields may only change during a valid workflow transition';
  END IF;

  IF NOT public.quality_has_permission(resource_name, 'edit') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('approved', 'rejected')
       AND public.quality_has_permission(resource_name, 'approve')
       AND (to_jsonb(NEW) - ARRAY['status', 'updated_at', 'closed_at', 'approval_reason', 'approved_by', 'approved_at'])
           IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at', 'closed_at', 'approval_reason', 'approved_by', 'approved_at']) THEN
      NULL;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('closed', 'reopened')
       AND public.quality_has_permission(resource_name, 'verify')
       AND (to_jsonb(NEW) - ARRAY['status', 'updated_at', 'closed_at', 'verification_result', 'verified_by', 'verified_at'])
           IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at', 'closed_at', 'verification_result', 'verified_by', 'verified_at']) THEN
      NULL;
    ELSIF NEW.status = 'archived'
       AND OLD.status = 'closed'
       AND public.quality_has_permission(resource_name, 'archive')
       AND (to_jsonb(NEW) - ARRAY['status', 'updated_at'])
           IS NOT DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Edit permission required for this quality record';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    allowed_transition :=
      (OLD.status = 'draft' AND NEW.status IN ('open', 'pending')) OR
      (OLD.status = 'open' AND NEW.status IN ('pending', 'scheduled', 'under_review', 'in_progress', 'contained')) OR
      (OLD.status = 'pending' AND NEW.status IN ('scheduled', 'under_review', 'approved', 'rejected', 'in_progress')) OR
      (OLD.status = 'scheduled' AND NEW.status IN ('in_progress', 'cancelled')) OR
      (OLD.status = 'under_review' AND NEW.status IN ('approved', 'rejected', 'open', 'in_progress', 'contained', 'awaiting_verification')) OR
      (OLD.status = 'approved' AND NEW.status IN ('scheduled', 'in_progress', 'open')) OR
      (OLD.status = 'rejected' AND NEW.status IN ('draft', 'open')) OR
      (OLD.status = 'in_progress' AND NEW.status IN ('passed', 'failed', 'contained', 'awaiting_verification', 'under_review', 'compliant', 'non_compliant')) OR
      (OLD.status = 'contained' AND NEW.status IN ('in_progress', 'awaiting_verification')) OR
      (OLD.status IN ('awaiting_verification', 'failed', 'non_compliant') AND NEW.status IN ('closed', 'reopened', 'in_progress', 'under_review')) OR
      (OLD.status IN ('passed', 'compliant', 'resolved') AND NEW.status IN ('closed', 'reopened')) OR
      (OLD.status = 'closed' AND NEW.status IN ('archived', 'reopened'));
    IF NOT allowed_transition THEN
      RAISE EXCEPTION 'Invalid quality record status transition from % to %', OLD.status, NEW.status;
    END IF;
    IF NEW.status IN ('approved', 'rejected') AND NOT public.quality_has_permission(resource_name, 'approve') THEN
      RAISE EXCEPTION 'Approval permission required';
    END IF;
    IF NEW.status IN ('approved', 'rejected') THEN
    IF OLD.status <> 'under_review' AND OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending records can be approved or rejected';
    END IF;
    IF OLD.created_by = auth.uid() THEN
      RAISE EXCEPTION 'Request initiators cannot approve their own records';
    END IF;
    IF NULLIF(trim(NEW.approval_reason), '') IS NULL THEN
      RAISE EXCEPTION 'An approval or rejection reason is required';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
    END IF;
    IF NEW.status IN ('closed', 'reopened') AND NOT public.quality_has_permission(resource_name, 'verify') THEN
    RAISE EXCEPTION 'Verification permission required';
    END IF;
    IF NEW.status = 'closed' THEN
    IF OLD.status <> 'awaiting_verification' AND OLD.status <> 'passed'
       AND OLD.status <> 'compliant' AND OLD.status <> 'resolved' THEN
      RAISE EXCEPTION 'Only verified quality outcomes can be closed';
    END IF;
    IF OLD.owner_id = auth.uid() THEN
      RAISE EXCEPTION 'The action owner cannot independently verify and close their own action';
    END IF;
    IF NULLIF(trim(NEW.verification_result), '') IS NULL THEN
      RAISE EXCEPTION 'Record the verification result before closing';
    END IF;
    NEW.verified_by := auth.uid();
    NEW.verified_at := now();
    END IF;
    IF NEW.status = 'archived' AND NOT public.quality_has_permission(resource_name, 'archive') THEN
      RAISE EXCEPTION 'Archive permission required';
    END IF;
    IF NEW.status IN ('closed', 'archived') THEN
      NEW.closed_at := COALESCE(NEW.closed_at, now());
    ELSIF NEW.status = 'reopened' THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_quality_record_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.quality_record_history(company_id, record_id, actor_id, action, snapshot)
  VALUES (NEW.company_id, NEW.id, auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quality_record_workflow_guard ON public.quality_records;
CREATE TRIGGER quality_record_workflow_guard
  BEFORE UPDATE ON public.quality_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quality_record_workflow();
DROP TRIGGER IF EXISTS quality_record_history_trigger ON public.quality_records;
CREATE TRIGGER quality_record_history_trigger
  AFTER INSERT OR UPDATE ON public.quality_records
  FOR EACH ROW EXECUTE FUNCTION public.record_quality_record_history();

ALTER TABLE public.quality_inspections
  ADD COLUMN IF NOT EXISTS inspection_title text,
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sampling_details text,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_reason text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.quality_inspection_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  inspection_id uuid NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quality_inspection_history_record
  ON public.quality_inspection_history(company_id, inspection_id, created_at DESC);
ALTER TABLE public.quality_inspection_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY quality_inspection_history_select ON public.quality_inspection_history
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.quality_has_permission('quality.inspections', 'view')
      OR public.quality_has_permission('manufacturing.quality', 'view')
    )
  );

ALTER TABLE public.quality_inspections
  DROP CONSTRAINT IF EXISTS quality_inspections_status_check;
ALTER TABLE public.quality_inspections
  ADD CONSTRAINT quality_inspections_status_check
  CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'conditional', 'completed', 'cancelled'));
ALTER TABLE public.quality_inspections
  DROP CONSTRAINT IF EXISTS quality_inspections_inspection_type_check;
ALTER TABLE public.quality_inspections
  ADD CONSTRAINT quality_inspections_inspection_type_check
  CHECK (inspection_type IN ('incoming', 'in_process', 'finished_goods', 'equipment', 'other', 'final', 'outgoing'));

DROP POLICY IF EXISTS quality_inspections_company_policy ON public.quality_inspections;
CREATE POLICY quality_inspections_select ON public.quality_inspections
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.quality_has_permission('quality.inspections', 'view')
      OR public.quality_has_permission('manufacturing.quality', 'view')
    )
  );
CREATE POLICY quality_inspections_insert ON public.quality_inspections
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
    AND (
      public.quality_has_permission('quality.inspections', 'create')
      OR public.quality_has_permission('manufacturing.quality', 'create')
    )
  );
CREATE POLICY quality_inspections_update ON public.quality_inspections
  FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.quality_has_permission('quality.inspections', 'edit')
      OR public.quality_has_permission('quality.inspections', 'approve')
      OR public.quality_has_permission('manufacturing.quality', 'edit')
      OR public.quality_has_permission('manufacturing.quality', 'approve')
    )
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      public.quality_has_permission('quality.inspections', 'edit')
      OR public.quality_has_permission('quality.inspections', 'approve')
      OR public.quality_has_permission('manufacturing.quality', 'edit')
      OR public.quality_has_permission('manufacturing.quality', 'approve')
    )
  );
CREATE POLICY quality_inspections_delete ON public.quality_inspections
  FOR DELETE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND status = 'pending'
    AND (
      public.quality_has_permission('manufacturing.quality', 'delete')
      OR public.quality_has_permission('quality.inspections', 'archive')
    )
  );

CREATE OR REPLACE FUNCTION public.validate_quality_inspection_links()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = NEW.product_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection product must belong to the same company';
  END IF;
  IF NEW.work_order_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.work_orders WHERE id = NEW.work_order_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection work order must belong to the same company';
  END IF;
  IF NEW.production_run_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.production_runs WHERE id = NEW.production_run_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection production run must belong to the same company';
  END IF;
  IF NEW.inspector_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.inspector_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspector must belong to the same company';
  END IF;
  IF NEW.reviewer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.reviewer_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection reviewer must belong to the same company';
  END IF;
  IF NEW.supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vendors WHERE id = NEW.supplier_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection supplier must belong to the same company';
  END IF;
  IF NEW.warehouse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.warehouses WHERE id = NEW.warehouse_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection warehouse must belong to the same company';
  END IF;
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branches WHERE id = NEW.branch_id AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection branch must belong to the same company';
  END IF;
  IF NEW.created_by IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.created_by AND company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Inspection creator must belong to the same company';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS quality_inspection_tenant_links_guard ON public.quality_inspections;
CREATE TRIGGER quality_inspection_tenant_links_guard
  BEFORE INSERT OR UPDATE ON public.quality_inspections
  FOR EACH ROW EXECUTE FUNCTION public.validate_quality_inspection_links();

CREATE OR REPLACE FUNCTION public.enforce_quality_inspection_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.inspection_number IS DISTINCT FROM OLD.inspection_number
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Inspection identity fields cannot be changed';
  END IF;
  IF OLD.approval_status = 'approved'
     AND (to_jsonb(NEW) - ARRAY['updated_at'])
         IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at']) THEN
    RAISE EXCEPTION 'Approved inspections are locked; create a linked follow-up inspection for revisions';
  END IF;
  IF NEW.result IS NOT NULL AND NEW.status NOT IN ('passed', 'failed', 'conditional', 'completed') THEN
    RAISE EXCEPTION 'A recorded inspection result must match its completed status';
  END IF;
  IF OLD.result IS NOT NULL
     AND NEW.result IS DISTINCT FROM OLD.result
     AND OLD.approval_status <> 'changes_requested' THEN
    RAISE EXCEPTION 'Inspection results are preserved; record a linked follow-up inspection for retesting';
  END IF;
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF OLD.approval_status = 'changes_requested' AND NEW.approval_status = 'pending'
       AND (
         public.quality_has_permission('quality.inspections', 'edit')
         OR public.quality_has_permission('manufacturing.quality', 'edit')
       ) THEN
      NEW.approved_by := NULL;
      NEW.approved_at := NULL;
      NEW.approval_reason := NULL;
    ELSE
      IF OLD.approval_status <> 'pending'
         OR NEW.approval_status NOT IN ('approved', 'rejected', 'changes_requested')
         OR NOT (
           public.quality_has_permission('quality.inspections', 'approve')
           OR public.quality_has_permission('manufacturing.quality', 'approve')
         ) THEN
        RAISE EXCEPTION 'Only authorized reviewers can decide pending inspections';
      END IF;
      IF OLD.created_by = auth.uid() THEN
        RAISE EXCEPTION 'Inspection creators cannot approve their own inspection';
      END IF;
      IF NULLIF(trim(NEW.approval_reason), '') IS NULL THEN
        RAISE EXCEPTION 'A review reason is required';
      END IF;
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
    END IF;
  END IF;
  IF NEW.result IS DISTINCT FROM OLD.result AND NEW.result IS NOT NULL THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS quality_inspection_review_guard ON public.quality_inspections;
CREATE TRIGGER quality_inspection_review_guard
  BEFORE UPDATE ON public.quality_inspections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_quality_inspection_review();
CREATE OR REPLACE FUNCTION public.record_quality_inspection_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.quality_inspection_history(company_id, inspection_id, actor_id, snapshot)
  VALUES (NEW.company_id, NEW.id, auth.uid(), to_jsonb(NEW));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS quality_inspection_history_trigger ON public.quality_inspections;
CREATE TRIGGER quality_inspection_history_trigger
  AFTER INSERT OR UPDATE ON public.quality_inspections
  FOR EACH ROW EXECUTE FUNCTION public.record_quality_inspection_history();

CREATE TABLE IF NOT EXISTS public.quality_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  record_id uuid,
  inspection_id uuid,
  object_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (record_id, company_id)
    REFERENCES public.quality_records(id, company_id),
  FOREIGN KEY (inspection_id) REFERENCES public.quality_inspections(id),
  UNIQUE (company_id, object_path),
  CHECK ((record_id IS NOT NULL) <> (inspection_id IS NOT NULL))
);
ALTER TABLE public.quality_evidence ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quality_evidence_inspection
  ON public.quality_evidence(company_id, inspection_id, created_at DESC);
CREATE POLICY quality_evidence_select ON public.quality_evidence
  FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.quality_records record
        WHERE record.id = quality_evidence.record_id AND record.company_id = quality_evidence.company_id
          AND public.quality_has_permission(public.quality_record_permission_resource(record.record_type), 'view')
      )
      OR EXISTS (
        SELECT 1 FROM public.quality_inspections inspection
        WHERE inspection.id = quality_evidence.inspection_id AND inspection.company_id = quality_evidence.company_id
          AND (
            public.quality_has_permission('quality.inspections', 'view')
            OR public.quality_has_permission('manufacturing.quality', 'view')
          )
      )
    )
  );
CREATE POLICY quality_evidence_insert ON public.quality_evidence
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
    AND (storage.foldername(object_path))[1] = company_id::text
    AND (storage.foldername(object_path))[2] = COALESCE(record_id, inspection_id)::text
    AND (
      EXISTS (
        SELECT 1 FROM public.quality_records record
        WHERE record.id = quality_evidence.record_id AND record.company_id = quality_evidence.company_id
          AND public.quality_has_permission(public.quality_record_permission_resource(record.record_type), 'edit')
      )
      OR EXISTS (
        SELECT 1 FROM public.quality_inspections inspection
        WHERE inspection.id = quality_evidence.inspection_id AND inspection.company_id = quality_evidence.company_id
          AND inspection.approval_status NOT IN ('approved', 'rejected')
          AND (
            public.quality_has_permission('quality.inspections', 'edit')
            OR public.quality_has_permission('manufacturing.quality', 'edit')
          )
      )
    )
  );

INSERT INTO storage.buckets(id, name, public)
VALUES ('quality-evidence', 'quality-evidence', false)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY quality_evidence_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'quality-evidence'
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.quality_evidence evidence
      WHERE evidence.object_path = storage.objects.name
        AND evidence.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.quality_records record
            WHERE record.id = evidence.record_id AND record.company_id = evidence.company_id
              AND public.quality_has_permission(public.quality_record_permission_resource(record.record_type), 'view')
          )
          OR EXISTS (
            SELECT 1 FROM public.quality_inspections inspection
            WHERE inspection.id = evidence.inspection_id AND inspection.company_id = evidence.company_id
              AND (
                public.quality_has_permission('quality.inspections', 'view')
                OR public.quality_has_permission('manufacturing.quality', 'view')
              )
          )
        )
    )
  );
CREATE POLICY quality_evidence_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quality-evidence'
    AND (storage.foldername(name))[1] = (SELECT company_id::text FROM public.profiles WHERE id = auth.uid())
    AND (storage.foldername(name))[2] IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.quality_records record
        WHERE record.id::text = (storage.foldername(name))[2]
          AND record.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
          AND public.quality_has_permission(public.quality_record_permission_resource(record.record_type), 'edit')
      )
      OR EXISTS (
        SELECT 1 FROM public.quality_inspections inspection
        WHERE inspection.id::text = (storage.foldername(name))[2]
          AND inspection.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
          AND inspection.approval_status NOT IN ('approved', 'rejected')
          AND (
            public.quality_has_permission('quality.inspections', 'edit')
            OR public.quality_has_permission('manufacturing.quality', 'edit')
          )
      )
    )
  );

INSERT INTO public.permissions(resource, action, description)
SELECT 'quality.' || module_name, action_name,
  action_name || ' QC/QA ' || replace(module_name, '_', ' ') || ' records'
FROM (VALUES
  ('dashboard'), ('inspections'), ('checklists'), ('tests'), ('defects'),
  ('non_conformances'), ('specifications'), ('process_reviews'), ('audits'),
  ('compliance'), ('risks'), ('standards'), ('training'), ('improvement'),
  ('capa'), ('incidents'), ('documents'), ('requests'), ('monitoring'), ('reports')
) AS modules(module_name)
CROSS JOIN (VALUES ('view'), ('create'), ('edit'), ('approve'), ('verify'), ('archive'), ('export')) AS actions(action_name)
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.permissions(resource, action, description)
VALUES ('quality', 'view', 'View Quality Control & Quality Assurance department')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.roles(name, description, is_system, company_id)
SELECT 'Quality Manager', 'Manage QC/QA records, reviews, and corrective actions', false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'Quality Manager' AND company_id IS NULL);

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT role_row.id, permission_row.id
FROM public.roles role_row
CROSS JOIN public.permissions permission_row
WHERE role_row.name = 'Quality Manager'
  AND role_row.company_id IS NULL
  AND (permission_row.resource = 'quality' OR permission_row.resource LIKE 'quality.%')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT role_row.id, permission_row.id
FROM public.roles role_row
CROSS JOIN public.permissions permission_row
WHERE role_row.name = 'QA/QC Manager'
  AND (permission_row.resource = 'quality' OR permission_row.resource LIKE 'quality.%')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT role_row.id, permission_row.id
FROM public.roles role_row
CROSS JOIN public.permissions permission_row
WHERE role_row.name IN ('Super Admin', 'Company Admin')
  AND (permission_row.resource = 'quality' OR permission_row.resource LIKE 'quality.%')
ON CONFLICT (role_id, permission_id) DO NOTHING;
