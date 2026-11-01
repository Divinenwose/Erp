CREATE OR REPLACE FUNCTION public.app_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND p.is_active IS TRUE
      AND r.name = 'Super Admin'
      AND (r.company_id IS NULL OR r.company_id = p.company_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.app_has_permission(p_resource text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active IS TRUE
      AND (
        public.app_is_super_admin()
        OR EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          JOIN public.role_permissions rp ON rp.role_id = r.id
          JOIN public.permissions permission ON permission.id = rp.permission_id
          WHERE ur.user_id = p.id
            AND (r.company_id IS NULL OR r.company_id = p.company_id)
            AND permission.resource = p_resource
            AND permission.action = p_action
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.app_can_assign_role(p_role_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.app_is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.roles target_role
      WHERE target_role.id = p_role_id
        AND (target_role.company_id IS NULL OR target_role.company_id = public.user_company_id())
        AND lower(trim(target_role.name)) NOT IN ('super admin', 'company admin', 'company administrator')
        AND NOT EXISTS (
          SELECT 1
          FROM public.role_permissions target_grant
          JOIN public.permissions target_permission ON target_permission.id = target_grant.permission_id
          WHERE target_grant.role_id = target_role.id
            AND NOT EXISTS (
              SELECT 1
              FROM public.user_roles actor_role
              JOIN public.role_permissions actor_grant ON actor_grant.role_id = actor_role.role_id
              JOIN public.permissions actor_permission ON actor_permission.id = actor_grant.permission_id
              JOIN public.roles actor_role_definition ON actor_role_definition.id = actor_role.role_id
              WHERE actor_role.user_id = auth.uid()
                AND (actor_role_definition.company_id IS NULL OR actor_role_definition.company_id = public.user_company_id())
                AND actor_permission.resource = target_permission.resource
                AND actor_permission.action = target_permission.action
            )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.app_user_company(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT company_id FROM public.profiles WHERE id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.app_user_department(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT department_id FROM public.profiles WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.app_is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_has_permission(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_assign_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_user_department(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_has_permission(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_can_assign_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_user_company(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_user_department(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.app_is_super_admin() THEN
    RAISE EXCEPTION 'Only a Super Admin can change the legacy profile role';
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id
     AND NEW.department_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.departments d
       WHERE d.id = NEW.department_id AND d.company_id = NEW.company_id
     ) THEN
    RAISE EXCEPTION 'A profile department must belong to the same company';
  END IF;

  IF NEW.branch_id IS DISTINCT FROM OLD.branch_id
     AND NEW.branch_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.branches b
       WHERE b.id = NEW.branch_id AND b.company_id = NEW.company_id
     ) THEN
    RAISE EXCEPTION 'A profile branch must belong to the same company';
  END IF;

  IF auth.uid() = OLD.id
     AND (
       NEW.company_id IS DISTINCT FROM OLD.company_id
       OR (
         NOT public.app_is_super_admin()
         AND (
           NEW.department_id IS DISTINCT FROM OLD.department_id
           OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
           OR NEW.role IS DISTINCT FROM OLD.role
           OR NEW.is_active IS DISTINCT FROM OLD.is_active
         )
       )
     ) THEN
    RAISE EXCEPTION 'Users cannot change their own company, department, role, or active status';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privilege_changes_trigger ON public.profiles;
CREATE TRIGGER guard_profile_privilege_changes_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_changes();

DROP POLICY IF EXISTS "anyone_insert_company" ON public.companies;
DROP POLICY IF EXISTS "users_insert_own_company" ON public.companies;
DROP POLICY IF EXISTS "users_delete_own_company" ON public.companies;
DROP POLICY IF EXISTS "users_update_own_company" ON public.companies;
DROP POLICY IF EXISTS companies_update_authorized ON public.companies;
CREATE POLICY companies_update_authorized ON public.companies
  FOR UPDATE TO authenticated
  USING (
    id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('settings.company', 'edit')
    )
  )
  WITH CHECK (
    id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('settings.company', 'edit')
    )
  );

DROP POLICY IF EXISTS "company_insert_departments" ON public.departments;
DROP POLICY IF EXISTS "company_update_departments" ON public.departments;
DROP POLICY IF EXISTS "company_delete_departments" ON public.departments;
DROP POLICY IF EXISTS departments_insert_authorized ON public.departments;
DROP POLICY IF EXISTS departments_update_authorized ON public.departments;
DROP POLICY IF EXISTS departments_delete_authorized ON public.departments;
CREATE POLICY departments_insert_authorized ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND (
      head_id IS NULL
      OR public.app_user_company(head_id) = company_id
    )
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('settings.departments', 'create')
      OR public.app_has_permission('departments', 'manage')
    )
  );

CREATE POLICY departments_update_authorized ON public.departments
  FOR UPDATE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('settings.departments', 'edit')
      OR public.app_has_permission('departments', 'manage')
    )
  )
  WITH CHECK (
    company_id = public.user_company_id()
    AND (
      head_id IS NULL
      OR public.app_user_company(head_id) = company_id
    )
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('settings.departments', 'edit')
      OR public.app_has_permission('departments', 'manage')
    )
  );

CREATE POLICY departments_delete_authorized ON public.departments
  FOR DELETE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('settings.departments', 'delete')
      OR public.app_has_permission('departments', 'manage')
    )
  );

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_select_company_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_delete_own_profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_scoped ON public.profiles;
DROP POLICY IF EXISTS profiles_update_scoped ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_scoped ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      company_id = public.user_company_id()
      AND (
        public.app_has_permission('settings.users', 'view')
        OR (
          public.app_has_permission('hr.employees', 'view')
          AND (
            department_id = public.app_user_department(auth.uid())
            OR EXISTS (
              SELECT 1 FROM public.departments d
              WHERE d.id = profiles.department_id AND d.head_id = auth.uid()
            )
          )
        )
      )
    )
  );

