/*
# ERP RBAC Schema - Role Based Access Control

## New Tables
1. `roles` - Role definitions
2. `permissions` - Permission definitions
3. `role_permissions` - Role-permission mapping
4. `user_roles` - User-role assignments
*/

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(resource, action)
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- RLS Policies for Roles
DROP POLICY IF EXISTS "company_select_roles" ON roles;
CREATE POLICY "company_select_roles" ON roles FOR SELECT
TO authenticated USING (company_id = user_company_id() OR is_system = true OR company_id IS NULL);

DROP POLICY IF EXISTS "company_insert_roles" ON roles;
CREATE POLICY "company_insert_roles" ON roles FOR INSERT
TO authenticated WITH CHECK (company_id = user_company_id());

DROP POLICY IF EXISTS "company_update_roles" ON roles;
CREATE POLICY "company_update_roles" ON roles FOR UPDATE
TO authenticated USING (company_id = user_company_id() OR is_system = true) WITH CHECK (company_id = user_company_id() OR is_system = true);

DROP POLICY IF EXISTS "company_delete_roles" ON roles;
CREATE POLICY "company_delete_roles" ON roles FOR DELETE
TO authenticated USING (company_id = user_company_id() AND is_system = false);

-- RLS Policies for Permissions (system-wide, read-only for authenticated)
DROP POLICY IF EXISTS "authenticated_select_permissions" ON permissions;
CREATE POLICY "authenticated_select_permissions" ON permissions FOR SELECT
TO authenticated USING (true);

-- RLS Policies for Role Permissions
DROP POLICY IF EXISTS "company_select_role_permissions" ON role_permissions;
CREATE POLICY "company_select_role_permissions" ON role_permissions FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM roles WHERE roles.id = role_permissions.role_id
    AND (roles.company_id = user_company_id() OR roles.is_system = true)
  )
);

DROP POLICY IF EXISTS "company_insert_role_permissions" ON role_permissions;
CREATE POLICY "company_insert_role_permissions" ON role_permissions FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM roles WHERE roles.id = role_permissions.role_id
    AND roles.company_id = user_company_id()
  )
);

DROP POLICY IF EXISTS "company_delete_role_permissions" ON role_permissions;
CREATE POLICY "company_delete_role_permissions" ON role_permissions FOR DELETE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM roles WHERE roles.id = role_permissions.role_id
    AND roles.company_id = user_company_id()
  )
);

-- RLS Policies for User Roles
DROP POLICY IF EXISTS "users_select_own_roles" ON user_roles;
CREATE POLICY "users_select_own_roles" ON user_roles FOR SELECT
TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_roles" ON user_roles;
CREATE POLICY "users_insert_own_roles" ON user_roles FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "users_delete_own_roles" ON user_roles;
CREATE POLICY "users_delete_own_roles" ON user_roles FOR DELETE
TO authenticated USING (user_id = auth.uid());

-- Seed Default Permissions
INSERT INTO permissions (resource, action, description) VALUES
-- Dashboard
('dashboard', 'view', 'View dashboard'),

-- HR Module
('hr', 'view', 'View HR module'),
('hr.employees', 'view', 'View employees'),
('hr.employees', 'create', 'Create employees'),
('hr.employees', 'edit', 'Edit employees'),
('hr.employees', 'delete', 'Delete employees'),
('hr.leave', 'view', 'View leave requests'),
('hr.leave', 'create', 'Create leave requests'),
('hr.leave', 'approve', 'Approve leave requests'),
('hr.leave', 'reject', 'Reject leave requests'),
('hr.attendance', 'view', 'View attendance'),
('hr.attendance', 'edit', 'Edit attendance'),
('hr.payroll', 'view', 'View payroll'),
('hr.payroll', 'manage', 'Manage payroll'),
('hr.performance', 'view', 'View performance'),
('hr.performance', 'edit', 'Edit performance'),
('hr.recruitment', 'view', 'View recruitment'),
('hr.recruitment', 'manage', 'Manage recruitment'),
('hr.training', 'view', 'View training'),
('hr.training', 'manage', 'Manage training'),

