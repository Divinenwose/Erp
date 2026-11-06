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
import { Clipboard, Plus, Edit, Trash2, CheckCircle, Clock, Archive, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  product_id: z.string().optional(),
  production_schedule_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  quantity_ordered: z.coerce.number().min(0, 'Quantity must be positive'),
  unit_of_measure: z.string().default('unit'),
  target_date: z.string().optional(),
  start_date: z.string().optional(),
  notes: z.string().optional(),
});
type WorkOrderForm = z.infer<typeof workOrderSchema>;

export default function WorkOrdersPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.work_orders.create');
  const canEdit = isAdmin || hasPermission('manufacturing.work_orders.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.work_orders.delete');
  const canApprove = isAdmin || hasPermission('manufacturing.work_orders.approve');
  const canAssign = isAdmin || hasPermission('manufacturing.work_orders.assign');

  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWorkOrder, setEditWorkOrder] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, inProgress: 0, completed: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WorkOrderForm>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { priority: 'medium', unit_of_measure: 'unit' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [woRes, prodRes, schedRes, empRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select('*, products(name), production_schedules(schedule_name), assigned_profile:profiles!work_orders_assigned_to_fkey(first_name, last_name), approved_profile:profiles!work_orders_approved_by_fkey(first_name, last_name), created_profile:profiles!work_orders_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name').eq('company_id', company.id),
      supabase.from('production_schedules').select('id, schedule_name').eq('company_id', company.id),
      supabase.from('employee_directory').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    if (woRes.error) {
      console.error('Error loading work orders:', woRes.error);
      toast.error('Failed to load work orders');
    }
    setWorkOrders(woRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setSchedules(schedRes.data ?? []);
    setEmployees(empRes.data ?? []);

    const pending = woRes.data?.filter(w => w.status === 'pending').length || 0;
    const approved = woRes.data?.filter(w => w.status === 'approved').length || 0;
    const inProgress = woRes.data?.filter(w => w.status === 'in_progress').length || 0;
    const completed = woRes.data?.filter(w => w.status === 'completed').length || 0;
    setStats({ pending, approved, inProgress, completed });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (wo: any) => {
    setEditWorkOrder(wo);
    reset({
      title: wo.title,
      description: wo.description ?? '',
      product_id: wo.product_id ?? '',
      production_schedule_id: wo.production_schedule_id ?? '',
      priority: wo.priority,
      quantity_ordered: wo.quantity_ordered,
      unit_of_measure: wo.unit_of_measure,
      target_date: wo.target_date ?? '',
      start_date: wo.start_date ?? '',
      notes: wo.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: WorkOrderForm) => {
    if (!company?.id || !currentUser?.id) return;

    const workOrderNumber = `WO-${Date.now()}`;

    if (editWorkOrder) {
      const { error } = await supabase
        .from('work_orders')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editWorkOrder.id);

      if (error) {
        toast.error('Failed to update work order');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'work_orders',
          record_id: editWorkOrder.id,
          new_value: { title: data.title },
        });
      }

      toast.success('Work order updated');
    } else {
      const { error } = await supabase.from('work_orders').insert({
        company_id: company.id,
        work_order_number: workOrderNumber,
        ...data,
        status: 'pending',
        approval_status: 'pending',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create work order');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'work_orders',
          new_value: { title: data.title, work_order_number: workOrderNumber },
        });
      }

      toast.success('Work order created');
    }

    reset();
    setEditWorkOrder(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('work_orders').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete work order');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'work_orders',
        record_id: deleteId,
      });
      toast.success('Work order deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleArchive = async () => {
    if (!archiveId || !company?.id || !currentUser?.id) return;
    setArchiving(true);

    const { error } = await supabase
      .from('work_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', archiveId);

    if (error) {
      toast.error('Failed to cancel work order');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'cancelled',
        module: 'manufacturing',
        entity_type: 'work_orders',
        record_id: archiveId,
      });
      toast.success('Work order cancelled');
    }

    setArchiving(false);
    setArchiveId(null);
    load();
  };

  const handleApprove = async (wo: any) => {
    if (!canApprove || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('work_orders')
      .update({
        status: 'approved',
        approval_status: 'approved',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', wo.id);

    if (error) {
      toast.error('Failed to approve work order');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'approved',
        module: 'manufacturing',
        entity_type: 'work_orders',
        record_id: wo.id,
      });
      toast.success('Work order approved');
      load();
    }
  };

  const handleStart = async (wo: any) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('work_orders')
      .update({
        status: 'in_progress',
        start_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', wo.id);

    if (error) {
      toast.error('Failed to start work order');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'started',
        module: 'manufacturing',
        entity_type: 'work_orders',
        record_id: wo.id,
      });
      toast.success('Work order started');
      load();
    }
  };

  const handleComplete = async (wo: any) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('work_orders')
      .update({
        status: 'completed',
        completion_date: new Date().toISOString().slice(0, 10),
        quantity_completed: wo.quantity_ordered,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wo.id);

    if (error) {
      toast.error('Failed to complete work order');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'completed',
        module: 'manufacturing',
        entity_type: 'work_orders',
        record_id: wo.id,
      });
      toast.success('Work order completed');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'work_order_number', header: 'WO Number', sortable: true },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'products', header: 'Product', cell: row => row.products?.name || '-' },
    { key: 'quantity_ordered', header: 'Quantity', sortable: true },
    { key: 'priority', header: 'Priority', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: row => (
        <StatusBadge
          status={row.status}
        />
      ),
    },
    { key: 'target_date', header: 'Target Date', sortable: true, cell: row => row.target_date ? format(new Date(row.target_date), 'MMM dd, yyyy') : '-' },
    { key: 'created_at', header: 'Created', sortable: true, cell: row => format(new Date(row.created_at), 'MMM dd, yyyy') },
    {
      key: 'actions',
      header: 'Actions',
      cell: row => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>}
            {canApprove && row.status === 'pending' && <DropdownMenuItem onClick={() => handleApprove(row)}>Approve</DropdownMenuItem>}
            {row.status === 'approved' && <DropdownMenuItem onClick={() => handleStart(row)}>Start Production</DropdownMenuItem>}
            {row.status === 'in_progress' && <DropdownMenuItem onClick={() => handleComplete(row)}>Complete</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Work Orders" description="Create and track production work orders" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Work Orders' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditWorkOrder(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Work Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editWorkOrder ? 'Edit Work Order' : 'New Work Order'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Work order title" />
                  {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Work order description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product</Label>
                    <Select {...register('product_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Production Schedule</Label>
                    <Select {...register('production_schedule_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        {schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.schedule_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Priority *</Label>
                    <Select {...register('priority')} defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.priority && <p className="text-red-500 text-sm">{errors.priority.message}</p>}
                  </div>
                  <div>
                    <Label>Quantity *</Label>
                    <Input type="number" {...register('quantity_ordered')} placeholder="0" />
                    {errors.quantity_ordered && <p className="text-red-500 text-sm">{errors.quantity_ordered.message}</p>}
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input {...register('unit_of_measure')} placeholder="unit" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" {...register('start_date')} />
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input type="date" {...register('target_date')} />
                  </div>
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
        <KPICard title="Pending" value={stats.pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Approved" value={stats.approved} icon={<CheckCircle className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Clipboard className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={workOrders}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Work Order"
        description="Are you sure you want to delete this work order? This action cannot be undone."
        loading={deleting}
      />

      <ConfirmDialog
        open={!!archiveId}
        onClose={() => setArchiveId(null)}
        onConfirm={handleArchive}
        title="Cancel Work Order"
        description="Are you sure you want to cancel this work order?"
        loading={archiving}
      />
    </div>
  );
}
