-- IT Department operational records, workflow permissions, and company isolation.

CREATE TABLE IF NOT EXISTS it_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_tag text NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('computer', 'mobile', 'network', 'server', 'peripheral', 'other')),
  manufacturer text,
  model text,
  serial_number text,
  operating_system text,
  purchase_date date,
  purchase_cost numeric(15,2) CHECK (purchase_cost IS NULL OR purchase_cost >= 0),
  warranty_expires date,
  status text NOT NULL DEFAULT 'in_service' CHECK (status IN ('in_service', 'spare', 'repair', 'retired', 'disposed')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  location text,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, asset_tag),
  UNIQUE (id, company_id)
);

CREATE TABLE IF NOT EXISTS it_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  ticket_type text NOT NULL DEFAULT 'helpdesk' CHECK (ticket_type IN ('helpdesk', 'incident', 'access', 'security')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'in_progress', 'waiting', 'resolved', 'closed', 'escalated')),
  workflow_stage text NOT NULL DEFAULT 'it_review' CHECK (workflow_stage IN ('it_review', 'supporting_documents', 'approval', 'execution', 'documentation', 'testing_follow_up', 'closure')),
  approval_status text CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected')),
  requester_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  asset_id uuid,
  supporting_documents text[] NOT NULL DEFAULT '{}',
  resolution text,
  resolution_minutes integer CHECK (resolution_minutes IS NULL OR resolution_minutes >= 0),
  escalated_at timestamptz,
  closed_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ticket_number),
  FOREIGN KEY (asset_id, company_id) REFERENCES it_assets(id, company_id)
);

CREATE TABLE IF NOT EXISTS it_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  vendor_name text,
  version text,
  license_type text NOT NULL DEFAULT 'subscription' CHECK (license_type IN ('subscription', 'perpetual', 'open_source', 'other')),
  license_reference text,
  licensed_seats integer NOT NULL DEFAULT 1 CHECK (licensed_seats > 0),
  renewal_date date,
  annual_cost numeric(15,2) CHECK (annual_cost IS NULL OR annual_cost >= 0),
  compliance_status text NOT NULL DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'review', 'non_compliant', 'expired')),
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id)
);

