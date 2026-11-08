'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { isSuperAdminRoleName } from '@/lib/rbac';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface ActorRole {
  name: string;
  company_id: string | null;
  role_permissions: Array<{
    permissions: { resource: string; action: string } | null;
  }>;
}

async function getActor(accessToken: string) {
  if (!accessToken) return { error: 'Authentication is required' as const };
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData.user) return { error: 'Authentication is required' as const };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('company_id, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError || !profile?.is_active || !profile.company_id) {
    return { error: 'An active company account is required' as const };
  }

  const { data: roleRows, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name, company_id, role_permissions(permissions(resource, action)))')
    .eq('user_id', authData.user.id);
  if (rolesError) {
    console.error('[EMPLOYEE ACCESS] Could not verify actor roles:', rolesError);
    return { error: 'Unable to verify your permissions' as const };
  }

  const roles = (roleRows ?? [])
    .map(row => row.roles as unknown as ActorRole | null)
    .filter((role): role is ActorRole => Boolean(role));
  const hasPermission = roles.some(role =>
    (role.company_id === null || role.company_id === profile.company_id)
    && role.role_permissions.some(grant =>
      grant.permissions?.resource === 'hr.access_requests'
      && grant.permissions.action === 'create'
    )
  );
  const isSuperAdmin = roles.some(role =>
    isSuperAdminRoleName(role.name)
    && (role.company_id === null || role.company_id === profile.company_id)
  );

  return {
    actorId: authData.user.id,
    companyId: profile.company_id,
    roles,
    hasPermission,
    isSuperAdmin,
  };
}

async function writeAccessAudit(
  companyId: string,
  actorId: string,
  employeeId: string,
  action: string,
  values: Record<string, unknown>
) {
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    company_id: companyId,
    user_id: actorId,
    action,
    module: 'employee_access',
    record_id: employeeId,
    new_values: values,
  });
  if (error) console.error('[EMPLOYEE ACCESS] Audit logging failed:', error);
}

