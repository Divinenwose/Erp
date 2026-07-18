'use client';

import { useState, useEffect } from 'react';
import { supabase, Department } from '@/lib/supabase';
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
import { Building2, Plus, Edit, Trash2, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const deptSchema = z.object({
  name: z.string().min(1, 'Required').min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  cost_center: z.string().optional(),
});
type DeptForm = z.infer<typeof deptSchema>;

export default function DepartmentsPage() {
  const { company, user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<(Department & { employee_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DeptForm>({
    resolver: zodResolver(deptSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [deptRes, empRes] = await Promise.all([
      supabase.from('departments').select('*').eq('company_id', company.id).order('name'),
      supabase.from('employees').select('department_id').eq('company_id', company.id),
    ]);

    const deptsWithCounts = (deptRes.data ?? []).map((dept: Department) => ({
      ...dept,
      employee_count: empRes.data?.filter((e: any) => e.department_id === dept.id).length || 0,
    }));

    setDepartments(deptsWithCounts);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    reset({
      name: dept.name,
      description: dept.description ?? '',
      cost_center: dept.cost_center ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: DeptForm) => {
    if (!company?.id) return;

    if (editDept) {
      const { error } = await supabase
        .from('departments')
        .update({
          name: data.name,
          description: data.description,
          cost_center: data.cost_center,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editDept.id);

      if (error) {
        toast.error('Failed to update department');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'department_updated',
        module: 'departments',
        record_id: editDept.id,
        new_values: { name: data.name },
      });

      toast.success('Department updated');
    } else {
      const { error } = await supabase.from('departments').insert({
        company_id: company.id,
        name: data.name,
        description: data.description,
        cost_center: data.cost_center,
      });

      if (error) {
        toast.error('Failed to create department');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'department_created',
        module: 'departments',
        new_values: { name: data.name },
      });

      toast.success('Department created');
    }

    reset();
    setEditDept(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('departments').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete department');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'department_deleted',
        module: 'departments',
        record_id: deleteId,
      });
      toast.success('Department deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const columns: Column<(Department & { employee_count?: number })>[] = [
    {
      key: 'name',
      header: 'Department',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.description && <p className="text-xs text-gray-400">{row.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'cost_center',
      header: 'Cost Center',
      sortable: true,
      cell: (row) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {row.cost_center || '—'}
        </code>
      ),
    },
    {
      key: 'employee_count',
      header: 'Employees',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-gray-400" />
          <span className="text-sm">{row.employee_count ?? 0}</span>
        </div>
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
            <Can resource="departments" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage organizational departments and cost centers"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Departments' }]}
      >
        <Can resource="departments" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditDept(null); reset(); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div>
                  <Label>Department Name *</Label>
                  <Input className="mt-1" {...register('name')} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label>Description</Label>
                  <Input className="mt-1" {...register('description')} />
                </div>
                <div>
                  <Label>Cost Center</Label>
                  <Input className="mt-1" {...register('cost_center')} placeholder="e.g., CC-1001" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditDept(null); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editDept ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Departments" value={departments.length} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Employees" value={departments.reduce((a, d) => a + (d.employee_count || 0), 0)} icon={<Users className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={departments}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search departments..."
        searchKeys={['name', 'description', 'cost_center']}
        pageSize={15}
        emptyTitle="No departments yet"
        emptyDescription="Create departments to organize your workforce"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Department?"
        description="This will permanently delete the department. Any employees assigned to this department will need to be reassigned."
        confirmLabel="Delete"
      />
    </div>
  );
}
