/**
 * Department-to-module access mapping.
 *
 * A user's department determines which top-level modules appear in the sidebar.
 * RBAC permissions (checked separately) determine which pages/actions inside
 * those modules are visible.
 *
 * Company Admins and Super Admins bypass department filtering entirely —
 * they see every module their RBAC permissions allow.
 */

/** Map department name → module identifiers the department owns. */
const DEPARTMENT_MODULE_ACCESS: Record<string, string[]> = {
  'Human Resources': ['hr'],
  'Finance & Accounts': ['finance'],
  'Inventory': ['inventory'],
  'Procurement': ['procurement'],
  'Sales & CRM': ['crm'],
  'Client Servicing': ['client_servicing'],
  'Client Marketing': ['client_marketing'],
  'Legal': ['legal'],
  'Graphics': ['graphics'],
  'Administration': ['admin'],
  'Operations': ['operations'],
  'Logistics': ['logistics'],
  'IT': ['it'],
  'Media': ['media'],
  'Internal Control': ['internal_control'],
  'Quality Assurance & Quality Control': ['qa_qc'],
  'Manufacturing': ['manufacturing'],
};

/** Modules every authenticated user should see regardless of department. */
const UNIVERSAL_MODULES = new Set(['dashboard', 'settings', 'reports']);

/**
 * Returns the set of module identifiers a user with the given department name
 * is allowed to see. Returns null when the department is unknown or the user
 * should not be restricted (caller is expected to check admin status first).
 */
export function getDepartmentModules(departmentName?: string): Set<string> | null {
  if (!departmentName) return null;
  const modules = DEPARTMENT_MODULE_ACCESS[departmentName];
  if (!modules) return null;
  return new Set([...modules, ...UNIVERSAL_MODULES]);
}

/**
 * Returns true if the given module is accessible from the given department.
 */
export function isModuleAllowed(module: string | undefined, departmentName?: string): boolean {
  if (!module) return true;
  if (UNIVERSAL_MODULES.has(module)) return true;
  const allowed = DEPARTMENT_MODULE_ACCESS[departmentName ?? ''];
  if (!allowed) return false;
  return allowed.includes(module);
}

/**
 * Map a route pathname to its top-level module identifier.
 * e.g. /hr/employees → 'hr', /administration/assets → 'admin'
 */
export function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const first = segments[0];

  // Direct module mappings
  const directMap: Record<string, string> = {
    'dashboard': 'dashboard',
    'hr': 'hr',
    'finance': 'finance',
    'inventory': 'inventory',
    'procurement': 'procurement',
    'crm': 'crm',
    'client-servicing': 'client_servicing',
    'client-marketing': 'client_marketing',
    'legal': 'legal',
    'graphics': 'graphics',
    'administration': 'admin',
    'operations': 'operations',
    'logistics': 'logistics',
    'it': 'it',
    'media': 'media',
    'internal-control': 'internal_control',
    'quality': 'qa_qc',
    'manufacturing': 'manufacturing',
    'reports': 'reports',
    'settings': 'settings',
    'support': 'support',
    'projects': 'projects',
  };

  return directMap[first] ?? null;
}

/**
 * Returns true if a user with the given department can access the given route.
 */
export function isRouteAllowedForDepartment(pathname: string, departmentName?: string): boolean {
  const module = getModuleFromPath(pathname);
  if (!module) return true; // unknown routes are not department-restricted
  return isModuleAllowed(module, departmentName);
}