CREATE TABLE IF NOT EXISTS it_license_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  license_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  notes text,
  FOREIGN KEY (license_id, company_id) REFERENCES it_licenses(id, company_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_it_license_assignments_active
  ON it_license_assignments (license_id, user_id) WHERE released_at IS NULL;

CREATE OR REPLACE FUNCTION public.enforce_it_license_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  seat_limit integer;
  seats_in_use integer;
BEGIN
  IF NEW.released_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT licensed_seats INTO seat_limit
  FROM public.it_licenses
  WHERE id = NEW.license_id AND company_id = NEW.company_id
  FOR UPDATE;

  IF seat_limit IS NULL THEN
    RAISE EXCEPTION 'License does not belong to this company';
  END IF;

  SELECT count(*) INTO seats_in_use
  FROM public.it_license_assignments
  WHERE license_id = NEW.license_id
    AND company_id = NEW.company_id
    AND released_at IS NULL
    AND id IS DISTINCT FROM NEW.id;

  IF seats_in_use >= seat_limit THEN
    RAISE EXCEPTION 'All licensed seats are assigned';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS it_license_seat_limit ON it_license_assignments;
CREATE TRIGGER it_license_seat_limit
  BEFORE INSERT OR UPDATE ON it_license_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_it_license_seat_limit();

CREATE TABLE IF NOT EXISTS it_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN (
    'access_request', 'security_incident', 'security_request', 'monitoring', 'backup', 'disaster_recovery',
    'policy', 'change_request', 'vendor', 'contract', 'purchase_request', 'training', 'documentation'
  )),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  vendor_name text,
  amount numeric(15,2) CHECK (amount IS NULL OR amount >= 0),
  metric_name text,
  metric_value numeric(12,4),
  metric_unit text,
  event_date date,
  due_date date,
  reference_url text,
  supporting_documents text[] NOT NULL DEFAULT '{}',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  workflow_stage text CHECK (workflow_stage IS NULL OR workflow_stage IN ('it_review', 'supporting_documents', 'approval', 'execution', 'documentation', 'testing_follow_up', 'closure')),
  approval_status text CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  linked_purchase_request_id uuid REFERENCES purchase_requests(id) ON DELETE SET NULL,
  execution_notes text,
  test_result text,
  closed_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE it_records ADD COLUMN IF NOT EXISTS vendor_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_id_company ON vendors(id, company_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'it_records_vendor_company_fkey'
      AND conrelid = 'public.it_records'::regclass
  ) THEN
    ALTER TABLE public.it_records
      ADD CONSTRAINT it_records_vendor_company_fkey
      FOREIGN KEY (vendor_id, company_id) REFERENCES public.vendors(id, company_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_it_assets_company_status ON it_assets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_it_tickets_company_status ON it_tickets(company_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_it_tickets_assignee ON it_tickets(company_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_it_licenses_company_renewal ON it_licenses(company_id, renewal_date);
CREATE INDEX IF NOT EXISTS idx_it_records_company_type_date ON it_records(company_id, record_type, event_date);

ALTER TABLE it_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_license_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.it_has_permission(p_resource text, p_action text)
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

CREATE OR REPLACE FUNCTION public.it_record_permission_resource(p_record_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_record_type
    WHEN 'access_request' THEN 'it.access'
    WHEN 'security_incident' THEN 'it.security'
    WHEN 'security_request' THEN 'it.security'
    WHEN 'monitoring' THEN 'it.infrastructure'
    WHEN 'backup' THEN 'it.backup'
    WHEN 'disaster_recovery' THEN 'it.backup'
    WHEN 'policy' THEN 'it.compliance'
    WHEN 'change_request' THEN 'it.changes'
    WHEN 'vendor' THEN 'it.vendors'
    WHEN 'contract' THEN 'it.vendors'
    WHEN 'purchase_request' THEN 'it.purchasing'
    WHEN 'training' THEN 'it.training'
    WHEN 'documentation' THEN 'it.documentation'
    ELSE 'it'
  END;
$$;

DROP POLICY IF EXISTS it_company_isolation_it_assets ON it_assets;
DROP POLICY IF EXISTS it_company_isolation_it_tickets ON it_tickets;
DROP POLICY IF EXISTS it_company_isolation_it_licenses ON it_licenses;
DROP POLICY IF EXISTS it_company_isolation_it_license_assignments ON it_license_assignments;
DROP POLICY IF EXISTS it_company_isolation_it_records ON it_records;

CREATE POLICY it_assets_select ON it_assets FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.assets', 'view'));
CREATE POLICY it_assets_insert ON it_assets FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.assets', 'create'));
CREATE POLICY it_assets_update ON it_assets FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.assets', 'edit'))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.assets', 'edit'));
CREATE POLICY it_assets_delete ON it_assets FOR DELETE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.assets', 'delete'));

CREATE POLICY it_tickets_select ON it_tickets FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'view'));
CREATE POLICY it_tickets_insert ON it_tickets FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'create'));
CREATE POLICY it_tickets_update ON it_tickets FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND (public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'edit') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'approve') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'assign') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'resolve') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'escalate')))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND (public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'edit') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'approve') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'assign') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'resolve') OR public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'escalate')));
CREATE POLICY it_tickets_delete ON it_tickets FOR DELETE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission(CASE WHEN ticket_type = 'incident' THEN 'it.incidents' ELSE 'it.tickets' END, 'delete'));

CREATE POLICY it_licenses_select ON it_licenses FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'view'));
CREATE POLICY it_licenses_insert ON it_licenses FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'create'));
CREATE POLICY it_licenses_update ON it_licenses FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'edit'))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'edit'));
CREATE POLICY it_licenses_delete ON it_licenses FOR DELETE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'delete'));

CREATE POLICY it_license_assignments_select ON it_license_assignments FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'view'));
CREATE POLICY it_license_assignments_insert ON it_license_assignments FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'assign'));
CREATE POLICY it_license_assignments_update ON it_license_assignments FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'assign'))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'assign'));
CREATE POLICY it_license_assignments_delete ON it_license_assignments FOR DELETE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission('it.licenses', 'assign'));

CREATE POLICY it_records_select ON it_records FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission(public.it_record_permission_resource(record_type), 'view'));
CREATE POLICY it_records_insert ON it_records FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission(public.it_record_permission_resource(record_type), 'create'));
CREATE POLICY it_records_update ON it_records FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND (public.it_has_permission(public.it_record_permission_resource(record_type), 'edit') OR public.it_has_permission(public.it_record_permission_resource(record_type), 'approve')))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND (public.it_has_permission(public.it_record_permission_resource(record_type), 'edit') OR public.it_has_permission(public.it_record_permission_resource(record_type), 'approve')));
CREATE POLICY it_records_delete ON it_records FOR DELETE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.it_has_permission(public.it_record_permission_resource(record_type), 'delete'));

