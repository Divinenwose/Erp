import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if the current user has a specific role
 * @param roleName - The name of the role to check
 * @returns boolean indicating if the user has the role
 */
export function useRole(roleName: string): boolean {
  const { hasRole } = useAuth();
  return hasRole(roleName);
}

/**
 * Hook to get the current user's roles
 * @returns Array of role objects
 */
export function useRoles() {
  const { roles } = useAuth();
  return roles;
}

/**
 * Hook to check if the current user has a specific permission
 * @param permission - The permission string in format "resource.action" (e.g., "employees.create")
 * @returns boolean indicating if the user has the permission
 */
export function usePermission(permission: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Hook to get the current user's permissions
 * @returns Array of permission objects
 */
export function usePermissions() {
  const { permissions } = useAuth();
  return permissions;
}

/**
 * Hook to check if the current user can perform a specific action on a resource
 * @param resource - The resource (e.g., "employees")
 * @param action - The action (e.g., "create")
 * @returns boolean indicating if the user can perform the action
 */
export function useCan(resource: string, action: string): boolean {
  const { can } = useAuth();
  return can(resource, action);
}

/**
 * Hook to check if the current user is a Super Admin
 * @returns boolean indicating if the user is a Super Admin
 */
export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin();
}

/**
 * Hook to check if the current user is a Company Admin
 * @returns boolean indicating if the user is a Company Admin
 */
export function useIsCompanyAdmin(): boolean {
  const { isCompanyAdmin } = useAuth();
  return isCompanyAdmin();
}
