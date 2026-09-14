-- Ensure Administration Manager roles can use the action buttons on all
-- administration module pages, not only view the pages.

INSERT INTO permissions (resource, action, description)
SELECT resource, action, description
FROM (VALUES
  ('facilities', 'view', 'View Facilities'),
  ('facilities.maintenance', 'create', 'Create maintenance requests'),
  ('facilities.maintenance', 'edit', 'Edit maintenance requests'),
  ('facilities.maintenance', 'delete', 'Delete maintenance requests'),
  ('facilities.utilities', 'create', 'Create utilities'),
  ('facilities.utilities', 'edit', 'Edit utilities'),
  ('facilities.utilities', 'delete', 'Delete utilities'),
  ('facilities.cleaning', 'create', 'Create cleaning schedules'),
  ('facilities.cleaning', 'edit', 'Edit cleaning schedules'),
  ('facilities.cleaning', 'delete', 'Delete cleaning schedules'),
  ('facilities.relocation', 'create', 'Create office relocations'),
  ('facilities.relocation', 'edit', 'Edit office relocations'),
  ('facilities.relocation', 'delete', 'Delete office relocations'),
  ('facilities.meeting_rooms', 'create', 'Create meeting rooms'),
  ('facilities.meeting_rooms', 'edit', 'Edit meeting rooms'),
  ('facilities.meeting_rooms', 'delete', 'Delete meeting rooms'),
  ('assets', 'view', 'View Assets'),
  ('assets', 'create', 'Create assets'),
  ('assets', 'edit', 'Edit assets'),
  ('assets', 'delete', 'Delete assets'),
  ('assets.furniture', 'create', 'Create furniture'),
  ('assets.furniture', 'edit', 'Edit furniture'),
  ('assets.furniture', 'delete', 'Delete furniture'),
  ('assets.equipment', 'create', 'Create equipment'),
  ('assets.equipment', 'edit', 'Edit equipment'),
  ('assets.equipment', 'delete', 'Delete equipment'),
  ('assets.vehicles', 'create', 'Create vehicles'),
  ('assets.vehicles', 'edit', 'Edit vehicles'),
  ('assets.vehicles', 'delete', 'Delete vehicles'),
  ('assets.assignment', 'create', 'Create asset assignments'),
  ('assets.assignment', 'edit', 'Edit asset assignments'),
  ('assets.assignment', 'delete', 'Delete asset assignments'),
  ('assets.maintenance', 'create', 'Create asset maintenance'),
  ('assets.maintenance', 'edit', 'Edit asset maintenance'),
  ('assets.maintenance', 'delete', 'Delete asset maintenance'),
  ('assets.movement', 'create', 'Create asset movements'),
  ('assets.movement', 'edit', 'Edit asset movements'),
  ('assets.movement', 'delete', 'Delete asset movements'),
  ('reception.visitors', 'create', 'Create visitor records'),
  ('reception.visitors', 'edit', 'Edit visitor records'),
  ('reception.visitors', 'delete', 'Delete visitor records'),
  ('reception.courier', 'create', 'Create courier records'),
  ('reception.courier', 'edit', 'Edit courier records'),
  ('reception.courier', 'delete', 'Delete courier records'),
  ('reception.incoming_mail', 'create', 'Create incoming mail records'),
  ('reception.incoming_mail', 'edit', 'Edit incoming mail records'),
  ('reception.incoming_mail', 'delete', 'Delete incoming mail records'),
  ('reception.outgoing_mail', 'create', 'Create outgoing mail records'),
  ('reception.outgoing_mail', 'edit', 'Edit outgoing mail records'),
  ('reception.outgoing_mail', 'delete', 'Delete outgoing mail records'),
  ('supplies.inventory', 'create', 'Create supply inventory records'),
  ('supplies.inventory', 'edit', 'Edit supply inventory records'),
  ('supplies.inventory', 'delete', 'Delete supply inventory records'),
  ('supplies.requests', 'create', 'Create supply requests'),
  ('supplies.requests', 'edit', 'Edit supply requests'),
  ('supplies.requests', 'delete', 'Delete supply requests'),
  ('supplies.issuance', 'create', 'Create supply issuances'),
  ('supplies.issuance', 'edit', 'Edit supply issuances'),
  ('supplies.issuance', 'delete', 'Delete supply issuances'),
  ('vendors.cleaning', 'create', 'Create cleaning vendors'),
  ('vendors.cleaning', 'edit', 'Edit cleaning vendors'),
  ('vendors.cleaning', 'delete', 'Delete cleaning vendors'),
  ('vendors.maintenance', 'create', 'Create maintenance vendors'),
  ('vendors.maintenance', 'edit', 'Edit maintenance vendors'),
  ('vendors.maintenance', 'delete', 'Delete maintenance vendors'),
  ('vendors.internet', 'create', 'Create internet providers'),
  ('vendors.internet', 'edit', 'Edit internet providers'),
  ('vendors.internet', 'delete', 'Delete internet providers'),
  ('vendors.electricity', 'create', 'Create electricity providers'),
  ('vendors.electricity', 'edit', 'Edit electricity providers'),
  ('vendors.electricity', 'delete', 'Delete electricity providers'),
  ('documents.policies', 'create', 'Create company policies'),
  ('documents.policies', 'edit', 'Edit company policies'),
  ('documents.policies', 'delete', 'Delete company policies'),
  ('documents.letters', 'create', 'Create letters'),
  ('documents.letters', 'edit', 'Edit letters'),
  ('documents.letters', 'delete', 'Delete letters'),
  ('documents.minutes', 'create', 'Create meeting minutes'),
  ('documents.minutes', 'edit', 'Edit meeting minutes'),
  ('documents.minutes', 'delete', 'Delete meeting minutes'),
  ('documents.archive', 'create', 'Create archive records'),
  ('documents.archive', 'edit', 'Edit archive records'),
  ('documents.archive', 'delete', 'Delete archive records')
) AS seed(resource, action, description)
ON CONFLICT (resource, action) DO NOTHING;

DO $$
DECLARE
  v_role_id uuid;
BEGIN
  FOR v_role_id IN
    SELECT id FROM roles WHERE name = 'Administration Manager'
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, p.id
    FROM permissions p
    WHERE p.resource IN ('facilities', 'assets')
       OR p.resource LIKE 'facilities.%'
       OR p.resource LIKE 'assets.%'
       OR p.resource LIKE 'reception.%'
       OR p.resource LIKE 'supplies.%'
       OR p.resource LIKE 'vendors.%'
       OR p.resource LIKE 'documents.%'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;
