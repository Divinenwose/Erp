-- Ensure companies RLS policy uses created_by for INSERT
-- This migration fixes the RLS policy that was blocking signup

-- First, ensure created_by column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.companies
      ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop all existing companies policies
DROP POLICY IF EXISTS "users_select_own_company" ON public.companies;
DROP POLICY IF EXISTS "users_update_own_company" ON public.companies;
DROP POLICY IF EXISTS "anyone_insert_company" ON public.companies;
DROP POLICY IF EXISTS "users_delete_own_company" ON public.companies;
DROP POLICY IF EXISTS "users_insert_own_company" ON public.companies;
DROP POLICY IF EXISTS "authenticated_insert_company" ON public.companies;

-- Create correct policies using created_by
CREATE POLICY "users_insert_own_company" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "users_select_own_company" ON public.companies
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR id = user_company_id());

CREATE POLICY "users_update_own_company" ON public.companies
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR id = user_company_id())
  WITH CHECK (created_by = auth.uid() OR id = user_company_id());

CREATE POLICY "users_delete_own_company" ON public.companies
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());
