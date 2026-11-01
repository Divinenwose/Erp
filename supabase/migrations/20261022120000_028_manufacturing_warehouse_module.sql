-- Manufacturing & Warehouse Department Module Migration
-- Production Management, Inventory, Warehouse, Quality, Equipment, Workforce, Safety

-- Production Schedules
CREATE TABLE IF NOT EXISTS production_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  schedule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  work_order_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  production_schedule_id UUID REFERENCES production_schedules(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  quantity_ordered NUMERIC(10, 2) NOT NULL,
  quantity_completed NUMERIC(10, 2) DEFAULT 0,
  unit_of_measure TEXT DEFAULT 'unit',
  target_date DATE,
  start_date DATE,
  completion_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production Runs
CREATE TABLE IF NOT EXISTS production_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  run_number TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'paused', 'completed', 'cancelled')),
  quantity_produced NUMERIC(10, 2) DEFAULT 0,
  quantity_defective NUMERIC(10, 2) DEFAULT 0,
  efficiency_rate DECIMAL(5, 2),
  downtime_minutes INTEGER DEFAULT 0,
  waste_quantity NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Raw Materials Inventory (extends existing inventory_items)
CREATE TABLE IF NOT EXISTS raw_materials_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  location_id UUID,
  quantity_on_hand NUMERIC(10, 2) DEFAULT 0,
  quantity_reserved NUMERIC(10, 2) DEFAULT 0,
  reorder_level NUMERIC(10, 2) DEFAULT 0,
  reorder_quantity NUMERIC(10, 2) DEFAULT 0,
  unit_cost DECIMAL(15, 2) DEFAULT 0,
  last_received_at TIMESTAMP WITH TIME ZONE,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, product_id, warehouse_id)
);

-- Work-in-Progress Inventory
CREATE TABLE IF NOT EXISTS wip_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  production_run_id UUID REFERENCES production_runs(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  location_id UUID,
  quantity NUMERIC(10, 2) DEFAULT 0,
  stage TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Finished Goods Inventory (extends existing inventory_items)
CREATE TABLE IF NOT EXISTS finished_goods_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  location_id UUID,
  quantity_on_hand NUMERIC(10, 2) DEFAULT 0,
  quantity_reserved NUMERIC(10, 2) DEFAULT 0,
  quantity_available NUMERIC(10, 2) DEFAULT 0,
  unit_cost DECIMAL(15, 2) DEFAULT 0,
  batch_number TEXT,
  lot_number TEXT,
  expiry_date DATE,
  production_date DATE,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, product_id, warehouse_id, batch_number)
);

-- Warehouse Locations / Storage Bins
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  location_code TEXT NOT NULL,
  location_name TEXT,
  location_type TEXT CHECK (location_type IN ('shelf', 'bin', 'zone', 'aisle', 'room', 'cold_storage', 'hazardous', 'other')),
  capacity NUMERIC(10, 2),
  current_utilization NUMERIC(10, 2) DEFAULT 0,
  parent_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, warehouse_id, location_code)
);

