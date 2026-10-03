-- Logistics operations extend shared Procurement and Inventory entities.

CREATE TABLE IF NOT EXISTS logistics_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  route_name text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  planned_distance numeric(12,2) CHECK (planned_distance IS NULL OR planned_distance >= 0),
  actual_distance numeric(12,2) CHECK (actual_distance IS NULL OR actual_distance >= 0),
  planned_duration_hours numeric(10,2) CHECK (planned_duration_hours IS NULL OR planned_duration_hours >= 0),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'disrupted', 'cancelled')),
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, company_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_company_link_warehouses ON warehouses(id, company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_company_link_products ON products(id, company_id);
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS storage_capacity numeric(15,2)
  CHECK (storage_capacity IS NULL OR storage_capacity >= 0);

ALTER TABLE deliveries ALTER COLUMN po_id DROP NOT NULL;
ALTER TABLE deliveries ALTER COLUMN vendor_id DROP NOT NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS shipment_direction text NOT NULL DEFAULT 'inbound'
  CHECK (shipment_direction IN ('inbound', 'outbound'));
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_date date;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_address text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS origin_address text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS route_id uuid;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS freight_cost numeric(15,2) CHECK (freight_cost IS NULL OR freight_cost >= 0);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS customs_status text NOT NULL DEFAULT 'not_required'
  CHECK (customs_status IN ('not_required', 'pending', 'cleared', 'held'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_route_company_fkey' AND conrelid = 'public.deliveries'::regclass) THEN
    ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_route_company_fkey
      FOREIGN KEY (route_id, company_id) REFERENCES public.logistics_routes(id, company_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS logistics_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delivery_id uuid,
  vendor_id uuid,
  incident_type text NOT NULL CHECK (incident_type IN ('delay', 'damage', 'loss', 'misrouting', 'disruption', 'safety', 'other')),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  occurred_at timestamptz,
  location text,
  resolution text,
  estimated_loss numeric(15,2) CHECK (estimated_loss IS NULL OR estimated_loss >= 0),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (delivery_id, company_id) REFERENCES deliveries(id, company_id),
  FOREIGN KEY (vendor_id, company_id) REFERENCES vendors(id, company_id)
);

CREATE TABLE IF NOT EXISTS logistics_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delivery_id uuid,
  finance_invoice_id uuid,
  document_type text NOT NULL CHECK (document_type IN ('delivery_note', 'manifest', 'warehouse_log', 'freight_invoice', 'customs', 'safety', 'other')),
  title text NOT NULL,
  reference_number text,
  document_url text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'verified', 'rejected')),
  issue_date date,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (delivery_id, company_id) REFERENCES deliveries(id, company_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_company_link_invoices ON invoices(id, company_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'logistics_documents_finance_invoice_company_fkey' AND conrelid = 'public.logistics_documents'::regclass) THEN
    ALTER TABLE public.logistics_documents ADD CONSTRAINT logistics_documents_finance_invoice_company_fkey
      FOREIGN KEY (finance_invoice_id, company_id) REFERENCES public.invoices(id, company_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS logistics_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL,
  delivery_id uuid,
  channel text NOT NULL CHECK (channel IN ('email', 'phone', 'portal', 'meeting', 'other')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject text NOT NULL,
  message text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  follow_up_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'follow_up', 'resolved')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (vendor_id, company_id) REFERENCES vendors(id, company_id),
  FOREIGN KEY (delivery_id, company_id) REFERENCES deliveries(id, company_id)
);

CREATE TABLE IF NOT EXISTS logistics_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_number text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('shipment', 'warehouse_allocation', 'carrier_contract', 'customs_clearance', 'budget', 'compliance')),
  title text NOT NULL,
  description text,
  delivery_id uuid,
  vendor_id uuid,
  warehouse_id uuid,
  product_id uuid,
  requested_quantity numeric(15,3) CHECK (requested_quantity IS NULL OR requested_quantity > 0),
  budget_id uuid,
  requested_amount numeric(15,2) CHECK (requested_amount IS NULL OR requested_amount >= 0),
  supporting_documents text[] NOT NULL DEFAULT '{}',
  workflow_stage text NOT NULL DEFAULT 'request' CHECK (workflow_stage IN ('request', 'logistics_review', 'supporting_documents', 'authorization', 'execution', 'documentation', 'delivery_verification', 'follow_up', 'closure')),
  approval_status text CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected')),
  status text NOT NULL DEFAULT 'open',
  verification_result text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, request_number),
  FOREIGN KEY (delivery_id, company_id) REFERENCES deliveries(id, company_id),
  FOREIGN KEY (vendor_id, company_id) REFERENCES vendors(id, company_id),
  FOREIGN KEY (warehouse_id, company_id) REFERENCES warehouses(id, company_id),
  FOREIGN KEY (product_id, company_id) REFERENCES products(id, company_id),
  FOREIGN KEY (budget_id, company_id) REFERENCES budgets(id, company_id)
);

