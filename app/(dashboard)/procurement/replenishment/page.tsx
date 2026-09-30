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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Plus, Download, CheckCircle2, Clock, Package, MoreHorizontal, Eye, Edit, Send, Check, X, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const replenishmentSchema = z.object({
  item_name: z.string().min(1, 'Item name required'),
  item_code: z.string().optional(),
  current_stock: z.coerce.number().min(0),
  minimum_stock: z.coerce.number().min(0),
  requested_quantity: z.coerce.number().min(1, 'Requested quantity must be at least 1'),
  priority: z.string().min(1, 'Priority required'),
  required_date: z.string().min(1, 'Required date required'),
  reason: z.string().optional(),
  warehouse_id: z.string().optional(),
});
type ReplenishmentForm = z.infer<typeof replenishmentSchema>;

export default function ReplenishmentPage() {
  const { company, user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requestToDelete, setRequestToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ReplenishmentForm>({
    resolver: zodResolver(replenishmentSchema),
    defaultValues: { current_stock: 0, minimum_stock: 0, requested_quantity: 1, priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [reqRes, whRes] = await Promise.all([
      supabase.from('replenishment_requests').select('*, warehouses(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setRequests(reqRes.data ?? []);
    setWarehouses(whRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: ReplenishmentForm) => {
    if (!company?.id) return;
    
    const { error } = await supabase.from('replenishment_requests').insert({
      company_id: company.id,
      item_name: data.item_name,
      item_code: data.item_code,
      current_stock: data.current_stock,
      minimum_stock: data.minimum_stock,
      requested_quantity: data.requested_quantity,
      priority: data.priority,
      required_date: data.required_date,
      reason: data.reason,
      warehouse_id: data.warehouse_id,
      status: 'pending',
      requested_by: user?.id,
    });
    
    if (error) { toast.error('Failed to create replenishment request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'procurement', entity_type: 'replenishment_requests', new_value: { item_name: data.item_name, requested_quantity: data.requested_quantity } });
    }
    
    toast.success('Replenishment request created');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveRequest = async (request: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('replenishment_requests').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', request.id);
    if (error) { toast.error('Failed to approve request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'procurement', entity_type: 'replenishment_requests', entity_id: request.id, new_value: { status: 'approved' } });
    }
    
    toast.success('Replenishment request approved');
    load();
  };

  const rejectRequest = async (request: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('replenishment_requests').update({ status: 'rejected' }).eq('id', request.id);
    if (error) { toast.error('Failed to reject request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'rejected', module: 'procurement', entity_type: 'replenishment_requests', entity_id: request.id, new_value: { status: 'rejected' } });
    }
    
    toast.success('Replenishment request rejected');
    load();
  };

  const completeRequest = async (request: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('replenishment_requests').update({ status: 'completed', completed_by: user?.id, completed_at: new Date().toISOString() }).eq('id', request.id);
    if (error) { toast.error('Failed to complete request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'completed', module: 'procurement', entity_type: 'replenishment_requests', entity_id: request.id, new_value: { status: 'completed' } });
    }
    
    toast.success('Replenishment request completed');
    load();
  };

  const deleteRequest = async () => {
    if (!company?.id || !requestToDelete) return;
    const { error } = await supabase.from('replenishment_requests').delete().eq('id', requestToDelete.id);
    if (error) { toast.error('Failed to delete request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'procurement', entity_type: 'replenishment_requests', entity_id: requestToDelete.id });
    }
    
    toast.success('Replenishment request deleted');
    setDeleteDialogOpen(false);
    setRequestToDelete(null);
    load();
  };

  const viewRequest = (request: any) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const completed = requests.filter(r => r.status === 'completed').length;
  const totalRequested = requests.reduce((a, r) => a + (r.requested_quantity ?? 0), 0);

  const columns: Column<any>[] = [
    { key: 'item_name', header: 'Item Name' },
    { key: 'item_code', header: 'Item Code', cell: (row) => <span className="font-mono text-xs">{row.item_code || '—'}</span> },
    { key: 'current_stock', header: 'Current Stock', cell: (row) => <span className="text-sm">{row.current_stock ?? 0}</span> },
    { key: 'minimum_stock', header: 'Min Stock', cell: (row) => <span className="text-sm text-gray-500">{row.minimum_stock ?? 0}</span> },
    { key: 'requested_quantity', header: 'Requested', cell: (row) => <span className="text-sm font-semibold text-blue-600">{row.requested_quantity ?? 0}</span> },
    { key: 'priority', header: 'Priority', cell: (row) => <span className="text-xs capitalize">{row.priority}</span> },
    { key: 'required_date', header: 'Required By', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.required_date)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="procurement.replenishment.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view replenishment requests</div>}>
      <div className="space-y-6">
        <PageHeader title="Inventory Replenishment" description="Manage stock replenishment requests" breadcrumbs={[{ label: 'Procurement' }, { label: 'Replenishment' }]}>
          <Can resource="replenishment" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="replenishment" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Request</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Replenishment Request</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>Item Name *</Label><Input className="mt-1" {...register('item_name')} />{errors.item_name && <p className="text-xs text-red-500 mt-1">{errors.item_name.message}</p>}</div>
                    <div><Label>Item Code</Label><Input className="mt-1" {...register('item_code')} /></div>
                    <div><Label>Warehouse</Label>
                      <Controller name="warehouse_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                          <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div><Label>Current Stock</Label><Input className="mt-1" type="number" {...register('current_stock')} /></div>
                    <div><Label>Minimum Stock</Label><Input className="mt-1" type="number" {...register('minimum_stock')} /></div>
                    <div><Label>Requested Quantity *</Label><Input className="mt-1" type="number" {...register('requested_quantity')} />{errors.requested_quantity && <p className="text-xs text-red-500 mt-1">{errors.requested_quantity.message}</p>}</div>
                    <div>
                      <Label>Priority *</Label>
                      <Controller name="priority" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select priority" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                      {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority.message}</p>}
                    </div>
                    <div className="col-span-2"><Label>Required Date *</Label><Input className="mt-1" type="date" {...register('required_date')} />{errors.required_date && <p className="text-xs text-red-500 mt-1">{errors.required_date.message}</p>}</div>
                    <div className="col-span-2"><Label>Reason</Label><Textarea className="mt-1" {...register('reason')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Request</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Requests" value={requests.length} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending Approval" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Approved" value={approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Requested Qty" value={totalRequested} icon={<RefreshCw className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={requests}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Replenishment Request Details</DialogTitle></DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Item Name:</span> {selectedRequest.item_name}</div>
                  <div><span className="text-gray-500">Item Code:</span> {selectedRequest.item_code || '—'}</div>
                  <div><span className="text-gray-500">Warehouse:</span> {selectedRequest.warehouses?.name || '—'}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedRequest.status} /></div>
                  <div><span className="text-gray-500">Current Stock:</span> {selectedRequest.current_stock ?? 0}</div>
                  <div><span className="text-gray-500">Minimum Stock:</span> {selectedRequest.minimum_stock ?? 0}</div>
                  <div><span className="text-gray-500">Requested Quantity:</span> {selectedRequest.requested_quantity ?? 0}</div>
                  <div><span className="text-gray-500">Priority:</span> <span className="capitalize">{selectedRequest.priority}</span></div>
                  <div><span className="text-gray-500">Required Date:</span> {formatDate(selectedRequest.required_date)}</div>
                  <div><span className="text-gray-500">Created At:</span> {formatDate(selectedRequest.created_at)}</div>
                </div>
                {selectedRequest.reason && <div><span className="text-gray-500">Reason:</span> {selectedRequest.reason}</div>}
                
                {selectedRequest.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                    <Can resource="replenishment" action="approve">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); approveRequest(selectedRequest); }}>Approve</Button>
                    </Can>
                    <Can resource="replenishment" action="reject">
                      <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectRequest(selectedRequest); }}>Reject</Button>
                    </Can>
                  </div>
                )}
                {selectedRequest.status === 'approved' && (
                  <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                    <Can resource="replenishment" action="complete">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setViewDialogOpen(false); completeRequest(selectedRequest); }}>Mark Complete</Button>
                    </Can>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Replenishment Request"
          description="Are you sure you want to delete this replenishment request? This action cannot be undone."
          onConfirm={deleteRequest}
        />
      </div>
    </PermissionGuard>
  );
}
