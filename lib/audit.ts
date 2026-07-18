import { supabase } from '@/lib/supabase';

interface AuditLogData {
  action: string;
  module: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
}

/**
 * Log an audit event to the audit_logs table
 * @param companyId - The company ID
 * @param userId - The user ID performing the action
 * @param data - The audit log data
 */
export async function logAuditEvent(
  companyId: string,
  userId: string,
  data: AuditLogData
) {
  try {
    await supabase.from('audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: data.action,
      module: data.module,
      record_id: data.record_id,
      old_values: data.old_values,
      new_values: data.new_values,
      ip_address: data.ip_address,
    });
  } catch (error) {
    // Log errors but don't throw - audit logging should be non-blocking
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  companyId: string,
  userId: string,
  action: 'login' | 'logout' | 'password_change' | 'password_reset',
  metadata?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'auth',
    new_values: metadata,
  });
}

/**
 * Log role changes
 */
export async function logRoleChange(
  companyId: string,
  userId: string,
  targetUserId: string,
  action: 'role_assigned' | 'role_removed' | 'role_updated',
  oldRole?: string,
  newRole?: string
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'roles',
    record_id: targetUserId,
    old_values: oldRole ? { role: oldRole } : undefined,
    new_values: newRole ? { role: newRole } : undefined,
  });
}

/**
 * Log permission changes
 */
export async function logPermissionChange(
  companyId: string,
  userId: string,
  roleId: string,
  action: 'permission_granted' | 'permission_revoked',
  permission: string
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'permissions',
    record_id: roleId,
    new_values: { permission },
  });
}
