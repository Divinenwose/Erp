CREATE SEQUENCE IF NOT EXISTS public.employee_number_sequence;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_id_company_unique
  ON public.employees(id, company_id);

CREATE TABLE IF NOT EXISTS public.employee_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'rejected', 'approved', 'invitation_sent', 'active', 'suspended', 'deactivated')),
  requested_role_id uuid REFERENCES public.roles(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  invited_at timestamptz,
  activated_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_access_request_employee_company_fk
    FOREIGN KEY (employee_id, company_id) REFERENCES public.employees(id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_access_requests_company_status
  ON public.employee_access_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_access_requests_employee
  ON public.employee_access_requests(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_access_requests_open_employee
  ON public.employee_access_requests(employee_id)
  WHERE status IN ('pending', 'approved', 'invitation_sent', 'active', 'suspended');

CREATE OR REPLACE FUNCTION public.guard_employee_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_email text;
BEGIN
  IF NEW.employee_number IS NULL OR btrim(NEW.employee_number) = '' THEN
    NEW.employee_number := 'EMP-' || upper(substr(replace(NEW.company_id::text, '-', ''), 1, 6))
      || '-' || lpad(nextval('public.employee_number_sequence')::text, 6, '0');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text || ':number:' || lower(btrim(NEW.employee_number)), 0));
  IF EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.company_id = NEW.company_id
      AND lower(btrim(e.employee_number)) = lower(btrim(NEW.employee_number))
      AND e.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Employee number already exists in this company'
      USING ERRCODE = 'unique_violation';
  END IF;

  normalized_email := lower(btrim(NEW.email));
  IF normalized_email IS NOT NULL AND normalized_email <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text || ':email:' || normalized_email, 0));
    IF EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = NEW.company_id
        AND lower(btrim(e.email)) = normalized_email
        AND e.id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'Employee email already exists in this company'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF NEW.department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = NEW.department_id AND d.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Employee department must belong to the same company';
  END IF;
  IF NEW.branch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.branches b
    WHERE b.id = NEW.branch_id AND b.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Employee branch must belong to the same company';
  END IF;
  IF NEW.manager_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.employees manager
    WHERE manager.id = NEW.manager_id AND manager.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Employee reporting manager must belong to the same company';
  END IF;
  IF NEW.user_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.company_id::text || ':user:' || NEW.user_id::text, 0));
    IF EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = NEW.company_id
        AND e.user_id = NEW.user_id
        AND e.id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'An account can be linked to only one employee record in this company'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_employee_record_trigger ON public.employees;
CREATE TRIGGER guard_employee_record_trigger
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.guard_employee_record();

CREATE OR REPLACE FUNCTION public.record_employee_access_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL
     AND (
       NEW.department_id IS DISTINCT FROM OLD.department_id
       OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
       OR NEW.job_title IS DISTINCT FROM OLD.job_title
     ) THEN
    UPDATE public.profiles
    SET department_id = NEW.department_id,
        branch_id = NEW.branch_id,
        job_title = NEW.job_title,
        updated_at = now()
    WHERE id = NEW.user_id AND company_id = NEW.company_id;
  END IF;

  IF NEW.employment_status IN ('resigned', 'terminated', 'suspended', 'inactive', 'retired')
     AND NEW.employment_status IS DISTINCT FROM OLD.employment_status
     AND NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET is_active = false, updated_at = now()
    WHERE id = NEW.user_id AND company_id = NEW.company_id;
    UPDATE public.employee_access_requests
    SET status = CASE WHEN NEW.employment_status = 'suspended' THEN 'suspended' ELSE 'deactivated' END,
        updated_at = now()
    WHERE employee_id = NEW.id
      AND status IN ('invitation_sent', 'active', 'suspended');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_employee_access_revocation_trigger ON public.employees;
CREATE TRIGGER record_employee_access_revocation_trigger
  AFTER UPDATE OF employment_status, department_id, branch_id, job_title ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.record_employee_access_revocation();

DROP POLICY IF EXISTS employees_select_scoped ON public.employees;
CREATE POLICY employees_select_scoped ON public.employees
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      user_id = auth.uid()
      OR public.app_has_permission('hr.employees', 'view')
    )
  );

CREATE OR REPLACE VIEW public.employee_directory
WITH (security_barrier = true)
AS
SELECT
  e.id,
  e.company_id,
  e.user_id,
  e.employee_number,
  e.first_name,
  e.last_name,
  e.first_name || ' ' || e.last_name AS full_name,
  e.email,
  e.phone,
  e.department_id,
  e.branch_id,
  e.job_title,
  e.employment_type,
  e.employment_status,
  e.employment_status AS status,
  e.hire_date,
  e.manager_id,
  e.avatar_url,
  e.created_at
FROM public.employees e
WHERE e.company_id = public.user_company_id()
  AND (
    public.app_is_super_admin()
    OR public.app_has_permission('hr.employees', 'view')
    OR public.app_has_permission('settings.departments', 'view')
    OR public.app_has_permission('settings.branches', 'view')
    OR e.user_id = auth.uid()
    OR e.department_id = public.app_user_department(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.departments d
      WHERE d.id = e.department_id
        AND d.company_id = e.company_id
        AND d.head_id = auth.uid()
    )
  );

REVOKE ALL ON public.employee_directory FROM PUBLIC, anon;
GRANT SELECT ON public.employee_directory TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view own company data" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can insert own company data" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can update own company data" ON public.employee_documents;
DROP POLICY IF EXISTS "Users can delete own company data" ON public.employee_documents;
CREATE POLICY employee_documents_select_authorized ON public.employee_documents
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('hr.employees.documents', 'view')
    )
  );