CREATE TABLE IF NOT EXISTS logistics_approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES logistics_requests(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  decision text,
  note text,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_routes_company ON logistics_routes(company_id, status);
CREATE INDEX IF NOT EXISTS idx_logistics_incidents_company ON logistics_incidents(company_id, status, occurred_at);
CREATE INDEX IF NOT EXISTS idx_logistics_documents_company ON logistics_documents(company_id, delivery_id);
CREATE INDEX IF NOT EXISTS idx_logistics_communications_company ON logistics_communications(company_id, vendor_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_company ON logistics_requests(company_id, workflow_stage, status);
CREATE INDEX IF NOT EXISTS idx_logistics_history_request ON logistics_approval_history(request_id, created_at);

ALTER TABLE logistics_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_approval_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.logistics_has_permission(p_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid() AND p.resource = 'logistics' AND p.action = p_action
      AND (r.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR r.company_id IS NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_logistics_request_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  stages text[] := ARRAY['request', 'logistics_review', 'supporting_documents', 'authorization', 'execution', 'documentation', 'delivery_verification', 'follow_up', 'closure'];
  old_position integer;
  new_position integer;
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NEW.approval_status IN ('approved', 'rejected') THEN
    IF NOT public.logistics_has_permission('approve') OR OLD.workflow_stage <> 'authorization' THEN
      RAISE EXCEPTION 'Logistics authorization permission required';
    END IF;
    IF NEW.approval_status = 'approved' AND NEW.workflow_stage <> 'execution' THEN
      RAISE EXCEPTION 'Approved Logistics requests must enter execution';
    END IF;
    IF NEW.approval_status = 'rejected' AND NEW.workflow_stage <> 'supporting_documents' THEN
      RAISE EXCEPTION 'Rejected Logistics requests must return for supporting documents';
    END IF;
  ELSIF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NEW.approval_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Logistics approval decisions cannot be cleared or changed directly';
  END IF;
  IF NEW.workflow_stage IS DISTINCT FROM OLD.workflow_stage THEN
    old_position := array_position(stages, OLD.workflow_stage);
    new_position := array_position(stages, NEW.workflow_stage);
    IF NOT (NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NEW.approval_status IN ('approved', 'rejected'))
       AND NOT public.logistics_has_permission('edit') THEN
      RAISE EXCEPTION 'Logistics workflow edit permission required';
    END IF;
    IF NEW.workflow_stage = 'supporting_documents' AND OLD.workflow_stage = 'authorization' AND NEW.approval_status = 'rejected' THEN
      NULL;
    ELSIF new_position <> old_position + 1 THEN
      RAISE EXCEPTION 'Logistics requests must advance one workflow stage at a time';
    END IF;
    IF NEW.workflow_stage = 'execution' AND NEW.approval_status <> 'approved' THEN
      RAISE EXCEPTION 'Logistics requests require authorization before execution';
    END IF;
    IF NEW.workflow_stage = 'closure' AND NULLIF(trim(NEW.verification_result), '') IS NULL THEN
      RAISE EXCEPTION 'Record delivery verification before closure';
    END IF;
  END IF;
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status AND NEW.approval_status = 'pending'
     AND (OLD.workflow_stage <> 'supporting_documents' OR NEW.workflow_stage <> 'authorization') THEN
    RAISE EXCEPTION 'Requests can only enter authorization after supporting documents';
  END IF;
  IF NEW.approval_status = 'approved' AND NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
  END IF;
  IF NEW.workflow_stage = 'closure' AND OLD.workflow_stage <> 'closure' THEN
    NEW.closed_at := now();
    NEW.status := 'closed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_logistics_request_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.logistics_approval_history (company_id, request_id, from_stage, to_stage, decision, actor_id)
  VALUES (NEW.company_id, NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.workflow_stage END,
    NEW.workflow_stage, CASE WHEN TG_OP = 'INSERT' THEN 'requested' ELSE NEW.approval_status END, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS logistics_request_workflow_guard ON logistics_requests;
CREATE TRIGGER logistics_request_workflow_guard BEFORE UPDATE ON logistics_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_logistics_request_workflow();
DROP TRIGGER IF EXISTS logistics_request_history_log ON logistics_requests;
CREATE TRIGGER logistics_request_history_log AFTER INSERT OR UPDATE OF workflow_stage, approval_status ON logistics_requests
FOR EACH ROW EXECUTE FUNCTION public.log_logistics_request_history();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['logistics_routes', 'logistics_incidents', 'logistics_documents', 'logistics_communications', 'logistics_requests'] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission(''view''))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission(''create''))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission(''edit'')) WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission(''edit''))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission(''delete''))', t || '_delete', t);
  END LOOP;