INSERT INTO permissions (resource, action, description) VALUES
  ('it.tickets', 'view', 'View IT helpdesk tickets'),
  ('it.tickets', 'create', 'Create IT helpdesk tickets'),
  ('it.tickets', 'edit', 'Update IT helpdesk tickets'),
  ('it.tickets', 'delete', 'Delete IT helpdesk tickets'),
  ('it.tickets', 'assign', 'Assign IT helpdesk tickets'),
  ('it.tickets', 'escalate', 'Escalate IT helpdesk tickets'),
  ('it.tickets', 'resolve', 'Resolve IT helpdesk tickets'),
  ('it.tickets', 'approve', 'Approve IT ticket workflows'),
  ('it.incidents', 'view', 'View IT incidents'),
  ('it.incidents', 'create', 'Create IT incidents'),
  ('it.incidents', 'edit', 'Update IT incidents'),
  ('it.incidents', 'delete', 'Delete IT incidents'),
  ('it.incidents', 'assign', 'Assign IT incidents'),
  ('it.incidents', 'resolve', 'Resolve IT incidents'),
  ('it.incidents', 'escalate', 'Escalate IT incidents'),
  ('it.incidents', 'approve', 'Approve IT incident workflows'),
  ('it.assets', 'view', 'View IT assets'),
  ('it.assets', 'create', 'Create IT assets'),
  ('it.assets', 'edit', 'Update IT assets'),
  ('it.assets', 'delete', 'Delete IT assets'),
  ('it.assets', 'assign', 'Assign IT assets'),
  ('it.access', 'view', 'View IT access requests and accounts'),
  ('it.access', 'create', 'Create IT access requests'),
  ('it.access', 'edit', 'Update IT access requests'),
  ('it.access', 'delete', 'Delete IT access requests'),
  ('it.access', 'approve', 'Approve IT access requests'),
  ('it.licenses', 'view', 'View software licenses'),
  ('it.licenses', 'create', 'Create software licenses'),
  ('it.licenses', 'edit', 'Update software licenses'),
  ('it.licenses', 'delete', 'Delete software licenses'),
  ('it.licenses', 'assign', 'Assign software licenses'),
  ('it.infrastructure', 'view', 'View IT infrastructure records'),
  ('it.infrastructure', 'create', 'Create IT infrastructure records'),
  ('it.infrastructure', 'edit', 'Update IT infrastructure records'),
  ('it.infrastructure', 'delete', 'Delete IT infrastructure records'),
  ('it.backup', 'view', 'View backup and recovery records'),
  ('it.backup', 'create', 'Create backup and recovery records'),
  ('it.backup', 'edit', 'Update backup and recovery records'),
  ('it.backup', 'delete', 'Delete backup and recovery records'),
  ('it.security', 'view', 'View cybersecurity records'),
  ('it.security', 'create', 'Create cybersecurity records'),
  ('it.security', 'edit', 'Update cybersecurity records'),
  ('it.security', 'delete', 'Delete cybersecurity records'),
  ('it.security', 'approve', 'Review cybersecurity requests'),
  ('it.compliance', 'view', 'View IT policies and compliance records'),
  ('it.compliance', 'create', 'Create IT policies and compliance records'),
  ('it.compliance', 'edit', 'Update IT policies and compliance records'),
  ('it.compliance', 'delete', 'Delete IT policies and compliance records'),
  ('it.changes', 'view', 'View IT changes and service requests'),
  ('it.changes', 'create', 'Create IT changes and service requests'),
  ('it.changes', 'edit', 'Update IT changes and service requests'),
  ('it.changes', 'delete', 'Delete IT changes and service requests'),
  ('it.changes', 'approve', 'Approve IT changes and service requests'),
  ('it.vendors', 'view', 'View IT vendors and contracts'),
  ('it.vendors', 'create', 'Create IT vendors and contracts'),
  ('it.vendors', 'edit', 'Update IT vendors and contracts'),
  ('it.vendors', 'delete', 'Delete IT vendors and contracts'),
  ('it.purchasing', 'view', 'View IT purchase requests'),
  ('it.purchasing', 'create', 'Create IT purchase requests'),
  ('it.purchasing', 'edit', 'Update IT purchase requests'),
  ('it.purchasing', 'approve', 'Approve IT purchase requests'),
  ('it.training', 'view', 'View IT training records'),
  ('it.training', 'create', 'Create IT training records'),
  ('it.training', 'edit', 'Update IT training records'),
  ('it.training', 'delete', 'Delete IT training records'),
  ('it.documentation', 'view', 'View IT documentation'),
  ('it.documentation', 'create', 'Create IT documentation'),
  ('it.documentation', 'edit', 'Update IT documentation'),
  ('it.documentation', 'delete', 'Delete IT documentation'),
  ('it.reports', 'view', 'View IT reports'),
  ('it.reports', 'export', 'Export IT reports')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM roles r
JOIN permissions p ON p.resource LIKE 'it.%' OR (p.resource = 'it' AND p.action = 'view')
WHERE r.name IN ('IT Manager', 'Company Admin', 'Super Admin')
  AND r.company_id IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;
