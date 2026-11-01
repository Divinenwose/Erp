-- Manufacturing & Warehouse Department Permissions
-- Add all Manufacturing & Warehouse permissions to the permissions table

INSERT INTO permissions (resource, action, description) VALUES
-- Manufacturing & Warehouse Module Overview
('manufacturing', 'view', 'View manufacturing & warehouse module'),

-- Production Schedules
('manufacturing.schedules', 'view', 'View production schedules'),
('manufacturing.schedules', 'create', 'Create production schedules'),
('manufacturing.schedules', 'edit', 'Edit production schedules'),
('manufacturing.schedules', 'delete', 'Delete production schedules'),
('manufacturing.schedules', 'approve', 'Approve production schedules'),

-- Work Orders
('manufacturing.work_orders', 'view', 'View work orders'),
('manufacturing.work_orders', 'create', 'Create work orders'),
('manufacturing.work_orders', 'edit', 'Edit work orders'),
('manufacturing.work_orders', 'delete', 'Delete work orders'),
('manufacturing.work_orders', 'approve', 'Approve work orders'),
('manufacturing.work_orders', 'assign', 'Assign work orders'),

-- Production Runs
('manufacturing.production_runs', 'view', 'View production runs'),
('manufacturing.production_runs', 'create', 'Create production runs'),
('manufacturing.production_runs', 'edit', 'Edit production runs'),
('manufacturing.production_runs', 'delete', 'Delete production runs'),
('manufacturing.production_runs', 'start', 'Start production runs'),
('manufacturing.production_runs', 'complete', 'Complete production runs'),

-- Raw Materials Inventory
('manufacturing.raw_materials', 'view', 'View raw materials inventory'),
('manufacturing.raw_materials', 'create', 'Add raw materials'),
('manufacturing.raw_materials', 'edit', 'Edit raw materials'),
('manufacturing.raw_materials', 'delete', 'Delete raw materials'),
('manufacturing.raw_materials', 'adjust', 'Adjust raw material stock'),

-- Work-in-Progress
('manufacturing.wip', 'view', 'View work-in-progress'),
('manufacturing.wip', 'create', 'Create WIP records'),
('manufacturing.wip', 'edit', 'Edit WIP records'),
('manufacturing.wip', 'delete', 'Delete WIP records'),

-- Finished Goods
('manufacturing.finished_goods', 'view', 'View finished goods'),
('manufacturing.finished_goods', 'create', 'Add finished goods'),
('manufacturing.finished_goods', 'edit', 'Edit finished goods'),
('manufacturing.finished_goods', 'delete', 'Delete finished goods'),
('manufacturing.finished_goods', 'adjust', 'Adjust finished goods stock'),

-- Warehouse Locations
('manufacturing.warehouse_locations', 'view', 'View warehouse locations'),
('manufacturing.warehouse_locations', 'create', 'Create warehouse locations'),
('manufacturing.warehouse_locations', 'edit', 'Edit warehouse locations'),
('manufacturing.warehouse_locations', 'delete', 'Delete warehouse locations'),

-- Stock Movements
('manufacturing.stock_movements', 'view', 'View stock movements'),
('manufacturing.stock_movements', 'create', 'Create stock movements'),
('manufacturing.stock_movements', 'edit', 'Edit stock movements'),
('manufacturing.stock_movements', 'delete', 'Delete stock movements'),

-- Goods Receiving
('manufacturing.goods_receiving', 'view', 'View goods receiving'),
('manufacturing.goods_receiving', 'create', 'Create receiving records'),
('manufacturing.goods_receiving', 'edit', 'Edit receiving records'),
('manufacturing.goods_receiving', 'delete', 'Delete receiving records'),
('manufacturing.goods_receiving', 'complete', 'Complete receiving'),

-- Dispatch & Shipments
('manufacturing.dispatch', 'view', 'View dispatch shipments'),
('manufacturing.dispatch', 'create', 'Create dispatch shipments'),
('manufacturing.dispatch', 'edit', 'Edit dispatch shipments'),
('manufacturing.dispatch', 'delete', 'Delete dispatch shipments'),
('manufacturing.dispatch', 'ship', 'Ship orders'),
('manufacturing.dispatch', 'track', 'Track shipments'),

