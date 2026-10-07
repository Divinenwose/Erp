'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatDate } from '@/lib/utils';
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
import { Calendar, Phone, Mail, MessageSquare, Video, CheckCircle, Clock, Plus, Download, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const activitySchema = z.object({
  activity_type: z.string().min(1, 'Required'),
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  lead_id: z.string().optional(),
  opportunity_id: z.string().optional(),
  customer_id: z.string().optional(),
  assigned_to: z.string().optional(),
  activity_date: z.string().min(1, 'Required'),
  activity_time: z.string().optional(),
  duration_minutes: z.coerce.number().int().min(0).optional(),
  outcome: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.string().optional(),
  notes: z.string().optional(),
});
type ActivityForm = z.infer<typeof activitySchema>;

const activityTypes = [
  { id: 'call', label: 'Phone Call', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'meeting', label: 'Meeting', icon: Calendar },
  { id: 'demo', label: 'Demo', icon: Video },
  { id: 'follow_up', label: 'Follow-up', icon: MessageSquare },
  { id: 'task', label: 'Task', icon: CheckCircle },
];

const typeColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  email: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  meeting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  demo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  follow_up: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  task: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function ActivitiesPage() {
  const { company, user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ActivityForm>({
    resolver: zodResolver(activitySchema),
    defaultValues: { activity_date: new Date().toISOString().split('T')[0] },
  });

  const load = async () => {
    if (!company?.id) return;
    const [actRes, leadRes, oppRes, custRes, empRes] = await Promise.all([
      supabase.from('sales_activities').select('*, leads(first_name, last_name), opportunities(title), customers(name), employees(full_name)').eq('company_id', company.id).order('activity_date', { ascending: false }),
      supabase.from('leads').select('id, first_name, last_name').eq('company_id', company.id).eq('status', 'in').neq('status', 'converted'),
      supabase.from('opportunities').select('id, title').eq('company_id', company.id).eq('status', 'open'),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
      supabase.from('employees').select('id, full_name').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setActivities(actRes.data ?? []);
    setLeads(leadRes.data ?? []);
    setOpportunities(oppRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (act: any) => {
    setEditActivity(act);
    reset({
      activity_type: act.activity_type,
      title: act.title,
      description: act.description ?? '',
      lead_id: act.lead_id ?? '',
      opportunity_id: act.opportunity_id ?? '',
      customer_id: act.customer_id ?? '',
      assigned_to: act.assigned_to ?? '',
      activity_date: act.activity_date,
      activity_time: act.activity_time ?? '',
      duration_minutes: act.duration_minutes ?? 0,
      outcome: act.outcome ?? '',
      next_action: act.next_action ?? '',
      next_action_date: act.next_action_date ?? '',
      notes: act.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ActivityForm) => {
    if (!company?.id) return;
    
    if (editActivity) {
      const { error } = await supabase.from('sales_activities').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editActivity.id);
      if (error) { toast.error('Failed to update activity'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'sales_activities', entity_id: editActivity.id, new_value: { title: data.title, activity_type: data.activity_type } });
      }
      
      toast.success('Activity updated');
    } else {
      if (!company?.id) return;
      const { error } = await supabase.from('sales_activities').insert({ ...data, company_id: company.id, status: 'scheduled', created_by: user?.id });
      if (error) { toast.error('Failed to create activity'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'sales_activities', new_value: { title: data.title, activity_type: data.activity_type } });
      }
      
      toast.success('Activity created');
    }
    
    reset({ activity_date: new Date().toISOString().split('T')[0] });
    setEditActivity(null);
    setDialogOpen(false);
    load();
  };

  const completeActivity = async (act: any) => {
    await supabase.from('sales_activities').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', act.id);
    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, status: 'completed' } : a));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'completed', module: 'crm', entity_type: 'sales_activities', entity_id: act.id });
    }
    
    toast.success('Activity completed');
  };

  const deleteActivity = async () => {
    if (!deleteId) return;
    await supabase.from('sales_activities').delete().eq('id', deleteId);
    setActivities(prev => prev.filter(a => a.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'sales_activities', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Activity deleted');
  };

  const scheduled = activities.filter(a => a.status === 'scheduled').length;
  const completed = activities.filter(a => a.status === 'completed').length;
  const today = activities.filter(a => a.activity_date === new Date().toISOString().split('T')[0]).length;

  const columns: Column<any>[] = [
    {
      key: 'title', header: 'Activity',
      cell: (row) => {
        const IconComponent = activityTypes.find(t => t.id === row.activity_type)?.icon || Clock;
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeColors[row.activity_type] ?? 'bg-gray-100'}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{row.title}</p>
              <p className="text-xs text-gray-500">{row.activity_type}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'activity_date', header: 'Date', sortable: true, cell: (row) => <span className="text-sm">{formatDate(row.activity_date)}</span> },
    { key: 'activity_time', header: 'Time', cell: (row) => <span className="text-sm">{row.activity_time ?? '—'}</span> },
    { key: 'employees', header: 'Assigned To', cell: (row) => <span className="text-sm">{row.employees?.full_name ?? '—'}</span> },
    { key: 'related', header: 'Related To', cell: (row) => {
      if (row.customers?.name) return <span className="text-sm text-blue-600">{row.customers.name}</span>;
      if (row.opportunities?.title) return <span className="text-sm text-emerald-600">{row.opportunities.title}</span>;
      if (row.leads) return <span className="text-sm text-violet-600">{row.leads.first_name} {row.leads.last_name ?? ''}</span>;
      return <span className="text-sm text-gray-400">—</span>;
    }},
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.activities.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view activities</div>}>
      <div className="space-y-6">
      <PageHeader title="Sales Activities" description="Track follow-ups, meetings, calls, demos, and tasks" breadcrumbs={[{ label: 'CRM' }, { label: 'Activities' }]}>
        <Can resource="activities" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="activities" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditActivity(null); reset({ activity_date: new Date().toISOString().split('T')[0] }); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Activity</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editActivity ? 'Edit Activity' : 'New Activity'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Activity Type *</Label>
                    <Controller name="activity_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{activityTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Title *</Label><Input className="mt-1" {...register('title')} />{errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}</div>
                  <div><Label>Date *</Label><Input className="mt-1" type="date" {...register('activity_date')} /></div>
                  <div><Label>Time</Label><Input className="mt-1" type="time" {...register('activity_time')} /></div>
                  <div><Label>Duration (min)</Label><Input className="mt-1" type="number" {...register('duration_minutes')} /></div>
                  <div><Label>Assigned To</Label>
                    <Controller name="assigned_to" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Assign to" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Related Lead</Label>
                    <Controller name="lead_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select lead" /></SelectTrigger>
                        <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name ?? ''}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Related Opportunity</Label>
                    <Controller name="opportunity_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select opportunity" /></SelectTrigger>
                        <SelectContent>{opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Related Customer</Label>
                    <Controller name="customer_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>
                <div><Label>Description</Label><Textarea className="mt-1" {...register('description')} /></div>
                <div><Label>Outcome</Label><Textarea className="mt-1" {...register('outcome')} placeholder="What was the result?" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Next Action</Label><Input className="mt-1" {...register('next_action')} /></div>
                  <div><Label>Next Action Date</Label><Input className="mt-1" type="date" {...register('next_action_date')} /></div>
                </div>
                <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset({ activity_date: new Date().toISOString().split('T')[0] }); setEditActivity(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editActivity ? 'Update' : 'Create Activity'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Activities" value={activities.length} icon={<Calendar className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Scheduled" value={scheduled} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Today" value={today} icon={<Calendar className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={activities}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search activities..."
        searchKeys={['title', 'description', 'notes']}
        rowKey="id"
        emptyTitle="No activities yet"
        emptyDescription="Add your first activity to start tracking sales activities"
        emptyAction={<Can resource="activities" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Activity</Button></Can>}
      />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteActivity} title="Delete Activity?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
