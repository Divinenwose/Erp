/*
  # HR Foundation: employee documents + employment history

  ## Problem
  The HR module has a rich, real `employees` table (personal + employment
  fields) and real `leave_requests`/`attendance_records`, but no way to:
  1. Store/track personnel documents (offer letters, contracts,
     confirmation/promotion/transfer letters, certificates, IDs) per
     employee.
  2. Preserve a history of promotions, transfers, confirmations, salary
     changes, and status changes. `employees` only holds current values —
     overwriting department_id/job_title/salary/employment_status in place
     would destroy history, which the HR requirements explicitly require
     to be preserved.

  Neither of these is a duplicate of anything that exists: Administration's
  `documents`/`archive` tables (if any) are facility documents, not
  personnel files; there is no employment-history table anywhere in the
  schema.

  ## What this migration does
  Creates two new, additive tables:

  1. `employee_documents` — one row per document attached to an employee.
  2. `employee_employment_history` — one row per career event (hire,
     promotion, transfer, confirmation, salary_change, status_change,
     department_change), capturing the before/after state so history is
     never overwritten.

  Both reference the existing `employees` table and follow the exact same
  company-scoped RLS convention already used for the vendor-management
  tables in 20260816090000_011_vendor_management_tables.sql
  (`company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())`).

  ## What this migration deliberately does NOT do
  - Does not modify the `employees` table or any other existing table.
  - Does not create a second document or history system — these are new,
    HR-specific tables with no existing equivalent.
  - Does not modify or delete any existing migration.

  ## Idempotency
  `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and
  conditional policy creation (checked via pg_policies) — safe to re-run.
*/

CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other' CHECK (document_type IN (
    'bio_data', 'contract', 'offer_letter', 'confirmation_letter',
    'promotion_letter', 'transfer_letter', 'warning_letter', 'certificate',
    'identification', 'other'
  )),
  title text NOT NULL,
  file_url text,
  notes text,
  uploaded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_company ON employee_documents(company_id);

CREATE TABLE IF NOT EXISTS employee_employment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'hire', 'promotion', 'transfer', 'confirmation', 'salary_change',
    'status_change', 'department_change'
  )),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  previous_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  new_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  previous_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  new_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  previous_job_title text,
  new_job_title text,
  previous_salary numeric(15,2),
  new_salary numeric(15,2),
  previous_status text,
  new_status text,
  reason text,
  notes text,
  recorded_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employment_history_employee ON employee_employment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_company ON employee_employment_history(company_id);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_employment_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_documents' AND policyname = 'Users can view own company data') THEN
    CREATE POLICY "Users can view own company data" ON employee_documents FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_documents' AND policyname = 'Users can insert own company data') THEN
    CREATE POLICY "Users can insert own company data" ON employee_documents FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_documents' AND policyname = 'Users can update own company data') THEN
    CREATE POLICY "Users can update own company data" ON employee_documents FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_documents' AND policyname = 'Users can delete own company data') THEN
    CREATE POLICY "Users can delete own company data" ON employee_documents FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_employment_history' AND policyname = 'Users can view own company data') THEN
    CREATE POLICY "Users can view own company data" ON employee_employment_history FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_employment_history' AND policyname = 'Users can insert own company data') THEN
    CREATE POLICY "Users can insert own company data" ON employee_employment_history FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_employment_history' AND policyname = 'Users can update own company data') THEN
    CREATE POLICY "Users can update own company data" ON employee_employment_history FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_employment_history' AND policyname = 'Users can delete own company data') THEN
    CREATE POLICY "Users can delete own company data" ON employee_employment_history FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

-- New HR permissions, following the existing hr.<area>.<action> convention
-- already established in 20260712014000_005_erp_rbac_schema.sql. Documents
-- get their own permission (not folded into hr.employees.*) since personnel
-- documents are more sensitive than the basic employee record.
INSERT INTO permissions (resource, action, description) VALUES
  ('hr.employees.documents', 'view', 'View employee documents'),
  ('hr.employees.documents', 'manage', 'Upload/manage employee documents'),
  ('hr.employees.history', 'view', 'View employee employment history'),
  ('hr.employees.history', 'manage', 'Record promotions/transfers/confirmations')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant the new document/history permissions to any role that already has
-- hr.employees.edit — the same set of people already trusted to edit an
-- employee's record is trusted to see/manage their documents and history.
-- Company Admin/Super Admin are untouched; their access already comes from
-- the existing isCompanyAdmin()/isSuperAdmin() bypass, not role_permissions.
DO $$
DECLARE
  r RECORD;
  new_perm RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT rp.role_id
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE p.resource = 'hr.employees' AND p.action = 'edit'
  LOOP
    FOR new_perm IN
      SELECT id FROM permissions
      WHERE resource IN ('hr.employees.documents', 'hr.employees.history')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, new_perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
