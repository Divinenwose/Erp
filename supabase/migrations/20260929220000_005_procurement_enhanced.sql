-- Enhanced Procurement Module Tables
-- Adds GRN, Delivery Tracking, Invoice Verification, Supplier Performance, Buying Activities, Communication Logs, and Replenishment Requests

-- Goods Received Notes (GRN)
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  grn_number text NOT NULL,
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  warehouse_id uuid REFERENCES warehouses(id),
  received_date date NOT NULL,
  received_by uuid REFERENCES employees(id),
  delivery_note_number text,
  carrier_name text,
  vehicle_number text,
  status text DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  notes text,
  verified_by uuid REFERENCES employees(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_grn_company ON goods_received_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_received_notes(po_id);

CREATE TABLE IF NOT EXISTS grn_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  grn_id uuid NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES po_items(id),
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  ordered_quantity numeric(10,2) DEFAULT 0,
  received_quantity numeric(10,2) DEFAULT 0,
  accepted_quantity numeric(10,2) DEFAULT 0,
  rejected_quantity numeric(10,2) DEFAULT 0,
  unit_price numeric(15,2) DEFAULT 0,
  total_value numeric(15,2) DEFAULT 0,
  batch_number text,
  expiry_date date,
  quality_status text DEFAULT 'accepted', -- 'accepted', 'rejected', 'partial'
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;

-- Delivery Tracking
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  tracking_number text,
  carrier text,
  estimated_delivery_date date,
  actual_delivery_date date,
  delivery_address text,
  contact_person text,
  contact_phone text,
  status text DEFAULT 'pending', -- 'pending', 'shipped', 'in_transit', 'delivered', 'delayed', 'cancelled'
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_deliveries_company ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_po ON deliveries(po_id);

CREATE TABLE IF NOT EXISTS delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'created', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'exception'
  event_date timestamptz DEFAULT now(),
  location text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;

-- Invoice Verification
CREATE TABLE IF NOT EXISTS invoice_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  grn_id uuid REFERENCES goods_received_notes(id),
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  invoice_amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  po_amount numeric(15,2) DEFAULT 0,
  grn_amount numeric(15,2) DEFAULT 0,
  variance_amount numeric(15,2) DEFAULT 0,
  variance_percent numeric(5,2) DEFAULT 0,
  status text DEFAULT 'pending', -- 'pending', 'verified', 'disputed', 'approved', 'rejected'
  verification_notes text,
  verified_by uuid REFERENCES employees(id),
  verified_at timestamptz,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  finance_invoice_id uuid REFERENCES invoices(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_verifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoice_verif_company ON invoice_verifications(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_verif_po ON invoice_verifications(po_id);

CREATE TABLE IF NOT EXISTS invoice_verification_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  verification_id uuid NOT NULL REFERENCES invoice_verifications(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES po_items(id),
  grn_item_id uuid REFERENCES grn_items(id),
  description text NOT NULL,
  ordered_quantity numeric(10,2) DEFAULT 0,
  invoiced_quantity numeric(10,2) DEFAULT 0,
  received_quantity numeric(10,2) DEFAULT 0,
  unit_price numeric(15,2) DEFAULT 0,
  ordered_amount numeric(15,2) DEFAULT 0,
  invoiced_amount numeric(15,2) DEFAULT 0,
  variance numeric(15,2) DEFAULT 0,
  status text DEFAULT 'matched', -- 'matched', 'unmatched', 'partial'
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_verification_items ENABLE ROW LEVEL SECURITY;

-- Supplier Performance Tracking
CREATE TABLE IF NOT EXISTS supplier_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  evaluation_period text NOT NULL, -- 'monthly', 'quarterly', 'annual'
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_orders integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  late_deliveries integer DEFAULT 0,
  on_time_rate numeric(5,2) DEFAULT 0,
  quality_score numeric(5,2) DEFAULT 0, -- 1-5 scale
  price_competitiveness numeric(5,2) DEFAULT 0, -- 1-5 scale
  responsiveness numeric(5,2) DEFAULT 0, -- 1-5 scale
  overall_score numeric(5,2) DEFAULT 0, -- 1-5 scale
  total_spend numeric(15,2) DEFAULT 0,
  notes text,
  evaluated_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, vendor_id, evaluation_period, period_start, period_end)
);

ALTER TABLE supplier_performance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_supplier_perf_company ON supplier_performance(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_perf_vendor ON supplier_performance(vendor_id);

-- Buying Activities Tracking
CREATE TABLE IF NOT EXISTS buying_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  buyer_id uuid REFERENCES employees(id),
  department_id uuid REFERENCES departments(id),
  activity_type text NOT NULL, -- 'requisition', 'po_creation', 'negotiation', 'order_placement', 'delivery', 'invoice_verification'
  reference_type text, -- 'purchase_request', 'purchase_order', 'grn', 'invoice_verification'
  reference_id uuid,
  vendor_id uuid REFERENCES vendors(id),
  amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  category text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE buying_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_buying_activities_company ON buying_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_buying_activities_date ON buying_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_buying_activities_buyer ON buying_activities(buyer_id);

-- Supplier Communication Logs
CREATE TABLE IF NOT EXISTS supplier_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  communication_type text NOT NULL, -- 'email', 'phone', 'meeting', 'chat', 'other'
  subject text,
  message text,
  reference_type text, -- 'purchase_order', 'grn', 'invoice', 'contract', 'general'
  reference_id uuid,
  communicated_by uuid REFERENCES employees(id),
  communicated_with text,
  communication_date timestamptz DEFAULT now(),
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  follow_up_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_communications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_supplier_comm_company ON supplier_communications(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_comm_vendor ON supplier_communications(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_comm_date ON supplier_communications(communication_date);

-- Inventory Replenishment Requests
CREATE TABLE IF NOT EXISTS replenishment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_number text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id),
  requested_by uuid REFERENCES employees(id),
  department_id uuid REFERENCES departments(id),
  priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'in_progress', 'completed'
  required_date date,
  justification text,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE replenishment_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_replenish_company ON replenishment_requests(company_id);

CREATE TABLE IF NOT EXISTS replenishment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  replenishment_request_id uuid NOT NULL REFERENCES replenishment_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  current_stock numeric(10,2) DEFAULT 0,
  reorder_level numeric(10,2) DEFAULT 0,
  requested_quantity numeric(10,2) DEFAULT 0,
  unit_of_measure text DEFAULT 'unit',
  estimated_cost numeric(15,2) DEFAULT 0,
  preferred_vendor_id uuid REFERENCES vendors(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE replenishment_items ENABLE ROW LEVEL SECURITY;

-- Update purchase_orders to include delivery tracking reference
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_id uuid REFERENCES deliveries(id);

-- Update vendors to include additional performance fields
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_spend numeric(15,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_order_date date;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_rating integer DEFAULT 0; -- 1-5 scale