CREATE POLICY profiles_update_scoped ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (
      company_id = public.user_company_id()
      AND public.app_has_permission('settings.users', 'edit')
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR (
      company_id = public.user_company_id()
      AND public.app_has_permission('settings.users', 'edit')
    )
  );

CREATE POLICY profiles_delete_scoped ON public.profiles
  FOR DELETE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND public.app_has_permission('settings.users', 'delete')
    AND id <> auth.uid()
  );

DROP POLICY IF EXISTS "company_select_employees" ON public.employees;
DROP POLICY IF EXISTS "company_insert_employees" ON public.employees;
DROP POLICY IF EXISTS "company_update_employees" ON public.employees;
DROP POLICY IF EXISTS "company_delete_employees" ON public.employees;
DROP POLICY IF EXISTS employees_select_scoped ON public.employees;
DROP POLICY IF EXISTS employees_insert_authorized ON public.employees;
DROP POLICY IF EXISTS employees_update_authorized ON public.employees;
DROP POLICY IF EXISTS employees_delete_authorized ON public.employees;
CREATE POLICY employees_select_scoped ON public.employees
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      user_id = auth.uid()
      OR public.app_has_permission('hr.employees', 'view')
      OR EXISTS (
        SELECT 1 FROM public.departments d
        WHERE d.id = employees.department_id
          AND d.head_id = auth.uid()
          AND d.company_id = employees.company_id
      )
    )
  );

CREATE POLICY employees_insert_authorized ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND (
      public.app_has_permission('hr.employees', 'create')
      OR public.app_has_permission('settings.users', 'create')
    )
  );

CREATE POLICY employees_update_authorized ON public.employees
  FOR UPDATE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_has_permission('hr.employees', 'edit')
      OR public.app_has_permission('settings.users', 'edit')
    )
  )
  WITH CHECK (
    company_id = public.user_company_id()
    AND (
      public.app_has_permission('hr.employees', 'edit')
      OR public.app_has_permission('settings.users', 'edit')
    )
  );

CREATE POLICY employees_delete_authorized ON public.employees
  FOR DELETE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employees', 'delete')
  );

DROP POLICY IF EXISTS "company_select_roles" ON public.roles;
DROP POLICY IF EXISTS roles_select_company_and_templates ON public.roles;
CREATE POLICY roles_select_company_and_templates ON public.roles
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    OR is_system IS TRUE
    OR company_id IS NULL
  );

