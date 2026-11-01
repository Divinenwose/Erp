'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
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
import { Calendar, Plus, Edit, Trash2, CheckCircle, Clock, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const scheduleSchema = z.object({
  schedule_name: z.string().min(1, 'Schedule name is required'),
  schedule_type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'custom']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().optional(),
  notes: z.string().optional(),
});
type ScheduleForm = z.infer<typeof scheduleSchema>;

export default function ProductionSchedulesPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.schedules.create');
  const canEdit = isAdmin || hasPermission('manufacturing.schedules.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.schedules.delete');
  const canApprove = isAdmin || hasPermission('manufacturing.schedules.approve');

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [stats, setStats] = useState({ active: 0, draft: 0, completed: 0, cancelled: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ScheduleForm>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { schedule_type: 'weekly' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('production_schedules')
      .select('*, approved_profile:profiles!production_schedules_approved_by_fkey(first_name, last_name), created_profile:profiles!production_schedules_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading schedules:', error);
      toast.error('Failed to load schedules');
    }
    setSchedules(data ?? []);

    const active = data?.filter(s => s.status === 'active').length || 0;
    const draft = data?.filter(s => s.status === 'draft').length || 0;
    const completed = data?.filter(s => s.status === 'completed').length || 0;
    const cancelled = data?.filter(s => s.status === 'cancelled').length || 0;
    setStats({ active, draft, completed, cancelled });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (schedule: any) => {
    setEditSchedule(schedule);
    reset({
      schedule_name: schedule.schedule_name,
      schedule_type: schedule.schedule_type,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      description: schedule.description ?? '',
      notes: schedule.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ScheduleForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editSchedule) {
      const { error } = await supabase
        .from('production_schedules')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editSchedule.id);

      if (error) {
        toast.error('Failed to update schedule');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'production_schedules',
          record_id: editSchedule.id,
          new_value: { schedule_name: data.schedule_name },
        });
      }

      toast.success('Schedule updated');
    } else {
      const { error } = await supabase.from('production_schedules').insert({
        company_id: company.id,
        ...data,
        status: 'draft',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create schedule');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'production_schedules',
          new_value: { schedule_name: data.schedule_name },
        });
      }

      toast.success('Schedule created');
    }

    reset();
    setEditSchedule(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('production_schedules').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete schedule');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'production_schedules',
        record_id: deleteId,
      });
      toast.success('Schedule deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleArchive = async () => {
    if (!archiveId || !company?.id || !currentUser?.id) return;
    setArchiving(true);

    const { error } = await supabase
      .from('production_schedules')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', archiveId);

    if (error) {
      toast.error('Failed to archive schedule');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'archived',
        module: 'manufacturing',
        entity_type: 'production_schedules',
        record_id: archiveId,
      });
      toast.success('Schedule archived');
    }

    setArchiving(false);
    setArchiveId(null);
    load();
  };

  const handleApprove = async (schedule: any) => {
    if (!canApprove || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('production_schedules')
      .update({
        status: 'active',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id);

    if (error) {
      toast.error('Failed to approve schedule');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'approved',
        module: 'manufacturing',
        entity_type: 'production_schedules',
        record_id: schedule.id,
      });
      toast.success('Schedule approved');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'schedule_name', header: 'Schedule Name', sortable: true },
    { key: 'schedule_type', header: 'Type', sortable: true },
    { key: 'start_date', header: 'Start Date', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
    { key: 'end_date', header: 'End Date', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (v) => <StatusBadge status={v} />,
    },
    { key: 'created_at', header: 'Created', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy') },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>}
            {canApprove && row.status === 'draft' && <DropdownMenuItem onClick={() => handleApprove(row)}>Approve</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Production Schedules" description="Plan and manage production schedules" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Schedules' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditSchedule(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editSchedule ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Schedule Name *</Label>
                  <Input {...register('schedule_name')} placeholder="Schedule name" />
                  {errors.schedule_name && <p className="text-red-500 text-sm">{errors.schedule_name.message}</p>}
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select {...register('schedule_type')} defaultValue="weekly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.schedule_type && <p className="text-red-500 text-sm">{errors.schedule_type.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" {...register('start_date')} />
                    {errors.start_date && <p className="text-red-500 text-sm">{errors.start_date.message}</p>}
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input type="date" {...register('end_date')} />
                    {errors.end_date && <p className="text-red-500 text-sm">{errors.end_date.message}</p>}
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Schedule description" rows={3} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Schedules" value={stats.active} icon={<Calendar className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Draft Schedules" value={stats.draft} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Cancelled" value={stats.cancelled} icon={<Archive className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={schedules}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Schedule"
        description="Are you sure you want to delete this schedule? This action cannot be undone."
        loading={deleting}
      />

      <ConfirmDialog
        open={!!archiveId}
        onClose={() => setArchiveId(null)}
        onConfirm={handleArchive}
        title="Archive Schedule"
        description="Are you sure you want to archive this schedule?"
        loading={archiving}
      />
    </div>
  );
}
