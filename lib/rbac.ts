import type { Role } from '@/lib/supabase';

export type AccessLevel = 'super_admin' | 'company_admin' | 'department' | 'employee';

export function normalizeRoleName(roleName: string): string {
  return roleName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function isSuperAdminRoleName(roleName: string): boolean {
  return normalizeRoleName(roleName) === 'super admin';
}

export function isCompanyAdminRoleName(roleName: string): boolean {
  const normalized = normalizeRoleName(roleName);
  return normalized === 'company admin' || normalized === 'company administrator';
}

export function resolveAccessLevel(roles: Role[]): AccessLevel {
  if (roles.some(role => isSuperAdminRoleName(role.name))) return 'super_admin';
  if (roles.some(role => isCompanyAdminRoleName(role.name))) return 'company_admin';
  if (roles.some(role => /\b(manager|head)\b/i.test(role.name))) return 'department';
  return 'employee';
}
