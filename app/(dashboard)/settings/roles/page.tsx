'use client';

import { useState, useEffect } from 'react';
import { supabase, Role, Permission } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Plus, Edit, Trash2, Users, Lock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const roleSchema = z.object({
  name: z.string().min(1, 'Required').min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  permission_ids: z.array(z.string()),
});
type RoleForm = z.infer<typeof roleSchema>;

export default function RolesSettingsPage() {
  const { company, user: currentUser } = useAuth();
  const [roles, setRoles] = useState<(Role & { user_count?: number; permission_count?: number })[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { permission_ids: [] },
  });

  const load = async () => {
    setLoading(true);

    console.log('[Roles Page] Loading data');
    console.log('[Roles Page] Company ID:', company?.id);

    // First, check raw counts without filters
    const [countRoles, countPerms] = await Promise.all([
      supabase.from('roles').select('*', { count: 'exact', head: true }),
      supabase.from('permissions').select('*', { count: 'exact', head: true }),
    ]);

    console.log('[Roles Page] Total roles in database:', countRoles.count);
    console.log('[Roles Page] Total permissions in database:', countPerms.count);
    console.log('[Roles Page] Roles count error:', countRoles.error);
    console.log('[Roles Page] Permissions count error:', countPerms.error);

    // Permissions are global, load them regardless of company
    const permsRes = await supabase.from('permissions').select('*').order('resource, action');
    
    console.log('[Roles Page] Permissions query result:', permsRes);
    console.log('[Roles Page] Permissions data length:', permsRes.data?.length);
    console.log('[Roles Page] Permissions data sample:', permsRes.data?.slice(0, 3));
    console.log('[Roles Page] Permissions error:', permsRes.error);
    
    setPermissions(permsRes.data ?? []);

    // Roles are company-specific (or system), only load if company exists
    if (company?.id) {
      const rolesRes = await supabase
        .from('roles')
        .select('*, user_roles(user_id), role_permissions(permission_id)')
        .or(`company_id.eq.${company.id},is_system.eq.true`)
        .order('name');

      console.log('[Roles Page] Roles query result:', rolesRes);
      console.log('[Roles Page] Roles data length:', rolesRes.data?.length);
      console.log('[Roles Page] Roles data:', rolesRes.data);
      console.log('[Roles Page] Roles error:', rolesRes.error);

      const rolesWithCounts = (rolesRes.data ?? []).map((r: any) => ({
        ...r,
        user_count: r.user_roles?.length || 0,
        permission_count: r.role_permissions?.length || 0,
      }));

      setRoles(rolesWithCounts);
    } else {
      console.log('[Roles Page] No company ID, skipping roles load');
      setRoles([]);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = async (role: Role & { permission_count?: number }) => {
    setEditRole(role);
    
    // Load existing permissions for this role
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', role.id);
    
    const permissionIds = rolePerms?.map(rp => rp.permission_id) || [];
    
    reset({
      name: role.name,
      description: role.description ?? '',
      permission_ids: permissionIds,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RoleForm) => {
    if (!company?.id) return;

    if (editRole) {
      if (editRole.is_system) {
        toast.error('Cannot edit system roles');
        return;
      }

      const { error: roleError } = await supabase
        .from('roles')
        .update({
          name: data.name,
          description: data.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editRole.id);

      if (roleError) {
        toast.error('Failed to update role');
        return;
      }

      // Update permissions
      await supabase.from('role_permissions').delete().eq('role_id', editRole.id);
      if (data.permission_ids.length > 0) {
        const permInserts = data.permission_ids.map(permId => ({
          role_id: editRole.id,
          permission_id: permId,
        }));
        await supabase.from('role_permissions').insert(permInserts);
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'role_updated',
        module: 'roles',
        record_id: editRole.id,
        new_values: { name: data.name, permissions: data.permission_ids },
      });

      toast.success('Role updated');
    } else {
      const { data: newRole, error: roleError } = await supabase
        .from('roles')
        .insert({
          company_id: company.id,
          name: data.name,
          description: data.description,
          is_system: false,
        })
        .select()
        .single();

      if (roleError || !newRole) {
        toast.error('Failed to create role');
        return;
      }

      // Assign permissions
      if (data.permission_ids.length > 0) {
        const permInserts = data.permission_ids.map(permId => ({
          role_id: newRole.id,
          permission_id: permId,
        }));
        await supabase.from('role_permissions').insert(permInserts);
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'role_created',
        module: 'roles',
        record_id: newRole.id,
        new_values: { name: data.name, permissions: data.permission_ids },
      });

      toast.success('Role created');
    }

    reset();
    setEditRole(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('roles').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete role');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'role_deleted',
        module: 'roles',
        record_id: deleteId,
      });
      toast.success('Role deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const columns: Column<(Role & { user_count?: number; permission_count?: number })>[] = [
    {
      key: 'name',
      header: 'Role Name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.description && <p className="text-xs text-gray-400">{row.description}</p>}
            {row.is_system && <Badge variant="secondary" className="text-xs mt-1">System</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: 'user_count',
      header: 'Users',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-gray-400" />
          <span className="text-sm">{row.user_count ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'permission_count',
      header: 'Permissions',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-gray-400" />
          <span className="text-sm">{row.permission_count ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'is_system',
      header: 'Type',
      cell: (row) => (
        <Badge variant={row.is_system ? 'default' : 'secondary'} className="text-xs">
          {row.is_system ? 'System' : 'Custom'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-10',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 mr-2" />Edit
            </DropdownMenuItem>
            <Can resource="roles" action="delete">
              {!row.is_system && (
                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
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
        title="Roles"
        description="Manage user roles and their permissions"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Roles' }]}
      >
        <Can resource="roles" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditRole(null); reset(); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />Add Role
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div>
                  <Label>Role Name *</Label>
                  <Input className="mt-1" {...register('name')} disabled={!!editRole && editRole.is_system} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                  {editRole?.is_system && <p className="text-xs text-gray-400 mt-1">System role names cannot be changed</p>}
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea className="mt-1" rows={2} {...register('description')} />
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="flex gap-2 mt-1 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allPermissionIds = permissions.map(p => p.id);
                        setValue('permission_ids', allPermissionIds);
                      }}
                      className="text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setValue('permission_ids', []);
                      }}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                  <Controller name="permission_ids" control={control} render={({ field }) => (
                    <div className="mt-2 space-y-4 max-h-60 overflow-y-auto border rounded-md p-4">
                      {Object.entries(groupedPermissions).map(([resource, perms]) => (
                        <div key={resource}>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2 capitalize">
                            {resource}
                          </p>
                          <div className="space-y-2 pl-2">
                            {perms.map(perm => (
                              <div key={perm.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={perm.id}
                                  checked={field.value.includes(perm.id)}
                                  onCheckedChange={checked => {
                                    if (checked) {
                                      field.onChange([...field.value, perm.id]);
                                    } else {
                                      field.onChange(field.value.filter(id => id !== perm.id));
                                    }
                                  }}
                                />
                                <label htmlFor={perm.id} className="text-sm cursor-pointer">
                                  {perm.action}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditRole(null); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editRole ? 'Update Role' : 'Create Role'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Roles" value={roles.length} icon={<Shield className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="System Roles" value={roles.filter(r => r.is_system).length} icon={<Lock className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Custom Roles" value={roles.filter(r => !r.is_system).length} icon={<Users className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Permissions" value={permissions.length} icon={<Lock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        data={roles}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search roles..."
        searchKeys={['name', 'description']}
        pageSize={15}
        emptyTitle="No roles yet"
        emptyDescription="Create custom roles to manage access"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Role?"
        description="This will permanently delete the role. Any users assigned this role will lose these permissions."
        confirmLabel="Delete"
      />
    </div>
  );
}
