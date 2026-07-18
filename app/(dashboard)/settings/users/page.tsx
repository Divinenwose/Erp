'use client';

import { useState, useEffect } from 'react';
import { supabase, Profile, Role, Department, Branch } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logRoleChange, logAuditEvent } from '@/lib/audit';
import { Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
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

const userSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  department_id: z.string().optional(),
  branch_id: z.string().optional(),
  role_ids: z.array(z.string()).min(1, 'At least one role required'),
});
type UserForm = z.infer<typeof userSchema>;

export default function UsersSettingsPage() {
  const { company, user: currentUser } = useAuth();
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

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role_ids: [] },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);
    
    const [usersRes, rolesRes, deptRes, branchRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*, user_roles(role_id, roles(*)), departments(*), branches(*)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('roles').select('*').eq('company_id', company.id).or('is_system.eq.true'),
      supabase.from('departments').select('*').eq('company_id', company.id),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    const usersWithRoles = (usersRes.data ?? []).map((u: any) => ({
      ...u,
      roles: u.user_roles?.map((ur: any) => ur.roles).filter(Boolean) || [],
    }));

    setUsers(usersWithRoles);
    setRoles(rolesRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

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
    
    if (editUser) {
      // Update existing user
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          job_title: data.job_title,
          department_id: data.department_id,
          branch_id: data.branch_id,
          display_name: `${data.first_name} ${data.last_name}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editUser.id);

      if (profileError) {
        toast.error('Failed to update user');
        return;
      }

      // Update roles
      const { error: deleteRolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editUser.id);

      if (!deleteRolesError) {
        const roleInserts = data.role_ids.map(roleId => ({
          user_id: editUser.id,
          role_id: roleId,
          assigned_by: currentUser?.id,
        }));
        
        await supabase.from('user_roles').insert(roleInserts);
      }

      // Audit log
      await logRoleChange(company.id, currentUser?.id || '', editUser.id, 'role_updated');
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'user_updated',
        module: 'users',
        record_id: editUser.id,
        new_values: { email: data.email, roles: data.role_ids },
      });

      toast.success('User updated');
    } else {
      // Create new user (invite)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: {
          first_name: data.first_name,
          last_name: data.last_name,
        },
      });

      if (authError) {
        toast.error('Failed to create user');
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          company_id: company.id,
          first_name: data.first_name,
          last_name: data.last_name,
          display_name: `${data.first_name} ${data.last_name}`,
          email: data.email,
          phone: data.phone,
          job_title: data.job_title,
          department_id: data.department_id,
          branch_id: data.branch_id,
          is_active: true,
        });

        if (profileError) {
          toast.error('Failed to create profile');
          return;
        }

        // Assign roles
        const roleInserts = data.role_ids.map(roleId => ({
          user_id: authData.user.id,
          role_id: roleId,
          assigned_by: currentUser?.id,
        }));
        
        await supabase.from('user_roles').insert(roleInserts);

        // Audit log
        await logRoleChange(company.id, currentUser?.id || '', authData.user.id, 'role_assigned');
        await logAuditEvent(company.id, currentUser?.id || '', {
          action: 'user_created',
          module: 'users',
          record_id: authData.user.id,
          new_values: { email: data.email, roles: data.role_ids },
        });

        toast.success('User created successfully');
      }
    }

    reset();
    setEditUser(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to disable user');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'user_disabled',
        module: 'users',
        record_id: deleteId,
      });
      toast.success('User disabled');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordId || !company?.id) return;
    setResettingPassword(true);

    const { error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: users.find(u => u.id === resetPasswordId)?.email || '',
    });

    if (error) {
      toast.error('Failed to generate password reset link');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'password_reset',
        module: 'auth',
        record_id: resetPasswordId,
      });
      toast.success('Password reset link sent to user email');
    }

    setResetPasswordId(null);
    setResettingPassword(false);
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (!company?.id) return;
    setToggleActiveId(userId);
    setTogglingActive(true);

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to update user status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: !currentStatus ? 'user_activated' : 'user_deactivated',
        module: 'users',
        record_id: userId,
      });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      load();
    }

    setToggleActiveId(null);
    setTogglingActive(false);
  };

  const handleBulkAction = async () => {
    if (!company?.id || selectedUsers.length === 0 || !bulkActionType) return;
    setBulkProcessing(true);

    try {
      if (bulkActionType === 'activate' || bulkActionType === 'deactivate') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_active: bulkActionType === 'activate', updated_at: new Date().toISOString() })
          .in('id', selectedUsers);

        if (error) throw error;

        await logAuditEvent(company.id, currentUser?.id || '', {
          action: bulkActionType === 'activate' ? 'users_bulk_activated' : 'users_bulk_deactivated',
          module: 'users',
          new_values: { user_ids: selectedUsers },
        });

        toast.success(`${selectedUsers.length} users ${bulkActionType === 'activate' ? 'activated' : 'deactivated'}`);
      } else if (bulkActionType === 'assign_roles' && bulkRoleIds.length > 0) {
        for (const userId of selectedUsers) {
          await supabase.from('user_roles').delete().eq('user_id', userId);
          const roleInserts = bulkRoleIds.map(roleId => ({
            user_id: userId,
            role_id: roleId,
            assigned_by: currentUser?.id,
          }));
          await supabase.from('user_roles').insert(roleInserts);
        }

        await logAuditEvent(company.id, currentUser?.id || '', {
          action: 'users_bulk_roles_assigned',
          module: 'users',
          new_values: { user_ids: selectedUsers, role_ids: bulkRoleIds },
        });

        toast.success(`Roles assigned to ${selectedUsers.length} users`);
      }

      setSelectedUsers([]);
      setBulkActionOpen(false);
      setBulkActionType(null);
      setBulkRoleIds([]);
      load();
    } catch (error) {
      toast.error('Failed to perform bulk action');
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
            <Can resource="users" action="manage">
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
        <Can resource="users" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditUser(null); reset(); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
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
                        {roles.map(role => (
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
                        ))}
                      </div>
                    )} />
                    {errors.role_ids && <p className="text-xs text-red-500 mt-1">{errors.role_ids.message}</p>}
                  </div>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Users" value={users.length} icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Inactive" value={users.length - active} icon={<UserX className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Roles" value={roles.length} icon={<Shield className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
          <span className="text-sm text-blue-700 dark:text-blue-400">{selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
              Clear
            </Button>
            <Can resource="users" action="manage">
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
