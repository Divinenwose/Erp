/*
  # Grant remaining Administration Manager permissions

  ## Problem
  A follow-up audit of app/(dashboard)/administration found 11 permission
  strings that config/navigation.ts's Administration section (and, for six
  of them, the corresponding page's own internal PermissionGuard) already
  requires, but that were never created as rows in `permissions` and/or
  never granted to the 'Administration Manager' role by any prior
  migration:

  Already-covered resource families, but missing this specific sub-resource
  row (the family's wildcard grant in 20260712014000_005_erp_rbac_schema.sql
  only matched rows that existed in `permissions` at the time it ran, so a
  row added later is not swept in retroactively):
  - assets.movement       (Assets > Movement History)
  - supplies.low_stock    (Office Supplies > Low Stock)
  - vendors.quotations    (Vendors > Quotations)
  - vendors.performance   (Vendors > Performance)

  Entirely new resource families (no prior migration covers these; each
  string below is already hard-coded into that page's own
  <PermissionGuard permission="..."> check, so this migration persists
  what the application code already expects rather than inventing new
  permission semantics):
  - approvals, approvals.workflows
  - audit_logs
  - birthdays
  - calendar
  - meetings
  - notifications

  ## What this migration does
  1. Idempotently inserts these 11 permission rows if not already present.
  2. Grants them to the existing 'Administration Manager' role only,
     looked up by name (not a hardcoded id, not a user id). No-op if that
     role does not exist. Mirrors the exact pattern used in
     20260712014000_005_erp_rbac_schema.sql and
     20260815120000_009_fix_administration_manager_permissions.sql.

  ## What this migration deliberately does NOT do
  - Does not modify or delete any existing migration file.
  - Does not create or modify the 'Administration Manager' role itself.
  - Does not touch Company Admin / Super Admin — their access comes from
    the existing isCompanyAdmin()/isSuperAdmin() bypass in the
    application code, not from role_permissions rows.
  - Does not touch any other role, and does not grant by user id.
  - Does not change RLS policies or profile.role.
  - Does not grant access to any other department.

  ## Idempotency
  - Permission inserts use `ON CONFLICT (resource, action) DO NOTHING`,
    matching the real `UNIQUE(resource, action)` constraint on
    `permissions`.
  - The grant uses `ON CONFLICT (role_id, permission_id) DO NOTHING`,
    matching the real `UNIQUE(role_id, permission_id)` constraint on
    `role_permissions`.
  - As in the prior fix migration, the PL/pgSQL variable is named
    `v_role_id` (not `role_id`) to avoid the "column reference role_id is
    ambiguous" error that the equivalent blocks in
    20260712014000_005_erp_rbac_schema.sql raise (verified locally) by
    reusing the column name as their variable name.
*/

-- 1. Ensure the permission rows exist (safe no-op if already present)
INSERT INTO permissions (resource, action, description) VALUES
  ('assets.movement', 'view', 'View asset movement history'),
  ('supplies.low_stock', 'view', 'View low stock supplies'),
  ('vendors.quotations', 'view', 'View vendor quotations'),
  ('vendors.performance', 'view', 'View vendor performance'),
  ('approvals', 'view', 'View Approvals section'),
  ('approvals.workflows', 'view', 'View approval workflows'),
  ('audit_logs', 'view', 'View audit logs'),
  ('birthdays', 'view', 'View Birthdays section'),
  ('calendar', 'view', 'View Administration calendar'),
  ('meetings', 'view', 'View Meetings section'),
  ('notifications', 'view', 'View Administration notifications')
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
    WHERE p.resource IN (
      'assets.movement',
      'supplies.low_stock',
      'vendors.quotations',
      'vendors.performance',
      'approvals',
      'approvals.workflows',
      'audit_logs',
      'birthdays',
      'calendar',
      'meetings',
      'notifications'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
