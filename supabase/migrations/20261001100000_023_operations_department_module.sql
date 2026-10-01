-- Operations Department records and cross-functional authorization workflow.

CREATE TABLE IF NOT EXISTS operations_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN (
    'incident', 'production', 'schedule', 'resource_allocation', 'compliance',
    'kpi', 'vendor_evaluation', 'vendor_communication', 'vendor_contract', 'safety'
  )),
  title text NOT NULL,
  description text,
  category text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL,
  quantity numeric(15,3) CHECK (quantity IS NULL OR quantity >= 0),
  waste_quantity numeric(15,3) CHECK (waste_quantity IS NULL OR waste_quantity >= 0),
  amount numeric(15,2) CHECK (amount IS NULL OR amount >= 0),
  metric_name text,
  metric_value numeric(15,4),
  target_value numeric(15,4),
  metric_unit text,
  event_date date,
  due_date date,
  source_module text,
  source_record_id uuid,
  reference_url text,
  supporting_documents text[] NOT NULL DEFAULT '{}',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operations_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_number text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN (
    'procurement', 'inventory', 'logistics', 'vendor_contract', 'budget',
    'compliance', 'resource', 'other'
  )),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open',
  workflow_stage text NOT NULL DEFAULT 'operations_review' CHECK (workflow_stage IN (
    'operations_review', 'supporting_documents', 'authorization', 'execution',
    'documentation', 'follow_up_verification', 'closure'
  )),
  approval_status text CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected')),
  requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  requested_for_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  requested_amount numeric(15,2) CHECK (requested_amount IS NULL OR requested_amount >= 0),
  required_date date,
  source_module text,
  source_record_id uuid,
  purchase_request_id uuid REFERENCES purchase_requests(id) ON DELETE SET NULL,
  replenishment_request_id uuid REFERENCES replenishment_requests(id) ON DELETE SET NULL,
  delivery_id uuid REFERENCES deliveries(id) ON DELETE SET NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL,
  budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL,
  supporting_documents text[] NOT NULL DEFAULT '{}',
  execution_notes text,
  documentation_url text,
  verification_result text,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  closed_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, request_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_vendors ON vendors(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_assets ON assets(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_projects ON projects(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_departments ON departments(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_budgets ON budgets(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_purchase_requests ON purchase_requests(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_replenishment ON replenishment_requests(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_company_link_deliveries ON deliveries(id, company_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_records_vendor_company_fkey' AND conrelid = 'public.operations_records'::regclass) THEN
    ALTER TABLE public.operations_records ADD CONSTRAINT operations_records_vendor_company_fkey FOREIGN KEY (vendor_id, company_id) REFERENCES public.vendors(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_records_asset_company_fkey' AND conrelid = 'public.operations_records'::regclass) THEN
    ALTER TABLE public.operations_records ADD CONSTRAINT operations_records_asset_company_fkey FOREIGN KEY (asset_id, company_id) REFERENCES public.assets(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_records_project_company_fkey' AND conrelid = 'public.operations_records'::regclass) THEN
    ALTER TABLE public.operations_records ADD CONSTRAINT operations_records_project_company_fkey FOREIGN KEY (project_id, company_id) REFERENCES public.projects(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_records_department_company_fkey' AND conrelid = 'public.operations_records'::regclass) THEN
    ALTER TABLE public.operations_records ADD CONSTRAINT operations_records_department_company_fkey FOREIGN KEY (department_id, company_id) REFERENCES public.departments(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_records_budget_company_fkey' AND conrelid = 'public.operations_records'::regclass) THEN
    ALTER TABLE public.operations_records ADD CONSTRAINT operations_records_budget_company_fkey FOREIGN KEY (budget_id, company_id) REFERENCES public.budgets(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_requests_vendor_company_fkey' AND conrelid = 'public.operations_requests'::regclass) THEN
    ALTER TABLE public.operations_requests ADD CONSTRAINT operations_requests_vendor_company_fkey FOREIGN KEY (vendor_id, company_id) REFERENCES public.vendors(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_requests_budget_company_fkey' AND conrelid = 'public.operations_requests'::regclass) THEN
    ALTER TABLE public.operations_requests ADD CONSTRAINT operations_requests_budget_company_fkey FOREIGN KEY (budget_id, company_id) REFERENCES public.budgets(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_requests_purchase_company_fkey' AND conrelid = 'public.operations_requests'::regclass) THEN
    ALTER TABLE public.operations_requests ADD CONSTRAINT operations_requests_purchase_company_fkey FOREIGN KEY (purchase_request_id, company_id) REFERENCES public.purchase_requests(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_requests_replenishment_company_fkey' AND conrelid = 'public.operations_requests'::regclass) THEN
    ALTER TABLE public.operations_requests ADD CONSTRAINT operations_requests_replenishment_company_fkey FOREIGN KEY (replenishment_request_id, company_id) REFERENCES public.replenishment_requests(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_requests_delivery_company_fkey' AND conrelid = 'public.operations_requests'::regclass) THEN
    ALTER TABLE public.operations_requests ADD CONSTRAINT operations_requests_delivery_company_fkey FOREIGN KEY (delivery_id, company_id) REFERENCES public.deliveries(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_requests_department_company_fkey' AND conrelid = 'public.operations_requests'::regclass) THEN
    ALTER TABLE public.operations_requests ADD CONSTRAINT operations_requests_department_company_fkey FOREIGN KEY (department_id, company_id) REFERENCES public.departments(id, company_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'operations_requests_target_department_company_fkey' AND conrelid = 'public.operations_requests'::regclass) THEN
    ALTER TABLE public.operations_requests ADD CONSTRAINT operations_requests_target_department_company_fkey FOREIGN KEY (requested_for_department_id, company_id) REFERENCES public.departments(id, company_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operations_records_company_type_date
  ON operations_records(company_id, record_type, event_date);
CREATE INDEX IF NOT EXISTS idx_operations_records_vendor
  ON operations_records(company_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_operations_records_asset
  ON operations_records(company_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_operations_requests_company_stage
  ON operations_requests(company_id, workflow_stage, status);
CREATE INDEX IF NOT EXISTS idx_operations_requests_purchase
  ON operations_requests(company_id, purchase_request_id);

ALTER TABLE operations_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.operations_has_permission(p_resource text, p_action text)
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

CREATE OR REPLACE FUNCTION public.operations_record_permission_resource(p_record_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_record_type
    WHEN 'incident' THEN 'operations.incidents'
    WHEN 'production' THEN 'operations.production'
    WHEN 'schedule' THEN 'operations.workforce'
    WHEN 'resource_allocation' THEN 'operations.resources'
    WHEN 'compliance' THEN 'operations.compliance'
    WHEN 'kpi' THEN 'operations.kpis'
    WHEN 'vendor_evaluation' THEN 'operations.vendors'
    WHEN 'vendor_communication' THEN 'operations.vendors'
    WHEN 'vendor_contract' THEN 'operations.vendors'
    WHEN 'safety' THEN 'operations.inspections'
    ELSE 'operations'
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_operations_request_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  stages text[] := ARRAY[
    'operations_review', 'supporting_documents', 'authorization', 'execution',
    'documentation', 'follow_up_verification', 'closure'
  ];
  old_position integer;
  new_position integer;
BEGIN
  IF OLD.workflow_stage IS DISTINCT FROM NEW.workflow_stage THEN
    old_position := array_position(stages, OLD.workflow_stage);
    new_position := array_position(stages, NEW.workflow_stage);
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
       AND NEW.approval_status IN ('approved', 'rejected') THEN
      IF NOT public.operations_has_permission('operations.requests', 'approve') THEN
        RAISE EXCEPTION 'Authorization permission required to decide an Operations request';
      END IF;
    ELSIF NOT public.operations_has_permission('operations.requests', 'edit') THEN
      RAISE EXCEPTION 'Workflow edit permission required to advance an Operations request';
    END IF;
    IF NEW.workflow_stage = 'supporting_documents' AND OLD.workflow_stage = 'authorization'
       AND NEW.approval_status = 'rejected' THEN
      NULL;
    ELSIF new_position <> old_position + 1 THEN
      RAISE EXCEPTION 'Operations requests must advance one stage at a time';
    END IF;
    IF NEW.workflow_stage = 'execution' AND OLD.workflow_stage = 'authorization'
       AND NEW.approval_status <> 'approved' THEN
      RAISE EXCEPTION 'Operations requests require authorization before execution';
    END IF;
    IF NEW.workflow_stage = 'closure' AND NULLIF(trim(NEW.verification_result), '') IS NULL THEN
      RAISE EXCEPTION 'Record follow-up verification before closing the request';
    END IF;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NEW.approval_status = 'pending' THEN
      IF OLD.workflow_stage <> 'supporting_documents' OR NEW.workflow_stage <> 'authorization'
         OR NOT public.operations_has_permission('operations.requests', 'edit') THEN
        RAISE EXCEPTION 'Requests can only enter authorization from the supporting documents stage';
      END IF;
    ELSIF OLD.workflow_stage <> 'authorization'
       OR NOT public.operations_has_permission('operations.requests', 'approve') THEN
      RAISE EXCEPTION 'Requests may only be authorized by an Operations approver at the authorization stage';
    ELSIF NEW.approval_status = 'approved' THEN
      NEW.workflow_stage := 'execution';
      NEW.approved_at := now();
    ELSIF NEW.approval_status = 'rejected' THEN
      NEW.workflow_stage := 'supporting_documents';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operations_request_workflow_guard ON operations_requests;
CREATE TRIGGER operations_request_workflow_guard
  BEFORE UPDATE ON operations_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_operations_request_workflow();

CREATE POLICY operations_records_select ON operations_records FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission(public.operations_record_permission_resource(record_type), 'view')
  );
CREATE POLICY operations_records_insert ON operations_records FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission(public.operations_record_permission_resource(record_type), 'create')
  );
CREATE POLICY operations_records_update ON operations_records FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission(public.operations_record_permission_resource(record_type), 'edit')
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission(public.operations_record_permission_resource(record_type), 'edit')
  );
CREATE POLICY operations_records_delete ON operations_records FOR DELETE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission(public.operations_record_permission_resource(record_type), 'delete')
  );

CREATE POLICY operations_requests_select ON operations_requests FOR SELECT TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission('operations.requests', 'view')
  );
CREATE POLICY operations_requests_insert ON operations_requests FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission('operations.requests', 'create')
  );
CREATE POLICY operations_requests_update ON operations_requests FOR UPDATE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.operations_has_permission('operations.requests', 'edit') OR public.operations_has_permission('operations.requests', 'approve'))
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND (public.operations_has_permission('operations.requests', 'edit') OR public.operations_has_permission('operations.requests', 'approve'))
  );
CREATE POLICY operations_requests_delete ON operations_requests FOR DELETE TO authenticated
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND public.operations_has_permission('operations.requests', 'delete')
  );

ALTER TABLE office_inspections DROP CONSTRAINT IF EXISTS office_inspections_inspection_type_check;
ALTER TABLE office_inspections ADD CONSTRAINT office_inspections_inspection_type_check
  CHECK (inspection_type IN ('cleanliness', 'restroom', 'workspace', 'reception', 'meeting_room', 'general', 'quality', 'safety', 'production', 'process'));

INSERT INTO permissions (resource, action, description) VALUES
  ('operations', 'view', 'View Operations module'),
  ('operations.tasks', 'view', 'View operational tasks'),
  ('operations.tasks', 'create', 'Create operational tasks'),
  ('operations.tasks', 'edit', 'Update operational tasks'),
  ('operations.tasks', 'delete', 'Delete operational tasks'),
  ('operations.supply_chain', 'view', 'View supply chain coordination'),
  ('operations.inventory', 'view', 'View inventory status and movements'),
  ('operations.procurement', 'view', 'View procurement requests and orders'),
  ('operations.logistics', 'view', 'View logistics records and deliveries'),
  ('operations.logistics', 'create', 'Create logistics deliveries'),
  ('operations.logistics', 'edit', 'Update logistics deliveries'),
  ('operations.logistics', 'delete', 'Delete logistics deliveries'),
  ('operations.vendors', 'view', 'View operational vendors and evaluations'),
  ('operations.vendors', 'create', 'Create vendor evaluations and communications'),
  ('operations.vendors', 'edit', 'Update vendor evaluations and communications'),
  ('operations.vendors', 'delete', 'Delete vendor evaluations and communications'),
  ('operations.workforce', 'view', 'View staff schedules and attendance'),
  ('operations.workforce', 'create', 'Create staff schedules'),
  ('operations.workforce', 'edit', 'Update staff schedules'),
  ('operations.workforce', 'delete', 'Delete staff schedules'),
  ('operations.incidents', 'view', 'View operational incidents'),
  ('operations.incidents', 'create', 'Create operational incidents'),
  ('operations.incidents', 'edit', 'Update operational incidents'),
  ('operations.incidents', 'delete', 'Delete operational incidents'),
  ('operations.inspections', 'view', 'View quality and safety inspections'),
  ('operations.inspections', 'create', 'Create quality and safety inspections'),
  ('operations.inspections', 'edit', 'Update quality and safety inspections'),
  ('operations.inspections', 'delete', 'Delete quality and safety inspections'),
  ('operations.production', 'view', 'View production records'),
  ('operations.production', 'create', 'Create production records'),
  ('operations.production', 'edit', 'Update production records'),
  ('operations.production', 'delete', 'Delete production records'),
  ('operations.resources', 'view', 'View resource allocation plans'),
  ('operations.resources', 'create', 'Create resource allocation plans'),
  ('operations.resources', 'edit', 'Update resource allocation plans'),
  ('operations.resources', 'delete', 'Delete resource allocation plans'),
  ('operations.compliance', 'view', 'View operations compliance documents'),
  ('operations.compliance', 'create', 'Create operations compliance documents'),
  ('operations.compliance', 'edit', 'Update operations compliance documents'),
  ('operations.compliance', 'delete', 'Delete operations compliance documents'),
  ('operations.maintenance', 'view', 'View equipment maintenance and work orders'),
  ('operations.maintenance', 'create', 'Create equipment work orders'),
  ('operations.maintenance', 'edit', 'Update equipment work orders'),
  ('operations.maintenance', 'delete', 'Delete equipment work orders'),
  ('operations.requests', 'view', 'View cross-department Operations requests'),
  ('operations.requests', 'create', 'Create cross-department Operations requests'),
  ('operations.requests', 'edit', 'Update Operations requests and workflow'),
  ('operations.requests', 'approve', 'Authorize Operations requests'),
  ('operations.requests', 'delete', 'Delete Operations requests'),
  ('operations.kpis', 'view', 'View operational KPIs'),
  ('operations.kpis', 'create', 'Create operational KPI records'),
  ('operations.kpis', 'edit', 'Update operational KPI records'),
  ('operations.kpis', 'delete', 'Delete operational KPI records'),
  ('operations.reports', 'view', 'View Operations reports'),
  ('operations.reports', 'export', 'Export Operations reports')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource = 'operations' OR p.resource LIKE 'operations.%'
WHERE r.name IN ('Operations Manager', 'Company Admin', 'Super Admin')
  AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource IN (
  'operations', 'operations.requests', 'operations.procurement', 'operations.reports'
) AND p.action = 'view'
WHERE r.name = 'Procurement Manager' AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource IN (
  'operations', 'operations.requests', 'operations.inventory', 'operations.reports'
) AND p.action = 'view'
WHERE r.name = 'Inventory Manager' AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource IN (
  'operations', 'operations.requests', 'operations.logistics', 'operations.reports'
) AND p.action = 'view'
WHERE r.name = 'Logistics Manager' AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource IN (
  'operations', 'operations.requests', 'operations.workforce', 'operations.reports'
) AND p.action = 'view'
WHERE r.name = 'HR Manager' AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource IN ('operations', 'operations.requests') AND p.action = 'view'
WHERE r.name IN ('IT Manager', 'Administration Manager') AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource IN (
  'operations', 'operations.requests', 'operations.inspections', 'operations.compliance', 'operations.reports'
) AND p.action = 'view'
WHERE r.name = 'QA/QC Manager' AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource IN (
  'operations', 'operations.requests', 'operations.resources', 'operations.reports'
) AND p.action = 'view'
WHERE r.name = 'Finance Manager' AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;
