'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { isCompanyAdminRoleName, isSuperAdminRoleName } from '@/lib/rbac';
import { getDepartmentsForCompany } from '@/lib/departments';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create admin client with service role key for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

function isElevatedAdminRole(roleName: string): boolean {
  return isSuperAdminRoleName(roleName) || isCompanyAdminRoleName(roleName);
}

const restrictedCompanyAdminResources = new Set([
  'hr.payroll',
  'finance.ledger',
  'finance.payables',
  'finance.receivables',
  'finance.invoices',
  'finance.bank_accounts',
  'finance.bank_reconciliation',
  'finance.tax_compliance',
  'finance.financial_statements',
  'audit_logs',
  'settings.security',
  'settings.billing',
  'roles',
  'permissions',
  'it.security',
  'internal_control.fraud',
  'internal_control.incidents',
]);

async function ensureCompanyAdminPermissions(roleId: string) {
  const { data: permissions, error: permissionsError } = await supabaseAdmin
    .from('permissions')
    .select('id, resource, action')
    .or('action.eq.view,and(resource.eq.settings.users,action.in.(create,edit))');
  if (permissionsError) {
    console.error('[AUTHORIZATION] Company Admin permission lookup failed:', permissionsError);
    return 'Unable to load Company Admin permissions';
  }

  const requiredGrants = (permissions ?? []).filter(permission =>
    !restrictedCompanyAdminResources.has(permission.resource)
  );
  const { error: grantError } = await supabaseAdmin.from('role_permissions').upsert(
    requiredGrants.map(permission => ({ role_id: roleId, permission_id: permission.id })),
    { onConflict: 'role_id,permission_id', ignoreDuplicates: true }
  );
  if (grantError) {
    console.error('[AUTHORIZATION] Company Admin permission assignment failed:', grantError);
    return 'Unable to configure Company Admin permissions';
  }
  return null;
}

async function ensureCompanySuperAdminPermissions(roleId: string) {
  const { data: permissions, error: permissionsError } = await supabaseAdmin
    .from('permissions')
    .select('id');
  if (permissionsError) {
    console.error('[AUTHORIZATION] Company Super Admin permission lookup failed:', permissionsError);
    return 'Unable to load Super Admin permissions';
  }

  const { error: grantError } = await supabaseAdmin.from('role_permissions').upsert(
    (permissions ?? []).map(permission => ({ role_id: roleId, permission_id: permission.id })),
    { onConflict: 'role_id,permission_id', ignoreDuplicates: true }
  );
  if (grantError) {
    console.error('[AUTHORIZATION] Company Super Admin permission assignment failed:', grantError);
    return 'Unable to configure Super Admin permissions';
  }
  return null;
}

export async function syncCompanyAdminPermissions(accessToken: string) {
  try {
    if (!accessToken) return { success: false, error: 'Authentication is required' };
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !authData.user) return { success: false, error: 'Authentication is required' };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, is_active')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError || !profile?.is_active || !profile.company_id) {
      return { success: false, error: 'Unable to verify your active company account' };
    }

    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role_id, roles(id, name, company_id)')
      .eq('user_id', authData.user.id);
    if (rolesError) {
      console.error('[AUTHORIZATION] Failed to verify login roles:', rolesError);
      return { success: false, error: 'Unable to verify your account role' };
    }
    const adminRoles = (userRoles ?? []).flatMap(row => {
      const relatedRole = row.roles as { id?: string; name?: string; company_id?: string | null } | null;
      if (!relatedRole?.name || (relatedRole.company_id !== null && relatedRole.company_id !== profile.company_id)) return [];
      if (isSuperAdminRoleName(relatedRole.name) && relatedRole.company_id === profile.company_id) {
        return [{ id: relatedRole.id ?? row.role_id, isCompanySuperAdmin: true }];
      }
      if (isCompanyAdminRoleName(relatedRole.name)) {
        return [{ id: relatedRole.id ?? row.role_id, isCompanySuperAdmin: false }];
      }
      return [];
    });
    if (adminRoles.length === 0) return { success: true };

    for (const role of adminRoles) {
      const permissionError = role.isCompanySuperAdmin
        ? await ensureCompanySuperAdminPermissions(role.id)
        : await ensureCompanyAdminPermissions(role.id);
      if (permissionError) return { success: false, error: permissionError };
    }
    return { success: true };
  } catch (error) {
    console.error('[AUTHORIZATION] Unexpected login permission sync error:', error);
    return { success: false, error: 'Unable to configure your company administrator access' };
  }
}

