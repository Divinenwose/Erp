
/*
# ERP CRM, Projects, Assets, Notifications Schema

## New Tables
1. `leads` - Sales leads
2. `opportunities` - Sales opportunities / pipeline
3. `contacts` - CRM contacts
4. `sales_orders` - Sales orders
5. `projects` - Project management
6. `tasks` - Project tasks
7. `assets` - Company fixed assets
8. `visitors` - Visitor management
9. `notifications` - In-app notification center
10. `audit_logs` - System audit trail
11. `meetings` - Meeting room bookings
*/

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  company_name text,
  job_title text,
  source text,
  status text DEFAULT 'new',
  rating text DEFAULT 'warm',
  assigned_to uuid REFERENCES employees(id),
  notes text,
  converted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  customer_id uuid REFERENCES customers(id),
  lead_id uuid REFERENCES leads(id),
  assigned_to uuid REFERENCES employees(id),
  stage text DEFAULT 'prospecting',
  probability integer DEFAULT 0,
  estimated_value numeric(15,2) DEFAULT 0,
  expected_close_date date,
  actual_close_date date,
  status text DEFAULT 'open',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id),
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  mobile text,
  job_title text,
  department text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES customers(id),
  opportunity_id uuid REFERENCES opportunities(id),
  order_date date NOT NULL,
  delivery_date date,
  status text DEFAULT 'pending',
  subtotal numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  discount_amount numeric(15,2) DEFAULT 0,
  total_amount numeric(15,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  notes text,
  assigned_to uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON sales_orders(company_id);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_number text,
  name text NOT NULL,
  description text,
  customer_id uuid REFERENCES customers(id),
  department_id uuid REFERENCES departments(id),
  project_manager_id uuid REFERENCES employees(id),
  start_date date,
  end_date date,
  actual_end_date date,
  status text DEFAULT 'planning',
  priority text DEFAULT 'medium',
  budget numeric(15,2) DEFAULT 0,
  spent_amount numeric(15,2) DEFAULT 0,
  completion_percent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES employees(id),
  parent_task_id uuid REFERENCES tasks(id),
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  due_date date,
  estimated_hours numeric(8,2) DEFAULT 0,
  actual_hours numeric(8,2) DEFAULT 0,
  completion_percent integer DEFAULT 0,
  tags text[],
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_number text,
  name text NOT NULL,
  asset_type text,
  category text,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_price numeric(15,2) DEFAULT 0,
  current_value numeric(15,2) DEFAULT 0,
  depreciation_method text DEFAULT 'straight_line',
  useful_life_years integer DEFAULT 5,
  location text,
  branch_id uuid REFERENCES branches(id),
  department_id uuid REFERENCES departments(id),
  assigned_to uuid REFERENCES employees(id),
  condition text DEFAULT 'good',
  status text DEFAULT 'active',
  warranty_expiry date,
  last_maintenance date,
  next_maintenance date,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_assets_company ON assets(company_id);

-- Fleet / Vehicles
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_number text,
  make text,
  model text,
  year integer,
  vin text,
  license_plate text,
  vehicle_type text DEFAULT 'car',
  fuel_type text DEFAULT 'petrol',
  status text DEFAULT 'available',
  assigned_driver uuid REFERENCES employees(id),
  branch_id uuid REFERENCES branches(id),
  purchase_date date,
  purchase_price numeric(15,2),
  insurance_expiry date,
  registration_expiry date,
  last_service date,
  next_service date,
  mileage integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;

-- Visitors
CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  company_name text,
  purpose text,
  host_employee_id uuid REFERENCES employees(id),
  check_in timestamptz DEFAULT now(),
  check_out timestamptz,
  badge_number text,
  id_type text,
  id_number text,
  notes text,
  status text DEFAULT 'checked_in',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_visitors_company ON visitors(company_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info',
  module text,
  reference_id uuid,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  action_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  module text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_number text,
  title text NOT NULL,
  description text,
  work_type text DEFAULT 'maintenance',
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  asset_id uuid REFERENCES assets(id),
  assigned_to uuid REFERENCES employees(id),
  requested_by uuid REFERENCES employees(id),
  scheduled_date date,
  completed_date date,
  estimated_cost numeric(15,2) DEFAULT 0,
  actual_cost numeric(15,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
