-- Media Department Permissions
-- Add all Media permissions to the permissions table

INSERT INTO permissions (resource, action, description) VALUES
-- Media Module Overview
('media', 'view', 'View media module'),

-- Media Requests
('media.requests', 'view', 'View media requests'),
('media.requests', 'create', 'Create media requests'),
('media.requests', 'edit', 'Edit media requests'),
('media.requests', 'delete', 'Delete media requests'),
('media.requests', 'approve', 'Approve media requests'),
('media.requests', 'reject', 'Reject media requests'),

-- Content Management
('media.content', 'view', 'View media content'),
('media.content', 'create', 'Create media content'),
('media.content', 'edit', 'Edit media content'),
('media.content', 'delete', 'Delete media content'),
('media.content', 'approve', 'Approve media content'),
('media.content', 'publish', 'Publish media content'),
('media.content', 'archive', 'Archive media content'),

-- Media Assets
('media.assets', 'view', 'View media assets'),
('media.assets', 'create', 'Create media assets'),
('media.assets', 'edit', 'Edit media assets'),
('media.assets', 'delete', 'Delete media assets'),
('media.assets', 'archive', 'Archive media assets'),

-- Media Campaigns
('media.campaigns', 'view', 'View media campaigns'),
('media.campaigns', 'create', 'Create media campaigns'),
('media.campaigns', 'edit', 'Edit media campaigns'),
('media.campaigns', 'delete', 'Delete media campaigns'),
('media.campaigns', 'approve', 'Approve media campaigns'),

-- Press Releases
('media.press_releases', 'view', 'View press releases'),
('media.press_releases', 'create', 'Create press releases'),
('media.press_releases', 'edit', 'Edit press releases'),
('media.press_releases', 'delete', 'Delete press releases'),
('media.press_releases', 'approve', 'Approve press'),
('media.press_releases', 'publish', 'Publish press releases'),

-- Media Coverage
('media.coverage', 'view', 'View media coverage'),
('media.coverage', 'create', 'Create media coverage'),
('media.coverage', 'edit', 'Edit media coverage'),
('media.coverage', 'delete', 'Delete media coverage'),

-- Event Coverage
('media.event_coverage', 'view', 'View event coverage'),
('media.event_coverage', 'create', 'Create event coverage requests'),
('media.event_coverage', 'edit', 'Edit event coverage'),
('media.event_coverage', 'delete', 'Delete event coverage'),
('media.event_coverage', 'approve', 'Approve event coverage requests'),
('media.event_coverage', 'assign', 'Assign event coverage team'),

-- Internal Communications
('media.communications', 'view', 'View internal communications'),
('media.communications', 'create', 'Create internal communications'),
('media.communications', 'edit', 'Edit internal communications'),
('media.communications', 'delete', 'Delete internal communications'),
('media.communications', 'approve', 'Approve internal communications'),
('media.communications', 'send', 'Send internal communications'),

-- Newsletters
('media.newsletters', 'view', 'View newsletters'),
('media.newsletters', 'create', 'Create newsletters'),
('media.newsletters', 'edit', 'Edit newsletters'),
('media.newsletters', 'delete', 'Delete newsletters'),
('media.newsletters', 'approve', 'Approve newsletters'),
('media.newsletters', 'send', 'Send newsletters'),

-- Audience Analytics
('media.analytics', 'view', 'View audience analytics'),
('media.analytics', 'export', 'Export audience analytics'),

-- Interviews & Leadership Visibility
('media.interviews', 'view', 'View media interviews'),
('media.interviews', 'create', 'Create media interviews'),
('media.interviews', 'edit', 'Edit media interviews'),
('media.interviews', 'delete', 'Delete media interviews'),

-- Brand & Messaging
('media.brand', 'view', 'View media brand guidelines'),
('media.brand', 'create', 'Create media brand guidelines'),
('media.brand', 'edit', 'Edit media brand guidelines'),
('media.brand', 'delete', 'Delete media brand guidelines'),

-- Copyright & Compliance
('media.copyright', 'view', 'View copyright licenses'),
('media.copyright', 'create', 'Create copyright licenses'),
('media.copyright', 'edit', 'Edit copyright licenses'),
('media.copyright', 'delete', 'Delete copyright licenses'),

-- Media Issues
('media.issues', 'view', 'View media issues'),
('media.issues', 'create', 'Create media issues'),
('media.issues', 'edit', 'Edit media issues'),
('media.issues', 'delete', 'Delete media issues'),
('media.issues', 'resolve', 'Resolve media issues'),

-- Media Vendors & Partners
('media.vendors', 'view', 'View media vendors'),
('media.vendors', 'create', 'Create media vendors'),
('media.vendors', 'edit', 'Edit media vendors'),
('media.vendors', 'delete', 'Delete media vendors'),

-- Media Documents
('media.documents', 'view', 'View media documents'),
('media.documents', 'create', 'Create media documents'),
('media.documents', 'edit', 'Edit media documents'),
('media.documents', 'delete', 'Delete media documents'),

-- Media Reports
('media.reports', 'view', 'View media reports'),
('media.reports', 'export', 'Export media reports'),

-- Media Approvals
('media.approvals', 'view', 'View media approvals'),
('media.approvals', 'approve', 'Approve media requests'),
('media.approvals', 'reject', 'Reject media requests')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant Media permissions to Media Manager role (create if not exists)
DO $$
DECLARE
  v_role_id uuid;
  v_permission_ids uuid[];
BEGIN
  -- Get or create Media Manager role
  SELECT id INTO v_role_id FROM roles WHERE name = 'Media Manager' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NULL THEN
    INSERT INTO roles (name, description, company_id, created_at)
    VALUES ('Media Manager', 'Media Department Manager with full access to media module', NULL, NOW())
    RETURNING id INTO v_role_id;
  END IF;
  
  -- Get all media permissions
  SELECT ARRAY_AGG(id) INTO v_permission_ids 
  FROM permissions 
  WHERE resource = 'media' OR resource LIKE 'media.%';
  
  -- Insert role permissions
  INSERT INTO role_permissions (role_id, permission_id, created_at)
  SELECT v_role_id, unnest(v_permission_ids), NOW()
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;

-- Grant Media permissions to Company Admin role
DO $$
DECLARE
  v_role_id uuid;
  v_permission_ids uuid[];
BEGIN
  -- Get Company Admin role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'Company Admin' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    -- Get all media permissions
    SELECT ARRAY_AGG(id) INTO v_permission_ids 
    FROM permissions 
    WHERE resource = 'media' OR resource LIKE 'media.%';
    
    -- Insert role permissions
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT v_role_id, unnest(v_permission_ids), NOW()
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- Grant Media permissions to Super Admin role (if exists)
DO $$
DECLARE
  v_role_id uuid;
  v_permission_ids uuid[];
BEGIN
  -- Get Super Admin role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'Super Admin' AND company_id IS NULL LIMIT 1;
  
  IF v_role_id IS NOT NULL THEN
    -- Get all media permissions
    SELECT ARRAY_AGG(id) INTO v_permission_ids 
    FROM permissions 
    WHERE resource = 'media' OR resource LIKE 'media.%';
    
    -- Insert role permissions
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT v_role_id, unnest(v_permission_ids), NOW()
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;