CREATE POLICY employee_documents_insert_authorized ON public.employee_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employees.documents', 'manage')
  );
CREATE POLICY employee_documents_update_authorized ON public.employee_documents
  FOR UPDATE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employees.documents', 'manage')
  )
  WITH CHECK (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employees.documents', 'manage')
  );
CREATE POLICY employee_documents_delete_authorized ON public.employee_documents
  FOR DELETE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employees.documents', 'manage')
  );

DROP POLICY IF EXISTS "Users can view own company data" ON public.employee_employment_history;
DROP POLICY IF EXISTS "Users can insert own company data" ON public.employee_employment_history;
DROP POLICY IF EXISTS "Users can update own company data" ON public.employee_employment_history;
DROP POLICY IF EXISTS "Users can delete own company data" ON public.employee_employment_history;
CREATE POLICY employee_history_select_authorized ON public.employee_employment_history
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('hr.employees.history', 'view')
    )
  );
CREATE POLICY employee_history_insert_authorized ON public.employee_employment_history
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employees.history', 'manage')
  );

DROP POLICY IF EXISTS "Users can view own company data" ON public.employee_requests;
DROP POLICY IF EXISTS "Users can insert own company data" ON public.employee_requests;
DROP POLICY IF EXISTS "Users can update own company data" ON public.employee_requests;
DROP POLICY IF EXISTS "Users can delete own company data" ON public.employee_requests;
CREATE POLICY employee_requests_select_authorized ON public.employee_requests
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('hr.employee_requests', 'view')
    )
  );
CREATE POLICY employee_requests_insert_authorized ON public.employee_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employee_requests', 'manage')
  );
CREATE POLICY employee_requests_update_authorized ON public.employee_requests
  FOR UPDATE TO authenticated
  USING (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employee_requests', 'manage')
  )
  WITH CHECK (
    company_id = public.user_company_id()
    AND public.app_has_permission('hr.employee_requests', 'manage')
  );

CREATE OR REPLACE FUNCTION public.audit_employee_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_action := 'employee_created';
    INSERT INTO public.audit_logs(company_id, user_id, action, module, record_id, new_values)
    VALUES (NEW.company_id, auth.uid(), event_action, 'hr', NEW.id,
      jsonb_build_object('employee_number', NEW.employee_number, 'department_id', NEW.department_id,
        'job_title', NEW.job_title, 'employment_status', NEW.employment_status));
    RETURN NEW;
  END IF;

  IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
    event_action := 'employee_department_transferred';
  ELSE
    event_action := 'employee_updated';
  END IF;
  INSERT INTO public.audit_logs(company_id, user_id, action, module, record_id, old_values, new_values)
  VALUES (NEW.company_id, auth.uid(), event_action, 'hr', NEW.id,
    jsonb_build_object('department_id', OLD.department_id, 'job_title', OLD.job_title,
      'employment_status', OLD.employment_status, 'salary', OLD.salary),
    jsonb_build_object('department_id', NEW.department_id, 'job_title', NEW.job_title,
      'employment_status', NEW.employment_status, 'salary', NEW.salary));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_employee_changes_trigger ON public.employees;
CREATE TRIGGER audit_employee_changes_trigger
  AFTER INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.audit_employee_changes();

ALTER TABLE public.employee_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_access_requests_select ON public.employee_access_requests;
CREATE POLICY employee_access_requests_select ON public.employee_access_requests
  FOR SELECT TO authenticated
  USING (
    company_id = public.user_company_id()
    AND (
      public.app_is_super_admin()
      OR public.app_has_permission('hr.access_requests', 'view')
      OR requester_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS employee_access_requests_insert ON public.employee_access_requests;
CREATE POLICY employee_access_requests_insert ON public.employee_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.user_company_id()
    AND requester_user_id = auth.uid()
    AND public.app_has_permission('hr.access_requests', 'create')
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_access_requests.employee_id
        AND e.company_id = employee_access_requests.company_id
        AND e.user_id IS NULL
        AND e.employment_status = 'active'
    )
  );

INSERT INTO public.permissions(resource, action, description) VALUES
  ('hr.access_requests', 'view', 'View employee account access requests'),
  ('hr.access_requests', 'create', 'Request employee account access'),
  ('hr.access_requests', 'approve', 'Approve employee account access requests')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'HR Manager'
  AND p.resource = 'hr.access_requests'
  AND p.action IN ('view', 'create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Super Admin'
  AND p.resource = 'hr.access_requests'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions(role_id, permission_id)
SELECT DISTINCT r.id, p.id
FROM public.roles r
JOIN public.role_permissions existing_grant ON existing_grant.role_id = r.id
JOIN public.permissions employee_permission ON employee_permission.id = existing_grant.permission_id
CROSS JOIN public.permissions p
WHERE employee_permission.resource = 'hr.employees'
  AND employee_permission.action IN ('create', 'edit')
  AND p.resource = 'hr.access_requests'
  AND p.action IN ('view', 'create')
  AND lower(btrim(r.name)) NOT IN ('company admin', 'company administrator')
ON CONFLICT (role_id, permission_id) DO NOTHING;

DELETE FROM public.user_roles ur
USING public.roles r
WHERE r.id = ur.role_id
  AND lower(btrim(r.name)) IN ('company admin', 'company administrator');

DELETE FROM public.role_permissions rp
USING public.roles r
WHERE r.id = rp.role_id
  AND lower(btrim(r.name)) IN ('company admin', 'company administrator');

UPDATE public.profiles p
SET role = 'employee', updated_at = now()
WHERE lower(btrim(p.role)) IN ('company admin', 'company administrator')
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p.id AND r.name = 'Super Admin'
  );
