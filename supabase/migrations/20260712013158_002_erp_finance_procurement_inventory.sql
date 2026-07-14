
/*
# ERP Finance, Procurement & Inventory Schema

## New Tables
1. `chart_of_accounts` - General ledger accounts
2. `journal_entries` - GL journal entries
3. `journal_entry_lines` - Individual journal entry lines
4. `invoices` - Customer and vendor invoices
5. `invoice_items` - Invoice line items
6. `expenses` - Employee expense reports
7. `budgets` - Department/company budgets
8. `vendors` - Vendor/supplier records
9. `purchase_requests` - Internal purchase requests
10. `purchase_orders` - Formal purchase orders
11. `po_items` - PO line items
12. `products` - Product/item catalog
13. `categories` - Product categories
14. `warehouses` - Storage locations
15. `inventory_items` - Inventory stock
16. `stock_movements` - Inventory movement log
*/

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_number text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL,
  account_subtype text,
  parent_id uuid REFERENCES chart_of_accounts(id),
  balance numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_coa_company ON chart_of_accounts(company_id);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_number text,
  date date NOT NULL,
  description text NOT NULL,
  reference text,
  status text DEFAULT 'draft',
  total_debit numeric(15,2) DEFAULT 0,
  total_credit numeric(15,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  description text,
  debit numeric(15,2) DEFAULT 0,
  credit numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_number text,
  name text NOT NULL,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  country text,
  industry text,
  customer_type text DEFAULT 'business',
  credit_limit numeric(15,2) DEFAULT 0,
  payment_terms integer DEFAULT 30,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_type text DEFAULT 'sales',
  customer_id uuid REFERENCES customers(id),
  vendor_id uuid,
  issue_date date NOT NULL,
  due_date date,
  status text DEFAULT 'draft',
  subtotal numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  paid_amount numeric(15,2) DEFAULT 0,
  balance_due numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  notes text,
  terms text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  discount_percent numeric(5,2) DEFAULT 0,
  tax_percent numeric(5,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  expense_number text,
  title text NOT NULL,
  category text,
  amount numeric(15,2) NOT NULL,
  currency text DEFAULT 'USD',
  expense_date date NOT NULL,
  description text,
  status text DEFAULT 'draft',
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id),
  name text NOT NULL,
  fiscal_year integer NOT NULL,
  period text DEFAULT 'annual',
  total_amount numeric(15,2) DEFAULT 0,
  spent_amount numeric(15,2) DEFAULT 0,
  remaining_amount numeric(15,2) DEFAULT 0,
  status text DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_number text,
  name text NOT NULL,
  email text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  country text,
  category text,
  payment_terms integer DEFAULT 30,
  currency text DEFAULT 'USD',
  tax_id text,
  bank_name text,
  bank_account text,
  status text DEFAULT 'active',
  rating integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);

-- Purchase Requests
CREATE TABLE IF NOT EXISTS purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_number text,
  title text NOT NULL,
  department_id uuid REFERENCES departments(id),
  requested_by uuid REFERENCES employees(id),
  required_date date,
  estimated_cost numeric(15,2) DEFAULT 0,
  status text DEFAULT 'draft',
  priority text DEFAULT 'medium',
  justification text,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pr_company ON purchase_requests(company_id);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  vendor_id uuid NOT NULL REFERENCES vendors(id),
  purchase_request_id uuid REFERENCES purchase_requests(id),
  issue_date date NOT NULL,
  expected_delivery date,
  status text DEFAULT 'draft',
  subtotal numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  notes text,
  terms text,
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(company_id);

CREATE TABLE IF NOT EXISTS po_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  total_price numeric(15,2) DEFAULT 0,
  received_quantity numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;

-- Product Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  parent_id uuid REFERENCES categories(id),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id),
  unit_of_measure text DEFAULT 'unit',
  cost_price numeric(15,2) DEFAULT 0,
  selling_price numeric(15,2) DEFAULT 0,
  reorder_level integer DEFAULT 0,
  reorder_quantity integer DEFAULT 0,
  product_type text DEFAULT 'product',
  track_inventory boolean DEFAULT true,
  barcode text,
  qr_code text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  name text NOT NULL,
  code text,
  address text,
  manager_id uuid REFERENCES employees(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Inventory
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity_on_hand numeric(10,2) DEFAULT 0,
  quantity_reserved numeric(10,2) DEFAULT 0,
  quantity_available numeric(10,2) DEFAULT 0,
  last_counted_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory_items(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_items(product_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  movement_type text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
