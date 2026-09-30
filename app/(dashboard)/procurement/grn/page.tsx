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
import { Package, Plus, Download, CheckCircle2, Clock, FileText, MoreHorizontal, Eye, Edit, Send, Check, X, Truck, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const grnSchema = z.object({
  po_id: z.string().min(1, 'Purchase Order required'),
  delivery_date: z.string().min(1, 'Required'),
  received_by: z.string().min(1, 'Receiver required'),
  condition: z.string().min(1, 'Condition required'),
  notes: z.string().optional(),
});
type GRNForm = z.infer<typeof grnSchema>;

export default function GRNPage() {
  const { company, user } = useAuth();
  const [grns, setGrns] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  const [grnToDelete, setGrnToDelete] = useState<any>(null);
  const [grnItems, setGrnItems] = useState<any[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<GRNForm>({
    resolver: zodResolver(grnSchema),
    defaultValues: { delivery_date: new Date().toISOString().split('T')[0] },
  });

  const load = async () => {
    if (!company?.id) return;
    const [grnRes, poRes, empRes] = await Promise.all([
      supabase.from('goods_received_notes').select('*, purchase_orders(po_number, vendors(name))').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('purchase_orders').select('id, po_number, vendors(name)').eq('company_id', company.id).in('status', ['approved', 'sent']),
      supabase.from('employees').select('id, full_name').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setGrns(grnRes.data ?? []);
    setPurchaseOrders(poRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: GRNForm) => {
    if (!company?.id) return;
    
    const { data: maxGRN } = await supabase
      .from('goods_received_notes')
      .select('grn_number')
      .eq('company_id', company.id)
      .order('grn_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastNum = maxGRN?.grn_number ? parseInt(String(maxGRN.grn_number).split('-').pop() || '0') : 0;
    const grnNumber = `GRN-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, '0')}`;
    
    const { error } = await supabase.from('goods_received_notes').insert({
      company_id: company.id,
      grn_number: grnNumber,
      po_id: data.po_id,
      delivery_date: data.delivery_date,
      received_by: data.received_by,
      condition: data.condition,
      notes: data.notes,
      status: 'pending_verification',
      created_by: user?.id,
    });
    
    if (error) { toast.error('Failed to create GRN'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'procurement', entity_type: 'goods_received_notes', new_value: { grn_number: grnNumber, po_id: data.po_id } });
    }
    
    toast.success('Goods Received Note created');
    reset();
    setDialogOpen(false);
    load();
  };

  const verifyGRN = async (grn: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('goods_received_notes').update({ status: 'verified', verified_by: user?.id, verified_at: new Date().toISOString() }).eq('id', grn.id);
    if (error) { toast.error('Failed to verify GRN'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'verified', module: 'procurement', entity_type: 'goods_received_notes', entity_id: grn.id, new_value: { status: 'verified' } });
    }

    // Update inventory stock levels for GRN items
    const { data: grnItems } = await supabase.from('grn_items').select('*').eq('grn_id', grn.id);
    if (grnItems) {
      for (const item of grnItems) {
        await supabase.rpc('update_inventory_stock', {
          p_item_id: item.item_id,
          p_quantity: item.quantity_received,
          p_company_id: company.id,
        });
      }
    }
    
    toast.success('GRN verified and inventory updated');
    load();
  };

  const rejectGRN = async (grn: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('goods_received_notes').update({ status: 'rejected' }).eq('id', grn.id);
    if (error) { toast.error('Failed to reject GRN'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'rejected', module: 'procurement', entity_type: 'goods_received_notes', entity_id: grn.id, new_value: { status: 'rejected' } });
    }
    
    toast.success('GRN rejected');
    load();
  };

  const deleteGRN = async () => {
    if (!company?.id || !grnToDelete) return;
    const { error } = await supabase.from('goods_received_notes').delete().eq('id', grnToDelete.id);
    if (error) { toast.error('Failed to delete GRN'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'procurement', entity_type: 'goods_received_notes', entity_id: grnToDelete.id });
    }
    
    toast.success('GRN deleted');
    setDeleteDialogOpen(false);
    setGrnToDelete(null);
    load();
  };

  const viewGRN = async (grn: any) => {
    setSelectedGRN(grn);
    const { data } = await supabase.from('grn_items').select('*').eq('grn_id', grn.id);
    setGrnItems(data ?? []);
    setViewDialogOpen(true);
  };

  const pending = grns.filter(g => g.status === 'pending_verification').length;
  const verified = grns.filter(g => g.status === 'verified').length;
  const totalValue = grns.reduce((a, g) => a + (g.total_value ?? 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'grn_number', header: 'GRN Number',
      cell: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.grn_number}</span>,
    },
    { key: 'purchase_orders', header: 'PO Reference', cell: (row) => <span className="text-sm">{row.purchase_orders?.po_number || '—'}</span> },
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="text-sm">{row.purchase_orders?.vendors?.name || '—'}</span> },
    { key: 'delivery_date', header: 'Delivery Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.delivery_date)}</span> },
    { key: 'condition', header: 'Condition', cell: (row) => <span className="text-xs capitalize">{row.condition.replace(/_/g, ' ')}</span> },
    { key: 'total_value', header: 'Total Value', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_value ?? 0)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="procurement.grn.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view Goods Received Notes</div>}>
      <div className="space-y-6">
        <PageHeader title="Goods Received Notes" description="Verify and record incoming deliveries" breadcrumbs={[{ label: 'Procurement' }, { label: 'GRN' }]}>
          <Can resource="grn" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="grn" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New GRN</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Goods Received Note</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Purchase Order *</Label>
                    <Controller name="po_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select PO" /></SelectTrigger>
                        <SelectContent>{purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.po_number} - {po.vendors?.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    {errors.po_id && <p className="text-xs text-red-500 mt-1">{errors.po_id.message}</p>}
                  </div>
                  <div><Label>Delivery Date *</Label><Input className="mt-1" type="date" {...register('delivery_date')} /></div>
                  <div>
                    <Label>Received By *</Label>
                    <Controller name="received_by" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select receiver" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    {errors.received_by && <p className="text-xs text-red-500 mt-1">{errors.received_by.message}</p>}
                  </div>
                  <div>
                    <Label>Condition *</Label>
                    <Controller name="condition" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select condition" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="wrong_item">Wrong Item</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                    {errors.condition && <p className="text-xs text-red-500 mt-1">{errors.condition.message}</p>}
                  </div>
                  <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || purchaseOrders.length === 0}>
                      {purchaseOrders.length === 0 ? 'No approved POs' : isSubmitting ? 'Creating...' : 'Create GRN'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total GRNs" value={grns.length} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending Verification" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Verified" value={verified} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Value" value={formatCurrency(totalValue)} icon={<Truck className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={grns}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Goods Received Note - {selectedGRN?.grn_number}</DialogTitle></DialogHeader>
            {selectedGRN && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">GRN Number:</span> {selectedGRN.grn_number}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedGRN.status} /></div>
                  <div><span className="text-gray-500">PO Reference:</span> {selectedGRN.purchase_orders?.po_number || '—'}</div>
                  <div><span className="text-gray-500">Vendor:</span> {selectedGRN.purchase_orders?.vendors?.name || '—'}</div>
                  <div><span className="text-gray-500">Delivery Date:</span> {formatDate(selectedGRN.delivery_date)}</div>
                  <div><span className="text-gray-500">Condition:</span> <span className="capitalize">{selectedGRN.condition.replace(/_/g, ' ')}</span></div>
                  <div><span className="text-gray-500">Total Value:</span> {formatCurrency(selectedGRN.total_value || 0)}</div>
                  <div><span className="text-gray-500">Verified At:</span> {selectedGRN.verified_at ? formatDate(selectedGRN.verified_at) : '—'}</div>
                </div>
                {selectedGRN.notes && <div><span className="text-gray-500">Notes:</span> {selectedGRN.notes}</div>}
                
                {selectedGRN.status === 'pending_verification' && (
                  <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                    <Can resource="grn" action="verify">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); verifyGRN(selectedGRN); }}>Verify GRN</Button>
                    </Can>
                    <Can resource="grn" action="reject">
                      <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectGRN(selectedGRN); }}>Reject</Button>
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
          title="Delete Goods Received Note"
          description="Are you sure you want to delete this GRN? This action cannot be undone."
          onConfirm={deleteGRN}
        />
      </div>
    </PermissionGuard>
  );
}
