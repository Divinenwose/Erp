-- Ensure Administration Manager can open the Administration Fleet and
-- Approval Workflows pages using the permission keys used by navigation.
INSERT INTO permissions (resource, action, description) VALUES
  ('assets.vehicles', 'view', 'View administration fleet vehicles'),
  ('assets.vehicles', 'create', 'Create administration fleet vehicles'),
  ('assets.vehicles', 'edit', 'Edit administration fleet vehicles'),
  ('assets.vehicles', 'delete', 'Delete administration fleet vehicles'),
  ('approvals.workflows', 'view', 'View approval workflows')
ON CONFLICT (resource, action) DO NOTHING;

DO $$
DECLARE
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = 'Administration Manager'
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, permissions.id
    FROM permissions
    WHERE (resource = 'assets.vehicles' AND action IN ('view', 'create', 'edit', 'delete'))
       OR (resource = 'approvals.workflows' AND action = 'view')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;