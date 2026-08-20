/*
  # HR: employee lifecycle requests + leave balances

  ## Problem
  Confirmation, promotion, transfer, and employment-status-change all need
  the same shape: a proposed before/after change to an employee's record
  that goes through approval before taking effect, and gets recorded in
  employee_employment_history once approved. No table currently exists to
  hold that proposal while it's in flight (employee_employment_history only
  records completed events, not pending ones).

  Leave balances (entitlement/carry-forward per employee/leave_type/year)
  also has no table — leave_types.days_per_year is only a default, and
  "used"/"pending" days are always computed live from leave_requests to
  avoid storing data that can drift from the source of truth.

  ## What this migration does
  1. Creates `employee_requests` — one unified table for confirmation,
     promotion, transfer, and status_change proposals. Reuses the existing
     approval engine (`request_approvals` + `approval_stages`) exactly the
     way `purchase_requests` already does — this is not a new approval
     system, just another request_type feeding the same one.
  2. Creates `leave_balances` — per employee/leave_type/year entitlement
     override and carried-forward days only. Used/pending days remain
     computed from `leave_requests` at query time, not duplicated here.
  3. Adds RBAC permissions following the existing hr.<area>.<action>
     convention, and hr.leave.balances.manage since no leave-balance
     permission exists yet (hr.leave.approve/reject already exist from
     20260712014000_005_erp_rbac_schema.sql and are reused as-is for leave
     approval — not recreated).

  ## Design decision needing confirmation
  Confirmation/promotion/transfer/status-change are unified under one
  `hr.employee_requests.view` / `hr.employee_requests.manage` permission
  pair rather than four separate ones, since they share one table and one
  UI. If per-type permission granularity turns out to be required, that's
  a follow-up migration, not a redesign of this table.

  ## What this migration deliberately does NOT do
  - Does not modify `employees`, `employee_employment_history`,
    `leave_requests`, `leave_types`, `request_approvals`, or any other
    existing table.
  - Does not create a second approval engine.
  - Does not touch Company Admin/Super Admin (bypass is application-level).
  - Does not modify or delete any existing migration.

  ## Idempotency
  `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
  `ON CONFLICT ... DO NOTHING`, and conditional policy/grant creation —
  safe to re-run.
*/

CREATE TABLE IF NOT EXISTS employee_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('confirmation', 'promotion', 'transfer', 'status_change')),
  current_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  new_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  current_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  new_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  current_job_title text,
  new_job_title text,
  current_salary numeric(15,2),
  new_salary numeric(15,2),
  current_status text,
  new_status text,
  effective_date date NOT NULL,
  reason text,
  recommendation text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_requests_employee ON employee_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_company ON employee_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_requests_status ON employee_requests(status);

CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year integer NOT NULL,
  entitled_days numeric(5,1) NOT NULL DEFAULT 0,
  carried_forward_days numeric(5,1) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_company ON leave_balances(company_id);

ALTER TABLE employee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_requests' AND policyname = 'Users can view own company data') THEN
    CREATE POLICY "Users can view own company data" ON employee_requests FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_requests' AND policyname = 'Users can insert own company data') THEN
    CREATE POLICY "Users can insert own company data" ON employee_requests FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_requests' AND policyname = 'Users can update own company data') THEN
    CREATE POLICY "Users can update own company data" ON employee_requests FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_requests' AND policyname = 'Users can delete own company data') THEN
    CREATE POLICY "Users can delete own company data" ON employee_requests FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_balances' AND policyname = 'Users can view own company data') THEN
    CREATE POLICY "Users can view own company data" ON leave_balances FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_balances' AND policyname = 'Users can insert own company data') THEN
    CREATE POLICY "Users can insert own company data" ON leave_balances FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_balances' AND policyname = 'Users can update own company data') THEN
    CREATE POLICY "Users can update own company data" ON leave_balances FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leave_balances' AND policyname = 'Users can delete own company data') THEN
    CREATE POLICY "Users can delete own company data" ON leave_balances FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

INSERT INTO permissions (resource, action, description) VALUES
  ('hr.employee_requests', 'view', 'View confirmation/promotion/transfer/status-change requests'),
  ('hr.employee_requests', 'manage', 'Submit and approve employee lifecycle requests'),
  ('hr.leave.balances', 'view', 'View employee leave balances'),
  ('hr.leave.balances', 'manage', 'Set/adjust employee leave balances'),
  ('hr.leave.reports', 'view', 'View HR leave reports')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant the new permissions to any role that already has hr.employees.edit,
-- mirroring 20260818100000_014's approach: the same people already trusted
-- to edit employee records get the new lifecycle/leave-balance capabilities.
-- hr.leave.approve/reject already exist and are untouched — no new leave
-- approval permission is created. Company Admin/Super Admin are untouched.
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
      WHERE resource IN ('hr.employee_requests', 'hr.leave.balances', 'hr.leave.reports')
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, new_perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