-- Finance Module
('finance', 'view', 'View finance module'),
('finance.ledger', 'view', 'View general ledger'),
('finance.ledger', 'manage', 'Manage general ledger'),
('finance.invoices', 'view', 'View invoices'),
('finance.invoices', 'create', 'Create invoices'),
('finance.invoices', 'edit', 'Edit invoices'),
('finance.invoices', 'delete', 'Delete invoices'),
('finance.expenses', 'view', 'View expenses'),
('finance.expenses', 'create', 'Create expenses'),
('finance.expenses', 'edit', 'Edit expenses'),
('finance.expenses', 'approve', 'Approve expenses'),
('finance.budgets', 'view', 'View budgets'),
('finance.budgets', 'create', 'Create budgets'),
('finance.budgets', 'edit', 'Edit budgets'),
('finance.receivables', 'view', 'View accounts receivable'),
('finance.receivables', 'manage', 'Manage accounts receivable'),
('finance.payables', 'view', 'View accounts payable'),
('finance.payables', 'manage', 'Manage accounts payable'),
('finance.reports', 'view', 'View financial reports'),
('finance.reports', 'export', 'Export financial reports'),

-- CRM Module
('crm', 'view', 'View CRM module'),
('crm.leads', 'view', 'View leads'),
('crm.leads', 'create', 'Create leads'),
('crm.leads', 'edit', 'Edit leads'),
('crm.leads', 'delete', 'Delete leads'),
('crm.pipeline', 'view', 'View sales pipeline'),
('crm.pipeline', 'manage', 'Manage sales pipeline'),
('crm.customers', 'view', 'View customers'),
('crm.customers', 'create', 'Create customers'),
('crm.customers', 'edit', 'Edit customers'),
('crm.customers', 'delete', 'Delete customers'),
('crm.orders', 'view', 'View sales orders'),
('crm.orders', 'create', 'Create sales orders'),
('crm.orders', 'edit', 'Edit sales orders'),
('crm.contacts', 'view', 'View contacts'),
('crm.contacts', 'create', 'Create contacts'),
('crm.contacts', 'edit', 'Edit contacts'),

-- Procurement Module
('procurement', 'view', 'View procurement module'),
('procurement.vendors', 'view', 'View vendors'),
('procurement.vendors', 'create', 'Create vendors'),
('procurement.vendors', 'edit', 'Edit vendors'),
('procurement.vendors', 'delete', 'Delete vendors'),
('procurement.requests', 'view', 'View purchase requests'),
('procurement.requests', 'create', 'Create purchase requests'),
('procurement.requests', 'edit', 'Edit purchase requests'),
('procurement.requests', 'approve', 'Approve purchase requests'),
('procurement.orders', 'view', 'View purchase orders'),
('procurement.orders', 'create', 'Create purchase orders'),
('procurement.orders', 'edit', 'Edit purchase orders'),
('procurement.orders', 'approve', 'Approve purchase orders'),

-- Inventory Module
('inventory', 'view', 'View inventory module'),
('inventory.products', 'view', 'View products'),
('inventory.products', 'create', 'Create products'),
('inventory.products', 'edit', 'Edit products'),
('inventory.products', 'delete', 'Delete products'),
('inventory.categories', 'view', 'View categories'),
('inventory.categories', 'create', 'Create categories'),
('inventory.categories', 'edit', 'Edit categories'),
('inventory.warehouses', 'view', 'View warehouses'),
('inventory.warehouses', 'create', 'Create warehouses'),
('inventory.warehouses', 'edit', 'Edit warehouses'),
('inventory.movements', 'view', 'View stock movements'),
('inventory.movements', 'create', 'Create stock movements'),

-- Projects Module
('projects', 'view', 'View projects module'),
('projects.list', 'view', 'View projects'),
('projects.list', 'create', 'Create projects'),
('projects.list', 'edit', 'Edit projects'),
('projects.list', 'delete', 'Delete projects'),
('projects.tasks', 'view', 'View tasks'),
('projects.tasks', 'create', 'Create tasks'),
('projects.tasks', 'edit', 'Edit tasks'),
('projects.tasks', 'delete', 'Delete tasks'),
('projects.kanban', 'view', 'View kanban board'),
('projects.kanban', 'manage', 'Manage kanban board'),