DROP POLICY IF EXISTS "company_select_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_select_company_and_templates ON public.role_permissions;
CREATE POLICY role_permissions_select_company_and_templates ON public.role_permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND (
          r.company_id = public.user_company_id()
          OR r.is_system IS TRUE
          OR r.company_id IS NULL
        )
    )
  );

DROP POLICY IF EXISTS "users_select_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_insert_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_delete_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select_scoped ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_scoped ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_scoped ON public.user_roles;
CREATE POLICY user_roles_select_scoped ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.app_has_permission('settings.users', 'view')
    OR public.app_has_permission('roles', 'view')
  );

CREATE POLICY user_roles_insert_scoped ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id <> auth.uid()
    AND public.app_user_company(user_id) = public.user_company_id()
    AND (
      public.app_has_permission('settings.users', 'create')
      OR public.app_has_permission('settings.users', 'edit')
    )
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = user_roles.role_id
        AND (r.company_id IS NULL OR r.company_id = public.user_company_id())
        AND (
          lower(trim(r.name)) NOT IN ('super admin', 'company admin', 'company administrator')
          OR public.app_is_super_admin()
        )
        AND public.app_can_assign_role(r.id)
    )
  );

CREATE POLICY user_roles_delete_scoped ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    user_id <> auth.uid()
    AND public.app_user_company(user_id) = public.user_company_id()
    AND public.app_has_permission('settings.users', 'edit')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = user_roles.role_id
        AND (
          lower(trim(r.name)) NOT IN ('super admin', 'company admin', 'company administrator')
          OR public.app_is_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "company_insert_roles" ON public.roles;
DROP POLICY IF EXISTS "company_update_roles" ON public.roles;
DROP POLICY IF EXISTS "company_delete_roles" ON public.roles;
DROP POLICY IF EXISTS roles_insert_authorized ON public.roles;
DROP POLICY IF EXISTS roles_update_authorized ON public.roles;
DROP POLICY IF EXISTS roles_delete_authorized ON public.roles;
CREATE POLICY roles_insert_authorized ON public.roles
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND is_system IS FALSE
    AND public.app_has_permission('roles', 'create')
  );

CREATE POLICY roles_update_authorized ON public.roles
  FOR UPDATE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND is_system IS FALSE
    AND public.app_has_permission('roles', 'edit')
  )
  WITH CHECK (
    company_id = public.user_company_id()
    AND is_system IS FALSE
    AND public.app_has_permission('roles', 'edit')
  );

CREATE POLICY roles_delete_authorized ON public.roles
  FOR DELETE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND is_system IS FALSE
    AND public.app_has_permission('roles', 'delete')
  );

DROP POLICY IF EXISTS "company_insert_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "company_update_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "company_delete_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_insert_authorized ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_update_authorized ON public.role_permissions;
DROP POLICY IF EXISTS role_permissions_delete_authorized ON public.role_permissions;
CREATE POLICY role_permissions_insert_authorized ON public.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.app_has_permission('roles', 'edit')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.company_id = public.user_company_id()
        AND r.is_system IS FALSE
    )
  );

CREATE POLICY role_permissions_update_authorized ON public.role_permissions
  FOR UPDATE TO authenticated
  USING (
    public.app_has_permission('roles', 'edit')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.company_id = public.user_company_id()
        AND r.is_system IS FALSE
    )
  )
  WITH CHECK (
    public.app_has_permission('roles', 'edit')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.company_id = public.user_company_id()
        AND r.is_system IS FALSE
    )
  );

CREATE POLICY role_permissions_delete_authorized ON public.role_permissions
  FOR DELETE TO authenticated
  USING (
    public.app_has_permission('roles', 'edit')
    AND EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.company_id = public.user_company_id()
        AND r.is_system IS FALSE
    )
  );

DROP POLICY IF EXISTS "company_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_insert_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "company_delete_tasks" ON public.tasks;
DROP POLICY IF EXISTS tasks_select_scoped ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_scoped ON public.tasks;
DROP POLICY IF EXISTS tasks_update_scoped ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_scoped ON public.tasks;
CREATE POLICY tasks_select_scoped ON public.tasks
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('projects.tasks', 'view')
      OR public.app_has_permission('tasks', 'view')
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = tasks.assigned_to AND e.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        JOIN public.departments d ON d.id = e.department_id
        WHERE e.id = tasks.assigned_to
          AND d.head_id = auth.uid()
          AND e.company_id = tasks.company_id
          AND d.company_id = tasks.company_id
      )
    )
  );

