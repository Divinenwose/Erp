UPDATE public.departments AS department
SET is_active = false,
    updated_at = now()
FROM public.companies AS company
WHERE department.company_id = company.id
  AND company.name ~* '^targfit([[:space:]]|$)'
  AND lower(department.name) = 'graphics'
  AND department.is_active IS DISTINCT FROM false;