-- Administration Module
('administration', 'view', 'View administration module'),
('administration.assets', 'view', 'View assets'),
('administration.assets', 'create', 'Create assets'),
('administration.assets', 'edit', 'Edit assets'),
('administration.assets', 'delete', 'Delete assets'),
('administration.fleet', 'view', 'View fleet'),
('administration.fleet', 'create', 'Create fleet vehicles'),
('administration.fleet', 'edit', 'Edit fleet vehicles'),
('administration.fleet', 'delete', 'Delete fleet vehicles'),
('administration.visitors', 'view', 'View visitors'),
('administration.visitors', 'create', 'Create visitors'),
('administration.visitors', 'edit', 'Edit visitors'),
('administration.work_orders', 'view', 'View work orders'),
('administration.work_orders', 'create', 'Create work orders'),
('administration.work_orders', 'edit', 'Edit work orders'),
('administration.work_orders', 'approve', 'Approve work orders'),

-- Support Module
('support', 'view', 'View support module'),
('support.tickets', 'view', 'View tickets'),
('support.tickets', 'create', 'Create tickets'),
('support.tickets', 'edit', 'Edit tickets'),
('support.tickets', 'delete', 'Delete tickets'),
('support.knowledge', 'view', 'View knowledge base'),
('support.knowledge', 'create', 'Create knowledge articles'),
('support.knowledge', 'edit', 'Edit knowledge articles'),

-- Reports
('reports', 'view', 'View reports'),
('reports.export', 'Export reports'),
('reports.schedule', 'Schedule reports'),

-- Settings
('settings', 'view', 'View settings'),
('settings.company', 'edit', 'Edit company settings'),
('settings.users', 'view', 'View users'),
('settings.users', 'create', 'Create users'),
('settings.users', 'edit', 'Edit users'),
('settings.users', 'delete', 'Delete users'),
('settings.departments', 'view', 'View departments'),
('settings.departments', 'create', 'Create departments'),
('settings.departments', 'edit', 'Edit departments'),
('settings.departments', 'delete', 'Delete departments'),
('settings.branches', 'view', 'View branches'),
('settings.branches', 'create', 'Create branches'),
('settings.branches', 'edit', 'Edit branches'),
('settings.branches', 'delete', 'Delete branches'),
('settings.notifications', 'edit', 'Edit notification settings'),
('settings.security', 'edit', 'Edit security settings'),
('settings.billing', 'view', 'View billing'),
('settings.billing', 'manage', 'Manage billing'),

-- Role & Permission Management
('roles', 'view', 'View roles'),
('roles', 'create', 'Create roles'),
('roles', 'edit', 'Edit roles'),
('roles', 'delete', 'Delete roles'),
('permissions', 'view', 'View permissions'),
('permissions', 'assign', 'Assign permissions'),