CREATE POLICY tasks_insert_scoped ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('projects.tasks', 'create')
      OR public.app_has_permission('tasks', 'create')
    )
    AND (
      assigned_to IS NULL
      OR public.app_has_permission('projects.tasks', 'assign')
      OR public.app_has_permission('tasks', 'assign')
      OR EXISTS (
        SELECT 1 FROM public.employees e
        JOIN public.departments d ON d.id = e.department_id
        WHERE e.id = tasks.assigned_to
          AND e.company_id = tasks.company_id
          AND d.head_id = auth.uid()
          AND d.company_id = tasks.company_id
      )
    )
  );

CREATE POLICY tasks_update_scoped ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('projects.tasks', 'edit')
      OR public.app_has_permission('tasks', 'edit')
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.id = tasks.assigned_to AND e.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        JOIN public.departments d ON d.id = e.department_id
        WHERE e.id = tasks.assigned_to
          AND d.head_id = auth.uid()
          AND e.company_id = tasks.company_id
          AND d.company_id = tasks.company_id
      )
    )
  )
  WITH CHECK (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('projects.tasks', 'edit')
      OR public.app_has_permission('tasks', 'edit')
      OR created_by = auth.uid()
      OR (
        assigned_to IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = tasks.assigned_to AND e.user_id = auth.uid()
        )
      )
      OR (
        assigned_to IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.employees e
          JOIN public.departments d ON d.id = e.department_id
          WHERE e.id = tasks.assigned_to
            AND d.head_id = auth.uid()
            AND e.company_id = tasks.company_id
            AND d.company_id = tasks.company_id
        )
      )
    )
  );

CREATE POLICY tasks_delete_scoped ON public.tasks
  FOR DELETE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('projects.tasks', 'delete')
      OR public.app_has_permission('tasks', 'delete')
    )
  );

CREATE OR REPLACE FUNCTION public.guard_assigned_task_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.app_is_super_admin()
     AND NOT public.app_has_permission('projects.tasks', 'edit')
     AND NOT public.app_has_permission('tasks', 'edit')
     AND EXISTS (
       SELECT 1 FROM public.employees e
       WHERE e.id = OLD.assigned_to AND e.user_id = auth.uid()
     )
     AND (
       NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
     ) THEN
    RAISE EXCEPTION 'Assigned employees may update task progress only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_assigned_task_updates_trigger ON public.tasks;
CREATE TRIGGER guard_assigned_task_updates_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.guard_assigned_task_updates();

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT role_row.id, permission.id
FROM public.roles role_row
CROSS JOIN public.permissions permission
WHERE role_row.name IN ('Company Admin', 'Company Administrator')
  AND permission.action = 'view'
  AND permission.resource NOT IN (
    'hr.payroll',
    'finance.ledger',
    'finance.payables',
    'finance.receivables',
    'finance.invoices',
    'finance.bank_accounts',
    'finance.bank_reconciliation',
    'finance.tax_compliance',
    'finance.financial_statements',
    'audit_logs',
    'settings.security',
    'settings.billing',
    'roles',
    'permissions'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

DELETE FROM public.role_permissions role_permission
USING public.roles role_row, public.permissions permission
WHERE role_permission.role_id = role_row.id
  AND role_permission.permission_id = permission.id
  AND role_row.name IN ('Company Admin', 'Company Administrator')
  AND permission.resource IN (
    'hr.payroll',
    'finance.ledger',
    'finance.payables',
    'finance.receivables',
    'finance.invoices',
    'finance.bank_accounts',
    'finance.bank_reconciliation',
    'finance.tax_compliance',
    'finance.financial_statements',
    'audit_logs',
    'settings.security',
    'settings.billing',
    'roles',
    'permissions',
    'it.security',
    'internal_control.fraud',
    'internal_control.incidents'
  );
