import type { Role } from '@/lib/supabase';

export type AccessLevel = 'super_admin' | 'company_super_admin' | 'company_admin' | 'department' | 'employee';

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

export function resolveAccessLevel(roles: Role[], companyId?: string): AccessLevel {
  if (roles.some(role => isSuperAdminRoleName(role.name) && role.company_id == null)) return 'super_admin';
  if (companyId && roles.some(role => isSuperAdminRoleName(role.name) && role.company_id === companyId)) {
    return 'company_super_admin';
  }
  if (roles.some(role => isCompanyAdminRoleName(role.name))) return 'company_admin';
  if (roles.some(role => /\b(manager|head)\b/i.test(role.name))) return 'department';
  return 'employee';
}