export async function requestEmployeeAccess(input: {
  access_token: string;
  employee_id: string;
  request_reason?: string;
}) {
  const actor = await getActor(input.access_token);
  if ('error' in actor) return { success: false, error: actor.error };
  if (!actor.hasPermission && !actor.isSuperAdmin) {
    return { success: false, error: 'You do not have permission to request employee access' };
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id, company_id, user_id, employment_status, first_name, last_name, email, phone, job_title, department_id, branch_id')
    .eq('id', input.employee_id)
    .eq('company_id', actor.companyId)
    .maybeSingle();
  if (employeeError || !employee) return { success: false, error: 'Employee was not found' };
  if (employee.user_id) return { success: false, error: 'This employee already has a linked account' };
  if (employee.employment_status !== 'active') {
    return { success: false, error: 'Only active employees can request account access' };
  }
  if (!employee.email?.trim()) return { success: false, error: 'Add an email address to the employee record first' };

  const { data: request, error: requestError } = await supabaseAdmin
    .from('employee_access_requests')
    .insert({
      company_id: actor.companyId,
      employee_id: employee.id,
      requester_user_id: actor.actorId,
      request_reason: input.request_reason?.trim() || null,
    })
    .select('id')
    .single();
  if (requestError) {
    if (requestError.code === '23505') {
      return { success: false, error: 'There is already an open access request for this employee' };
    }
    console.error('[EMPLOYEE ACCESS] Request creation failed:', requestError);
    return { success: false, error: 'Unable to submit the access request' };
  }

  await writeAccessAudit(actor.companyId, actor.actorId, employee.id, 'employee_access_requested', {
    request_id: request.id,
    email: employee.email,
  });
  revalidatePath('/hr/employees');
  revalidatePath('/settings/access-requests');
  return { success: true };
}

export async function reviewEmployeeAccessRequest(input: {
  access_token: string;
  request_id: string;
  decision: 'approve' | 'reject';
  role_id?: string;
  decision_note?: string;
}) {
  const actor = await getActor(input.access_token);
  if ('error' in actor) return { success: false, error: actor.error };
  if (!actor.isSuperAdmin) {
    return { success: false, error: 'Only a Super Admin can approve or reject access requests' };
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from('employee_access_requests')
    .select('id, company_id, employee_id, status, employees!employee_access_request_employee_company_fk(id, user_id, employment_status, first_name, last_name, email, phone, job_title, department_id, branch_id)')
    .eq('id', input.request_id)
    .eq('company_id', actor.companyId)
    .maybeSingle();
  if (requestError) {
    console.error('[EMPLOYEE ACCESS] Request lookup failed:', requestError);
    return { success: false, error: 'Unable to load the access request' };
  }
  if (!request) return { success: false, error: 'Access request was not found' };
  if (request.status !== 'pending') return { success: false, error: 'This request has already been reviewed' };

  const employee = request.employees as unknown as {
    id: string;
    user_id: string | null;
    employment_status: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    job_title: string | null;
    department_id: string | null;
    branch_id: string | null;
  } | null;
  if (!employee) return { success: false, error: 'The employee record is no longer available' };

  if (input.decision === 'reject') {
    const { data: rejectedRequest, error } = await supabaseAdmin
      .from('employee_access_requests')
      .update({
        status: 'rejected',
        reviewed_by: actor.actorId,
        reviewed_at: new Date().toISOString(),
        decision_note: input.decision_note?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (error || !rejectedRequest) {
      console.error('[EMPLOYEE ACCESS] Request rejection failed:', error);
      return { success: false, error: 'This request has already been processed or could not be rejected' };
    }
    await writeAccessAudit(request.company_id, actor.actorId, employee.id, 'employee_access_rejected', {
      request_id: request.id,
      note: input.decision_note?.trim() || null,
    });
    revalidatePath('/settings/access-requests');
    return { success: true };
  }

  if (!input.role_id) return { success: false, error: 'Select a role before approving this request' };
  if (employee.user_id) return { success: false, error: 'This employee already has a linked account' };
  if (employee.employment_status !== 'active' || !employee.email?.trim()) {
    return { success: false, error: 'The employee must be active and have an email address before invitation' };
  }

  const { data: role, error: roleError } = await supabaseAdmin
    .from('roles')
    .select('id, name, company_id')
    .eq('id', input.role_id)
    .maybeSingle();
  if (roleError || !role || (role.company_id !== null && role.company_id !== request.company_id)) {
    return { success: false, error: 'The selected role is not available in this company' };
  }
  const normalizedRoleName = role.name.trim().toLowerCase();
  if (normalizedRoleName === 'company admin' || normalizedRoleName === 'company administrator') {
    return { success: false, error: 'Company Administrator roles are not permitted' };
  }
  if (isSuperAdminRoleName(role.name) && !actor.roles.some(actorRole =>
    isSuperAdminRoleName(actorRole.name) && actorRole.company_id === null
  )) {
    return { success: false, error: 'Only the global Super Admin can grant system-wide Super Admin access' };
  }

  const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('company_id', request.company_id)
    .ilike('email', employee.email.trim())
    .maybeSingle();
  if (profileLookupError) {
    console.error('[EMPLOYEE ACCESS] Existing account lookup failed:', profileLookupError);
    return { success: false, error: 'Unable to check whether this email already has an account' };
  }
  if (existingProfile) return { success: false, error: 'This email is already linked to a company account' };

  const approvalTime = new Date().toISOString();
  const { data: claimedRequest, error: claimError } = await supabaseAdmin
    .from('employee_access_requests')
    .update({
      status: 'approved',
      requested_role_id: role.id,
      reviewed_by: actor.actorId,
      reviewed_at: approvalTime,
      decision_note: input.decision_note?.trim() || null,
      updated_at: approvalTime,
    })
    .eq('id', request.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (claimError || !claimedRequest) {
    if (claimError) console.error('[EMPLOYEE ACCESS] Could not claim request:', claimError);
    return { success: false, error: 'This request has already been processed' };
  }

  const resetRequest = async () => {
    const { error } = await supabaseAdmin
      .from('employee_access_requests')
      .update({
        status: 'pending',
        requested_role_id: null,
        reviewed_by: null,
        reviewed_at: null,
        decision_note: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .eq('status', 'approved');
    if (error) console.error('[EMPLOYEE ACCESS] Could not restore request after failed invitation:', error);
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { data: invitation, error: invitationError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    employee.email.trim(),
    {
      data: { first_name: employee.first_name, last_name: employee.last_name, employee_id: employee.id },
      redirectTo: `${appUrl}/auth/callback`,
    }
  );
  if (invitationError || !invitation.user) {
    console.error('[EMPLOYEE ACCESS] Invitation failed:', invitationError);
    await resetRequest();
    return { success: false, error: invitationError?.message || 'Unable to send the account invitation' };
  }

  const userId = invitation.user.id;
  const rollbackInvitation = async () => {
    const { error: employeeRollbackError } = await supabaseAdmin
      .from('employees')
      .update({ user_id: null })
      .eq('id', employee.id)
      .eq('user_id', userId);
    const { error: roleRollbackError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    const { error: profileRollbackError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    const { error: authRollbackError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    await resetRequest();
    for (const [label, error] of [
      ['employee link', employeeRollbackError],
      ['role assignment', roleRollbackError],
      ['profile', profileRollbackError],
      ['invitation', authRollbackError],
    ] as const) {
      if (error) console.error(`[EMPLOYEE ACCESS] Invitation rollback failed for ${label}:`, error);
    }
  };

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    company_id: request.company_id,
    first_name: employee.first_name,
    last_name: employee.last_name,
    display_name: `${employee.first_name} ${employee.last_name}`,
    email: employee.email.trim(),
    phone: employee.phone,
    job_title: employee.job_title,
    department_id: employee.department_id,
    branch_id: employee.branch_id,
    is_active: false,
  });
  if (profileError) {
    console.error('[EMPLOYEE ACCESS] Profile creation failed:', profileError);
    await rollbackInvitation();
    return { success: false, error: 'Unable to prepare the invited account' };
  }

  const { error: roleAssignmentError } = await supabaseAdmin.from('user_roles').insert({
    user_id: userId,
    role_id: role.id,
    assigned_by: actor.actorId,
  });
  if (roleAssignmentError) {
    console.error('[EMPLOYEE ACCESS] Role assignment failed:', roleAssignmentError);
    await rollbackInvitation();
    return { success: false, error: 'Unable to assign the approved role' };
  }

  const { data: linkedEmployee, error: employeeLinkError } = await supabaseAdmin
    .from('employees')
    .update({ user_id: userId })
    .eq('id', employee.id)
    .eq('company_id', request.company_id)
    .is('user_id', null)
    .select('id')
    .maybeSingle();
  if (employeeLinkError || !linkedEmployee) {
    console.error('[EMPLOYEE ACCESS] Employee linking failed:', employeeLinkError);
    await rollbackInvitation();
    return { success: false, error: 'Unable to link the account to the existing employee record' };
  }

  const { error: requestUpdateError } = await supabaseAdmin
    .from('employee_access_requests')
    .update({
      status: 'invitation_sent',
      requested_role_id: role.id,
      reviewed_by: actor.actorId,
      reviewed_at: new Date().toISOString(),
      invited_at: new Date().toISOString(),
      decision_note: input.decision_note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .eq('status', 'approved');
  if (requestUpdateError) {
    console.error('[EMPLOYEE ACCESS] Request status update failed:', requestUpdateError);
    await rollbackInvitation();
    return { success: false, error: 'Unable to finalize the account invitation' };
  }

  await writeAccessAudit(request.company_id, actor.actorId, employee.id, 'employee_account_invited', {
    request_id: request.id,
    user_id: userId,
    role_id: role.id,
    role_name: role.name,
  });
  revalidatePath('/settings/access-requests');
  revalidatePath('/settings/users');
  revalidatePath('/hr/employees');
  return { success: true };
}

export async function activateEmployeeAccess(accessToken: string) {
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData.user) return { success: false, error: 'Authentication is required' };

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id, company_id, employment_status')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  if (employeeError) {
    console.error('[EMPLOYEE ACCESS] Employee activation lookup failed:', employeeError);
    return { success: false, error: 'Unable to verify the employee account' };
  }
  if (!employee) return { success: true };
  if (employee.employment_status !== 'active') {
    return { success: false, error: 'This employee account is not eligible for activation' };
  }
  const { data: accessRequest, error: accessRequestError } = await supabaseAdmin
    .from('employee_access_requests')
    .select('id')
    .eq('employee_id', employee.id)
    .eq('status', 'invitation_sent')
    .maybeSingle();
  if (accessRequestError) {
    console.error('[EMPLOYEE ACCESS] Invitation status lookup failed:', accessRequestError);
    return { success: false, error: 'Unable to verify the employee invitation' };
  }
  if (!accessRequest) return { success: true };

  const activationTime = new Date().toISOString();
  const { data: activatedRequest, error: requestError } = await supabaseAdmin
    .from('employee_access_requests')
    .update({ status: 'active', activated_at: activationTime, updated_at: activationTime })
    .eq('employee_id', employee.id)
    .eq('status', 'invitation_sent')
    .select('id')
    .maybeSingle();
  if (requestError || !activatedRequest) {
    console.error('[EMPLOYEE ACCESS] Request activation failed:', requestError);
    return { success: false, error: 'Unable to record employee account activation' };
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: true, updated_at: activationTime })
    .eq('id', authData.user.id)
    .eq('company_id', employee.company_id);
  if (profileError) {
    console.error('[EMPLOYEE ACCESS] Profile activation failed:', profileError);
    const { error: rollbackError } = await supabaseAdmin
      .from('employee_access_requests')
      .update({ status: 'invitation_sent', activated_at: null, updated_at: new Date().toISOString() })
      .eq('id', accessRequest.id)
      .eq('status', 'active');
    if (rollbackError) console.error('[EMPLOYEE ACCESS] Activation rollback failed:', rollbackError);
    return { success: false, error: 'Unable to activate the employee profile' };
  }
  await writeAccessAudit(employee.company_id, authData.user.id, employee.id, 'employee_account_activated', {
    request_id: accessRequest.id,
    user_id: authData.user.id,
  });
  return { success: true };
}
