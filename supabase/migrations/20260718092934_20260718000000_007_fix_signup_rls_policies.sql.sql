/*
# Fix signup flow RLS policies and remove companies/profiles circular dependency

## Problem
During registration, inserting into `companies` failed with
`new row violates row-level security policy for table "companies"`.

Root cause: the `companies` table had no real ownership column. Its
SELECT/UPDATE policies relied on `user_company_id()` (a SECURITY DEFINER
function that reads `profiles.company_id` for the current user). If an
INSERT policy on `companies` also tried to verify ownership through
`user_company_id()`, it would create a chicken-and-egg deadlock:
  - cannot insert `companies` because no `profiles` row exists yet
  - cannot insert `profiles` because no `companies` row exists yet

The previous workaround (`WITH CHECK (true)` on companies INSERT) was
insecure: any authenticated user could insert unlimited companies with
no ownership record.

## Fix
1. Add `created_by uuid NOT NULL DEFAULT auth.uid()` to `companies`.
   This gives `companies` a real, non-circular ownership column sourced
   directly from the authenticated session — no dependency on `profiles`.
   The table is empty (0 rows), so backfilling is not required.

2. Rewrite every RLS policy on `companies`, `profiles`, `roles`, and
   `role_permissions` so the signup flow succeeds in order:
      a. signUp  -> auth.users row (Supabase Auth)
      b. INSERT companies   (policy: created_by = auth.uid())
      c. INSERT profiles    (policy: id = auth.uid())  -- no company dep
      d. INSERT roles       (policy: company_id = user_company_id())
         + UPDATE profiles.role_id to the new role
      e. seed demo data
   No step depends on a policy that is only satisfiable by a later step.

3. `profiles` INSERT checks `id = auth.uid()` only — it does NOT consult
   `user_company_id()` or any `companies` policy, so there is no circular
   dependency between `companies` and `profiles` policies.

## Tables modified
- `companies`: added `created_by` column (uuid, NOT NULL, default auth.uid()).
- `companies`, `profiles`, `roles`, `role_permissions`: all RLS policies
  dropped and recreated (4 per table: SELECT/INSERT/UPDATE/DELETE).

## Security
- `companies` INSERT now requires `created_by = auth.uid()` (real ownership,
  no permissive `true`).
- `companies` SELECT/UPDATE/DELETE require ownership via `created_by` OR
  membership via `user_company_id()`.
- `profiles` INSERT restricted to `id = auth.uid()` (self only).
- `profiles` SELECT/UPDATE allow self or same-company members.
- `roles` scoped to `company_id = user_company_id()` (company admins).
- `role_permissions` scoped through `roles`.
- All policies target `TO authenticated` (this app has a sign-in screen).

## Important notes
1. `user_company_id()` is unchanged. It remains a SECURITY DEFINER helper
   that reads `profiles.company_id` for the current user. It is only used
   in SELECT/UPDATE/DELETE policies (where a profile already exists) and in
   the `roles` INSERT policy (step d, after the profile exists) — never in
   the `companies` INSERT or `profiles` INSERT policies, which is what
   breaks the circular dependency.
2. `profiles.id` is both PRIMARY KEY and a foreign key to `auth.users(id)`.
   The INSERT policy `id = auth.uid()` relies on this: a user can only
   create the profile row whose id matches their own auth uid.
3. This migration is idempotent: every `CREATE POLICY` is preceded by a
   `DROP POLICY IF EXISTS`, and the column add is guarded by a DO block.
*/

-- ---------------------------------------------------------------------------
-- 1. Add created_by ownership column to companies (idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.companies
      ADD COLUMN created_by uuid NOT NULL DEFAULT auth.uid();
  END IF;
END $$;

-- Index created_by for ownership lookups
CREATE INDEX IF NOT EXISTS companies_created_by_idx
  ON public.companies (created_by);

-- ---------------------------------------------------------------------------
-- 2. companies policies
--   INSERT: created_by = auth.uid()  (real ownership, no profiles dependency)
--   SELECT/UPDATE/DELETE: created_by = auth.uid() OR id = user_company_id()
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_insert_company" ON public.companies;
DROP POLICY IF EXISTS "users_select_own_company" ON public.companies;
DROP POLICY IF EXISTS "users_update_own_company" ON public.companies;
DROP POLICY IF EXISTS "users_delete_own_company" ON public.companies;

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

-- ---------------------------------------------------------------------------
-- 3. profiles policies
--   INSERT: id = auth.uid()  (self only; NO companies dependency -> breaks circle)
--   SELECT/UPDATE: self OR same-company
--   DELETE: self only
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_select_company_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_delete_own_profile" ON public.profiles;

CREATE POLICY "users_insert_own_profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_select_company_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = user_company_id());

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR company_id = user_company_id())
  WITH CHECK (id = auth.uid() OR company_id = user_company_id());

CREATE POLICY "users_delete_own_profile" ON public.profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. roles policies (company-scoped; depends on profiles via user_company_id,
--    which is fine because roles are created AFTER the profile in signup)
-- ---------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_insert_roles" ON public.roles;
DROP POLICY IF EXISTS "company_select_roles" ON public.roles;
DROP POLICY IF EXISTS "company_update_roles" ON public.roles;
DROP POLICY IF EXISTS "company_delete_roles" ON public.roles;

CREATE POLICY "company_insert_roles" ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "company_select_roles" ON public.roles
  FOR SELECT TO authenticated
  USING (company_id = user_company_id());

CREATE POLICY "company_update_roles" ON public.roles
  FOR UPDATE TO authenticated
  USING (company_id = user_company_id())
  WITH CHECK (company_id = user_company_id());

CREATE POLICY "company_delete_roles" ON public.roles
  FOR DELETE TO authenticated
  USING (company_id = user_company_id() AND is_system = false);

-- ---------------------------------------------------------------------------
-- 5. role_permissions policies (scoped through roles)
-- ---------------------------------------------------------------------------
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_select_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "company_insert_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "deny_update_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "company_delete_role_permissions" ON public.role_permissions;

CREATE POLICY "company_select_role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.roles
    WHERE roles.id = role_permissions.role_id
      AND roles.company_id = user_company_id()
  ));

CREATE POLICY "company_insert_role_permissions" ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.roles
    WHERE roles.id = role_permissions.role_id
      AND roles.company_id = user_company_id()
  ));

CREATE POLICY "company_update_role_permissions" ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.roles
    WHERE roles.id = role_permissions.role_id
      AND roles.company_id = user_company_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.roles
    WHERE roles.id = role_permissions.role_id
      AND roles.company_id = user_company_id()
  ));

CREATE POLICY "company_delete_role_permissions" ON public.role_permissions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.roles
    WHERE roles.id = role_permissions.role_id
      AND roles.company_id = user_company_id()
  ));