export async function createCompanyAccount(input: {
  access_token: string;
  first_name: string;
  last_name: string;
  company_name: string;
}) {
  try {
    if (!input.access_token || !input.company_name.trim()) {
      return { success: false, error: 'A verified session and company name are required' };
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(input.access_token);
    if (authError || !authData.user?.email) return { success: false, error: 'Sign in to complete company setup' };

    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from('profiles').select('company_id').eq('id', authData.user.id).maybeSingle();
    if (profileLookupError) return { success: false, error: 'Unable to verify your existing account' };
    if (existingProfile?.company_id) return { success: false, error: 'This account is already assigned to a company' };
    const { data: existingRole, error: roleLookupError } = await supabaseAdmin
      .from('user_roles').select('role_id').eq('user_id', authData.user.id).limit(1).maybeSingle();
    if (roleLookupError) return { success: false, error: 'Unable to verify your current role assignments' };
    if (existingRole) return { success: false, error: 'An account with existing roles cannot bootstrap a company' };

    const companyName = input.company_name.trim();
    const slug = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${crypto.randomUUID().slice(0, 6)}`;
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: companyName, slug, email: authData.user.email, created_by: authData.user.id })
      .select('id')
      .single();
    if (companyError || !company) {
      console.error('[SIGNUP] Company creation failed:', companyError);
      return { success: false, error: companyError?.message || 'Unable to create company' };
    }

    const cleanup = async () => {
      const { error: roleCleanupError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', authData.user.id);
      const { error: profileCleanupError } = await supabaseAdmin.from('profiles').delete().eq('id', authData.user.id);
      const { error: companyCleanupError } = await supabaseAdmin.from('companies').delete().eq('id', company.id);
      if (roleCleanupError) console.error('[SIGNUP] Failed to clean up role assignment:', roleCleanupError);
      if (profileCleanupError) console.error('[SIGNUP] Failed to clean up profile:', profileCleanupError);
      if (companyCleanupError) console.error('[SIGNUP] Failed to clean up company:', companyCleanupError);
    };

    const { data: superAdminRole, error: superAdminRoleError } = await supabaseAdmin
      .from('roles')
      .insert({
        company_id: company.id,
        name: 'Super Admin',
        description: 'Full access to this company',
        is_system: true,
      })
      .select('id')
      .single();
    if (superAdminRoleError || !superAdminRole) {
      console.error('[SIGNUP] Company Super Admin role creation failed:', superAdminRoleError);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return { success: false, error: 'Unable to create the company Super Admin role' };
    }

    const permissionError = await ensureCompanySuperAdminPermissions(superAdminRole.id);
    if (permissionError) {
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return { success: false, error: permissionError };
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      company_id: company.id,
      first_name: input.first_name,
      last_name: input.last_name,
      display_name: `${input.first_name} ${input.last_name}`,
      email: authData.user.email,
      role: 'Super Admin',
      is_active: true,
    });
    if (profileError) {
      console.error('[SIGNUP] Profile creation failed:', profileError);
      await cleanup();
      return { success: false, error: profileError.message };
    }

    const { error: assignmentError } = await supabaseAdmin.from('user_roles').insert({
      user_id: authData.user.id,
      role_id: superAdminRole.id,
      assigned_by: authData.user.id,
    });
    if (assignmentError) {
      console.error('[SIGNUP] Company Super Admin assignment failed:', assignmentError);
      await cleanup();
      return { success: false, error: assignmentError.message };
    }

    const { data: existingDepartments, error: departmentsError } = await supabaseAdmin
      .from('departments').select('name').eq('company_id', company.id);
    if (departmentsError) {
      console.error('[SIGNUP] Department lookup failed:', departmentsError);
      await cleanup();
      return { success: false, error: 'Company was created, but departments could not be initialized' };
    }
    const existingDepartmentNames = new Set((existingDepartments ?? []).map(department => department.name));
    const departmentRows = getDepartmentsForCompany(companyName)
      .filter(department => !existingDepartmentNames.has(department.name))
      .map(department => ({
        company_id: company.id,
        name: department.name,
        code: department.code,
        budget: department.budget,
        description: department.description ?? null,
        is_active: true,
      }));
    if (departmentRows.length) {
      const { error } = await supabaseAdmin.from('departments').insert(departmentRows);
      if (error) {
        console.error('[SIGNUP] Department initialization failed:', error);
        await cleanup();
        return { success: false, error: 'Company was created, but departments could not be initialized' };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[SIGNUP] Unexpected company setup error:', error);
    return { success: false, error: 'Unable to complete company setup' };
  }
}

interface CreateUserInput {
  access_token: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  job_title?: string;
  department_id?: string;
  branch_id?: string;
  role_ids: string[];
  company_id: string;
  create_employee_record?: boolean;
  assign_as_department_head?: boolean;
}

interface UpdateUserInput {
  access_token: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  job_title?: string;
  department_id?: string;
  branch_id?: string;
  role_ids: string[];
  company_id: string;
}

interface ActorRoleRow {
  roles: {
    name: string;
    company_id: string | null;
    is_system: boolean;
    role_permissions: Array<{
      permissions: { resource: string; action: string } | null;
    }>;
  } | null;
}

async function authorizeUserManagement(accessToken: string, companyId: string, action: 'create' | 'edit') {
  if (!accessToken || !companyId) return { error: 'Authentication is required' as const };
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !authData.user) return { error: 'Authentication is required' as const };

  const { data: actor, error: actorError } = await supabaseAdmin
    .from('profiles')
    .select('company_id, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (actorError || !actor?.is_active || actor.company_id !== companyId) {
    return { error: 'You are not authorized to manage users in this company' as const };
  }

  const { data: roleData, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('roles(name, company_id, is_system, role_permissions(permissions(resource, action)))')
    .eq('user_id', authData.user.id);
  if (rolesError) {
    console.error('[USER ADMIN] Failed to resolve caller permissions:', rolesError);
    return { error: 'Unable to verify your user-management permissions' as const };
  }

  const roleRows = (roleData ?? []) as unknown as ActorRoleRow[];
  const actorRoles = roleRows.map(row => row.roles).filter((role): role is NonNullable<ActorRoleRow['roles']> => Boolean(role));
  const isSuperAdmin = actorRoles.some(role => isSuperAdminRoleName(role.name) && role.company_id == null);
  const isCompanyAdmin = actorRoles.some(role =>
    isCompanyAdminRoleName(role.name)
    || (isSuperAdminRoleName(role.name) && role.company_id === companyId)
  );
  const actorPermissions = new Set(actorRoles.flatMap(role =>
    role.role_permissions.flatMap(grant => grant.permissions
      ? [`${grant.permissions.resource}.${grant.permissions.action}`]
      : [])
  ));
  const hasPermission = actorRoles.some(role => role.role_permissions.some(grant =>
    grant.permissions?.resource === 'settings.users' && grant.permissions.action === action
  ));
  if (!isSuperAdmin && !hasPermission) {
    return { error: 'You do not have permission to manage users' as const };
  }
  return { actorId: authData.user.id, isSuperAdmin, isCompanyAdmin, actorPermissions };
}

async function validateCompanyAssignments(companyId: string, departmentId: string | undefined, branchId: string | undefined) {
  if (departmentId) {
    const { data, error } = await supabaseAdmin.from('departments').select('id').eq('id', departmentId).eq('company_id', companyId).maybeSingle();
    if (error || !data) return 'The selected department does not belong to this company';
  }
  if (branchId) {
    const { data, error } = await supabaseAdmin.from('branches').select('id').eq('id', branchId).eq('company_id', companyId).maybeSingle();
    if (error || !data) return 'The selected branch does not belong to this company';
  }
  return null;
}

async function validateRoleAssignments(
  companyId: string,
  roleIds: string[],
  authorization: { isSuperAdmin: boolean; isCompanyAdmin: boolean; actorPermissions: Set<string> }
) {
  const uniqueRoleIds = Array.from(new Set(roleIds));
  if (uniqueRoleIds.length === 0 || uniqueRoleIds.length !== roleIds.length) return 'Select one or more valid roles';
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('id, name, company_id, role_permissions(permissions(resource, action))')
    .in('id', uniqueRoleIds);
  if (error || data?.length !== uniqueRoleIds.length) return 'One or more selected roles are unavailable';
  const selectedRoles = data as unknown as Array<{
    id: string;
    name: string;
    company_id: string | null;
    role_permissions: Array<{ permissions: { resource: string; action: string } | null }>;
  }>;
  if (selectedRoles.some(role => role.company_id !== null && role.company_id !== companyId)) {
    return 'Roles can only be assigned within this company';
  }
  if (!authorization.isSuperAdmin && selectedRoles.some(role => isElevatedAdminRole(role.name))) {
    return 'Only a Super Admin can assign elevated administrator roles';
  }
  if (!authorization.isSuperAdmin && !authorization.isCompanyAdmin && selectedRoles.some(role =>
    role.role_permissions.some(grant => grant.permissions
      && !authorization.actorPermissions.has(`${grant.permissions.resource}.${grant.permissions.action}`))
  )) {
    return 'You cannot assign roles with permissions you do not have';
  }
  return null;
}

/**
 * Create a new user with Supabase Auth and profile
 * This runs on the server with service role key for security
 */
export async function createUser(input: CreateUserInput) {
  try {
    const authorization = await authorizeUserManagement(input.access_token, input.company_id, 'create');
    if ('error' in authorization) return { success: false, error: authorization.error };
    const assignmentError = await validateCompanyAssignments(input.company_id, input.department_id, input.branch_id);
    if (assignmentError) return { success: false, error: assignmentError };
    const roleError = await validateRoleAssignments(input.company_id, input.role_ids, authorization);
    if (roleError) return { success: false, error: roleError };
    if (input.assign_as_department_head
      && !authorization.isSuperAdmin
      && !authorization.actorPermissions.has('settings.departments.edit')
      && !authorization.actorPermissions.has('departments.manage')) {
      return { success: false, error: 'You do not have permission to assign department heads' };
    }
    if (input.assign_as_department_head && !input.department_id) {
      return { success: false, error: 'Choose a department before assigning a department head' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      input.email,
      {
        data: { first_name: input.first_name, last_name: input.last_name },
        redirectTo: `${appUrl}/auth/callback`,
      }
    );
    if (inviteError || !inviteData.user) {
      console.error('[USER ADMIN] Invitation failed:', inviteError);
      return { success: false, error: inviteError?.message || 'Unable to invite user' };
    }
    const newUserId = inviteData.user.id;

    const rollback = async () => {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (deleteError) console.error('[USER ADMIN] Failed to roll back invited account:', deleteError);
    };

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: newUserId,
      company_id: input.company_id,
      first_name: input.first_name,
      last_name: input.last_name,
      display_name: `${input.first_name} ${input.last_name}`,
      email: input.email,
      phone: input.phone,
      job_title: input.job_title,
      department_id: input.department_id,
      branch_id: input.branch_id,
      is_active: true,
    });
    if (profileError) {
      console.error('[USER ADMIN] Profile creation failed:', profileError);
      await rollback();
      return { success: false, error: `Failed to create profile: ${profileError.message}` };
    }

    if (input.role_ids.length > 0) {
      const { error } = await supabaseAdmin.from('user_roles').insert(input.role_ids.map(roleId => ({
        user_id: newUserId,
        role_id: roleId,
        assigned_by: authorization.actorId,
      })));
      if (error) {
        console.error('[USER ADMIN] Role assignment failed:', error);
        await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
        await rollback();
        return { success: false, error: `Failed to assign roles: ${error.message}` };
      }
    }

    if (input.create_employee_record) {
      const { error } = await supabaseAdmin.from('employees').insert({
        company_id: input.company_id,
        user_id: newUserId,
        employee_number: `EMP-${Date.now()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        job_title: input.job_title,
        department_id: input.department_id,
        branch_id: input.branch_id,
        employment_type: 'full_time',
        employment_status: 'active',
        hire_date: new Date().toISOString().slice(0, 10),
      });
      if (error) {
        console.error('[USER ADMIN] Employee record creation failed:', error);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId);
        await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
        await rollback();
        return { success: false, error: `Failed to create employee record: ${error.message}` };
      }
    }

    if (input.assign_as_department_head && input.department_id) {
      const { error } = await supabaseAdmin.from('departments')
        .update({ head_id: newUserId })
        .eq('id', input.department_id)
        .eq('company_id', input.company_id);
      if (error) {
        console.error('[USER ADMIN] Department head assignment failed:', error);
        await supabaseAdmin.from('employees').delete().eq('user_id', newUserId);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId);
        await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
        await rollback();
        return { success: false, error: `Failed to assign department head: ${error.message}` };
      }
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      company_id: input.company_id,
      user_id: authorization.actorId,
      action: 'user_created',
      module: 'users',
      record_id: newUserId,
      new_values: { roles: input.role_ids, department_id: input.department_id ?? null },
    });
    if (auditError) console.error('[USER ADMIN] User created but audit logging failed:', auditError);

    for (const path of ['/settings/users', '/hr/employees', '/dashboard']) revalidatePath(path);
    return {
      success: true,
      userId: newUserId,
      message: auditError
        ? 'User invited and created, but the audit log could not be recorded.'
        : 'User created successfully. Invitation sent.',
    };

  } catch (error) {
    console.error('[SERVER ACTION] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update an existing user
 */
export async function updateUser(input: UpdateUserInput) {
  try {
    const authorization = await authorizeUserManagement(input.access_token, input.company_id, 'edit');
    if ('error' in authorization) return { success: false, error: authorization.error };
    const assignmentError = await validateCompanyAssignments(input.company_id, input.department_id, input.branch_id);
    if (assignmentError) return { success: false, error: assignmentError };
    const roleError = await validateRoleAssignments(input.company_id, input.role_ids, authorization);
    if (roleError) return { success: false, error: roleError };
    if (authorization.actorId === input.user_id) {
      return { success: false, error: 'You cannot change your own role assignments' };
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, company_id')
      .eq('id', input.user_id)
      .eq('company_id', input.company_id)
      .maybeSingle();
    if (targetError || !target) return { success: false, error: 'User not found in this company' };

    const { data: existingRoleRows, error: existingRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', input.user_id);
    if (existingRolesError) return { success: false, error: 'Unable to verify current user roles' };
    const existingRoleIds = (existingRoleRows ?? []).map(row => row.role_id);
    if (!authorization.isSuperAdmin && (existingRoleRows ?? []).some(row => {
      const relatedRole = row.roles as { name?: string } | null;
      return relatedRole?.name ? isElevatedAdminRole(relatedRole.name) : false;
    })) {
      return { success: false, error: 'Only a Super Admin can manage an administrator account' };
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').update({
      first_name: input.first_name,
      last_name: input.last_name,
      display_name: `${input.first_name} ${input.last_name}`,
      email: input.email,
      phone: input.phone,
      job_title: input.job_title,
      department_id: input.department_id,
      branch_id: input.branch_id,
      updated_at: new Date().toISOString(),
    }).eq('id', input.user_id).eq('company_id', input.company_id);

    if (profileError) {
      console.error('[SERVER ACTION] Profile update failed:', profileError);
      return { success: false, error: 'Failed to update profile' };
    }

    console.log('[SERVER ACTION] Profile updated');

    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', input.user_id);

    if (deleteRolesError) {
      console.error('[SERVER ACTION] Role deletion failed:', deleteRolesError);
      return { success: false, error: 'Failed to update user roles' };
    }

    if (input.role_ids.length > 0) {
      const roleInserts = input.role_ids.map(roleId => ({
        user_id: input.user_id,
        role_id: roleId,
        assigned_by: authorization.actorId,
      }));

      const { error: rolesError } = await supabaseAdmin.from('user_roles').insert(roleInserts);

      if (rolesError) {
        console.error('[SERVER ACTION] Role assignment failed:', rolesError);
        await supabaseAdmin.from('user_roles').delete().eq('user_id', input.user_id);
        if (existingRoleIds.length > 0) {
          const { error: restoreError } = await supabaseAdmin.from('user_roles').insert(existingRoleIds.map(roleId => ({
            user_id: input.user_id,
            role_id: roleId,
            assigned_by: authorization.actorId,
          })));
          if (restoreError) console.error('[USER ADMIN] Failed to restore previous roles:', restoreError);
        }
        return { success: false, error: 'Failed to assign roles' };
      }

      console.log('[SERVER ACTION] Roles updated:', input.role_ids);
    }

    const { error: employeeUpdateError } = await supabaseAdmin
      .from('employees')
      .update({
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        job_title: input.job_title,
        department_id: input.department_id,
        branch_id: input.branch_id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', input.user_id)
      .eq('company_id', input.company_id);
    if (employeeUpdateError) {
      console.error('[USER ADMIN] Profile updated but employee synchronization failed:', employeeUpdateError);
      return { success: false, error: 'Profile updated, but the employee record could not be synchronized' };
    }

    // Step 3: Log audit events
    try {
      await supabaseAdmin.from('audit_logs').insert({
        company_id: input.company_id,
        user_id: authorization.actorId,
        action: 'user_updated',
        module: 'users',
        record_id: input.user_id,
        new_values: { 
          roles: input.role_ids,
          department_id: input.department_id,
        },
      });

      await supabaseAdmin.from('audit_logs').insert({
        company_id: input.company_id,
        user_id: authorization.actorId,
        action: 'role_updated',
        module: 'roles',
        record_id: input.user_id,
        new_values: { roles: input.role_ids },
      });
    } catch (auditError) {
      console.error('[SERVER ACTION] Audit logging failed:', auditError);
    }

    for (const path of ['/settings/users', '/hr/employees', '/dashboard']) revalidatePath(path);

    return { 
      success: true, 
      message: 'User updated successfully' 
    };

  } catch (error) {
    console.error('[SERVER ACTION] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Deactivate a user (soft delete)
 */
export async function updateUsersStatus(accessToken: string, userIds: string[], companyId: string, isActive: boolean) {
  try {
    const authorization = await authorizeUserManagement(accessToken, companyId, 'edit');
    if ('error' in authorization) return { success: false, error: authorization.error };
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0 || uniqueIds.includes(authorization.actorId)) {
      return { success: false, error: 'Select other users; you cannot deactivate your own account' };
    }

    const { data: targets, error: targetsError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active')
      .eq('company_id', companyId)
      .in('id', uniqueIds);
    if (targetsError || targets?.length !== uniqueIds.length) {
      return { success: false, error: 'One or more users were not found in this company' };
    }
    const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, roles(name)')
      .in('user_id', uniqueIds);
    if (targetRolesError) return { success: false, error: 'Unable to verify selected users roles' };
    if (!authorization.isSuperAdmin && (targetRoles ?? []).some(row => {
      const relatedRole = row.roles as { name?: string } | null;
      return relatedRole?.name ? isElevatedAdminRole(relatedRole.name) : false;
    })) {
      return { success: false, error: 'Only a Super Admin can manage an administrator account' };
    }

    const { error: profileError } = await supabaseAdmin.from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('company_id', companyId)
      .in('id', uniqueIds);
    if (profileError) {
      console.error('[USER ADMIN] User status update failed:', profileError);
      return { success: false, error: profileError.message };
    }

    const updatedAuthIds: string[] = [];
    for (const id of uniqueIds) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        ban_duration: isActive ? 'none' : '876000h',
      });
      if (error) {
        console.error('[USER ADMIN] Auth account status synchronization failed:', error);
        let rollbackFailed = false;
        for (const target of targets ?? []) {
          const { error: profileRollbackError } = await supabaseAdmin.from('profiles').update({
            is_active: target.is_active,
            updated_at: new Date().toISOString(),
          }).eq('company_id', companyId).eq('id', target.id);
          if (profileRollbackError) {
            rollbackFailed = true;
            console.error('[USER ADMIN] Failed to restore profile status:', profileRollbackError);
          }
        }
        for (const updatedId of updatedAuthIds) {
          const wasActive = targets?.find(target => target.id === updatedId)?.is_active;
          const { error: authRollbackError } = await supabaseAdmin.auth.admin.updateUserById(updatedId, {
            ban_duration: wasActive ? 'none' : '876000h',
          });
          if (authRollbackError) {
            rollbackFailed = true;
            console.error('[USER ADMIN] Failed to restore authentication status:', authRollbackError);
          }
        }
        return {
          success: false,
          error: rollbackFailed
            ? `Authentication status could not be synchronized and rollback was incomplete: ${error.message}`
            : `Authentication status could not be synchronized; previous statuses were restored: ${error.message}`,
        };
      }
      updatedAuthIds.push(id);
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert(uniqueIds.map(id => ({
      company_id: companyId,
      user_id: authorization.actorId,
      action: isActive ? 'user_activated' : 'user_deactivated',
      module: 'users',
      record_id: id,
    })));
    if (auditError) console.error('[USER ADMIN] User status changed but audit logging failed:', auditError);
    for (const path of ['/settings/users', '/hr/employees', '/dashboard']) revalidatePath(path);
    return { success: true, message: auditError ? 'User status updated, but audit logging failed.' : 'User status updated' };
  } catch (error) {
    console.error('[USER ADMIN] Unexpected status update error:', error);
    return { success: false, error: 'Unable to update user status' };
  }
}

export async function assignUsersRoles(accessToken: string, userIds: string[], companyId: string, roleIds: string[]) {
  try {
    const authorization = await authorizeUserManagement(accessToken, companyId, 'edit');
    if ('error' in authorization) return { success: false, error: authorization.error };
    const uniqueUserIds = Array.from(new Set(userIds));
    if (!uniqueUserIds.length || uniqueUserIds.includes(authorization.actorId)) {
      return { success: false, error: 'You cannot change your own role assignments' };
    }
    const roleError = await validateRoleAssignments(companyId, roleIds, authorization);
    if (roleError) return { success: false, error: roleError };

    const { data: targets, error: targetsError } = await supabaseAdmin
      .from('profiles').select('id').eq('company_id', companyId).in('id', uniqueUserIds);
    if (targetsError || targets?.length !== uniqueUserIds.length) {
      return { success: false, error: 'One or more users were not found in this company' };
    }
    const { data: priorRoles, error: priorRolesError } = await supabaseAdmin
      .from('user_roles').select('user_id, role_id').in('user_id', uniqueUserIds);
    if (priorRolesError) return { success: false, error: 'Unable to read current role assignments' };

    for (const userId of uniqueUserIds) {
      const { data: currentRoles, error: currentRolesError } = await supabaseAdmin
        .from('user_roles').select('roles(name)').eq('user_id', userId);
      if (currentRolesError) return { success: false, error: 'Unable to verify selected users roles' };
      if (!authorization.isSuperAdmin && (currentRoles ?? []).some(row => {
        const relatedRole = row.roles as { name?: string } | null;
        return relatedRole?.name ? isElevatedAdminRole(relatedRole.name) : false;
      })) {
        return { success: false, error: 'Only a Super Admin can manage an administrator account' };
      }
    }

    const { error: deleteError } = await supabaseAdmin.from('user_roles').delete().in('user_id', uniqueUserIds);
    if (deleteError) return { success: false, error: 'Unable to replace current role assignments' };
    const { error: insertError } = await supabaseAdmin.from('user_roles').insert(uniqueUserIds.flatMap(userId =>
      roleIds.map(roleId => ({ user_id: userId, role_id: roleId, assigned_by: authorization.actorId }))
    ));
    if (insertError) {
      console.error('[USER ADMIN] Bulk role assignment failed:', insertError);
      const { error: restoreError } = await supabaseAdmin.from('user_roles').insert((priorRoles ?? []).map(row => ({
        user_id: row.user_id,
        role_id: row.role_id,
        assigned_by: authorization.actorId,
      })));
      if (restoreError) console.error('[USER ADMIN] Failed to restore bulk role assignments:', restoreError);
      return { success: false, error: `Failed to assign roles: ${insertError.message}` };
    }
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      company_id: companyId,
      user_id: authorization.actorId,
      action: 'users_bulk_roles_assigned',
      module: 'roles',
      new_values: { user_ids: uniqueUserIds, role_ids: roleIds },
    });
    if (auditError) console.error('[USER ADMIN] Roles assigned but audit logging failed:', auditError);
    revalidatePath('/settings/users');
    return { success: true, message: auditError ? 'Roles assigned, but audit logging failed.' : 'Roles assigned' };
  } catch (error) {
    console.error('[USER ADMIN] Unexpected bulk role assignment error:', error);
    return { success: false, error: 'Unable to assign roles' };
  }
}

export async function sendUserPasswordReset(accessToken: string, companyId: string, userId: string) {
  try {
    const authorization = await authorizeUserManagement(accessToken, companyId, 'edit');
    if ('error' in authorization) return { success: false, error: authorization.error };
    if (authorization.actorId === userId) return { success: false, error: 'Use the account recovery flow for your own password' };
    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (targetError || !target?.email) return { success: false, error: 'User email is unavailable' };
    const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', userId);
    if (targetRolesError) return { success: false, error: 'Unable to verify selected user roles' };
    if (!authorization.isSuperAdmin && (targetRoles ?? []).some(row => {
      const relatedRole = row.roles as { name?: string } | null;
      return relatedRole?.name ? isElevatedAdminRole(relatedRole.name) : false;
    })) {
      return { success: false, error: 'Only a Super Admin can manage an administrator account' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { error } = await supabasePublic.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${appUrl}/setup-password`,
    });
    if (error) {
      console.error('[USER ADMIN] Password reset email failed:', error);
      return { success: false, error: 'Unable to send password reset email' };
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      company_id: companyId,
      user_id: authorization.actorId,
      action: 'password_reset',
      module: 'auth',
      record_id: userId,
    });
    if (auditError) console.error('[USER ADMIN] Password reset sent but audit logging failed:', auditError);
    return { success: true, message: auditError ? 'Reset email sent, but audit logging failed.' : 'Password reset email sent' };
  } catch (error) {
    console.error('[USER ADMIN] Unexpected password reset error:', error);
    return { success: false, error: 'Unable to send password reset email' };
  }
}
