-- Sales & CRM Module Permissions

-- Core CRM Permissions
INSERT INTO permissions (resource, action, description) VALUES
-- Leads
('crm.leads', 'view', 'View leads'),
('crm.leads', 'create', 'Create leads'),
('crm.leads', 'edit', 'Edit leads'),
('crm.leads', 'delete', 'Delete leads'),
('crm.leads', 'convert', 'Convert leads to opportunities'),
('crm.leads', 'assign', 'Assign leads'),
('crm.leads', 'export', 'Export lead data'),
-- Opportunities / Pipeline
('crm.opportunities', 'view', 'View opportunities'),
('crm.opportunities', 'create', 'Create opportunities'),
('crm.opportunities', 'edit', 'Edit opportunities'),
('crm.opportunities', 'delete', 'Delete opportunities'),
('crm.opportunities', 'move_stage', 'Move opportunities between stages'),
('crm.opportunities', 'close_won', 'Close opportunities as won'),
('crm.opportunities', 'close_lost', 'Close opportunities as lost'),
('crm.opportunities', 'assign', 'Assign opportunities'),
('crm.opportunities', 'export', 'Export opportunity data'),
-- Customers
('crm.customers', 'view', 'View customers'),
('crm.customers', 'create', 'Create customers'),
('crm.customers', 'edit', 'Edit customers'),
('crm.customers', 'delete', 'Delete customers'),
('crm.customers', 'export', 'Export customer data'),
-- Contacts
('crm.contacts', 'view', 'View contacts'),
('crm.contacts', 'create', 'Create contacts'),
('crm.contacts', 'edit', 'Edit contacts'),
('crm.contacts', 'delete', 'Delete contacts'),
('crm.contacts', 'export', 'Export contact data'),
-- Sales Orders
('crm.sales_orders', 'view', 'View sales orders'),
('crm.sales_orders', 'create', 'Create sales orders'),
('crm.sales_orders', 'edit', 'Edit sales orders'),
('crm.sales_orders', 'delete', 'Delete sales orders'),
('crm.sales_orders', 'approve', 'Approve sales orders'),
('crm.sales_orders', 'cancel', 'Cancel sales orders'),
('crm.sales_orders', 'export', 'Export sales order data'),
-- Sales Proposals
('crm.proposals', 'view', 'View sales proposals'),
('crm.proposals', 'create', 'Create sales proposals'),
('crm.proposals', 'edit', 'Edit sales proposals'),
('crm.proposals', 'delete', 'Delete sales proposals'),
('crm.proposals', 'approve', 'Approve sales proposals'),
('crm.proposals', 'reject', 'Reject sales proposals'),
('crm.proposals', 'send', 'Send proposals to customers'),
('crm.proposals', 'export', 'Export proposal data'),
-- Sales Contracts
('crm.contracts', 'view', 'View sales contracts'),
('crm.contracts', 'create', 'Create sales contracts'),
('crm.contracts', 'edit', 'Edit sales contracts'),
('crm.contracts', 'delete', 'Delete sales contracts'),
('crm.contracts', 'approve', 'Approve sales contracts'),
('crm.contracts', 'sign', 'Sign contracts'),
('crm.contracts', 'renew', 'Renew contracts'),
('crm.contracts', 'terminate', 'Terminate contracts'),
('crm.contracts', 'export', 'Export contract data'),
-- Pricing Requests
('crm.pricing', 'view', 'View pricing requests'),
('crm.pricing', 'create', 'Create pricing requests'),
('crm.pricing', 'edit', 'Edit pricing requests'),
('crm.pricing', 'delete', 'Delete pricing requests'),
('crm.pricing', 'approve', 'Approve pricing requests'),
('crm.pricing', 'reject', 'Reject pricing requests'),
('crm.pricing', 'export', 'Export pricing data'),
-- Sales Activities
('crm.activities', 'view', 'View sales activities'),
('crm.activities', 'create', 'Create sales activities'),
('crm.activities', 'edit', 'Edit sales activities'),
('crm.activities', 'delete', 'Delete sales activities'),
('crm.activities', 'complete', 'Complete sales activities'),
('crm.activities', 'export', 'Export activity data'),
-- Customer Communications
('crm.communications', 'view', 'View customer communications'),
('crm.communications', 'create', 'Create communications'),
('crm.communications', 'edit', 'Edit communications'),
('crm.communications', 'delete', 'Delete communications'),
('crm.communications', 'export', 'Export communication data'),
-- Customer Feedback
('crm.feedback', 'view', 'View customer feedback'),
('crm.feedback', 'create', 'Create feedback records'),
('crm.feedback', 'edit', 'Edit feedback records'),
('crm.feedback', 'delete', 'Delete feedback records'),
('crm.feedback', 'resolve', 'Resolve feedback'),
('crm.feedback', 'export', 'Export feedback data'),
-- Customer Satisfaction
('crm.satisfaction', 'view', 'View customer satisfaction'),
('crm.satisfaction', 'create', 'Create satisfaction surveys'),
('crm.satisfaction', 'edit', 'Edit satisfaction surveys'),
('crm.satisfaction', 'delete', 'Delete satisfaction surveys'),
('crm.satisfaction', 'export', 'Export satisfaction data'),
-- Sales Targets
('crm.targets', 'view', 'View sales targets'),
('crm.targets', 'create', 'Create sales targets'),
('crm.targets', 'edit', 'Edit sales targets'),
('crm.targets', 'delete', 'Delete sales targets'),
('crm.targets', 'export', 'Export target data'),
-- Sales Forecasts
('crm.forecasts', 'view', 'View sales forecasts'),
('crm.forecasts', 'create', 'Create sales forecasts'),
('crm.forecasts', 'edit', 'Edit sales forecasts'),
('crm.forecasts', 'delete', 'Delete sales forecasts'),
('crm.forecasts', 'export', 'Export forecast data'),
-- CRM Reports
('crm.reports', 'view', 'View CRM reports'),
('crm.reports', 'performance', 'View sales performance reports'),
('crm.reports', 'lead_conversion', 'View lead conversion reports'),
('crm.reports', 'customer_engagement', 'View customer engagement reports'),
('crm.reports', 'pipeline', 'View pipeline reports'),
('crm.reports', 'revenue_forecast', 'View revenue forecast reports'),
('crm.reports', 'contract_closure', 'View contract closure reports'),
('crm.reports', 'satisfaction', 'View satisfaction reports'),
('crm.reports', 'crm_quality', 'View CRM data quality reports'),
('crm.reports', 'activities', 'View sales activity reports'),
('crm.reports', 'monthly', 'View monthly sales reports'),
('crm.reports', 'annual', 'View annual sales reports'),
('crm.reports', 'export', 'Export CRM reports')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant CRM permissions to Sales Manager role
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Sales Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource = 'crm' 
       OR p.resource LIKE 'crm.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant CRM permissions to Company Admin role
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Company Admin' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource = 'crm' 
       OR p.resource LIKE 'crm.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant view permissions to Marketing Manager (for lead integration)
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Marketing Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('crm.leads', 'crm.opportunities', 'crm.customers')
       AND p.action IN ('view', 'export')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant view permissions to Finance Manager (for revenue integration)
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Finance Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('crm.opportunities', 'crm.sales_orders', 'crm.contracts', 'crm.forecasts')
       AND p.action IN ('view', 'export')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
