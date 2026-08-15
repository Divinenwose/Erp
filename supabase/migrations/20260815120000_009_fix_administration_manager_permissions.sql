/*
  # Fix missing Administration Manager permissions

  ## Problem
  Six Administration sub-sections (Staff Attendance, Inspections, Fuel
  Management, Drivers, Purchase Requests, Reports) are defined in
  config/navigation.ts and expect specific `resource.action` permission
  strings, but those permission rows and their grant to the
  'Administration Manager' role were only ever defined in
  supabase/migrations/20240730_seed_all_departments_permissions.sql.

  That file's timestamp prefix (20240730) sorts before the migrations that
  create the roles/permissions/role_permissions tables it depends on
  (20260712014000_005_erp_rbac_schema.sql and later), so depending on
  migration application order it may never have applied — leaving
  Administration Manager without these permissions and the corresponding
  sidebar sections silently hidden (working as designed given no
  permission, but not the intended end state).

  ## What this migration does
  1. Idempotently inserts the missing permission rows using the exact
     resource/action strings config/navigation.ts already expects for
     these six sections — no new or renamed resources are introduced.
  2. Grants them to the existing 'Administration Manager' role only,
     looked up by name (not a hardcoded id), mirroring the exact pattern
     already used for every role in 20260712014000_005_erp_rbac_schema.sql.
     No-op if that role does not exist.

  ## What this migration deliberately does NOT do
  - Does not modify or delete any existing migration file.
  - Does not create or modify the 'Administration Manager' role itself —
    only grants permissions to it if it already exists.
  - Does not touch Company Admin / Super Admin — their access comes from
    the existing isCompanyAdmin()/isSuperAdmin() bypass in the
    application code, not from role_permissions rows.
  - Does not touch any other role.
  - Does not change RLS policies.
  - Does not touch the `purchase_requests` table or any other data table —
    only the `resource = 'purchase_requests'` permission string, which is
    unrelated to that table's schema.

  ## Idempotency
  - Permission inserts use `ON CONFLICT (resource, action) DO NOTHING`,
    matching the real `UNIQUE(resource, action)` constraint on
    `permissions` — safe to re-run.
  - The grant uses `ON CONFLICT (role_id, permission_id) DO NOTHING`,
    matching the real `UNIQUE(role_id, permission_id)` constraint on
    `role_permissions` — safe to re-run.
  - Note: the equivalent per-role DO blocks in
    20260712014000_005_erp_rbac_schema.sql declare their loop variable as
    `role_id`, which collides with the `role_permissions.role_id` column
    inside `ON CONFLICT (role_id, ...)` and raises "column reference
    role_id is ambiguous" (verified locally). This migration avoids that
    by naming its variable `v_role_id` instead.
*/

-- 1. Ensure the permission rows exist (safe no-op if already present)
INSERT INTO permissions (resource, action, description) VALUES
  ('attendance', 'view', 'View Staff Attendance section'),
  ('attendance.daily', 'view', 'View daily attendance'),
  ('attendance.clock_in_out', 'view', 'View clock in/out'),
  ('attendance.lateness', 'view', 'View lateness register'),
  ('attendance.absence', 'view', 'View absence register'),
  ('attendance.id_compliance', 'view', 'View ID card compliance'),
  ('attendance.reports', 'view', 'View attendance reports'),
  ('inspections', 'view', 'View Inspections section'),
  ('inspections.cleanliness', 'view', 'View cleanliness inspections'),
  ('inspections.restroom', 'view', 'View restroom inspections'),
  ('inspections.workspace', 'view', 'View workspace inspections'),
  ('inspections.reception', 'view', 'View reception inspections'),
  ('inspections.meeting_rooms', 'view', 'View meeting room inspections'),
  ('inspections.issues', 'view', 'View inspection issues'),
  ('fuel', 'view', 'View Fuel Management section'),
  ('fuel.records', 'view', 'View fuel records'),
  ('fuel.drivers', 'view', 'View driver fuel usage'),
  ('fuel.vehicles', 'view', 'View vehicle fuel history'),
  ('drivers', 'view', 'View Drivers section'),
  ('drivers.list', 'view', 'View drivers list'),
  ('drivers.trips', 'view', 'View driver trips'),
  ('drivers.licenses', 'view', 'View driver licenses'),
  ('purchase_requests', 'view', 'View Purchase Requests section'),
  ('purchase_requests.list', 'view', 'View all purchase requests'),
  ('purchase_requests.pending', 'view', 'View pending purchase requests'),
  ('purchase_requests.my', 'view', 'View my purchase requests'),
  ('purchase_requests.approvals', 'view', 'View purchase request approvals'),
  ('purchase_requests.reports', 'view', 'View purchase request reports'),
  ('admin_reports', 'view', 'View Administration reports')
ON CONFLICT (resource, action) DO NOTHING;

-- 2. Grant them to the Administration Manager role only (no-op if the role
--    does not exist; does not create it)
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Administration Manager' LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource = 'attendance' OR p.resource LIKE 'attendance.%'
       OR p.resource = 'inspections' OR p.resource LIKE 'inspections.%'
       OR p.resource = 'fuel' OR p.resource LIKE 'fuel.%'
       OR p.resource = 'drivers' OR p.resource LIKE 'drivers.%'
       OR p.resource = 'purchase_requests' OR p.resource LIKE 'purchase_requests.%'
       OR p.resource = 'admin_reports' OR p.resource LIKE 'admin_reports.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
