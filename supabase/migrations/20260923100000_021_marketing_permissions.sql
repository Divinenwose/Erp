-- Marketing Module Permissions
-- Add all Marketing permissions to the permissions table

INSERT INTO permissions (resource, action, description) VALUES
-- Marketing Module Overview
('marketing', 'view', 'View marketing module'),

-- Campaign Management
('marketing.campaigns', 'view', 'View marketing campaigns'),
('marketing.campaigns', 'create', 'Create marketing campaigns'),
('marketing.campaigns', 'edit', 'Edit marketing campaigns'),
('marketing.campaigns', 'delete', 'Delete marketing campaigns'),
('marketing.campaigns', 'approve', 'Approve marketing campaigns'),
('marketing.campaigns', 'reject', 'Reject marketing campaigns'),

-- Content Management
('marketing.content', 'view', 'View marketing content'),
('marketing.content', 'create', 'Create marketing content'),
('marketing.content', 'edit', 'Edit marketing content'),
('marketing.content', 'delete', 'Delete marketing content'),
('marketing.content', 'approve', 'Approve marketing content'),
('marketing.content', 'publish', 'Publish marketing content'),

-- Social Media
('marketing.social', 'view', 'View social media posts'),
('marketing.social', 'create', 'Create social media posts'),
('marketing.social', 'edit', 'Edit social media posts'),
('marketing.social', 'delete', 'Delete social media posts'),
('marketing.social', 'schedule', 'Schedule social media posts'),

-- Advertising
('marketing.advertising', 'view', 'View advertising campaigns'),
('marketing.advertising', 'create', 'Create advertising campaigns'),
('marketing.advertising', 'edit', 'Edit advertising campaigns'),
('marketing.advertising', 'delete', 'Delete advertising campaigns'),
('marketing.advertising', 'approve', 'Approve advertising campaigns'),

-- Events
('marketing.events', 'view', 'View marketing events'),
('marketing.events', 'create', 'Create marketing events'),
('marketing.events', 'edit', 'Edit marketing events'),
('marketing.events', 'delete', 'Delete marketing events'),
('marketing.events', 'approve', 'Approve marketing events'),
('marketing.events', 'manage_attendees', 'Manage event attendees'),

-- Public Relations
('marketing.pr', 'view', 'View press releases'),
('marketing.pr', 'create', 'Create press releases'),
('marketing.pr', 'edit', 'Edit press releases'),
('marketing.pr', 'delete', 'Delete press releases'),
('marketing.pr', 'approve', 'Approve press releases'),
('marketing.pr', 'publish', 'Publish press releases'),

-- Marketing Vendors
('marketing.vendors', 'view', 'View marketing vendors'),
('marketing.vendors', 'create', 'Create marketing vendors'),
('marketing.vendors', 'edit', 'Edit marketing vendors'),
('marketing.vendors', 'delete', 'Delete marketing vendors'),

-- Marketing Contracts
('marketing.contracts', 'view', 'View marketing contracts'),
('marketing.contracts', 'create', 'Create marketing contracts'),
('marketing.contracts', 'edit', 'Edit marketing contracts'),
('marketing.contracts', 'delete', 'Delete marketing contracts'),
('marketing.contracts', 'approve', 'Approve marketing contracts'),

-- Market Research
('marketing.research', 'view', 'View market research'),
('marketing.research', 'create', 'Create market research'),
('marketing.research', 'edit', 'Edit market research'),
('marketing.research', 'delete', 'Delete market research'),

-- Surveys
('marketing.surveys', 'view', 'View surveys'),
('marketing.surveys', 'create', 'Create surveys'),
('marketing.surveys', 'edit', 'Edit surveys'),
('marketing.surveys', 'delete', 'Delete surveys'),
('marketing.surveys', 'view_responses', 'View survey responses'),

-- Brand Management
('marketing.brand', 'view', 'View brand assets'),
('marketing.brand', 'create', 'Create brand assets'),
('marketing.brand', 'edit', 'Edit brand assets'),
('marketing.brand', 'delete', 'Delete brand assets'),

-- Lead Generation
('marketing.leads', 'view', 'View marketing leads'),
('marketing.leads', 'create', 'Create marketing leads'),
('marketing.leads', 'edit', 'Edit marketing leads'),
('marketing.leads', 'delete', 'Delete marketing leads'),
('marketing.leads', 'assign', 'Assign marketing leads'),
('marketing.leads', 'convert', 'Convert marketing leads'),

-- Marketing Documents
('marketing.documents', 'view', 'View marketing documents'),
('marketing.documents', 'create', 'Create marketing documents'),
('marketing.documents', 'edit', 'Edit marketing documents'),
('marketing.documents', 'delete', 'Delete marketing documents'),

-- Marketing Budgets
('marketing.budgets', 'view', 'View marketing budgets'),
('marketing.budgets', 'create', 'Create marketing budgets'),
('marketing.budgets', 'edit', 'Edit marketing budgets'),
('marketing.budgets', 'approve', 'Approve marketing budgets'),

-- Marketing Reports
('marketing.reports', 'view', 'View marketing reports'),
('marketing.reports', 'export', 'Export marketing reports'),

-- Marketing Approvals
('marketing.approvals', 'view', 'View marketing approvals'),
('marketing.approvals', 'approve', 'Approve marketing requests'),
('marketing.approvals', 'reject', 'Reject marketing requests')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant Marketing permissions to Marketing Manager role
DO $$
DECLARE
  v_role_id uuid;
  v_permission_ids uuid[];
BEGIN
  -- Get Marketing Manager role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'Marketing Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    -- Get all marketing permissions
    SELECT ARRAY_AGG(id) INTO v_permission_ids 
    FROM permissions 
    WHERE resource = 'marketing' OR resource LIKE 'marketing.%';
    
    -- Insert role permissions
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT v_role_id, unnest(v_permission_ids), NOW()
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant Marketing permissions to Company Admin role
DO $$
DECLARE
  v_role_id uuid;
  v_permission_ids uuid[];
BEGIN
  -- Get Company Admin role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'Company Admin' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    -- Get all marketing permissions
    SELECT ARRAY_AGG(id) INTO v_permission_ids 
    FROM permissions 
    WHERE resource = 'marketing' OR resource LIKE 'marketing.%';
    
    -- Insert role permissions
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT v_role_id, unnest(v_permission_ids), NOW()
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant Marketing permissions to Super Admin role (if exists)
DO $$
DECLARE
  v_role_id uuid;
  v_permission_ids uuid[];
BEGIN
  -- Get Super Admin role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'Super Admin' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    -- Get all marketing permissions
    SELECT ARRAY_AGG(id) INTO v_permission_ids 
    FROM permissions 
    WHERE resource = 'marketing' OR resource LIKE 'marketing.%';
    
    -- Insert role permissions
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT v_role_id, unnest(v_permission_ids), NOW()
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
