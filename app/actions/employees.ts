'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { isSuperAdminRoleName } from '@/lib/rbac';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const accessRevokingStatuses = new Set(['inactive', 'suspended', 'resigned', 'terminated', 'retired']);
const accessRestoringStatuses = new Set(['active', 'probation']);
const validStatuses = new Set([
  'inactive', 'suspended', 'resigned', 'terminated', 'retired',
  'active', 'on_leave', 'probation',
]);

export async function changeEmployeeEmploymentStatus(input: {
  access_token: string;
  employee_id: string;
  employment_status: string;
}) {
  if (!input.access_token) return { success: false, error: 'Authentication is required' };
  if (!validStatuses.has(input.employment_status)) {
    return { success: false, error: 'Invalid employment status' };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(input.access_token);
  if (authError || !authData.user) return { success: false, error: 'Authentication is required' };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('company_id, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError || !profile?.is_active || !profile.company_id) {
    return { success: false, error: 'An active company account is required' };
  }

  const { data: roleRows, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name, company_id, role_permissions(permissions(resource, action)))')
    .eq('user_id', authData.user.id);
  if (rolesError) {
    console.error('[HR] Could not verify employment-status permissions:', rolesError);
    return { success: false, error: 'Unable to verify your permissions' };
  }

  const roles = (roleRows ?? []).flatMap(row => {
    const role = row.roles as {
      name?: string;
      company_id?: string | null;
      role_permissions?: Array<{ permissions: { resource: string; action: string } | null }>;
    } | null;
    return role ? [role] : [];
  });
  const hasEmployeeEditPermission = roles.some(role =>
    (role.company_id === null || role.company_id === profile.company_id)
    && role.role_permissions?.some(grant =>
      grant.permissions?.resource === 'hr.employees'
      && grant.permissions.action === 'edit'
    )
  );
  const isSuperAdmin = roles.some(role =>
    isSuperAdminRoleName(role.name ?? '')
    && (role.company_id === null || role.company_id === profile.company_id)
  );
  if (!hasEmployeeEditPermission && !isSuperAdmin) {
    return { success: false, error: 'You do not have permission to change employment status' };
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id, company_id, user_id, employment_status')
    .eq('id', input.employee_id)
    .eq('company_id', profile.company_id)
    .maybeSingle();
  if (employeeError || !employee) return { success: false, error: 'Employee was not found' };
  if (employee.employment_status === input.employment_status) return { success: true };
  if (
    accessRestoringStatuses.has(input.employment_status)
    && accessRevokingStatuses.has(employee.employment_status)
    && !isSuperAdmin
  ) {
    return { success: false, error: 'Only a Super Admin can reactivate an employee account' };
  }

  let hasAccessRequest = false;
  let wasActivated = true;
  if (employee.user_id && accessRestoringStatuses.has(input.employment_status)) {
    const { data: accessRequest, error: accessRequestError } = await supabaseAdmin
      .from('employee_access_requests')
      .select('activated_at')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (accessRequestError) {
      console.error('[HR] Access-request state lookup failed:', accessRequestError);
      return { success: false, error: 'Unable to verify the linked account activation state' };
    }
    hasAccessRequest = Boolean(accessRequest);
    wasActivated = !accessRequest || Boolean(accessRequest.activated_at);
  }

  const isRevokingAccess = employee.user_id && accessRevokingStatuses.has(input.employment_status);
  if (isRevokingAccess) {
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
      ban_duration: '876000h',
    });
    if (banError) {
      console.error('[HR] Auth account suspension failed:', banError);
      return { success: false, error: 'Could not suspend the linked sign-in account; employment status was not changed' };
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('employees')
    .update({ employment_status: input.employment_status, updated_at: new Date().toISOString() })
    .eq('id', employee.id)
    .eq('company_id', employee.company_id);
  if (updateError) {
    console.error('[HR] Employment-status update failed:', updateError);
    if (isRevokingAccess && employee.user_id) {
      const { error: rollbackAuthError } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
        ban_duration: 'none',
      });
      if (rollbackAuthError) console.error('[HR] Auth account rollback failed:', rollbackAuthError);
    }
    return { success: false, error: 'Failed to update employment status' };
  }

  if (employee.user_id && accessRestoringStatuses.has(input.employment_status)) {
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
      ban_duration: 'none',
    });
    if (unbanError) {
      console.error('[HR] Auth account reactivation failed:', unbanError);
      const { error: rollbackError } = await supabaseAdmin
        .from('employees')
        .update({ employment_status: employee.employment_status, updated_at: new Date().toISOString() })
        .eq('id', employee.id)
        .eq('company_id', employee.company_id);
      if (rollbackError) console.error('[HR] Employment-status rollback failed:', rollbackError);
      return { success: false, error: 'Could not reactivate the linked sign-in account; employment status was not changed' };
    }
    if (wasActivated) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', employee.user_id)
        .eq('company_id', employee.company_id);
      if (profileUpdateError) {
        console.error('[HR] Linked profile reactivation failed:', profileUpdateError);
        const { error: rebanError } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
          ban_duration: '876000h',
        });
        if (rebanError) console.error('[HR] Auth re-suspension after failed reactivation failed:', rebanError);
        const { error: rollbackError } = await supabaseAdmin
          .from('employees')
          .update({ employment_status: employee.employment_status, updated_at: new Date().toISOString() })
          .eq('id', employee.id)
          .eq('company_id', employee.company_id);
        if (rollbackError) console.error('[HR] Employment-status rollback failed:', rollbackError);
        return { success: false, error: 'Could not reactivate the linked profile; employment status was not changed' };
      }
    }
    if (hasAccessRequest) {
      const { error: requestUpdateError } = await supabaseAdmin
        .from('employee_access_requests')
        .update({
          status: wasActivated ? 'active' : 'invitation_sent',
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employee.id)
        .in('status', ['suspended', 'deactivated']);
      if (requestUpdateError) {
        console.error('[HR] Access-request reactivation failed:', requestUpdateError);
        if (wasActivated) {
          const { error: profileRollbackError } = await supabaseAdmin
            .from('profiles')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', employee.user_id)
            .eq('company_id', employee.company_id);
          if (profileRollbackError) console.error('[HR] Profile re-suspension after failed reactivation failed:', profileRollbackError);
        }
        const { error: rebanError } = await supabaseAdmin.auth.admin.updateUserById(employee.user_id, {
          ban_duration: '876000h',
        });
        if (rebanError) console.error('[HR] Auth re-suspension after failed access-request reactivation failed:', rebanError);
        const { error: rollbackError } = await supabaseAdmin
          .from('employees')
          .update({ employment_status: employee.employment_status, updated_at: new Date().toISOString() })
          .eq('id', employee.id)
          .eq('company_id', employee.company_id);
        if (rollbackError) console.error('[HR] Employment-status rollback failed:', rollbackError);
        return { success: false, error: 'Could not update the linked access request; employment status was not changed' };
      }
    }
  }

  revalidatePath('/hr/employees');
  return { success: true };
}
