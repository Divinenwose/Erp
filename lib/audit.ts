import { supabase } from '@/lib/supabase';

interface AuditLogData {
  action: string;
  module: string;
  entity_type?: string;
  entity_id?: string;
  record_id?: string;
  previous_value?: Record<string, unknown>;
  previous_values?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
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
      entity_type: data.entity_type,
      entity_id: data.entity_id ?? data.record_id,
      previous_value: data.previous_value ?? data.previous_values,
      new_value: data.new_value ?? data.new_values,
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
    new_value: metadata,
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
    entity_type: 'profile',
    entity_id: targetUserId,
    previous_value: oldRole ? { role: oldRole } : undefined,
    new_value: newRole ? { role: newRole } : undefined,
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
    entity_type: 'role',
    entity_id: roleId,
    new_value: { permission },
  });
}

// Administration Module Audit Functions

/**
 * Log attendance events
 */
export async function logAttendanceEvent(
  companyId: string,
  userId: string,
  action: 'clock_in' | 'clock_out' | 'attendance_created' | 'attendance_updated' | 'attendance_deleted',
  attendanceId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'attendance',
    entity_type: 'attendance_record',
    entity_id: attendanceId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log fuel management events
 */
export async function logFuelEvent(
  companyId: string,
  userId: string,
  action: 'fuel_record_created' | 'fuel_record_updated' | 'fuel_record_deleted',
  fuelRecordId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'fuel',
    entity_type: 'fuel_record',
    entity_id: fuelRecordId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log inspection events
 */
export async function logInspectionEvent(
  companyId: string,
  userId: string,
  action: 'inspection_created' | 'inspection_updated' | 'inspection_completed' | 'inspection_deleted',
  inspectionId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'inspections',
    entity_type: 'office_inspection',
    entity_id: inspectionId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log driver events
 */
export async function logDriverEvent(
  companyId: string,
  userId: string,
  action: 'driver_created' | 'driver_updated' | 'driver_deleted' | 'driver_assigned' | 'driver_unassigned',
  driverId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'drivers',
    entity_type: 'driver',
    entity_id: driverId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log purchase request events
 */
export async function logPurchaseEvent(
  companyId: string,
  userId: string,
  action: 'purchase_created' | 'purchase_updated' | 'purchase_deleted' | 'purchase_submitted' | 'purchase_approved' | 'purchase_rejected' | 'purchase_completed',
  purchaseId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'purchase_requests',
    entity_type: 'purchase_request',
    entity_id: purchaseId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log asset events
 */
export async function logAssetEvent(
  companyId: string,
  userId: string,
  action: 'asset_created' | 'asset_updated' | 'asset_deleted' | 'asset_assigned' | 'asset_transferred' | 'asset_retired' | 'asset_disposed',
  assetId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'assets',
    entity_type: 'asset',
    entity_id: assetId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log vendor events
 */
export async function logVendorEvent(
  companyId: string,
  userId: string,
  action: 'vendor_created' | 'vendor_updated' | 'vendor_deleted' | 'vendor_assigned' | 'vendor_performance_updated',
  vendorId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'vendors',
    entity_type: 'vendor',
    entity_id: vendorId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log maintenance events
 */
export async function logMaintenanceEvent(
  companyId: string,
  userId: string,
  action: 'maintenance_created' | 'maintenance_updated' | 'maintenance_deleted' | 'maintenance_completed' | 'maintenance_assigned',
  maintenanceId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'maintenance',
    entity_type: 'maintenance_request',
    entity_id: maintenanceId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log approval events
 */
export async function logApprovalEvent(
  companyId: string,
  userId: string,
  action: 'approval_created' | 'approval_approved' | 'approval_rejected' | 'approval_skipped' | 'workflow_created' | 'workflow_updated',
  approvalId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'approvals',
    entity_type: approvalId ? 'request_approval' : 'approval_workflow',
    entity_id: approvalId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log document events
 */
export async function logDocumentEvent(
  companyId: string,
  userId: string,
  action: 'document_uploaded' | 'document_updated' | 'document_deleted' | 'document_downloaded' | 'document_viewed',
  documentId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'documents',
    entity_type: 'document',
    entity_id: documentId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log visitor events
 */
export async function logVisitorEvent(
  companyId: string,
  userId: string,
  action: 'visitor_checked_in' | 'visitor_checked_out' | 'visitor_created' | 'visitor_updated',
  visitorId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'visitors',
    entity_type: 'visitor',
    entity_id: visitorId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log meeting events
 */
export async function logMeetingEvent(
  companyId: string,
  userId: string,
  action: 'meeting_created' | 'meeting_updated' | 'meeting_deleted' | 'meeting_started' | 'meeting_ended' | 'meeting_attended',
  meetingId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'meetings',
    entity_type: 'meeting',
    entity_id: meetingId,
    previous_value: previousData,
    new_value: newData,
  });
}

/**
 * Log office supplies events
 */
export async function logSuppliesEvent(
  companyId: string,
  userId: string,
  action: 'supply_added' | 'supply_updated' | 'supply_deleted' | 'supply_issued' | 'supply_returned' | 'supply_restocked',
  supplyId?: string,
  previousData?: Record<string, unknown>,
  newData?: Record<string, unknown>
) {
  await logAuditEvent(companyId, userId, {
    action,
    module: 'office_supplies',
    entity_type: 'office_supply',
    entity_id: supplyId,
    previous_value: previousData,
    new_value: newData,
  });
}
