/*
  # HR: Recruitment & Onboarding

  ## Problem
  /hr/recruitment is a static mock page (hardcoded MOCK_POSITIONS array,
  no Supabase queries at all) and has no nav entry despite the route,
  route protection, and hr.recruitment.view/manage permissions already
  existing. There is no onboarding functionality or table anywhere.

  ## What this migration does
  Creates the tables needed for a real recruitment pipeline and onboarding
  checklist, reusing existing departments/branches/employees/companies —
  no duplicate org-structure tables.

  - job_requisitions: a department's request for a new position. Reuses
    the existing request_approvals engine for approval (request_type =
    'job_requisition'), the same way employee_requests and
    purchase_requests already do — not a new approval system.
  - vacancies: an approved, open position (optionally linked back to the
    requisition that justified it).
  - candidates: applicants, with `status` as their current pipeline stage
    (application -> screening -> shortlisted -> interview -> evaluation
    -> selected -> offer -> hired -> rejected). Stage-change history is
    recorded via the existing audit_logs system (lib/audit.ts), not a new
    history table.
  - interviews: scheduling + evaluation for a candidate.
  - job_offers: an offer extended to a candidate.
  - onboarding_tasks: a checklist item for a newly hired employee.

  ## New permissions
  hr.onboarding.view/manage are genuinely new — no existing equivalent.
  Requisitions/vacancies/candidates/interviews/offers all reuse the
  existing hr.recruitment.view/manage (already defined in
  20260712014000_005_erp_rbac_schema.sql and already granted to HR
  Manager via 20260820090000_016's LIKE 'hr.%' fix) rather than
  fragmenting into five more permission pairs for one cohesive feature.

  ## What this migration deliberately does NOT do
  - Does not create a second approval engine.
  - Does not duplicate departments/branches/employees.
  - Does not modify any existing table or migration.
  - Does not touch Company Admin/Super Admin (bypass is application-level).

  ## Idempotency
  CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
  ON CONFLICT ... DO NOTHING, conditional policy creation — safe to re-run.
*/

CREATE TABLE IF NOT EXISTS job_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  position_title text NOT NULL,
  number_required integer NOT NULL DEFAULT 1,
  reason text,
  employment_type text DEFAULT 'full_time',
  required_qualifications text,
  required_experience text,
  proposed_start_date date,
  salary_range_min numeric(15,2),
  salary_range_max numeric(15,2),
  requested_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  decided_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requisition_id uuid REFERENCES job_requisitions(id) ON DELETE SET NULL,
  position_title text NOT NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  openings_count integer NOT NULL DEFAULT 1,
  description text,
  requirements text,
  opening_date date,
  closing_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'open', 'on_hold', 'closed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vacancy_id uuid REFERENCES vacancies(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  cv_url text,
  source text,
  application_date date DEFAULT CURRENT_DATE,
  qualifications text,
  experience_years numeric(4,1),
  status text NOT NULL DEFAULT 'application' CHECK (status IN (
    'application', 'screening', 'shortlisted', 'interview', 'evaluation',
    'selected', 'offer', 'hired', 'rejected'
  )),
  hired_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  vacancy_id uuid REFERENCES vacancies(id) ON DELETE SET NULL,
  interview_date timestamptz NOT NULL,
  interviewers text,
  interview_type text DEFAULT 'in_person',
  notes text,
  score numeric(4,1),
  recommendation text,
  result text CHECK (result IN ('pending', 'pass', 'fail') OR result IS NULL),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  vacancy_id uuid REFERENCES vacancies(id) ON DELETE SET NULL,
  salary numeric(15,2),
  start_date date,
  employment_type text DEFAULT 'full_time',
  offer_date date DEFAULT CURRENT_DATE,
  expiration_date date,
  benefits text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  responsible_employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  due_date date,
  completion_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  comments text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_requisitions_company ON job_requisitions(company_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_company ON vacancies(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_company ON candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_vacancy ON candidates(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_candidate ON job_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee ON onboarding_tasks(employee_id);

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['job_requisitions', 'vacancies', 'candidates', 'interviews', 'job_offers', 'onboarding_tasks']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can view own company data') THEN
      EXECUTE format('CREATE POLICY "Users can view own company data" ON %I FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can insert own company data') THEN
      EXECUTE format('CREATE POLICY "Users can insert own company data" ON %I FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can update own company data') THEN
      EXECUTE format('CREATE POLICY "Users can update own company data" ON %I FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Users can delete own company data') THEN
      EXECUTE format('CREATE POLICY "Users can delete own company data" ON %I FOR DELETE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))', t);
    END IF;
  END LOOP;
END $$;

INSERT INTO permissions (resource, action, description) VALUES
  ('hr.onboarding', 'view', 'View onboarding checklists'),
  ('hr.onboarding', 'manage', 'Manage onboarding checklists')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant to any role already holding hr.recruitment.manage (onboarding is
-- the natural continuation of recruitment), plus hr.employees.edit as a
-- fallback for roles that don't have recruitment but do manage employees.
DO $$
DECLARE
  r RECORD;
  new_perm RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT rp.role_id
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE (p.resource = 'hr.recruitment' AND p.action = 'manage')
       OR (p.resource = 'hr.employees' AND p.action = 'edit')
  LOOP
    FOR new_perm IN SELECT id FROM permissions WHERE resource = 'hr.onboarding' LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, new_perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
