'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile, Role, Department, Branch } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logRoleChange, logAuditEvent } from '@/lib/audit';
import { Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import { assignUsersRoles, createUser, sendUserPasswordReset, updateUser, updateUsersStatus } from '@/app/actions/users';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Plus, Search, MoreHorizontal, Mail, Shield, Edit, Trash2, UserCheck, UserX, Key, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { isCompanyAdminRoleName, isSuperAdminRoleName } from '@/lib/rbac';

const userSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  department_id: z.string().optional(),
  branch_id: z.string().optional(),
  role_ids: z.array(z.string()).min(1, 'At least one role required'),
  create_employee_record: z.boolean().optional(),
  assign_as_department_head: z.boolean().optional(),
});
type UserForm = z.infer<typeof userSchema>;
type UserWithRelations = Profile & {
  user_roles?: Array<{ roles: Role | null }>;
  departments?: Department;
  branches?: Branch;
};

export default function UsersSettingsPage() {
  const { company, session, accessLevel, hasPermission } = useAuth();
  const [users, setUsers] = useState<(Profile & { roles?: Role[]; departments?: Department; branches?: Branch })[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [toggleActiveId, setToggleActiveId] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'activate' | 'deactivate' | 'assign_roles' | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkRoleIds, setBulkRoleIds] = useState<string[]>([]);
  const canAssignDepartmentHead = accessLevel === 'super_admin'
    || hasPermission('settings.departments.edit')
    || hasPermission('departments.manage');
  const assignableRoles = roles.filter(role => !isCompanyAdminRoleName(role.name)
    && (accessLevel === 'super_admin' || !isSuperAdminRoleName(role.name)));

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role_ids: [], create_employee_record: true },
    mode: 'onSubmit',
  });

  const load = useCallback(async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    const [usersRes, rolesRes, deptRes, branchRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, user_roles(role_id, roles(*)), departments(*), branches(*)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('roles').select('*').or(`company_id.eq.${company.id},and(company_id.is.null,is_system.eq.true)`),
      supabase.from('departments').select('*').eq('company_id', company.id),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    const queryErrors = [usersRes.error, rolesRes.error, deptRes.error, branchRes.error].filter(Boolean);
    if (queryErrors.length) {
      console.error('[Users Page] Failed to load user-management data:', queryErrors);
      toast.error('Unable to load user-management data');
      setLoading(false);
      return;
    }

    const usersWithRoles = (usersRes.data ?? []).map(row => {
      const userRow = row as unknown as UserWithRelations;
      return {
        ...userRow,
        roles: (userRow.user_roles ?? []).map(userRole => userRole.roles).filter((role): role is Role => Boolean(role)),
      };
    });

    setUsers(usersWithRoles);
    setRoles(rolesRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { void load(); }, [load]);

  const openEdit = (user: Profile & { roles?: Role[] }) => {
    setEditUser(user);
    reset({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      job_title: user.job_title ?? '',
      department_id: user.department_id ?? undefined,
      branch_id: user.branch_id ?? undefined,
      role_ids: user.roles?.map(r => r.id) || [],
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: UserForm) => {
    if (!company?.id) return;
    const accessToken = session?.access_token ?? '';
    if (!accessToken) {
      toast.error('Your session expired. Sign in again before managing users.');
      return;
    }

    if (editUser) {
      // Update existing user using Server Action
      const result = await updateUser({
        access_token: accessToken,
        user_id: editUser.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: editUser.email ?? data.email,
        phone: data.phone,
        job_title: data.job_title,
        department_id: data.department_id,
        branch_id: data.branch_id,
        role_ids: data.role_ids,
        company_id: company.id,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update user');
        return;
      }

      toast.success('User updated');
    } else {
      // Create new user using Server Action
      const result = await createUser({
        access_token: accessToken,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        job_title: data.job_title,
        department_id: data.department_id,
        branch_id: data.branch_id,
        role_ids: data.role_ids,
        company_id: company.id,
        create_employee_record: data.create_employee_record,
        assign_as_department_head: data.assign_as_department_head,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to create user');
        return;
      }

      toast.success(result.message || 'User created successfully');
    }

    reset();
    setEditUser(null);
    setDialogOpen(false);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !session?.access_token) return;
    setDeleting(true);
    const result = await updateUsersStatus(session.access_token, [deleteId], company.id, false);
    if (!result.success) {
      toast.error(result.error || 'Failed to disable user');
    } else {
      toast.success(result.message || 'User disabled');
      await load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordId || !company?.id || !session?.access_token) return;
    setResettingPassword(true);
    const result = await sendUserPasswordReset(session.access_token, company.id, resetPasswordId);
    if (!result.success) {
      toast.error(result.error || 'Failed to send password reset email');
    } else {
      toast.success(result.message || 'Password reset email sent');
    }

    setResetPasswordId(null);
    setResettingPassword(false);
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (!company?.id || !session?.access_token) return;
    setToggleActiveId(userId);
    setTogglingActive(true);
    const result = await updateUsersStatus(session.access_token, [userId], company.id, !currentStatus);
    if (!result.success) {
      toast.error(result.error || 'Failed to update user status');
    } else {
      toast.success(result.message || `User ${!currentStatus ? 'activated' : 'deactivated'}`);
      await load();
    }

    setToggleActiveId(null);
    setTogglingActive(false);
  };

  const handleBulkAction = async () => {
    if (!company?.id || !session?.access_token || selectedUsers.length === 0 || !bulkActionType) return;
    setBulkProcessing(true);

    try {
      if (bulkActionType === 'activate' || bulkActionType === 'deactivate') {
        const result = await updateUsersStatus(session.access_token, selectedUsers, company.id, bulkActionType === 'activate');
        if (!result.success) throw new Error(result.error || 'Failed to update user status');
        toast.success(result.message || `${selectedUsers.length} users updated`);
      } else if (bulkActionType === 'assign_roles' && bulkRoleIds.length > 0) {
        const result = await assignUsersRoles(session.access_token, selectedUsers, company.id, bulkRoleIds);
        if (!result.success) throw new Error(result.error || 'Failed to assign roles');
        toast.success(result.message || `Roles assigned to ${selectedUsers.length} users`);
      }

      setSelectedUsers([]);
      setBulkActionOpen(false);
      setBulkActionType(null);
      setBulkRoleIds([]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to perform bulk action');
    }

    setBulkProcessing(false);
  };

  const active = users.filter(u => u.is_active).length;

  const columns: Column<(Profile & { roles?: Role[]; departments?: Department })>[] = [
    {
      key: 'select',
      header: '',
      headerClassName: 'w-10',
      cell: (row) => (
        <Checkbox
          checked={selectedUsers.includes(row.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedUsers([...selectedUsers, row.id]);
            } else {
              setSelectedUsers(selectedUsers.filter(id => id !== row.id));
            }
          }}
        />
      ),
    },
    {
      key: 'name',
      header: 'User',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
              {getInitials(`${row.first_name} ${row.last_name}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {row.display_name || `${row.first_name} ${row.last_name}`}
            </p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'job_title',
      header: 'Job Title',
      sortable: true,
      cell: (row) => <span className="text-sm">{row.job_title ?? '—'}</span>,
    },
    {
      key: 'department',
      header: 'Department',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.departments?.name ?? '—'}</span>,
    },
    {
      key: 'roles',
      header: 'Roles',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.slice(0, 2).map(role => (
            <Badge key={role.id} variant="secondary" className="text-xs">
              {role.name}
            </Badge>
          ))}
          {(row.roles?.length || 0) > 2 && (
            <Badge variant="outline" className="text-xs">+{row.roles!.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-10',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 mr-2" />Edit
            </DropdownMenuItem>
            <Can resource="settings.users" action="edit">
              <DropdownMenuItem onClick={() => setResetPasswordId(row.id)}>
                <Key className="h-4 w-4 mr-2" />Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(row.id, row.is_active)}>
                {row.is_active ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                {row.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              {row.is_active && (
                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />Disable
                </DropdownMenuItem>
              )}
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage team members and their access"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users' }]}
      >
        <Can resource="settings.users" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => {
            if (open && !editUser) {
              reset({ role_ids: [], create_employee_record: true });
            }
            if (!open) {
              setEditUser(null);
              reset();
            }
            setDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit, (errors) => console.log('[Users Page] Form validation errors:', errors))} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input className="mt-1" {...register('first_name')} />
                    {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input className="mt-1" {...register('last_name')} />
                    {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <Label>Email *</Label>
                    <Input className="mt-1" type="email" {...register('email')} disabled={!!editUser} />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    {editUser && <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>}
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input className="mt-1" {...register('phone')} />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input className="mt-1" {...register('job_title')} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Controller name="department_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Controller name="branch_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                        <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="col-span-2">
                    <Label>Roles *</Label>
                    <Controller name="role_ids" control={control} render={({ field }) => (
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                        {assignableRoles.length === 0 ? (
                          <p className="text-sm text-gray-500">No roles are available to assign.</p>
                        ) : (
                          assignableRoles.map(role => (
                            <div key={role.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={role.id}
                                checked={field.value.includes(role.id)}
                                onCheckedChange={checked => {
                                  if (checked) {
                                    field.onChange([...field.value, role.id]);
                                  } else {
                                    field.onChange(field.value.filter(id => id !== role.id));
                                  }
                                }}
                              />
                              <label htmlFor={role.id} className="text-sm cursor-pointer flex-1">
                                {role.name}
                                {role.is_system && <span className="ml-2 text-xs text-gray-400">(System)</span>}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    )} />
                    {errors.role_ids && <p className="text-xs text-red-500 mt-1 font-medium">{errors.role_ids.message}</p>}
                  </div>
                  {!editUser && <div className="col-span-2 space-y-3 pt-2 border-t">
                    <Controller
                      name="create_employee_record"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="create_employee_record"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <label htmlFor="create_employee_record" className="text-sm cursor-pointer">
                            Create employee record
                          </label>
                        </div>
                      )}
                    />
                    {canAssignDepartmentHead && <Controller
                        name="assign_as_department_head"
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="assign_as_department_head"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <label htmlFor="assign_as_department_head" className="text-sm cursor-pointer">
                              Assign as department head
                            </label>
                          </div>
                        )}
                      />}
                  </div>}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditUser(null); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editUser ? 'Update User' : 'Add User'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Users" value={users.length} icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Inactive" value={users.length - active} icon={<UserX className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Roles" value={roles.length} icon={<Shield className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
          <span className="text-sm text-blue-700 dark:text-blue-400">{selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
              Clear
            </Button>
            <Can resource="settings.users" action="edit">
              <DropdownMenu open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Bulk Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setBulkActionType('activate'); setBulkActionOpen(false); }}>
                    <UserCheck className="h-4 w-4 mr-2" />Activate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setBulkActionType('deactivate'); setBulkActionOpen(false); }}>
                    <UserX className="h-4 w-4 mr-2" />Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setBulkActionType('assign_roles'); setBulkActionOpen(false); }}>
                    <Shield className="h-4 w-4 mr-2" />Assign Roles
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>
          </div>
        </div>
      )}

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search users..."
        searchKeys={['first_name', 'last_name', 'email', 'job_title']}
        pageSize={15}
        emptyTitle="No users yet"
        emptyDescription="Add team members to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Disable User?"
        description="This will disable the user's access. Their data will be preserved. You can reactivate them later."
        confirmLabel="Disable"
      />

      <ConfirmDialog
        open={!!resetPasswordId}
        onClose={() => setResetPasswordId(null)}
        onConfirm={handleResetPassword}
        loading={resettingPassword}
        title="Reset Password?"
        description="A password reset link will be sent to the user's email address."
        confirmLabel="Send Reset Link"
      />

      <Dialog open={bulkActionType === 'assign_roles'} onOpenChange={(open) => { if (!open) setBulkActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Roles to {selectedUsers.length} User{selectedUsers.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
              {roles.map(role => (
                <div key={role.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`bulk-${role.id}`}
                    checked={bulkRoleIds.includes(role.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBulkRoleIds([...bulkRoleIds, role.id]);
                      } else {
                        setBulkRoleIds(bulkRoleIds.filter(id => id !== role.id));
                      }
                    }}
                  />
                  <label htmlFor={`bulk-${role.id}`} className="text-sm cursor-pointer flex-1">
                    {role.name}
                    {role.is_system && <span className="ml-2 text-xs text-gray-400">(System)</span>}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBulkActionType(null)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAction} disabled={bulkProcessing || bulkRoleIds.length === 0} className="bg-blue-600 hover:bg-blue-700">
                {bulkProcessing ? 'Assigning...' : 'Assign Roles'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={bulkActionType === 'activate' || bulkActionType === 'deactivate'}
        onClose={() => setBulkActionType(null)}
        onConfirm={handleBulkAction}
        loading={bulkProcessing}
        title={`${bulkActionType === 'activate' ? 'Activate' : 'Deactivate'} ${selectedUsers.length} User${selectedUsers.length > 1 ? 's' : ''}?`}
        description={`This will ${bulkActionType === 'activate' ? 'activate' : 'deactivate'} the selected users. They will ${bulkActionType === 'activate' ? 'gain' : 'lose'} access to the system.`}
        confirmLabel={bulkActionType === 'activate' ? 'Activate' : 'Deactivate'}
      />
    </div>
  );
}