-- Administration Module Permissions
('facilities', 'view', 'View facilities module'),
('facilities.maintenance', 'view', 'View maintenance requests'),
('facilities.maintenance', 'create', 'Create maintenance requests'),
('facilities.maintenance', 'edit', 'Edit maintenance requests'),
('facilities.maintenance', 'delete', 'Delete maintenance requests'),
('facilities.utilities', 'view', 'View utilities'),
('facilities.utilities', 'create', 'Create utilities'),
('facilities.utilities', 'edit', 'Edit utilities'),
('facilities.utilities', 'delete', 'Delete utilities'),
('facilities.cleaning', 'view', 'View cleaning schedule'),
('facilities.cleaning', 'create', 'Create cleaning schedule'),
('facilities.cleaning', 'edit', 'Edit cleaning schedule'),
('facilities.cleaning', 'delete', 'Delete cleaning schedule'),
('facilities.relocation', 'view', 'View office relocation'),
('facilities.relocation', 'create', 'Create office relocation'),
('facilities.relocation', 'edit', 'Edit office relocation'),
('facilities.relocation', 'delete', 'Delete office relocation'),
('facilities.meeting_rooms', 'view', 'View meeting rooms'),
('facilities.meeting_rooms', 'create', 'Create meeting rooms'),
('facilities.meeting_rooms', 'edit', 'Edit meeting rooms'),
('facilities.meeting_rooms', 'delete', 'Delete meeting rooms'),
('assets', 'view', 'View assets module'),
('assets.furniture', 'view', 'View furniture'),
('assets.furniture', 'create', 'Create furniture'),
('assets.furniture', 'edit', 'Edit furniture'),
('assets.furniture', 'delete', 'Delete furniture'),
('assets.equipment', 'view', 'View equipment'),
('assets.equipment', 'create', 'Create equipment'),
('assets.equipment', 'edit', 'Edit equipment'),
('assets.equipment', 'delete', 'Delete equipment'),
('assets.vehicles', 'view', 'View vehicles'),
('assets.vehicles', 'create', 'Create vehicles'),
('assets.vehicles', 'edit', 'Edit vehicles'),
('assets.vehicles', 'delete', 'Delete vehicles'),
('assets.assignment', 'view', 'View asset assignments'),
('assets.assignment', 'create', 'Create asset assignments'),
('assets.assignment', 'edit', 'Edit asset assignments'),
('assets.assignment', 'delete', 'Delete asset assignments'),
('assets.maintenance', 'view', 'View asset maintenance'),
('assets.maintenance', 'create', 'Create asset maintenance'),
('assets.maintenance', 'edit', 'Edit asset maintenance'),
('assets.maintenance', 'delete', 'Delete asset maintenance'),
('reception', 'view', 'View reception module'),
('reception.visitors', 'view', 'View visitors'),
('reception.visitors', 'create', 'Create visitors'),
('reception.visitors', 'edit', 'Edit visitors'),
('reception.visitors', 'delete', 'Delete visitors'),
('reception.courier', 'view', 'View courier register'),
('reception.courier', 'create', 'Create courier register'),
('reception.courier', 'edit', 'Edit courier register'),
('reception.courier', 'delete', 'Delete courier register'),
('reception.incoming_mail', 'view', 'View incoming mail'),
('reception.incoming_mail', 'create', 'Create incoming mail'),
('reception.incoming_mail', 'edit', 'Edit incoming mail'),
('reception.incoming_mail', 'delete', 'Delete incoming mail'),
('reception.outgoing_mail', 'view', 'View outgoing mail'),
('reception.outgoing_mail', 'create', 'Create outgoing mail'),
('reception.outgoing_mail', 'edit', 'Edit outgoing mail'),
('reception.outgoing_mail', 'delete', 'Delete outgoing mail'),
('supplies', 'view', 'View office supplies module'),
('supplies.inventory', 'view', 'View supplies inventory'),
('supplies.inventory', 'create', 'Create supplies inventory'),
('supplies.inventory', 'edit', 'Edit supplies inventory'),
('supplies.inventory', 'delete', 'Delete supplies inventory'),
('supplies.requests', 'view', 'View supply requests'),
('supplies.requests', 'create', 'Create supply requests'),
('supplies.requests', 'edit', 'Edit supply requests'),
('supplies.requests', 'delete', 'Delete supply requests'),
('supplies.issuance', 'view', 'View supply issuance'),
('supplies.issuance', 'create', 'Create supply issuance'),
('supplies.issuance', 'edit', 'Edit supply issuance'),
('supplies.issuance', 'delete', 'Delete supply issuance'),
('vendors', 'view', 'View vendor management module'),
('vendors.cleaning', 'view', 'View cleaning vendors'),
('vendors.cleaning', 'create', 'Create cleaning vendors'),
('vendors.cleaning', 'edit', 'Edit cleaning vendors'),
('vendors.cleaning', 'delete', 'Delete cleaning vendors'),
('vendors.maintenance', 'view', 'View maintenance vendors'),
('vendors.maintenance', 'create', 'Create maintenance vendors'),
('vendors.maintenance', 'edit', 'Edit maintenance vendors'),
('vendors.maintenance', 'delete', 'Delete maintenance vendors'),
('vendors.internet', 'view', 'View internet providers'),
('vendors.internet', 'create', 'Create internet providers'),
('vendors.internet', 'edit', 'Edit internet providers'),
('vendors.internet', 'delete', 'Delete internet providers'),
('vendors.electricity', 'view', 'View electricity providers'),
('vendors.electricity', 'create', 'Create electricity providers'),
('vendors.electricity', 'edit', 'Edit electricity providers'),
('vendors.electricity', 'delete', 'Delete electricity providers'),
('documents', 'view', 'View documents module'),
('documents.policies', 'view', 'View company policies'),
('documents.policies', 'create', 'Create company policies'),
('documents.policies', 'edit', 'Edit company policies'),
('documents.policies', 'delete', 'Delete company policies'),
('documents.letters', 'view', 'View letters'),
('documents.letters', 'create', 'Create letters'),
('documents.letters', 'edit', 'Edit letters'),
('documents.letters', 'delete', 'Delete letters'),
('documents.minutes', 'view', 'View meeting minutes'),
('documents.minutes', 'create', 'Create meeting minutes'),
('documents.minutes', 'edit', 'Edit meeting minutes'),
('documents.minutes', 'delete', 'Delete meeting minutes'),
('documents.archive', 'view', 'View document archive'),
('documents.archive', 'create', 'Create document archive'),
('documents.archive', 'edit', 'Edit document archive'),
('documents.archive', 'delete', 'Delete document archive')
ON CONFLICT (resource, action) DO NOTHING;

