-- Assign all permissions to Company Admin role
-- This ensures Company Admin has full access to all settings and admin features

-- First, ensure Company Admin role exists as a system role
INSERT INTO roles (company_id, name, description, is_system)
VALUES (
  NULL, -- NULL company_id for system roles
  'Company Admin',
  'Company Administrator with full access to all company settings and features',
  true
)
ON CONFLICT (company_id, name) DO NOTHING;

-- Assign all permissions to Company Admin role (including roles and permissions management)
-- This overrides the restriction in migration 005 that excluded these permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Company Admin' LIMIT 1),
  id
FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Also assign all permissions to Super Admin role if it exists
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'Super Admin' AND is_system = true LIMIT 1),
  id
FROM permissions
WHERE (SELECT id FROM roles WHERE name = 'Super Admin' AND is_system = true LIMIT 1) IS NOT NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;
