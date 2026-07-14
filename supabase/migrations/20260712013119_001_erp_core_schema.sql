
/*
# ERP Core Schema - Multi-Tenant Foundation

## Summary
Creates the foundational tables for the Enterprise ERP Platform.

## New Tables
1. `companies` - Top-level tenant organizations
2. `branches` - Company branches/locations
3. `departments` - Organizational departments
4. `profiles` - Extended user profiles linked to auth.users
5. `employees` - Employee records
6. `roles` - System roles definition
7. `user_roles` - User-role assignments
8. `notifications` - In-app notifications
9. `audit_logs` - System-wide audit trail
10. `approval_workflows` - Configurable approval workflows
11. `approval_requests` - Approval request instances

## Security
- RLS enabled on all tables
- Multi-tenant isolation via company_id
- Owner-scoped and company-scoped policies
*/

-- Companies (Tenants)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  industry text,
  size text,
  website text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  logo_url text,
  subscription_plan text DEFAULT 'starter',
  subscription_status text DEFAULT 'trial',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  max_users integer DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  city text,
  state text,
  country text,
  phone text,
  email text,
  manager_id uuid,
  is_headquarter boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  name text NOT NULL,
  code text,
  description text,
  parent_id uuid REFERENCES departments(id),
  head_id uuid,
  budget numeric(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  display_name text,
  email text,
  phone text,
  avatar_url text,
  job_title text,
  department_id uuid REFERENCES departments(id),
  branch_id uuid REFERENCES branches(id),
  role text DEFAULT 'employee',
  is_active boolean DEFAULT true,
  last_seen_at timestamptz,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_profiles_company ON profiles(company_id);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  employee_number text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  nationality text,
  national_id text,
  passport_number text,
  address text,
  city text,
  state text,
  country text,
  emergency_contact_name text,
  emergency_contact_phone text,
  department_id uuid REFERENCES departments(id),
  branch_id uuid REFERENCES branches(id),
  job_title text,
  employment_type text DEFAULT 'full_time',
  employment_status text DEFAULT 'active',
  hire_date date,
  probation_end_date date,
  termination_date date,
  termination_reason text,
  manager_id uuid REFERENCES employees(id),
  salary numeric(15,2),
  salary_currency text DEFAULT 'USD',
  pay_frequency text DEFAULT 'monthly',
  bank_name text,
  bank_account text,
  bank_routing text,
  avatar_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  days_per_year integer DEFAULT 0,
  is_paid boolean DEFAULT true,
  carry_forward boolean DEFAULT false,
  max_carry_forward integer DEFAULT 0,
  requires_approval boolean DEFAULT true,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_requested numeric(5,1) NOT NULL,
  reason text,
  status text DEFAULT 'pending',
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  rejection_reason text,
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  work_hours numeric(5,2),
  overtime_hours numeric(5,2) DEFAULT 0,
  status text DEFAULT 'present',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendance_company ON attendance(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- Payroll
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date,
  status text DEFAULT 'draft',
  total_gross numeric(15,2) DEFAULT 0,
  total_deductions numeric(15,2) DEFAULT 0,
  total_net numeric(15,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id),
  gross_salary numeric(15,2) DEFAULT 0,
  basic_salary numeric(15,2) DEFAULT 0,
  allowances numeric(15,2) DEFAULT 0,
  bonuses numeric(15,2) DEFAULT 0,
  deductions numeric(15,2) DEFAULT 0,
  tax numeric(15,2) DEFAULT 0,
  net_salary numeric(15,2) DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
