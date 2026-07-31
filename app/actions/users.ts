'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role key for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface CreateUserInput {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  job_title?: string;
  department_id?: string;
  branch_id?: string;
  role_ids: string[];
  company_id: string;
  assigned_by: string;
  create_employee_record?: boolean;
  assign_as_department_head?: boolean;
}

interface UpdateUserInput {
  user_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  job_title?: string;
  department_id?: string;
  branch_id?: string;
  role_ids: string[];
  company_id: string;
  assigned_by: string;
}

/**
 * Create a new user with Supabase Auth and profile
 * This runs on the server with service role key for security
 */
export async function createUser(input: CreateUserInput) {
  try {
    console.log('[SERVER ACTION] Creating user:', input.email);

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      email_confirm: false, // Send invitation email
      user_metadata: {
        first_name: input.first_name,
        last_name: input.last_name,
      },
    });

    if (authError) {
      console.error('[SERVER ACTION] Auth user creation failed:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create auth user' };
    }

    console.log('[SERVER ACTION] Auth user created:', authData.user.id);

    // Step 2: Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
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
      console.error('[SERVER ACTION] Profile creation failed:', profileError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: 'Failed to create profile' };
    }

    console.log('[SERVER ACTION] Profile created');

    // Step 3: Create employee record if requested
    if (input.create_employee_record) {
      // Generate employee number
      const employeeNumber = `EMP-${Date.now().toString().slice(-6)}`;
      
      const { error: employeeError } = await supabaseAdmin.from('employees').insert({
        company_id: input.company_id,
        user_id: authData.user.id,
        employee_number: employeeNumber,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        job_title: input.job_title,
        department_id: input.department_id,
        branch_id: input.branch_id,
        employment_type: 'full_time',
        employment_status: 'active',
        hire_date: new Date().toISOString().split('T')[0],
        salary_currency: 'USD', // Default, should be fetched from company
      });

      if (employeeError) {
        console.error('[SERVER ACTION] Employee record creation failed:', employeeError);
        // Don't fail the operation, but log the error
      } else {
        console.log('[SERVER ACTION] Employee record created');
      }
    }

    // Step 4: Assign as department head if requested
    if (input.assign_as_department_head && input.department_id) {
      const { error: deptHeadError } = await supabaseAdmin
        .from('departments')
        .update({ head_id: authData.user.id })
        .eq('id', input.department_id);

      if (deptHeadError) {
        console.error('[SERVER ACTION] Department head assignment failed:', deptHeadError);
        // Don't fail the operation, but log the error
      } else {
        console.log('[SERVER ACTION] Assigned as department head');
      }
    }

    // Step 5: Assign roles
    if (input.role_ids.length > 0) {
      const roleInserts = input.role_ids.map(roleId => ({
        user_id: authData.user.id,
        role_id: roleId,
        assigned_by: input.assigned_by,
      }));

      const { error: rolesError } = await supabaseAdmin.from('user_roles').insert(roleInserts);

      if (rolesError) {
        console.error('[SERVER ACTION] Role assignment failed:', rolesError);
        // Don't fail the entire operation, but log the error
      } else {
        console.log('[SERVER ACTION] Roles assigned:', input.role_ids);
      }
    }

    // Step 6: Send invitation email
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      input.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/setup-password`,
      }
    );

    if (inviteError) {
      console.error('[SERVER ACTION] Invitation email failed:', inviteError);
      // Don't fail the operation, but log the error
    } else {
      console.log('[SERVER ACTION] Invitation email sent');
    }

    // Step 7: Log audit events
    try {
      // Log user creation
      await supabaseAdmin.from('audit_logs').insert({
        company_id: input.company_id,
        user_id: input.assigned_by,
        action: 'user_created',
        module: 'users',
        record_id: authData.user.id,
        new_values: { email: input.email, roles: input.role_ids },
      });

      // Log role assignment
      await supabaseAdmin.from('audit_logs').insert({
        company_id: input.company_id,
        user_id: input.assigned_by,
        action: 'role_assigned',
        module: 'roles',
        record_id: authData.user.id,
        new_values: { roles: input.role_ids },
      });
    } catch (auditError) {
      console.error('[SERVER ACTION] Audit logging failed:', auditError);
      // Don't fail the operation
    }

    revalidatePath('/settings/users');

    return { 
      success: true, 
      userId: authData.user.id,
      message: 'User created successfully. Invitation sent.' 
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
    console.log('[SERVER ACTION] Updating user:', input.user_id);

    // Step 1: Update profile
    const { error: profileError } = await supabaseAdmin.from('profiles').update({
      first_name: input.first_name,
      last_name: input.last_name,
      display_name: `${input.first_name} ${input.last_name}`,
      phone: input.phone,
      job_title: input.job_title,
      department_id: input.department_id,
      branch_id: input.branch_id,
      updated_at: new Date().toISOString(),
    }).eq('id', input.user_id);

    if (profileError) {
      console.error('[SERVER ACTION] Profile update failed:', profileError);
      return { success: false, error: 'Failed to update profile' };
    }

    console.log('[SERVER ACTION] Profile updated');

    // Step 2: Update roles (delete existing, then insert new)
    const { error: deleteRolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', input.user_id);

    if (deleteRolesError) {
      console.error('[SERVER ACTION] Role deletion failed:', deleteRolesError);
    }

    if (input.role_ids.length > 0) {
      const roleInserts = input.role_ids.map(roleId => ({
        user_id: input.user_id,
        role_id: roleId,
        assigned_by: input.assigned_by,
      }));

      const { error: rolesError } = await supabaseAdmin.from('user_roles').insert(roleInserts);

      if (rolesError) {
        console.error('[SERVER ACTION] Role assignment failed:', rolesError);
        return { success: false, error: 'Failed to assign roles' };
      }

      console.log('[SERVER ACTION] Roles updated:', input.role_ids);
    }

    // Step 3: Log audit events
    try {
      await supabaseAdmin.from('audit_logs').insert({
        company_id: input.company_id,
        user_id: input.assigned_by,
        action: 'user_updated',
        module: 'users',
        record_id: input.user_id,
        new_values: { 
          email: input.email,
          roles: input.role_ids,
          department_id: input.department_id,
        },
      });

      await supabaseAdmin.from('audit_logs').insert({
        company_id: input.company_id,
        user_id: input.assigned_by,
        action: 'role_updated',
        module: 'roles',
        record_id: input.user_id,
        new_values: { roles: input.role_ids },
      });
    } catch (auditError) {
      console.error('[SERVER ACTION] Audit logging failed:', auditError);
    }

    revalidatePath('/settings/users');

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
export async function deactivateUser(userId: string, companyId: string, currentUserId: string) {
  try {
    console.log('[SERVER ACTION] Deactivating user:', userId);

    const { error } = await supabaseAdmin.from('profiles').update({
      is_active: false,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    if (error) {
      console.error('[SERVER ACTION] User deactivation failed:', error);
      return { success: false, error: 'Failed to deactivate user' };
    }

    // Log audit event
    try {
      await supabaseAdmin.from('audit_logs').insert({
        company_id: companyId,
        user_id: currentUserId,
        action: 'user_deactivated',
        module: 'users',
        record_id: userId,
      });
    } catch (auditError) {
      console.error('[SERVER ACTION] Audit logging failed:', auditError);
    }

    revalidatePath('/settings/users');

    return { success: true, message: 'User deactivated successfully' };

  } catch (error) {
    console.error('[SERVER ACTION] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