-- Stock Movements (extends existing stock_movements)
CREATE TABLE IF NOT EXISTS manufacturing_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'issue', 'transfer', 'adjustment', 'return', 'scrap', 'production_in', 'production_out')),
  quantity NUMERIC(10, 2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  production_run_id UUID REFERENCES production_runs(id) ON DELETE SET NULL,
  unit_cost DECIMAL(15, 2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goods Receiving
CREATE TABLE IF NOT EXISTS goods_receiving (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  receiving_number TEXT UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  received_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  inspected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goods Receiving Items
CREATE TABLE IF NOT EXISTS goods_receiving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  receiving_id UUID NOT NULL REFERENCES goods_receiving(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  quantity_ordered NUMERIC(10, 2) NOT NULL,
  quantity_received NUMERIC(10, 2) DEFAULT 0,
  quantity_accepted NUMERIC(10, 2) DEFAULT 0,
  quantity_rejected NUMERIC(10, 2) DEFAULT 0,
  unit_cost DECIMAL(15, 2),
  batch_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispatch / Shipments
CREATE TABLE IF NOT EXISTS dispatch_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  shipment_number TEXT UNIQUE NOT NULL,
  shipment_type TEXT CHECK (shipment_type IN ('sales_order', 'transfer', 'return', 'sample', 'other')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  destination_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  destination_address TEXT,
  shipping_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  carrier TEXT,
  tracking_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'picked', 'packed', 'shipped', 'in_transit', 'delivered', 'cancelled', 'returned')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispatch Items
CREATE TABLE IF NOT EXISTS dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES dispatch_shipments(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price DECIMAL(15, 2),
  batch_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  inspection_number TEXT UNIQUE NOT NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('incoming', 'in_process', 'finished_goods', 'equipment', 'other')),
  reference_type TEXT,
  reference_id UUID,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  production_run_id UUID REFERENCES production_runs(id) ON DELETE SET NULL,
  equipment_id UUID,
  inspection_date DATE NOT NULL,
  inspector_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'conditional', 'cancelled')),
  result TEXT CHECK (result IN ('pass', 'fail', 'conditional')),
  defects_found INTEGER DEFAULT 0,
  defect_details TEXT,
  corrective_actions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inspection Checklist Items
CREATE TABLE IF NOT EXISTS inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES quality_inspections(id) ON DELETE CASCADE,
  checklist_item TEXT NOT NULL,
  result TEXT CHECK (result IN ('pass', 'fail', 'na')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment & Machinery
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  equipment_number TEXT UNIQUE NOT NULL,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT CHECK (equipment_type IN ('production', 'packaging', 'material_handling', 'quality_control', 'storage', 'other')),
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost DECIMAL(15, 2),
  status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'breakdown', 'retired', 'other')),
  location TEXT,
  specifications JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment Maintenance
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_number TEXT UNIQUE NOT NULL,
  maintenance_type TEXT CHECK (maintenance_type IN ('preventive', 'corrective', 'predictive', 'emergency', 'other')),
  scheduled_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
  description TEXT,
  work_performed TEXT,
  technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  downtime_hours DECIMAL(5, 2) DEFAULT 0,
  cost DECIMAL(15, 2) DEFAULT 0,
  parts_used TEXT[],
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workforce Shifts
CREATE TABLE IF NOT EXISTS workforce_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  shift_name TEXT NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('day', 'night', 'rotating', 'flexible', 'other')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 0,
  work_days TEXT[],
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shift Assignments
CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES workforce_shifts(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  assignment_date DATE NOT NULL,
  role TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety & Compliance Records
CREATE TABLE IF NOT EXISTS safety_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  compliance_type TEXT NOT NULL CHECK (compliance_type IN ('safety_inspection', 'training', 'certification', 'audit', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  compliance_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'compliant', 'non_compliant', 'overdue')),
  responsible_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id UUID,
  findings TEXT,
  corrective_actions TEXT,
  completion_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents
CREATE TABLE IF NOT EXISTS manufacturing_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  incident_number TEXT UNIQUE NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('safety', 'quality', 'equipment', 'environmental', 'other')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  production_run_id UUID REFERENCES production_runs(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  root_cause TEXT,
  corrective_actions TEXT,
  prevention_measures TEXT,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Process Waste Tracking
CREATE TABLE IF NOT EXISTS process_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  waste_date DATE NOT NULL,
  production_run_id UUID REFERENCES production_runs(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  waste_type TEXT CHECK (waste_type IN ('material', 'rework', 'scrap', 'defective', 'other')),
  quantity NUMERIC(10, 2) NOT NULL,
  unit_of_measure TEXT DEFAULT 'unit',
  reason TEXT,
  cost DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manufacturing Documents (Policies, Procedures, Checklists)
CREATE TABLE IF NOT EXISTS manufacturing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  document_number TEXT UNIQUE NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('policy', 'procedure', 'checklist', 'guideline', 'sop', 'other')),
  category TEXT CHECK (category IN ('production', 'quality', 'safety', 'maintenance', 'warehouse', 'other')),
  version TEXT,
  effective_date DATE,
  expiry_date DATE,
  description TEXT,
  document_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_schedules_company ON production_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_company ON work_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_runs_company ON production_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_production_runs_work_order ON production_runs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_company ON raw_materials_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_product ON raw_materials_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_wip_company ON wip_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_wip_work_order ON wip_inventory(work_order_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_company ON finished_goods_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_product ON finished_goods_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_company ON warehouse_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse ON warehouse_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_stock_movements_company ON manufacturing_stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_stock_movements_product ON manufacturing_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_goods_receiving_company ON goods_receiving(company_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_shipments_company ON dispatch_shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_company ON quality_inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_company ON equipment_maintenance(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_workforce_shifts_company ON workforce_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_compliance_company ON safety_compliance(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_incidents_company ON manufacturing_incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_process_waste_company ON process_waste(company_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_documents_company ON manufacturing_documents(company_id);

-- RLS Policies
ALTER TABLE production_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wip_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy Functions (reusing existing pattern)
CREATE OR REPLACE FUNCTION manufacturing_company_policy() RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id = (SELECT company_id FROM profiles WHERE id = NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply RLS Policies (company-scoped)
DROP POLICY IF EXISTS production_schedules_company_policy ON production_schedules;
CREATE POLICY production_schedules_company_policy ON production_schedules
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS work_orders_company_policy ON work_orders;
CREATE POLICY work_orders_company_policy ON work_orders
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS production_runs_company_policy ON production_runs;
CREATE POLICY production_runs_company_policy ON production_runs
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS raw_materials_inventory_company_policy ON raw_materials_inventory;
CREATE POLICY raw_materials_inventory_company_policy ON raw_materials_inventory
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS wip_inventory_company_policy ON wip_inventory;
CREATE POLICY wip_inventory_company_policy ON wip_inventory
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS finished_goods_inventory_company_policy ON finished_goods_inventory;
CREATE POLICY finished_goods_inventory_company_policy ON finished_goods_inventory
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS warehouse_locations_company_policy ON warehouse_locations;
CREATE POLICY warehouse_locations_company_policy ON warehouse_locations
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS manufacturing_stock_movements_company_policy ON manufacturing_stock_movements;
CREATE POLICY manufacturing_stock_movements_company_policy ON manufacturing_stock_movements
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS goods_receiving_company_policy ON goods_receiving;
CREATE POLICY goods_receiving_company_policy ON goods_receiving
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS goods_receiving_items_company_policy ON goods_receiving_items;
CREATE POLICY goods_receiving_items_company_policy ON goods_receiving_items
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS dispatch_shipments_company_policy ON dispatch_shipments;
CREATE POLICY dispatch_shipments_company_policy ON dispatch_shipments
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS dispatch_items_company_policy ON dispatch_items;
CREATE POLICY dispatch_items_company_policy ON dispatch_items
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS quality_inspections_company_policy ON quality_inspections;
CREATE POLICY quality_inspections_company_policy ON quality_inspections
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS inspection_checklist_items_company_policy ON inspection_checklist_items;
CREATE POLICY inspection_checklist_items_company_policy ON inspection_checklist_items
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS equipment_company_policy ON equipment;
CREATE POLICY equipment_company_policy ON equipment
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS equipment_maintenance_company_policy ON equipment_maintenance;
CREATE POLICY equipment_maintenance_company_policy ON equipment_maintenance
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS workforce_shifts_company_policy ON workforce_shifts;
CREATE POLICY workforce_shifts_company_policy ON workforce_shifts
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS shift_assignments_company_policy ON shift_assignments;
CREATE POLICY shift_assignments_company_policy ON shift_assignments
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS safety_compliance_company_policy ON safety_compliance;
CREATE POLICY safety_compliance_company_policy ON safety_compliance
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS manufacturing_incidents_company_policy ON manufacturing_incidents;
CREATE POLICY manufacturing_incidents_company_policy ON manufacturing_incidents
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS process_waste_company_policy ON process_waste;
CREATE POLICY process_waste_company_policy ON process_waste
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS manufacturing_documents_company_policy ON manufacturing_documents;
CREATE POLICY manufacturing_documents_company_policy ON manufacturing_documents
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Updated At Triggers
CREATE OR REPLACE FUNCTION update_manufacturing_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER production_schedules_updated_at BEFORE UPDATE ON production_schedules
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER production_runs_updated_at BEFORE UPDATE ON production_runs
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER raw_materials_inventory_updated_at BEFORE UPDATE ON raw_materials_inventory
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER wip_inventory_updated_at BEFORE UPDATE ON wip_inventory
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER finished_goods_inventory_updated_at BEFORE UPDATE ON finished_goods_inventory
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER warehouse_locations_updated_at BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER goods_receiving_updated_at BEFORE UPDATE ON goods_receiving
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER dispatch_shipments_updated_at BEFORE UPDATE ON dispatch_shipments
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER quality_inspections_updated_at BEFORE UPDATE ON quality_inspections
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER equipment_maintenance_updated_at BEFORE UPDATE ON equipment_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER workforce_shifts_updated_at BEFORE UPDATE ON workforce_shifts
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER safety_compliance_updated_at BEFORE UPDATE ON safety_compliance
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER manufacturing_incidents_updated_at BEFORE UPDATE ON manufacturing_incidents
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();

CREATE TRIGGER manufacturing_documents_updated_at BEFORE UPDATE ON manufacturing_documents
  FOR EACH ROW EXECUTE FUNCTION update_manufacturing_updated_at();
