-- Re-grant the complete HR permission family to every HR Manager role.
-- This repairs installations where the original seed ran before the role or
-- later HR permissions existed.

DO $$
DECLARE
  v_role_id uuid;
BEGIN
  FOR v_role_id IN
    SELECT id FROM roles WHERE name = 'HR Manager'
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id
    FROM permissions p
    WHERE p.resource IN ('dashboard', 'hr')
       OR p.resource LIKE 'hr.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;