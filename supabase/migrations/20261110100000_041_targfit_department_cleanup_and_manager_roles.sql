UPDATE public.departments AS department
SET is_active = false,
    updated_at = now()
FROM public.companies AS company
WHERE department.company_id = company.id
  AND company.name ~* '^targfit([[:space:]]|$)'
  AND lower(department.name) IN ('client marketing', 'client servicing')
  AND department.is_active IS DISTINCT FROM false;

WITH role_specs(department_name, role_name, resource_prefixes) AS (
  VALUES
    ('Human Resources', 'HR Manager', ARRAY['hr']::text[]),
    ('Finance & Accounts', 'Finance Manager', ARRAY['finance']::text[]),
    ('Inventory', 'Inventory Manager', ARRAY['inventory']::text[]),
    ('Procurement', 'Procurement Manager', ARRAY['procurement']::text[]),
    ('Sales & CRM', 'Sales Manager', ARRAY['crm']::text[]),
    ('Legal', 'Legal Manager', ARRAY['legal']::text[]),
    ('Administration', 'Administration Manager', ARRAY[
      'administration', 'facilities', 'assets', 'reception', 'supplies',
      'vendors', 'documents', 'attendance', 'inspections', 'fuel', 'drivers',
      'purchase_requests', 'admin_reports'
    ]::text[]),
    ('Operations', 'Operations Manager', ARRAY['operations']::text[]),
    ('Logistics', 'Logistics Manager', ARRAY['logistics']::text[]),
    ('IT', 'IT Manager', ARRAY['it']::text[]),
    ('Media', 'Media Manager', ARRAY['media']::text[]),
    ('Internal Control', 'Internal Control Manager', ARRAY['internal_control']::text[]),
    ('Quality Assurance & Quality Control', 'QA/QC Manager', ARRAY['quality', 'qa_qc']::text[]),
    ('Manufacturing', 'Manufacturing Manager', ARRAY['manufacturing']::text[])
)
INSERT INTO public.roles (company_id, name, description, is_system)
SELECT company.id,
       role_specs.role_name,
       'Department manager role for ' || role_specs.department_name,
       false
FROM public.companies AS company
CROSS JOIN role_specs
WHERE company.name ~* '^targfit([[:space:]]|$)'
ON CONFLICT (company_id, name) DO NOTHING;

WITH role_specs(department_name, role_name, resource_prefixes) AS (
  VALUES
    ('Human Resources', 'HR Manager', ARRAY['hr']::text[]),
    ('Finance & Accounts', 'Finance Manager', ARRAY['finance']::text[]),
    ('Inventory', 'Inventory Manager', ARRAY['inventory']::text[]),
    ('Procurement', 'Procurement Manager', ARRAY['procurement']::text[]),
    ('Sales & CRM', 'Sales Manager', ARRAY['crm']::text[]),
    ('Legal', 'Legal Manager', ARRAY['legal']::text[]),
    ('Administration', 'Administration Manager', ARRAY[
      'administration', 'facilities', 'assets', 'reception', 'supplies',
      'vendors', 'documents', 'attendance', 'inspections', 'fuel', 'drivers',
      'purchase_requests', 'admin_reports'
    ]::text[]),
    ('Operations', 'Operations Manager', ARRAY['operations']::text[]),
    ('Logistics', 'Logistics Manager', ARRAY['logistics']::text[]),
    ('IT', 'IT Manager', ARRAY['it']::text[]),
    ('Media', 'Media Manager', ARRAY['media']::text[]),
    ('Internal Control', 'Internal Control Manager', ARRAY['internal_control']::text[]),
    ('Quality Assurance & Quality Control', 'QA/QC Manager', ARRAY['quality', 'qa_qc']::text[]),
    ('Manufacturing', 'Manufacturing Manager', ARRAY['manufacturing']::text[])
),
company_roles AS (
  SELECT company.id AS company_id,
         role_specs.role_name,
         role_specs.resource_prefixes,
         role.id AS role_id
  FROM public.companies AS company
  CROSS JOIN role_specs
  JOIN public.roles AS role
    ON role.company_id = company.id
   AND role.name = role_specs.role_name
  WHERE company.name ~* '^targfit([[:space:]]|$)'
),
manager_permissions AS (
  SELECT company_roles.role_id, permission.id AS permission_id
  FROM company_roles
  JOIN public.permissions AS permission
    ON permission.resource = 'dashboard'
    OR EXISTS (
      SELECT 1
      FROM unnest(company_roles.resource_prefixes) AS prefix_row(resource_prefix)
      WHERE permission.resource = prefix_row.resource_prefix
         OR permission.resource LIKE prefix_row.resource_prefix || '.%'
    )
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM manager_permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;