END $$;

CREATE POLICY logistics_approval_history_select ON logistics_approval_history FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_finance_purchase_invoices_select ON invoices FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    AND invoice_type = 'purchase' AND public.logistics_has_permission('view'));
CREATE POLICY logistics_vendors_select ON vendors FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_purchase_orders_select ON purchase_orders FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_warehouses_select ON warehouses FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_products_select ON products FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_inventory_items_select ON inventory_items FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_budgets_select ON budgets FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_warehouse_capacity_update ON warehouses FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('edit'))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('edit'));
CREATE POLICY logistics_deliveries_select ON deliveries FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_deliveries_insert ON deliveries FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('create'));
CREATE POLICY logistics_deliveries_update ON deliveries FOR UPDATE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('edit'))
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('edit'));
CREATE POLICY logistics_deliveries_delete ON deliveries FOR DELETE TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('delete'));

CREATE POLICY logistics_delivery_events_select ON delivery_events FOR SELECT TO authenticated
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('view'));
CREATE POLICY logistics_delivery_events_insert ON delivery_events FOR INSERT TO authenticated
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) AND public.logistics_has_permission('create'));

INSERT INTO permissions (resource, action, description) VALUES
  ('logistics', 'create', 'Create Logistics records'),
  ('logistics', 'edit', 'Update Logistics records'),
  ('logistics', 'delete', 'Delete Logistics records'),
  ('logistics', 'approve', 'Authorize Logistics requests'),
  ('logistics', 'export', 'Export Logistics reports'),
  ('logistics.deliveries', 'edit', 'Update shared delivery records'),
  ('logistics.deliveries', 'delete', 'Delete shared delivery records'),
  ('logistics.requests', 'view', 'View Logistics approvals'),
  ('logistics.requests', 'create', 'Create Logistics approvals'),
  ('logistics.requests', 'edit', 'Advance Logistics approvals'),
  ('logistics.requests', 'approve', 'Authorize Logistics approvals'),
  ('logistics.reports', 'view', 'View Logistics reports')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name IN ('Logistics Manager', 'Company Admin', 'Super Admin')
  AND r.company_id IS NULL AND p.resource = 'logistics'
ON CONFLICT (role_id, permission_id) DO NOTHING;
