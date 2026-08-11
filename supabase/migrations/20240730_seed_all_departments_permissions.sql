-- Migration: Seed all department permissions and manager roles
-- This creates a comprehensive permission system for all departments
-- Each department will have a Manager role with appropriate permissions

-- Step 1: Create all department permissions
-- These are the base permissions that will be assigned to department managers

-- Dashboard (shared)
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('dashboard', 'view', 'View dashboard', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Human Resources
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('hr', 'view', 'View Human Resources module', NOW()),
  ('hr.employees', 'view', 'View employees', NOW()),
  ('hr.employees', 'create', 'Create employees', NOW()),
  ('hr.employees', 'update', 'Update employees', NOW()),
  ('hr.employees', 'delete', 'Delete employees', NOW()),
  ('hr.departments', 'view', 'View departments', NOW()),
  ('hr.attendance', 'view', 'View attendance', NOW()),
  ('hr.leave', 'view', 'View leave', NOW()),
  ('hr.leave', 'create', 'Create leave requests', NOW()),
  ('hr.leave', 'approve', 'Approve leave requests', NOW()),
  ('hr.payroll', 'view', 'View payroll', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Finance & Accounts
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('finance', 'view', 'View Finance module', NOW()),
  ('finance.accounts', 'view', 'View accounts', NOW()),
  ('finance.expenses', 'view', 'View expenses', NOW()),
  ('finance.expenses', 'create', 'Create expenses', NOW()),
  ('finance.expenses', 'approve', 'Approve expenses', NOW()),
  ('finance.budgets', 'view', 'View budgets', NOW()),
  ('finance.journal', 'view', 'View journal entries', NOW()),
  ('finance.payroll', 'view', 'View payroll', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Inventory
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('inventory', 'view', 'View Inventory module', NOW()),
  ('inventory.warehouses', 'view', 'View warehouses', NOW()),
  ('inventory.products', 'view', 'View products', NOW()),
  ('inventory.products', 'create', 'Create products', NOW()),
  ('inventory.products', 'update', 'Update products', NOW()),
  ('inventory.stock', 'view', 'View stock', NOW()),
  ('inventory.categories', 'view', 'View categories', NOW()),
  ('inventory.movements', 'view', 'View stock movements', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Procurement
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('procurement', 'view', 'View Procurement module', NOW()),
  ('procurement.vendors', 'view', 'View vendors', NOW()),
  ('procurement.vendors', 'create', 'Create vendors', NOW()),
  ('procurement.requests', 'view', 'View purchase requests', NOW()),
  ('procurement.requests', 'create', 'Create purchase requests', NOW()),
  ('procurement.requests', 'approve', 'Approve purchase requests', NOW()),
  ('procurement.orders', 'view', 'View purchase orders', NOW()),
  ('procurement.orders', 'create', 'Create purchase orders', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Sales & CRM
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('crm', 'view', 'View Sales & CRM module', NOW()),
  ('crm.leads', 'view', 'View leads', NOW()),
  ('crm.leads', 'create', 'Create leads', NOW()),
  ('crm.opportunities', 'view', 'View opportunities', NOW()),
  ('crm.customers', 'view', 'View customers', NOW()),
  ('crm.customers', 'create', 'Create customers', NOW()),
  ('crm.orders', 'view', 'View sales orders', NOW()),
  ('crm.invoices', 'view', 'View invoices', NOW()),
  ('crm.invoices', 'create', 'Create invoices', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Legal
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('legal', 'view', 'View Legal module', NOW()),
  ('legal.contracts', 'view', 'View contracts', NOW()),
  ('legal.contracts', 'create', 'Create contracts', NOW()),
  ('legal.compliance', 'view', 'View compliance', NOW()),
  ('legal.documents', 'view', 'View legal documents', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Administration
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('administration', 'view', 'View Administration module', NOW()),
  ('facilities', 'view', 'View Facilities section', NOW()),
  ('facilities.maintenance', 'view', 'View maintenance requests', NOW()),
  ('facilities.maintenance', 'create', 'Create maintenance requests', NOW()),
  ('facilities.maintenance', 'update', 'Update maintenance requests', NOW()),
  ('facilities.maintenance', 'delete', 'Delete maintenance requests', NOW()),
  ('facilities.utilities', 'view', 'View utilities', NOW()),
  ('facilities.cleaning', 'view', 'View cleaning', NOW()),
  ('facilities.relocation', 'view', 'View relocation', NOW()),
  ('facilities.meeting_rooms', 'view', 'View meeting rooms', NOW()),
  ('assets', 'view', 'View Assets section', NOW()),
  ('assets.furniture', 'view', 'View furniture', NOW()),
  ('assets.equipment', 'view', 'View equipment', NOW()),
  ('assets.vehicles', 'view', 'View vehicles', NOW()),
  ('assets.assignment', 'view', 'View assignments', NOW()),
  ('assets.maintenance', 'view', 'View asset maintenance', NOW()),
  ('assets.movement', 'view', 'View asset movement history', NOW()),
  ('assets', 'create', 'Create assets', NOW()),
  ('assets', 'update', 'Update assets', NOW()),
  ('assets', 'delete', 'Delete assets', NOW()),
  ('reception', 'view', 'View Reception section', NOW()),
  ('reception.visitors', 'view', 'View visitors', NOW()),
  ('reception.courier', 'view', 'View courier', NOW()),
  ('reception.incoming_mail', 'view', 'View incoming mail', NOW()),
  ('reception.outgoing_mail', 'view', 'View outgoing mail', NOW()),
  ('supplies', 'view', 'View Office Supplies section', NOW()),
  ('supplies.inventory', 'view', 'View inventory', NOW()),
  ('supplies.requests', 'view', 'View requests', NOW()),
  ('supplies.issuance', 'view', 'View issuance', NOW()),
  ('vendors', 'view', 'View Vendors section', NOW()),
  ('vendors.cleaning', 'view', 'View cleaning vendors', NOW()),
  ('vendors.maintenance', 'view', 'View maintenance vendors', NOW()),
  ('vendors.internet', 'view', 'View internet providers', NOW()),
  ('vendors.electricity', 'view', 'View electricity providers', NOW()),
  ('vendors.quotations', 'view', 'View vendor quotations', NOW()),
  ('vendors.performance', 'view', 'View vendor performance', NOW()),
  ('documents', 'view', 'View Documents section', NOW()),
  ('documents.policies', 'view', 'View policies', NOW()),
  ('documents.letters', 'view', 'View letters', NOW()),
  ('documents.minutes', 'view', 'View meeting minutes', NOW()),
  ('documents.archive', 'view', 'View archive', NOW()),
  ('attendance', 'view', 'View Staff Attendance section', NOW()),
  ('attendance.daily', 'view', 'View daily attendance', NOW()),
  ('attendance.clock_in_out', 'view', 'View clock in/out', NOW()),
  ('attendance.lateness', 'view', 'View lateness register', NOW()),
  ('attendance.absence', 'view', 'View absence register', NOW()),
  ('attendance.id_compliance', 'view', 'View ID card compliance', NOW()),
  ('attendance.reports', 'view', 'View attendance reports', NOW()),
  ('inspections', 'view', 'View Inspections section', NOW()),
  ('inspections.cleanliness', 'view', 'View cleanliness inspections', NOW()),
  ('inspections.restroom', 'view', 'View restroom inspections', NOW()),
  ('inspections.workspace', 'view', 'View workspace inspections', NOW()),
  ('inspections.reception', 'view', 'View reception inspections', NOW()),
  ('inspections.meeting_rooms', 'view', 'View meeting room inspections', NOW()),
  ('inspections.issues', 'view', 'View inspection issues', NOW()),
  ('fuel', 'view', 'View Fuel Management section', NOW()),
  ('fuel.records', 'view', 'View fuel records', NOW()),
  ('fuel.drivers', 'view', 'View driver fuel usage', NOW()),
  ('fuel.vehicles', 'view', 'View vehicle fuel history', NOW()),
  ('drivers', 'view', 'View Drivers section', NOW()),
  ('drivers.list', 'view', 'View drivers list', NOW()),
  ('drivers.trips', 'view', 'View driver trips', NOW()),
  ('drivers.licenses', 'view', 'View driver licenses', NOW()),
  ('purchase_requests', 'view', 'View Purchase Requests section', NOW()),
  ('purchase_requests.list', 'view', 'View all purchase requests', NOW()),
  ('purchase_requests.pending', 'view', 'View pending purchase requests', NOW()),
  ('purchase_requests.my', 'view', 'View my purchase requests', NOW()),
  ('purchase_requests.approvals', 'view', 'View purchase request approvals', NOW()),
  ('purchase_requests.reports', 'view', 'View purchase request reports', NOW()),
  ('admin_reports', 'view', 'View Administration reports', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Operations
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('operations', 'view', 'View Operations module', NOW()),
  ('operations.projects', 'view', 'View projects', NOW()),
  ('operations.projects', 'create', 'Create projects', NOW()),
  ('operations.tasks', 'view', 'View tasks', NOW()),
  ('operations.tasks', 'create', 'Create tasks', NOW()),
  ('operations.work_orders', 'view', 'View work orders', NOW()),
  ('operations.work_orders', 'create', 'Create work orders', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Information Technology
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('it', 'view', 'View IT module', NOW()),
  ('it.users', 'view', 'View IT users', NOW()),
  ('it.roles', 'view', 'View IT roles', NOW()),
  ('it.permissions', 'view', 'View IT permissions', NOW()),
  ('it.settings', 'view', 'View IT settings', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Logistics
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('logistics', 'view', 'View Logistics module', NOW()),
  ('logistics.deliveries', 'view', 'View deliveries', NOW()),
  ('logistics.deliveries', 'create', 'Create deliveries', NOW()),
  ('logistics.fleet', 'view', 'View fleet', NOW()),
  ('logistics.dispatch', 'view', 'View dispatch', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Quality Assurance & Quality Control
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('qa_qc', 'view', 'View QA/QC module', NOW()),
  ('qa_qc.inspections', 'view', 'View inspections', NOW()),
  ('qa_qc.inspections', 'create', 'Create inspections', NOW()),
  ('qa_qc.reports', 'view', 'View QC reports', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Reports
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('reports', 'view', 'View reports', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Settings (limited for department managers)
INSERT INTO permissions (resource, action, description, created_at)
VALUES 
  ('settings', 'view', 'View settings', NOW()),
  ('settings.company', 'view', 'View company settings', NOW()),
  ('settings.departments', 'view', 'View departments', NOW()),
  ('settings.branches', 'view', 'View branches', NOW())
ON CONFLICT (resource, action) DO NOTHING;

-- Step 2: Create department manager roles
-- These are generic roles that can be assigned to any company
-- Note: company_id is NULL to make these roles available to all companies

-- Check if roles table allows NULL company_id, if not we'll need to handle differently
-- For now, let's use INSERT with ON CONFLICT on (name, company_id) if that's the constraint

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('HR Manager', 'Full access to Human Resources module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Finance Manager', 'Full access to Finance module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Inventory Manager', 'Full access to Inventory module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Procurement Manager', 'Full access to Procurement module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Sales Manager', 'Full access to Sales & CRM module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Legal Manager', 'Full access to Legal module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Administration Manager', 'Full access to Administration module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Operations Manager', 'Full access to Operations module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('IT Manager', 'Full access to IT module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('Logistics Manager', 'Full access to Logistics module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

INSERT INTO roles (name, description, is_system, company_id, created_at, updated_at)
VALUES ('QA/QC Manager', 'Full access to Quality Assurance module', false, NULL, NOW(), NOW())
ON CONFLICT (name, company_id) DO NOTHING;

-- Step 3: Assign permissions to department manager roles

-- HR Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'HR Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'hr' OR
  p.resource LIKE 'hr.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Finance Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Finance Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'finance' OR
  p.resource LIKE 'finance.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Inventory Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Inventory Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'inventory' OR
  p.resource LIKE 'inventory.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Procurement Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Procurement Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'procurement' OR
  p.resource LIKE 'procurement.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Sales Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Sales Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'crm' OR
  p.resource LIKE 'crm.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Legal Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Legal Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'legal' OR
  p.resource LIKE 'legal.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Administration Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administration Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'administration' OR
  p.resource = 'facilities' OR
  p.resource LIKE 'facilities.%' OR
  p.resource = 'assets' OR
  p.resource LIKE 'assets.%' OR
  p.resource = 'reception' OR
  p.resource LIKE 'reception.%' OR
  p.resource = 'supplies' OR
  p.resource LIKE 'supplies.%' OR
  p.resource = 'vendors' OR
  p.resource LIKE 'vendors.%' OR
  p.resource = 'documents' OR
  p.resource LIKE 'documents.%' OR
  p.resource = 'attendance' OR
  p.resource LIKE 'attendance.%' OR
  p.resource = 'inspections' OR
  p.resource LIKE 'inspections.%' OR
  p.resource = 'fuel' OR
  p.resource LIKE 'fuel.%' OR
  p.resource = 'drivers' OR
  p.resource LIKE 'drivers.%' OR
  p.resource = 'purchase_requests' OR
  p.resource LIKE 'purchase_requests.%' OR
  p.resource = 'admin_reports' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Operations Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Operations Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'operations' OR
  p.resource LIKE 'operations.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- IT Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'IT Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'it' OR
  p.resource LIKE 'it.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Logistics Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Logistics Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'logistics' OR
  p.resource LIKE 'logistics.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- QA/QC Manager permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'QA/QC Manager'
AND (
  p.resource = 'dashboard' OR
  p.resource = 'qa_qc' OR
  p.resource LIKE 'qa_qc.%' OR
  p.resource = 'settings' OR
  p.resource LIKE 'settings.%'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id 
  AND rp.permission_id = p.id
);

-- Verification query
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.name IN ('HR Manager', 'Finance Manager', 'Inventory Manager', 'Procurement Manager', 'Sales Manager', 'Legal Manager', 'Administration Manager', 'Operations Manager', 'IT Manager', 'Logistics Manager', 'QA/QC Manager')
GROUP BY r.name
ORDER BY r.name;
