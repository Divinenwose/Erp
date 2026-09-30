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
import { ShoppingCart, Plus, Download, CheckCircle2, Clock, FileText, MoreHorizontal, Eye, Edit, Send, Check, X, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const poSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor required'),
  purchase_request_id: z.string().optional(),
  issue_date: z.string().min(1, 'Required'),
  expected_delivery: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});
type POForm = z.infer<typeof poSchema>;

export default function PurchaseOrdersPage() {
  const { company, user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [poItems, setPoItems] = useState<any[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<POForm>({
    resolver: zodResolver(poSchema),
    defaultValues: { issue_date: new Date().toISOString().split('T')[0] },
  });

  const load = async () => {
    if (!company?.id) return;
    const [poRes, vendRes, reqRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, vendors(name), purchase_requests(request_number)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, name').eq('company_id', company.id).eq('status', 'active'),
      supabase.from('purchase_requests').select('id, request_number, title').eq('company_id', company.id).eq('status', 'approved'),
    ]);
    setOrders(poRes.data ?? []);
    setVendors(vendRes.data ?? []);
    setRequests(reqRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: POForm) => {
    if (!company?.id) return;
    
    const { data: maxPO } = await supabase
      .from('purchase_orders')
      .select('po_number')
      .eq('company_id', company.id)
      .order('po_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastNum = maxPO?.po_number ? parseInt(String(maxPO.po_number).split('-').pop() || '0') : 0;
    const poNumber = `PO-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, '0')}`;
    
    const { error } = await supabase.from('purchase_orders').insert({
      company_id: company.id,
      po_number: poNumber,
      vendor_id: data.vendor_id,
      purchase_request_id: data.purchase_request_id,
      issue_date: data.issue_date,
      expected_delivery: data.expected_delivery,
      notes: data.notes,
      terms: data.terms,
      status: 'draft',
      currency: company.currency ?? 'USD',
      created_by: user?.id,
    });
    
    if (error) { toast.error('Failed to create purchase order'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'procurement', entity_type: 'purchase_orders', new_value: { po_number: poNumber, vendor_id: data.vendor_id } });
    }
    
    toast.success('Purchase order created as draft');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveOrder = async (order: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('purchase_orders').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', order.id);
    if (error) { toast.error('Failed to approve order'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'procurement', entity_type: 'purchase_orders', entity_id: order.id, new_value: { status: 'approved' } });
    }
    
    toast.success('Purchase order approved');
    load();
  };

  const rejectOrder = async (order: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('purchase_orders').update({ status: 'rejected' }).eq('id', order.id);
    if (error) { toast.error('Failed to reject order'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'rejected', module: 'procurement', entity_type: 'purchase_orders', entity_id: order.id, new_value: { status: 'rejected' } });
    }
    
    toast.success('Purchase order rejected');
    load();
  };

  const submitOrder = async (order: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('purchase_orders').update({ status: 'pending' }).eq('id', order.id);
    if (error) { toast.error('Failed to submit order'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'submitted', module: 'procurement', entity_type: 'purchase_orders', entity_id: order.id, new_value: { status: 'pending' } });
    }
    
    toast.success('Purchase order submitted for approval');
    load();
  };

  const cancelOrder = async (order: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('purchase_orders').update({ status: 'cancelled' }).eq('id', order.id);
    if (error) { toast.error('Failed to cancel order'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'cancelled', module: 'procurement', entity_type: 'purchase_orders', entity_id: order.id, new_value: { status: 'cancelled' } });
    }
    
    toast.success('Purchase order cancelled');
    load();
  };

  const deleteOrder = async () => {
    if (!company?.id || !orderToDelete) return;
    const { error } = await supabase.from('purchase_orders').delete().eq('id', orderToDelete.id);
    if (error) { toast.error('Failed to delete order'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'procurement', entity_type: 'purchase_orders', entity_id: orderToDelete.id });
    }
    
    toast.success('Purchase order deleted');
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
    load();
  };

  const viewOrder = async (order: any) => {
    setSelectedOrder(order);
    const { data } = await supabase.from('po_items').select('*').eq('po_id', order.id);
    setPoItems(data ?? []);
    setViewDialogOpen(true);
  };

  const pending = orders.filter(o => o.status === 'pending').length;
  const approved = orders.filter(o => o.status === 'approved').length;
  const totalValue = orders.reduce((a, o) => a + (o.total_amount ?? 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'po_number', header: 'PO Number',
      cell: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.po_number}</span>,
    },
    { key: 'vendor', header: 'Vendor', cell: (row) => <span className="text-sm">{row.vendors?.name ?? '—'}</span> },
    { key: 'purchase_requests', header: 'Reference', cell: (row) => <span className="text-xs text-gray-500">{row.purchase_requests?.request_number || '—'}</span> },
    { key: 'issue_date', header: 'Issue Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.issue_date)}</span> },
    { key: 'expected_delivery', header: 'Delivery Date', cell: (row) => <span className="text-sm text-gray-500">{row.expected_delivery ? formatDate(row.expected_delivery) : '—'}</span> },
    { key: 'total_amount', header: 'Total', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_amount ?? 0)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="procurement.orders.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view purchase orders</div>}>
      <div className="space-y-6">
        <PageHeader title="Purchase Orders" description="Create and manage formal purchase orders" breadcrumbs={[{ label: 'Procurement' }, { label: 'Purchase Orders' }]}>
          <Can resource="orders" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="orders" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New PO</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Vendor *</Label>
                    <Controller name="vendor_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    {errors.vendor_id && <p className="text-xs text-red-500 mt-1">{errors.vendor_id.message}</p>}
                  </div>
                  <div>
                    <Label>Purchase Request (Optional)</Label>
                    <Controller name="purchase_request_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Link to request" /></SelectTrigger>
                        <SelectContent>{requests.map(r => <SelectItem key={r.id} value={r.id}>{r.request_number} - {r.title}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Issue Date *</Label><Input className="mt-1" type="date" {...register('issue_date')} /></div>
                    <div><Label>Expected Delivery</Label><Input className="mt-1" type="date" {...register('expected_delivery')} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  <div><Label>Terms & Conditions</Label><Textarea className="mt-1" placeholder="Net 30, FOB..." {...register('terms')} /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || vendors.length === 0}>
                      {vendors.length === 0 ? 'Add vendors first' : isSubmitting ? 'Creating...' : 'Create PO'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total POs" value={orders.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending Approval" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Approved" value={approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Value" value={formatCurrency(totalValue)} icon={<ShoppingCart className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={orders}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Purchase Order - {selectedOrder?.po_number}</DialogTitle></DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">PO Number:</span> {selectedOrder.po_number}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedOrder.status} /></div>
                  <div><span className="text-gray-500">Vendor:</span> {selectedOrder.vendors?.name}</div>
                  <div><span className="text-gray-500">Reference:</span> {selectedOrder.purchase_requests?.request_number || '—'}</div>
                  <div><span className="text-gray-500">Issue Date:</span> {formatDate(selectedOrder.issue_date)}</div>
                  <div><span className="text-gray-500">Expected Delivery:</span> {selectedOrder.expected_delivery ? formatDate(selectedOrder.expected_delivery) : '—'}</div>
                  <div><span className="text-gray-500">Total Amount:</span> {formatCurrency(selectedOrder.total_amount || 0)}</div>
                  <div><span className="text-gray-500">Currency:</span> {selectedOrder.currency}</div>
                </div>
                {selectedOrder.notes && <div><span className="text-gray-500">Notes:</span> {selectedOrder.notes}</div>}
                {selectedOrder.terms && <div><span className="text-gray-500">Terms:</span> {selectedOrder.terms}</div>}
                
                {selectedOrder.status === 'draft' && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button size="sm" onClick={() => { setViewDialogOpen(false); submitOrder(selectedOrder); }}>Submit for Approval</Button>
                  </div>
                )}
                {selectedOrder.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Can resource="orders" action="approve">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); approveOrder(selectedOrder); }}>Approve</Button>
                    </Can>
                    <Can resource="orders" action="reject">
                      <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectOrder(selectedOrder); }}>Reject</Button>
                    </Can>
                  </div>
                )}
                {selectedOrder.status === 'approved' && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Can resource="orders" action="cancel">
                      <Button size="sm" variant="outline" onClick={() => { setViewDialogOpen(false); cancelOrder(selectedOrder); }}>Cancel Order</Button>
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
          title="Delete Purchase Order"
          description="Are you sure you want to delete this purchase order? This action cannot be undone."
          onConfirm={deleteOrder}
        />
      </div>
    </PermissionGuard>
  );
}
