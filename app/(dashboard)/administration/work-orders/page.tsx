'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, AlertCircle, Wrench, CheckCircle2, Plus, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WorkOrdersPage() {
  const { company, user } = useAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editWorkOrder, setEditWorkOrder] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('corrective');
  const [priority, setPriority] = useState('medium');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');

  const PRIORITY_COLOR: Record<string, string> = {
    high: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50',
    medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
    low: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
  };

  const loadWorkOrders = async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*, assigned_employee:employees!work_orders_assigned_to_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
      toast.error('Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWorkOrders(); }, [company?.id]);

  const handleCreateWorkOrder = async () => {
    if (!company?.id || !user?.id) return;
    if (!title.trim() || !dueDate) {
      toast.error('Title and due date are required');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        company_id: company.id,
        title: title.trim(),
        work_type: type,
        priority,
        assigned_to: assignee || null,
        scheduled_date: dueDate,
        description: description.trim() || null,
      };

      let error;
      if (editWorkOrder) {
        const result = await supabase.from('work_orders').update(payload).eq('id', editWorkOrder.id);
        error = result.error;
        if (!error) {
          await logAuditEvent(company.id, user.id, {
            action: 'work_order_updated',
            module: 'work_orders',
            entity_type: 'work_orders',
            entity_id: editWorkOrder.id,
            new_value: { title: title.trim() },
          });
          toast.success('Work order updated successfully');
        }
      } else {
        const woNumber = `WO-${format(new Date(), 'yyyy')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        const result = await supabase.from('work_orders').insert({ ...payload, order_number: woNumber, status: 'open' });
        error = result.error;
        if (!error) {
          await logAuditEvent(company.id, user.id, {
            action: 'work_order_created',
            module: 'work_orders',
            entity_type: 'work_orders',
            new_value: { order_number: woNumber, title: title.trim() },
          });
          toast.success('Work order created successfully');
        }
      }

      if (error) throw error;

      setTitle('');
      setType('corrective');
      setPriority('medium');
      setAssignee('');
      setDescription('');
      setDueDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
      setEditWorkOrder(null);
      setDialogOpen(false);
      loadWorkOrders();
    } catch (error) {
      console.error('Error saving work order:', error);
      toast.error('Failed to save work order');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (wo: any) => {
    setEditWorkOrder(wo);
    setTitle(wo.title || '');
    setType(wo.work_type || 'corrective');
    setPriority(wo.priority || 'medium');
    setAssignee(wo.assigned_to || '');
    setDueDate(wo.scheduled_date || format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    setDescription(wo.description || '');
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!company?.id || !user?.id || !deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('work_orders').delete().eq('id', deleteId);
      if (error) throw error;
      await logAuditEvent(company.id, user.id, {
        action: 'work_order_deleted',
        module: 'work_orders',
        entity_type: 'work_orders',
        entity_id: deleteId,
      });
      toast.success('Work order deleted');
      setDeleteId(null);
      loadWorkOrders();
    } catch (error) {
      console.error('Error deleting work order:', error);
      toast.error('Failed to delete work order');
    } finally {
      setDeleting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (!company?.id || !user?.id) return;

    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent(company.id, user.id, {
        action: 'work_order_status_updated',
        module: 'work_orders',
        entity_type: 'work_orders',
        entity_id: id,
        new_value: { status: newStatus },
      });

      toast.success('Status updated');
      loadWorkOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const totalCount = workOrders.length;
  const openCount = workOrders.filter(wo => wo.status === 'open').length;
  const inProgressCount = workOrders.filter(wo => wo.status === 'in_progress').length;
  const completedCount = workOrders.filter(wo => wo.status === 'completed').length;

  return (
    <PermissionGuard permission="work_orders.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view work orders</div>}>
      <div className="space-y-6">
        <PageHeader
          title="Work Orders"
          description="Manage facility maintenance and repair work orders"
          breadcrumbs={[{ label: 'Administration' }, { label: 'Work Orders' }]}
        >
          <PermissionGuard permission="work_orders.export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </PermissionGuard>
          <PermissionGuard permission="work_orders.create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Work Order</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editWorkOrder ? 'Edit Work Order' : 'Create New Work Order'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input id="title" placeholder="Enter work order title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrective">Corrective</SelectItem>
                          <SelectItem value="preventive">Preventive</SelectItem>
                          <SelectItem value="inspection">Inspection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date *</Label>
                      <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignee">Assignee</Label>
                      <Input id="assignee" placeholder="Assign to employee" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Enter description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>
                  <Button className="w-full" onClick={handleCreateWorkOrder} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Create Work Order
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </PermissionGuard>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Work Orders"
            value={totalCount}
            icon={<ClipboardList className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
          <KPICard
            title="Open"
            value={openCount}
            icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            loading={loading}
          />
          <KPICard
            title="In Progress"
            value={inProgressCount}
            icon={<Wrench className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
          <KPICard
            title="Completed"
            value={completedCount}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/50"
            loading={loading}
          />
        </div>

        <ConfirmDialog
          open={deleteId !== null}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title="Delete Work Order"
          description="Are you sure you want to delete this work order? This action cannot be undone."
          loading={deleting}
        />

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Work Order List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">Loading work orders...</p>
              </div>
            ) : workOrders.length === 0 ? (
              <div className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">No work orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">WO #</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assignee</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Due</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {workOrders.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row.order_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.title}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.work_type}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.assigned_employee ? `${row.assigned_employee.first_name} ${row.assigned_employee.last_name}` : 'Unassigned'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLOR[row.priority] ?? ''}`}>
                            {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.scheduled_date ? format(new Date(row.scheduled_date), 'MMM dd, yyyy') : '-'}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Select value={row.status} onValueChange={(v) => updateStatus(row.id, v)}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(row)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-red-600" onClick={() => setDeleteId(row.id)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
