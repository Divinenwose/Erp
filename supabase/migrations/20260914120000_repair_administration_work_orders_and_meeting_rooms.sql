-- Repair Administration objects whose original migration used inconsistent
-- names or invalid SQL. All statements are safe to run after a partial deploy.

CREATE TABLE IF NOT EXISTS meeting_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  location text,
  capacity integer,
  facilities text[],
  status text DEFAULT 'available' CHECK (status IN ('available', 'maintenance', 'unavailable')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_rooms ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_meeting_rooms_company ON meeting_rooms(company_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_rooms'
      AND policyname = 'company_select_meeting_rooms'
  ) THEN
    CREATE POLICY company_select_meeting_rooms ON meeting_rooms
      FOR SELECT TO authenticated USING (company_id = user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_rooms'
      AND policyname = 'company_insert_meeting_rooms'
  ) THEN
    CREATE POLICY company_insert_meeting_rooms ON meeting_rooms
      FOR INSERT TO authenticated WITH CHECK (company_id = user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_rooms'
      AND policyname = 'company_update_meeting_rooms'
  ) THEN
    CREATE POLICY company_update_meeting_rooms ON meeting_rooms
      FOR UPDATE TO authenticated
      USING (company_id = user_company_id())
      WITH CHECK (company_id = user_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'meeting_rooms'
      AND policyname = 'company_delete_meeting_rooms'
  ) THEN
    CREATE POLICY company_delete_meeting_rooms ON meeting_rooms
      FOR DELETE TO authenticated USING (company_id = user_company_id());
  END IF;
END $$;

INSERT INTO permissions (resource, action, description) VALUES
  ('work_orders', 'view', 'View work orders'),
  ('work_orders', 'create', 'Create work orders'),
  ('work_orders', 'edit', 'Edit work orders'),
  ('work_orders', 'delete', 'Delete work orders'),
  ('work_orders', 'export', 'Export work orders')
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
    WHERE p.resource = 'work_orders'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;
