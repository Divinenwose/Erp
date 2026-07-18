'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SprayCan, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const cleaningSchema = z.object({
  area: z.string().min(1, 'Required'),
  cleaning_type: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  assigned_to: z.string().optional(),
  frequency: z.string().optional(),
  branch_id: z.string().optional(),
  next_due: z.string().optional(),
  notes: z.string().optional(),
});
type CleaningForm = z.infer<typeof cleaningSchema>;

export default function CleaningSchedulePage() {
  const { company, user: currentUser } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CleaningForm>({
    resolver: zodResolver(cleaningSchema),
    defaultValues: { cleaning_type: 'daily' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [schedRes, branchRes] = await Promise.all([
      supabase
        .from('cleaning_schedule')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('next_due', { ascending: true }),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setSchedules(schedRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (sched: any) => {
    setEditSchedule(sched);
    reset({
      area: sched.area,
      cleaning_type: sched.cleaning_type,
      assigned_to: sched.assigned_to ?? '',
      frequency: sched.frequency ?? '',
      branch_id: sched.branch_id ?? undefined,
      next_due: sched.next_due ?? '',
      notes: sched.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CleaningForm) => {
    if (!company?.id) return;

    const payload = {
      area: data.area,
      cleaning_type: data.cleaning_type,
      assigned_to: data.assigned_to,
      frequency: data.frequency,
      branch_id: data.branch_id,
      next_due: data.next_due || null,
      notes: data.notes,
    };

    if (editSchedule) {
      const { error } = await supabase
        .from('cleaning_schedule')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editSchedule.id);

      if (error) {
        toast.error('Failed to update schedule');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_schedule_updated',
        module: 'facilities',
        record_id: editSchedule.id,
        new_values: { area: data.area },
      });

      toast.success('Schedule updated');
    } else {
      const { error } = await supabase.from('cleaning_schedule').insert({
        company_id: company.id,
        ...payload,
        status: 'scheduled',
      });

      if (error) {
        toast.error('Failed to create schedule');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_schedule_created',
        module: 'facilities',
        new_values: { area: data.area },
      });

      toast.success('Schedule created');
    }

    reset();
    setEditSchedule(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('cleaning_schedule').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete schedule');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_schedule_deleted',
        module: 'facilities',
        record_id: deleteId,
      });
      toast.success('Schedule deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleMarkComplete = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('cleaning_schedule')
      .update({ 
        status: 'completed',
        last_cleaned: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as complete');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_schedule_completed',
        module: 'facilities',
        record_id: id,
      });
      toast.success('Marked as complete');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Area', 'Type', 'Assigned To', 'Frequency', 'Branch', 'Next Due', 'Status', 'Last Cleaned'];
    const rows = schedules.map(s => [
      s.area,
      s.cleaning_type,
      s.assigned_to || '',
      s.frequency || '',
      s.branches?.name || '',
      s.next_due || '',
      s.status,
      s.last_cleaned || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaning_schedule.csv';
    a.click();
  };

  const typeColors: Record<string, string> = {
    daily: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    quarterly: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  const columns: Column<any>[] = [
    {
      key: 'area',
      header: 'Area',
      sortable: true,
      cell: (row) => <span className="text-sm font-medium">{row.area}</span>,
    },
    {
      key: 'cleaning_type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={typeColors[row.cleaning_type] || typeColors.daily} variant="secondary">
          {row.cleaning_type}
        </Badge>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned To',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.assigned_to || '—'}</span>,
    },
    {
      key: 'frequency',
      header: 'Frequency',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.frequency || '—'}</span>,
    },
    {
      key: 'next_due',
      header: 'Next Due',
      sortable: true,
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.next_due || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'branch',
      header: 'Branch',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.branches?.name || '—'}</span>,
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
            {row.status === 'scheduled' && (
              <DropdownMenuItem onClick={() => handleMarkComplete(row.id)}>
                <Calendar className="h-4 w-4 mr-2" />Mark Complete
              </DropdownMenuItem>
            )}
            <Can resource="facilities.cleaning" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const scheduled = schedules.filter(s => s.status === 'scheduled').length;
  const completed = schedules.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cleaning Schedule"
        description="Manage facility cleaning schedules"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Facilities' }, { label: 'Cleaning' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="facilities.cleaning" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditSchedule(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editSchedule ? 'Edit Schedule' : 'Add Cleaning Schedule'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Area *</Label>
                      <Input className="mt-1" {...register('area')} />
                      {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area.message}</p>}
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Controller name="cleaning_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
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
                    <div>
                      <Label>Assigned To</Label>
                      <Input className="mt-1" {...register('assigned_to')} />
                    </div>
                    <div>
                      <Label>Frequency</Label>
                      <Input className="mt-1" {...register('frequency')} placeholder="e.g., Every Monday" />
                    </div>
                    <div>
                      <Label>Next Due</Label>
                      <Input className="mt-1" type="date" {...register('next_due')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditSchedule(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editSchedule ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Schedules" value={schedules.length} icon={<SprayCan className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Scheduled" value={scheduled} icon={<Calendar className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Completed" value={completed} icon={<SprayCan className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={schedules}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search schedules..."
        searchKeys={['area', 'assigned_to']}
        pageSize={15}
        emptyTitle="No cleaning schedules"
        emptyDescription="Add a cleaning schedule to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Schedule?"
        description="This will permanently delete the cleaning schedule."
        confirmLabel="Delete"
      />
    </div>
  );
}