-- Quality Inspections
('manufacturing.quality', 'view', 'View quality inspections'),
('manufacturing.quality', 'create', 'Create quality inspections'),
('manufacturing.quality', 'edit', 'Edit quality inspections'),
('manufacturing.quality', 'delete', 'Delete quality inspections'),
('manufacturing.quality', 'approve', 'Approve inspections'),
('manufacturing.quality', 'reject', 'Reject inspections'),

-- Equipment
('manufacturing.equipment', 'view', 'View equipment'),
('manufacturing.equipment', 'create', 'Add equipment'),
('manufacturing.equipment', 'edit', 'Edit equipment'),
('manufacturing.equipment', 'delete', 'Delete equipment'),

-- Equipment Maintenance
('manufacturing.maintenance', 'view', 'View equipment maintenance'),
('manufacturing.maintenance', 'create', 'Create maintenance requests'),
('manufacturing.maintenance', 'edit', 'Edit maintenance records'),
('manufacturing.maintenance', 'delete', 'Delete maintenance records'),
('manufacturing.maintenance', 'complete', 'Complete maintenance'),

-- Workforce Shifts
('manufacturing.shifts', 'view', 'View workforce shifts'),
('manufacturing.shifts', 'create', 'Create shifts'),
('manufacturing.shifts', 'edit', 'Edit shifts'),
('manufacturing.shifts', 'delete', 'Delete shifts'),
('manufacturing.shifts', 'assign', 'Assign employees to shifts'),

-- Safety & Compliance
('manufacturing.safety', 'view', 'View safety & compliance'),
('manufacturing.safety', 'create', 'Create safety records'),
('manufacturing.safety', 'edit', 'Edit safety records'),
('manufacturing.safety', 'delete', 'Delete safety records'),
('manufacturing.safety', 'approve', 'Approve compliance'),

-- Incidents
('manufacturing.incidents', 'view', 'View incidents'),
('manufacturing.incidents', 'create', 'Report incidents'),
('manufacturing.incidents', 'edit', 'Edit incidents'),
('manufacturing.incidents', 'delete', 'Delete incidents'),
('manufacturing.incidents', 'resolve', 'Resolve incidents'),

-- Process Waste
('manufacturing.waste', 'view', 'View process waste'),
('manufacturing.waste', 'create', 'Record waste'),
('manufacturing.waste', 'edit', 'Edit waste records'),
('manufacturing.waste', 'delete', 'Delete waste records'),

-- Manufacturing Documents
('manufacturing.documents', 'view', 'View manufacturing documents'),
('manufacturing.documents', 'create', 'Create documents'),
('manufacturing.documents', 'edit', 'Edit documents'),
('manufacturing.documents', 'delete', 'Delete documents'),

-- Manufacturing Reports
('manufacturing.reports', 'view', 'View manufacturing reports'),
('manufacturing.reports', 'export', 'Export manufacturing reports')
ON CONFLICT (resource, action) DO NOTHING;

-- Create Manufacturing Manager role if it doesn't exist
INSERT INTO roles (name, description, is_system, company_id)
SELECT 'Manufacturing Manager', 'Manufacturing & Warehouse department manager with full access', false, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM roles
  WHERE name = 'Manufacturing Manager' AND company_id IS NULL
);

-- Grant all Manufacturing permissions to Manufacturing Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Manufacturing Manager'),
  id
FROM permissions
WHERE resource LIKE 'manufacturing%'
ON CONFLICT DO NOTHING;

-- Grant Manufacturing permissions to Company Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Company Admin'),
  id
FROM permissions
WHERE resource LIKE 'manufacturing%'
ON CONFLICT DO NOTHING;

-- Grant Manufacturing permissions to Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Super Admin'),
  id
FROM permissions
WHERE resource LIKE 'manufacturing%'
ON CONFLICT DO NOTHING;
