/*
  # Administration: WPI and TGIF report support

  ## Problem
  The client wants two recurring Administration reports (per their own
  spec, screenshot-provided):
  14. Weekly Performance Indicator (WPI) Report — a KPI table (target vs
      achieved vs achievement %) plus a small dashboard.
  15. TGIF Management Report — an 8-section weekly report intended to be
      presented like a slide deck (Executive Summary, Administrative
      Activities Completed, Attendance Overview, Purchases and Expenses,
      Completed Maintenance Activities, Challenges Encountered,
      Recommendations, Action Plan for Next Week).

  Most of these sections/KPIs can be computed live from existing tables
  (attendance_records, work_orders, purchase_requests, request_approvals)
  — no new table needed for those, and none is created here. Two things
  genuinely have no existing home:
  1. KPI *targets* (e.g. "95% attendance compliance") are business goals,
     not something derivable from data — there is nothing today to edit
     or persist them.
  2. TGIF's narrative sections (Executive Summary, Challenges
     Encountered, Recommendations, Action Plan for Next Week) are
     qualitative, written by a person each week — there is no table to
     hold them, and fabricating their content would violate the
     no-fake-data rule this whole module has followed.

  ## What this migration does
  - kpi_targets: one row per company/kpi_key, holds the current target
    value. Achieved values are always computed live from source tables,
    never stored here.
  - tgif_reports: one row per company/week, holding the four narrative
    fields plus who wrote it. All quantitative TGIF sections are
    computed live at render time from existing tables and are not
    duplicated into this table.
  - New permissions: hr.reports... no — these are Administration reports,
    so they reuse the existing admin_reports.view permission
    (config/navigation.ts's Reports section) for viewing, and add
    admin_reports.manage for editing targets/narrative content, since no
    "manage" permission existed for this resource before.

  ## What this migration deliberately does NOT do
  - Does not create a second reporting engine or duplicate any existing
    table (attendance_records, work_orders, purchase_requests,
    request_approvals are reused as-is).
  - Does not generate an actual .pptx file — that is a separate,
    larger piece of work (a real export pipeline) not attempted here.
  - Does not modify any existing table or migration.

  ## Idempotency
  CREATE TABLE IF NOT EXISTS, ON CONFLICT ... DO NOTHING, conditional
  policy creation — safe to re-run.
*/

CREATE TABLE IF NOT EXISTS kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kpi_key text NOT NULL,
  target_value numeric(10,2) NOT NULL,
  updated_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, kpi_key)
);

CREATE TABLE IF NOT EXISTS tgif_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  executive_summary text,
  challenges_encountered text,
  recommendations text,
  action_plan_next_week text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, week_start_date)
);

ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tgif_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kpi_targets' AND policyname = 'Users can view own company data') THEN
    CREATE POLICY "Users can view own company data" ON kpi_targets FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kpi_targets' AND policyname = 'Users can insert own company data') THEN
    CREATE POLICY "Users can insert own company data" ON kpi_targets FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kpi_targets' AND policyname = 'Users can update own company data') THEN
    CREATE POLICY "Users can update own company data" ON kpi_targets FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tgif_reports' AND policyname = 'Users can view own company data') THEN
    CREATE POLICY "Users can view own company data" ON tgif_reports FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tgif_reports' AND policyname = 'Users can insert own company data') THEN
    CREATE POLICY "Users can insert own company data" ON tgif_reports FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tgif_reports' AND policyname = 'Users can update own company data') THEN
    CREATE POLICY "Users can update own company data" ON tgif_reports FOR UPDATE USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

INSERT INTO permissions (resource, action, description) VALUES
  ('admin_reports', 'manage', 'Edit KPI targets and weekly report narrative sections')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant to any role already holding admin_reports.view (this is purely an
-- editing capability for a resource those roles can already see).
DO $$
DECLARE
  r RECORD;
  new_perm_id uuid;
BEGIN
  SELECT id INTO new_perm_id FROM permissions WHERE resource = 'admin_reports' AND action = 'manage';
  IF new_perm_id IS NOT NULL THEN
    FOR r IN
      SELECT DISTINCT rp.role_id
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.resource = 'admin_reports' AND p.action = 'view'
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (r.role_id, new_perm_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;
