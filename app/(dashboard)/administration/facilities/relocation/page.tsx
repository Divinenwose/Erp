'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Edit, Trash2, Building2, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const relocationSchema = z.object({
  from_branch_id: z.string().optional(),
  to_branch_id: z.string().optional(),
  employee_id: z.string().optional(),
  department_id: z.string().optional(),
  scheduled_date: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
type RelocationForm = z.infer<typeof relocationSchema>;

export default function OfficeRelocationPage() {
  const { company, user: currentUser } = useAuth();
  const [relocations, setRelocations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRelocation, setEditRelocation] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<RelocationForm>({
    resolver: zodResolver(relocationSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [relRes, branchRes, empRes, deptRes] = await Promise.all([
      supabase
        .from('office_relocations')
        .select('*, from_branch:branches!from_branch_id(name), to_branch:branches!to_branch_id(name), employee:profiles!employee_id(first_name, last_name), department:departments(name)')
        .eq('company_id', company.id)
        .order('scheduled_date', { ascending: true }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
      supabase.from('departments').select('*').eq('company_id', company.id),
    ]);

    setRelocations(relRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (rel: any) => {
    setEditRelocation(rel);
    reset({
      from_branch_id: rel.from_branch_id ?? undefined,
      to_branch_id: rel.to_branch_id ?? undefined,
      employee_id: rel.employee_id ?? undefined,
      department_id: rel.department_id ?? undefined,
      scheduled_date: rel.scheduled_date ?? '',
      reason: rel.reason ?? '',
      notes: rel.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RelocationForm) => {
    if (!company?.id) return;

    const payload = {
      from_branch_id: data.from_branch_id,
      to_branch_id: data.to_branch_id,
      employee_id: data.employee_id,
      department_id: data.department_id,
      scheduled_date: data.scheduled_date || null,
      reason: data.reason,
      notes: data.notes,
    };

    if (editRelocation) {
      const { error } = await supabase
        .from('office_relocations')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editRelocation.id);

      if (error) {
        toast.error('Failed to update relocation');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_relocation_updated',
        module: 'facilities',
        record_id: editRelocation.id,
        new_values: { to_branch_id: data.to_branch_id },
      });

      toast.success('Relocation updated');
    } else {
      const { error } = await supabase.from('office_relocations').insert({
        company_id: company.id,
        ...payload,
        status: 'planned',
      });

      if (error) {
        toast.error('Failed to create relocation');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_relocation_created',
        module: 'facilities',
        new_values: { to_branch_id: data.to_branch_id },
      });

      toast.success('Relocation created');
    }

    reset();
    setEditRelocation(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('office_relocations').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete relocation');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_relocation_deleted',
        module: 'facilities',
        record_id: deleteId,
      });
      toast.success('Relocation deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('office_relocations')
      .update({ 
        status,
        completed_date: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_relocation_status_updated',
        module: 'facilities',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['From Branch', 'To Branch', 'Employee', 'Department', 'Scheduled Date', 'Completed Date', 'Status', 'Reason'];
    const rows = relocations.map(r => [
      r.from_branch?.name || '',
      r.to_branch?.name || '',
      r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : '',
      r.department?.name || '',
      r.scheduled_date || '',
      r.completed_date || '',
      r.status,
      r.reason || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'office_relocations.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'from_branch',
      header: 'From',
      cell: (row) => <span className="text-sm font-medium">{row.from_branch?.name || '—'}</span>,
    },
    {
      key: 'to_branch',
      header: 'To',
      cell: (row) => <span className="text-sm font-medium">{row.to_branch?.name || '—'}</span>,
    },
    {
      key: 'employee',
      header: 'Employee',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.employee ? `${row.employee.first_name} ${row.employee.last_name}` : '—'}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.department?.name || '—'}</span>,
    },
    {
      key: 'scheduled_date',
      header: 'Scheduled',
      sortable: true,
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.scheduled_date || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
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
            {row.status === 'planned' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'in_progress')}>
                <MapPin className="h-4 w-4 mr-2" />Start
              </DropdownMenuItem>
            )}
            {row.status === 'in_progress' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'completed')}>
                <Building2 className="h-4 w-4 mr-2" />Complete
              </DropdownMenuItem>
            )}
            <Can resource="facilities.relocation" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const planned = relocations.filter(r => r.status === 'planned').length;
  const inProgress = relocations.filter(r => r.status === 'in_progress').length;
  const completed = relocations.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office Relocation"
        description="Manage office and employee relocations"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Facilities' }, { label: 'Relocation' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="facilities.relocation" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditRelocation(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild={false}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />New Relocation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editRelocation ? 'Edit Relocation' : 'New Office Relocation'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>From Branch</Label>
                      <Controller name="from_branch_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>To Branch</Label>
                      <Controller name="to_branch_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Employee</Label>
                      <Controller name="employee_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                          <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
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
                      <Label>Scheduled Date</Label>
                      <Input className="mt-1" type="date" {...register('scheduled_date')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Reason</Label>
                      <Textarea className="mt-1" rows={2} {...register('reason')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditRelocation(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editRelocation ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Relocations" value={relocations.length} icon={<MapPin className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Planned" value={planned} icon={<Building2 className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="In Progress" value={inProgress} icon={<User className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Completed" value={completed} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={relocations}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search relocations..."
        searchKeys={['reason']}
        pageSize={15}
        emptyTitle="No relocations"
        emptyDescription="Create an office relocation to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Relocation?"
        description="This will permanently delete the relocation record."
        confirmLabel="Delete"
      />
      </div>
    </PermissionGuard>
  );
}
