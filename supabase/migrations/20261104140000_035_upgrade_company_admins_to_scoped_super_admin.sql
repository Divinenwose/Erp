INSERT INTO public.roles (company_id, name, description, is_system)
SELECT DISTINCT profile.company_id,
       'Super Admin',
       'Full access to this company',
       true
FROM public.profiles AS profile
JOIN public.user_roles AS user_role ON user_role.user_id = profile.id
JOIN public.roles AS legacy_role ON legacy_role.id = user_role.role_id
WHERE profile.company_id IS NOT NULL
  AND lower(trim(legacy_role.name)) IN ('company admin', 'company administrator')
ON CONFLICT (company_id, name) DO UPDATE
SET description = EXCLUDED.description,
    is_system = true;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT company_role.id, permission.id
FROM public.roles AS company_role
CROSS JOIN public.permissions AS permission
WHERE company_role.name = 'Super Admin'
  AND company_role.company_id IS NOT NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id, assigned_by)
SELECT DISTINCT profile.id, company_role.id, profile.id
FROM public.profiles AS profile
JOIN public.user_roles AS user_role ON user_role.user_id = profile.id
JOIN public.roles AS legacy_role ON legacy_role.id = user_role.role_id
JOIN public.roles AS company_role
  ON company_role.company_id = profile.company_id
  AND company_role.name = 'Super Admin'
WHERE profile.company_id IS NOT NULL
  AND lower(trim(legacy_role.name)) IN ('company admin', 'company administrator')
ON CONFLICT (user_id, role_id) DO NOTHING;

UPDATE public.profiles AS profile
SET role = 'Super Admin',
    updated_at = now()
WHERE lower(trim(profile.role)) IN ('company admin', 'company administrator')
  AND EXISTS (
    SELECT 1
    FROM public.user_roles AS user_role
    JOIN public.roles AS assigned_role ON assigned_role.id = user_role.role_id
    WHERE user_role.user_id = profile.id
      AND assigned_role.name = 'Super Admin'
      AND assigned_role.company_id = profile.company_id
  );

DELETE FROM public.user_roles AS user_role
USING public.roles AS legacy_role,
      public.profiles AS profile
WHERE user_role.role_id = legacy_role.id
  AND user_role.user_id = profile.id
  AND lower(trim(legacy_role.name)) IN ('company admin', 'company administrator')
  AND EXISTS (
    SELECT 1
    FROM public.user_roles AS upgraded_assignment
    JOIN public.roles AS company_role ON company_role.id = upgraded_assignment.role_id
    WHERE upgraded_assignment.user_id = profile.id
      AND company_role.name = 'Super Admin'
      AND company_role.company_id = profile.company_id
  );