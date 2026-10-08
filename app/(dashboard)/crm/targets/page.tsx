'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
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
import { Textarea } from '@/components/ui/textarea';
import { Target, Plus, Download, TrendingUp, MoreHorizontal, Edit, Trash2, Award, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const targetSchema = z.object({
  target_type: z.string().min(1, 'Required'),
  period_type: z.string().default('monthly'),
  period_start: z.string().min(1, 'Required'),
  period_end: z.string().min(1, 'Required'),
  target_amount: z.coerce.number().min(0).default(0),
  target_quantity: z.coerce.number().int().min(0).default(0),
  assigned_to: z.string().optional(),
  team_id: z.string().optional(),
  notes: z.string().optional(),
});
type TargetForm = z.infer<typeof targetSchema>;

export default function TargetsPage() {
  const { company, user } = useAuth();
  const [targets, setTargets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<TargetForm>({
    resolver: zodResolver(targetSchema),
    defaultValues: { period_type: 'monthly' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [targetRes, empRes, deptRes] = await Promise.all([
      supabase.from('sales_targets').select('*, employees(full_name), departments(name)').eq('company_id', company.id).order('period_start', { ascending: false }),
      supabase.from('employees').select('id, full_name').eq('company_id', company.id).eq('status', 'active'),
      supabase.from('departments').select('id, name').eq('company_id', company.id),
    ]);
    setTargets(targetRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (target: any) => {
    setEditTarget(target);
    reset({
      target_type: target.target_type,
      period_type: target.period_type,
      period_start: target.period_start,
      period_end: target.period_end,
      target_amount: target.target_amount ?? 0,
      target_quantity: target.target_quantity ?? 0,
      assigned_to: target.assigned_to ?? '',
      team_id: target.team_id ?? '',
      notes: target.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: TargetForm) => {
    if (!company?.id) return;
    
    const targetNumber = editTarget?.target_number ?? `ST-${String(targets.length + 1).padStart(4, '0')}`;
    
    if (editTarget) {
      const { error } = await supabase.from('sales_targets').update({ 
        ...data, 
        updated_at: new Date().toISOString() 
      }).eq('id', editTarget.id);
      if (error) { toast.error('Failed to update target'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'sales_targets', entity_id: editTarget.id, new_value: { target_type: data.target_type } });
      }
      
      toast.success('Target updated');
    } else {
      if (!company?.id) return;
      const { error } = await supabase.from('sales_targets').insert({ 
        ...data, 
        company_id: company.id, 
        target_number: targetNumber,
        status: 'active',
        created_by: user?.id 
      });
      if (error) { toast.error('Failed to create target'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'sales_targets', new_value: { target_type: data.target_type, target_number: targetNumber } });
      }
      
      toast.success('Target created');
    }
    
    reset({ period_type: 'monthly' });
    setEditTarget(null);
    setDialogOpen(false);
    load();
  };

  const deleteTarget = async () => {
    if (!deleteId) return;
    await supabase.from('sales_targets').delete().eq('id', deleteId);
    setTargets(prev => prev.filter(t => t.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'sales_targets', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Target deleted');
  };

  const viewTarget = (target: any) => {
    setSelectedTarget(target);
    setViewDialogOpen(true);
  };

  const active = targets.filter(t => t.status === 'active').length;
  const totalTargetAmount = targets.filter(t => t.status === 'active').reduce((a, t) => a + (t.target_amount ?? 0), 0);
  const totalAchieved = targets.filter(t => t.status === 'active').reduce((a, t) => a + (t.achieved_amount ?? 0), 0);
  const achievementRate = totalTargetAmount > 0 ? (totalAchieved / totalTargetAmount * 100).toFixed(1) : 0;

  const columns: Column<any>[] = [
    { key: 'target_number', header: 'Number', sortable: true, cell: (row) => <span className="font-medium text-sm">{row.target_number}</span> },
    { key: 'target_type', header: 'Type', sortable: true, cell: (row) => <span className="text-sm capitalize">{row.target_type}</span> },
    { key: 'employees', header: 'Assigned To', cell: (row) => <span className="text-sm">{row.employees?.full_name ?? '—'}</span> },
    { key: 'departments', header: 'Team', cell: (row) => <span className="text-sm">{row.departments?.name ?? '—'}</span> },
    { key: 'period_start', header: 'Period', sortable: true, cell: (row) => <span className="text-sm">{formatDate(row.period_start)} - {formatDate(row.period_end)}</span> },
    { key: 'target_amount', header: 'Target Amount', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.target_amount)}</span> },
    { key: 'achieved_amount', header: 'Achieved', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.achieved_amount)}</span> },
    { key: 'achievement', header: '% Achieved', sortable: true, cell: (row) => {
      const pct = row.target_amount > 0 ? (row.achieved_amount / row.target_amount * 100).toFixed(1) : '0';
      return <span className={`text-sm font-semibold ${parseFloat(pct) >= 100 ? 'text-emerald-600' : parseFloat(pct) >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>;
    }},
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.targets.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view sales targets</div>}>
      <div className="space-y-6">
      <PageHeader title="Sales Targets" description="Track sales targets and performance" breadcrumbs={[{ label: 'CRM' }, { label: 'Targets' }]}>
        <Can resource="targets" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="targets" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditTarget(null); reset({ period_type: 'monthly' }); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Target</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editTarget ? 'Edit Target' : 'New Sales Target'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Target Type *</Label>
                    <Controller name="target_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="quantity">Quantity</SelectItem>
                          <SelectItem value="conversion">Conversion Rate</SelectItem>
                          <SelectItem value="customer_acquisition">Customer Acquisition</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Period Type</Label>
                    <Controller name="period_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Period Start *</Label><Input className="mt-1" type="date" {...register('period_start')} />{errors.period_start && <p className="text-xs text-red-500 mt-1">{errors.period_start.message}</p>}</div>
                  <div><Label>Period End *</Label><Input className="mt-1" type="date" {...register('period_end')} />{errors.period_end && <p className="text-xs text-red-500 mt-1">{errors.period_end.message}</p>}</div>
                  <div><Label>Target Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('target_amount')} /></div>
                  <div><Label>Target Quantity</Label><Input className="mt-1" type="number" {...register('target_quantity')} /></div>
                  <div><Label>Assigned To</Label>
                    <Controller name="assigned_to" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Assign to" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Team</Label>
                    <Controller name="team_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select team" /></SelectTrigger>
                        <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>
                <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset({ period_type: 'monthly' }); setEditTarget(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editTarget ? 'Update' : 'Create Target'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Targets" value={active} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Target" value={formatCurrency(totalTargetAmount)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Achieved" value={formatCurrency(totalAchieved)} icon={<Award className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Achievement Rate" value={`${achievementRate}%`} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={targets}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search targets..."
        searchKeys={['target_number', 'target_type', 'notes']}
        rowKey="id"
        emptyTitle="No sales targets yet"
        emptyDescription="Create your first sales target to start tracking performance"
        emptyAction={<Can resource="targets" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Target</Button></Can>}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Target Details</DialogTitle></DialogHeader>
          {selectedTarget && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Number:</span> {selectedTarget.target_number}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedTarget.status} /></div>
                <div className="col-span-2"><span className="text-gray-500">Type:</span> {selectedTarget.target_type}</div>
                <div><span className="text-gray-500">Period:</span> {formatDate(selectedTarget.period_start)} - {formatDate(selectedTarget.period_end)}</div>
                <div><span className="text-gray-500">Period Type:</span> {selectedTarget.period_type}</div>
                <div><span className="text-gray-500">Target Amount:</span> {formatCurrency(selectedTarget.target_amount)}</div>
                <div><span className="text-gray-500">Achieved Amount:</span> {formatCurrency(selectedTarget.achieved_amount)}</div>
                <div className="font-semibold"><span className="text-gray-500">Achievement:</span> {selectedTarget.target_amount > 0 ? (selectedTarget.achieved_amount / selectedTarget.target_amount * 100).toFixed(1) : 0}%</div>
                <div><span className="text-gray-500">Target Quantity:</span> {selectedTarget.target_quantity ?? 0}</div>
                <div><span className="text-gray-500">Achieved Quantity:</span> {selectedTarget.achieved_quantity ?? 0}</div>
                <div><span className="text-gray-500">Assigned To:</span> {selectedTarget.employees?.full_name ?? '—'}</div>
                <div><span className="text-gray-500">Team:</span> {selectedTarget.departments?.name ?? '—'}</div>
              </div>
              {selectedTarget.notes && <div><span className="text-gray-500">Notes:</span> {selectedTarget.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteTarget} title="Delete Target?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
