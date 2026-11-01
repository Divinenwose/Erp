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
import { Activity, Plus, Edit, Trash2, Play, Pause, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const productionRunSchema = z.object({
  work_order_id: z.string().min(1, 'Work order is required'),
  run_number: z.string().min(1, 'Run number is required'),
  notes: z.string().optional(),
});
type ProductionRunForm = z.infer<typeof productionRunSchema>;

export default function ProductionRunsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.production_runs.create');
  const canEdit = isAdmin || hasPermission('manufacturing.production_runs.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.production_runs.delete');
  const canStart = isAdmin || hasPermission('manufacturing.production_runs.start');
  const canComplete = isAdmin || hasPermission('manufacturing.production_runs.complete');

  const [productionRuns, setProductionRuns] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRun, setEditRun] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ planned: 0, inProgress: 0, paused: 0, completed: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductionRunForm>({
    resolver: zodResolver(productionRunSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [runRes, woRes] = await Promise.all([
      supabase
        .from('production_runs')
        .select('*, work_orders(work_order_number, title), created_profile:profiles!production_runs_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('work_orders').select('id, work_order_number, title').eq('company_id', company.id).eq('status', 'approved'),
    ]);

    if (runRes.error) {
      console.error('Error loading production runs:', runRes.error);
      toast.error('Failed to load production runs');
    }
    setProductionRuns(runRes.data ?? []);
    setWorkOrders(woRes.data ?? []);

    const planned = runRes.data?.filter(r => r.status === 'planned').length || 0;
    const inProgress = runRes.data?.filter(r => r.status === 'in_progress').length || 0;
    const paused = runRes.data?.filter(r => r.status === 'paused').length || 0;
    const completed = runRes.data?.filter(r => r.status === 'completed').length || 0;
    setStats({ planned, inProgress, paused, completed });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (run: any) => {
    setEditRun(run);
    reset({
      work_order_id: run.work_order_id,
      run_number: run.run_number,
      notes: run.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ProductionRunForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editRun) {
      const { error } = await supabase
        .from('production_runs')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editRun.id);

      if (error) {
        toast.error('Failed to update production run');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'production_runs',
          record_id: editRun.id,
          new_value: { run_number: data.run_number },
        });
      }

      toast.success('Production run updated');
    } else {
      const { error } = await supabase.from('production_runs').insert({
        company_id: company.id,
        ...data,
        status: 'planned',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create production run');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'production_runs',
          new_value: { run_number: data.run_number },
        });
      }

      toast.success('Production run created');
    }

    reset();
    setEditRun(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('production_runs').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete production run');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'production_runs',
        record_id: deleteId,
      });
      toast.success('Production run deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleStart = async (run: any) => {
    if (!canStart || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('production_runs')
      .update({
        status: 'in_progress',
        start_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    if (error) {
      toast.error('Failed to start production run');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'started',
        module: 'manufacturing',
        entity_type: 'production_runs',
        record_id: run.id,
      });
      toast.success('Production run started');
      load();
    }
  };

  const handlePause = async (run: any) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('production_runs')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    if (error) {
      toast.error('Failed to pause production run');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'paused',
        module: 'manufacturing',
        entity_type: 'production_runs',
        record_id: run.id,
      });
      toast.success('Production run paused');
      load();
    }
  };

  const handleComplete = async (run: any) => {
    if (!canComplete || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('production_runs')
      .update({
        status: 'completed',
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    if (error) {
      toast.error('Failed to complete production run');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'completed',
        module: 'manufacturing',
        entity_type: 'production_runs',
        record_id: run.id,
      });
      toast.success('Production run completed');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'run_number', header: 'Run Number', sortable: true },
    { key: 'work_orders', header: 'Work Order', cell: (v) => v ? `${v.work_order_number} - ${v.title}` : '-' },
    { key: 'quantity_produced', header: 'Produced', sortable: true },
    { key: 'quantity_defective', header: 'Defective', sortable: true },
    { key: 'efficiency_rate', header: 'Efficiency %', sortable: true, cell: (v) => v ? `${v}%` : '-' },
    { key: 'downtime_minutes', header: 'Downtime (min)', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (v) => <StatusBadge status={v} />,
    },
    { key: 'start_time', header: 'Start Time', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy HH:mm') : '-' },
    { key: 'end_time', header: 'End Time', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy HH:mm') : '-' },
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
            {row.status === 'planned' && canStart && <DropdownMenuItem onClick={() => handleStart(row)}>Start</DropdownMenuItem>}
            {row.status === 'in_progress' && <DropdownMenuItem onClick={() => handlePause(row)}>Pause</DropdownMenuItem>}
            {row.status === 'paused' && canStart && <DropdownMenuItem onClick={() => handleStart(row)}>Resume</DropdownMenuItem>}
            {row.status !== 'completed' && row.status !== 'cancelled' && canComplete && <DropdownMenuItem onClick={() => handleComplete(row)}>Complete</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Production Runs" description="Track production output and runs" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Production Runs' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditRun(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Production Run
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editRun ? 'Edit Production Run' : 'New Production Run'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Work Order *</Label>
                  <Select {...register('work_order_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work order" />
                    </SelectTrigger>
                    <SelectContent>
                      {workOrders.map(wo => <SelectItem key={wo.id} value={wo.id}>{wo.work_order_number} - {wo.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.work_order_id && <p className="text-red-500 text-sm">{errors.work_order_id.message}</p>}
                </div>
                <div>
                  <Label>Run Number *</Label>
                  <Input {...register('run_number')} placeholder="PR-001" />
                  {errors.run_number && <p className="text-red-500 text-sm">{errors.run_number.message}</p>}
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={3} />
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
        <KPICard title="Planned" value={stats.planned} icon={<Clock className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Play className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Paused" value={stats.paused} icon={<Pause className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={productionRuns}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Production Run"
        description="Are you sure you want to delete this production run? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
