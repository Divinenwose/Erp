-- Procurement Module Permissions

-- Core Procurement Permissions
INSERT INTO permissions (resource, action, description) VALUES
-- Vendors
('procurement.vendors', 'view', 'View vendors'),
('procurement.vendors', 'create', 'Create vendors'),
('procurement.vendors', 'edit', 'Edit vendors'),
('procurement.vendors', 'delete', 'Delete vendors'),
('procurement.vendors', 'export', 'Export vendor data'),
-- Purchase Requests
('procurement.requests', 'view', 'View purchase requests'),
('procurement.requests', 'create', 'Create purchase requests'),
('procurement.requests', 'edit', 'Edit purchase requests'),
('procurement.requests', 'delete', 'Delete purchase requests'),
('procurement.requests', 'approve', 'Approve purchase requests'),
('procurement.requests', 'reject', 'Reject purchase requests'),
('procurement.requests', 'export', 'Export purchase requests'),
-- Purchase Orders
('procurement.orders', 'view', 'View purchase orders'),
('procurement.orders', 'create', 'Create purchase orders'),
('procurement.orders', 'edit', 'Edit purchase orders'),
('procurement.orders', 'delete', 'Delete purchase orders'),
('procurement.orders', 'approve', 'Approve purchase orders'),
('procurement.orders', 'cancel', 'Cancel purchase orders'),
('procurement.orders', 'export', 'Export purchase orders'),
-- Contracts
('procurement.contracts', 'view', 'View contracts'),
('procurement.contracts', 'create', 'Create contracts'),
('procurement.contracts', 'edit', 'Edit contracts'),
('procurement.contracts', 'delete', 'Delete contracts'),
('procurement.contracts', 'approve', 'Approve contracts'),
('procurement.contracts', 'export', 'Export contracts'),
-- Goods Received Notes (GRN)
('procurement.grn', 'view', 'View goods received notes'),
('procurement.grn', 'create', 'Create goods received notes'),
('procurement.grn', 'edit', 'Edit goods received notes'),
('procurement.grn', 'delete', 'Delete goods received notes'),
('procurement.grn', 'verify', 'Verify goods received notes'),
('procurement.grn', 'reject', 'Reject goods received notes'),
('procurement.grn', 'export', 'Export GRN data'),
-- Invoice Verification
('procurement.invoice_verification', 'view', 'View invoice verifications'),
('procurement.invoice_verification', 'create', 'Create invoice verifications'),
('procurement.invoice_verification', 'edit', 'Edit invoice verifications'),
('procurement.invoice_verification', 'verify', 'Verify invoices'),
('procurement.invoice_verification', 'approve', 'Approve verified invoices'),
('procurement.invoice_verification', 'dispute', 'Dispute invoices'),
('procurement.invoice_verification', 'export', 'Export invoice verification data'),
-- Delivery Tracking
('procurement.deliveries', 'view', 'View delivery tracking'),
('procurement.deliveries', 'create', 'Create delivery records'),
('procurement.deliveries', 'edit', 'Edit delivery records'),
('procurement.deliveries', 'update_status', 'Update delivery status'),
('procurement.deliveries', 'export', 'Export delivery data'),
-- Supplier Performance
('procurement.supplier_performance', 'view', 'View supplier performance'),
('procurement.supplier_performance', 'evaluate', 'Evaluate supplier performance'),
('procurement.supplier_performance', 'export', 'Export supplier performance data'),
-- Buying Activities
('procurement.buying_activities', 'view', 'View buying activities'),
('procurement.buying_activities', 'create', 'Log buying activities'),
('procurement.buying_activities', 'edit', 'Edit buying activities'),
('procurement.buying_activities', 'export', 'Export buying activities data'),
-- Replenishment Requests
('procurement.replenishment', 'view', 'View replenishment requests'),
('procurement.replenishment', 'create', 'Create replenishment requests'),
('procurement.replenishment', 'edit', 'Edit replenishment requests'),
('procurement.replenishment', 'approve', 'Approve replenishment requests'),
('procurement.replenishment', 'reject', 'Reject replenishment requests'),
('procurement.replenishment', 'export', 'Export replenishment data'),
-- Supplier Communications
('procurement.communications', 'view', 'View supplier communications'),
('procurement.communications', 'create', 'Create communication logs'),
('procurement.communications', 'edit', 'Edit communication logs'),
('procurement.communications', 'delete', 'Delete communication logs'),
-- Procurement Reports
('procurement.reports', 'view', 'View procurement reports'),
('procurement.reports', 'po_status', 'View PO status reports'),
('procurement.reports', 'delivery_tracking', 'View delivery tracking reports'),
('procurement.reports', 'invoice_verification', 'View invoice verification reports'),
('procurement.reports', 'supplier_performance', 'View supplier performance reports'),
('procurement.reports', 'replenishment', 'View replenishment reports'),
('procurement.reports', 'buying_activities', 'View buying activities reports'),
('procurement.reports', 'annual_summary', 'View annual buying summary reports'),
('procurement.reports', 'export', 'Export procurement reports')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant Procurement permissions to Procurement Manager role
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Procurement Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource = 'procurement' 
       OR p.resource LIKE 'procurement.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant Procurement permissions to Company Admin role
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Company Admin' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource = 'procurement' 
       OR p.resource LIKE 'procurement.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant view permissions to Finance Manager (for invoice verification integration)
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Finance Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('procurement.orders', 'procurement.invoice_verification', 'procurement.grn', 'procurement.deliveries')
       AND p.action IN ('view', 'invoice_verification', 'verify')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant view permissions to Inventory Manager (for replenishment and stock integration)
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Inventory Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('procurement.requests', 'procurement.orders', 'procurement.grn', 'procurement.replenishment')
       AND p.action IN ('view', 'create', 'edit')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
