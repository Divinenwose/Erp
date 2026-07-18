'use client';

import { useAuth } from '@/contexts/AuthContext';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that renders children only if the user has the specified permission.
 * Permission format: "resource.action" (e.g., "employees.create")
 * 
 * @example
 * <PermissionGuard permission="employees.delete">
 *   <Button onClick={handleDelete}>Delete Employee</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, isSuperAdmin } = useAuth();

  // Super Admin has all permissions
  if (isSuperAdmin()) {
    return <>{children}</>;
  }

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface RoleGuardProps {
  roles: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that renders children only if the user has one of the specified roles.
 * 
 * @example
 * <RoleGuard roles="HR Manager">
 *   <Button onClick={handleApprove}>Approve Leave</Button>
 * </RoleGuard>
 * 
 * @example
 * <RoleGuard roles={['HR Manager', 'Finance Manager']}>
 *   <Button onClick={handleApprove}>Approve Request</Button>
 * </RoleGuard>
 */
export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { hasRole } = useAuth();
  const roleArray = Array.isArray(roles) ? roles : [roles];

  if (roleArray.some(role => hasRole(role))) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

interface CanProps {
  resource: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that renders children only if the user can perform the specified action on the resource.
 * 
 * @example
 * <Can resource="employees" action="delete">
 *   <Button onClick={handleDelete}>Delete Employee</Button>
 * </Can>
 */
export function Can({ resource, action, children, fallback = null }: CanProps) {
  const { can, isSuperAdmin } = useAuth();

  // Super Admin can do everything
  if (isSuperAdmin()) {
    return <>{children}</>;
  }

  if (can(resource, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