-- Seed System Roles (is_system = true for platform-wide roles)
INSERT INTO roles (name, description, is_system) VALUES
('Super Admin', 'Full system access with all permissions', true),
('Company Admin', 'Full company access with all permissions', false),
('HR Manager', 'Manage HR module and employee data', false),
('Finance Manager', 'Manage finance module and financial data', false),
('Administration Manager', 'Manage administration and facilities', false),
('Procurement Officer', 'Manage procurement and vendors', false),
('Inventory Manager', 'Manage inventory and stock', false),
('Sales Manager', 'Manage CRM and sales operations', false),
('Project Manager', 'Manage projects and tasks', false),
('Employee', 'Basic employee access', false),
('Viewer', 'Read-only access to assigned modules', false)
ON CONFLICT (name) DO NOTHING;

-- Assign Permissions to Super Admin (All permissions)
DO $$
DECLARE
  role_id uuid;
  perm_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Super Admin' AND is_system = true;
  
  IF role_id IS NOT NULL THEN
    FOR perm_id IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (role_id, perm_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Assign Permissions to Company Admin (All except system-level)
DO $$
DECLARE
  role_id uuid;
  perm_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Company Admin' limit 1;
  
  IF role_id IS NOT NULL THEN
    FOR perm_id IN SELECT id FROM permissions WHERE resource NOT IN ('roles', 'permissions') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (role_id, perm_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Assign Permissions to HR Manager
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'HR Manager' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'hr') OR p.resource LIKE 'hr.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Finance Manager
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Finance Manager' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'finance', 'reports') 
       OR p.resource LIKE 'finance.%' 
       OR p.resource LIKE 'reports.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Administration Manager
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Administration Manager' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'facilities', 'assets', 'reception', 'supplies', 'vendors', 'documents') 
       OR p.resource LIKE 'facilities.%'
       OR p.resource LIKE 'assets.%'
       OR p.resource LIKE 'reception.%'
       OR p.resource LIKE 'supplies.%'
       OR p.resource LIKE 'vendors.%'
       OR p.resource LIKE 'documents.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Procurement Officer
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Procurement Officer' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'procurement') OR p.resource LIKE 'procurement.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Inventory Manager
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Inventory Manager' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'inventory') OR p.resource LIKE 'inventory.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Sales Manager
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Sales Manager' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'crm') OR p.resource LIKE 'crm.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Project Manager
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Project Manager' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'projects') OR p.resource LIKE 'projects.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Employee (Basic access)
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Employee' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.resource = 'dashboard' 
       OR p.resource IN ('hr.leave', 'hr.attendance', 'hr.performance')
       OR (p.resource = 'hr.leave' AND p.action = 'create')
       OR (p.resource = 'hr.attendance' AND p.action = 'view')
       OR (p.resource = 'hr.performance' AND p.action = 'view')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Assign Permissions to Viewer (Read-only)
DO $$
DECLARE
  role_id uuid;
BEGIN
  SELECT id INTO role_id FROM roles WHERE name = 'Viewer' limit 1;
  
  IF role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_id, p.id FROM permissions p
    WHERE p.action = 'view'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
