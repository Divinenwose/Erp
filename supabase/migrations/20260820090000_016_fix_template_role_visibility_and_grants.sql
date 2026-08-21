/*
  # Fix template role visibility and broken permission grants

  ## Problem (found while answering "how do I create an HR Manager role")

  Two independent, compounding bugs in
  20260712014000_005_erp_rbac_schema.sql mean the 10 non-Super-Admin
  template roles it defines (HR Manager, Company Admin, Finance Manager,
  Administration Manager, Procurement Officer, Inventory Manager, Sales
  Manager, Project Manager, Employee, Viewer) are effectively unusable as
  shipped:

  1. INVISIBLE IN THE UI. They're seeded with `is_system = false` and no
     `company_id` (defaults to NULL). The role picker in
     app/(dashboard)/settings/users/page.tsx queries
     `.or('company_id.eq.<company>,is_system.eq.true')` — a role with
     company_id NULL and is_system false matches neither clause (verified
     locally: a role seeded exactly this way returns zero rows from that
     exact query). These roles cannot be assigned to anyone through the
     Settings UI, regardless of whether the row exists.

  2. BROKEN GRANTS. Every one of 005's per-role permission-grant blocks
     declares a PL/pgSQL variable named `role_id`, then does
     `... ON CONFLICT (role_id, permission_id) ...` — role_id collides
     with the role_permissions.role_id column at that position and raises
     "column reference role_id is ambiguous" (verified locally, reproduced
     with 005's exact HR Manager block). So even where a role row exists,
     it likely has zero permissions actually granted.

  This migration fixes both, for every affected role, using 005's exact
  original WHERE-clause intent per role — nothing here changes which
  permissions each role is meant to have, only makes the grant actually
  succeed and the role actually visible/assignable.

  ## What this migration deliberately does NOT do
  - Does not modify or delete 005 or any other existing migration.
  - Does not create any new role — only updates existing rows and grants
    permissions to whichever of these role names already exist (each
    block is a no-op if that role isn't present).
  - Does not change what Company Admin/Super Admin's application-level
    access bypass relies on (isCompanyAdmin()/isSuperAdmin() check role
    name presence, not is_system) — marking them is_system = true only
    fixes their visibility in the assignment picker, it does not change
    any authorization logic.
  - Does not touch RLS, employees, or any unrelated table.

  ## Safety review findings
  - Role lookups are scoped to `company_id IS NULL` explicitly, not just
    `name = 'X'`, so a company that has created its own custom role
    coincidentally sharing one of these 10 names is never matched by
    mistake — only the actual unscoped template row is targeted.
  - app/(dashboard)/settings/roles/page.tsx already treats
    `is_system = true` as fully immutable through its own UI: editing is
    blocked outright ("Cannot edit system roles"), not just the name, and
    the Delete action is hidden. This migration does not introduce that
    behavior — it is pre-existing application logic already applied to
    Super Admin — but flipping these 10 roles to is_system = true means a
    Company Admin will no longer be able to adjust their permissions
    through that UI; further changes would need another migration, the
    same way Super Admin's permissions already work today.
  - The existing RLS SELECT policy on `roles`
    (20260712014000_005_erp_rbac_schema.sql) already allows reading rows
    where `company_id IS NULL`, independent of is_system — the actual bug
    is that the application's query filter
    (`company_id.eq.<company>,is_system.eq.true`) is narrower than what
    RLS permits. Setting is_system = true works within RLS exactly as
    already designed, without any RLS or company-isolation change.

  ## Idempotency
  `UPDATE ... WHERE is_system = false` is naturally idempotent (no-op on
  re-run once already true). Every grant uses
  `ON CONFLICT (role_id, permission_id) DO NOTHING`. Safe to re-run.
*/

-- 1. Make every unscoped template role visible/assignable in the Settings
--    UI, matching how the app's own role picker already expects roles to
--    be flagged (is_system = true), rather than editing that query.
UPDATE roles
SET is_system = true
WHERE company_id IS NULL
  AND is_system = false
  AND name IN (
    'Company Admin', 'HR Manager', 'Finance Manager', 'Administration Manager',
    'Procurement Officer', 'Inventory Manager', 'Sales Manager', 'Project Manager',
    'Employee', 'Viewer'
  );

-- 2. Re-run every role's grant block from 005, with the variable renamed
--    to v_role_id to avoid the ambiguous-column error.

DO $$
DECLARE v_role_id uuid; perm_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Company Admin' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    FOR perm_id IN SELECT id FROM permissions WHERE resource NOT IN ('roles', 'permissions') LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, perm_id) ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'HR Manager' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'hr') OR p.resource LIKE 'hr.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Finance Manager' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'finance', 'reports')
       OR p.resource LIKE 'finance.%'
       OR p.resource LIKE 'reports.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Administration Manager' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'facilities', 'assets', 'reception', 'supplies', 'vendors', 'documents')
       OR p.resource LIKE 'facilities.%'
       OR p.resource LIKE 'assets.%'
       OR p.resource LIKE 'reception.%'
       OR p.resource LIKE 'supplies.%'
       OR p.resource LIKE 'vendors.%'
       OR p.resource LIKE 'documents.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Procurement Officer' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'procurement') OR p.resource LIKE 'procurement.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Inventory Manager' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'inventory') OR p.resource LIKE 'inventory.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Sales Manager' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'crm') OR p.resource LIKE 'crm.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Project Manager' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource IN ('dashboard', 'projects') OR p.resource LIKE 'projects.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Employee' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.resource = 'dashboard'
       OR (p.resource = 'hr.leave' AND p.action IN ('view', 'create'))
       OR (p.resource = 'hr.attendance' AND p.action = 'view')
       OR (p.resource = 'hr.performance' AND p.action = 'view')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'Viewer' AND company_id IS NULL LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id FROM permissions p
    WHERE p.action = 'view'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
