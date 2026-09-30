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
import { FileText, Plus, Download, CheckCircle2, Clock, DollarSign, MoreHorizontal, Eye, Edit, Send, Check, X, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const invoiceSchema = z.object({
  po_id: z.string().min(1, 'Purchase Order required'),
  grn_id: z.string().min(1, 'GRN required'),
  invoice_number: z.string().min(1, 'Invoice number required'),
  invoice_date: z.string().min(1, 'Invoice date required'),
  due_date: z.string().min(1, 'Due date required'),
  invoice_amount: z.coerce.number().min(0, 'Amount must be positive'),
  tax_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function InvoiceVerificationPage() {
  const { company, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { invoice_date: new Date().toISOString().split('T')[0] },
  });

  const load = async () => {
    if (!company?.id) return;
    const [invRes, poRes, grnRes] = await Promise.all([
      supabase.from('invoice_verifications').select('*, purchase_orders(po_number, vendors(name)), goods_received_notes(grn_number)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('purchase_orders').select('id, po_number, vendors(name), total_amount').eq('company_id', company.id).in('status', ['approved', 'received']),
      supabase.from('goods_received_notes').select('id, grn_number, po_id, total_value').eq('company_id', company.id).eq('status', 'verified'),
    ]);
    setInvoices(invRes.data ?? []);
    setPurchaseOrders(poRes.data ?? []);
    setGrns(grnRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: InvoiceForm) => {
    if (!company?.id) return;
    
    const { error } = await supabase.from('invoice_verifications').insert({
      company_id: company.id,
      po_id: data.po_id,
      grn_id: data.grn_id,
      invoice_number: data.invoice_number,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      invoice_amount: data.invoice_amount,
      tax_amount: data.tax_amount,
      total_amount: data.invoice_amount + data.tax_amount,
      notes: data.notes,
      status: 'pending_verification',
      created_by: user?.id,
    });
    
    if (error) { toast.error('Failed to create invoice verification'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'procurement', entity_type: 'invoice_verifications', new_value: { invoice_number: data.invoice_number, po_id: data.po_id } });
    }
    
    toast.success('Invoice verification created');
    reset();
    setDialogOpen(false);
    load();
  };

  const matchInvoice = async (invoice: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoice_verifications').update({ status: 'matched', matched_by: user?.id, matched_at: new Date().toISOString() }).eq('id', invoice.id);
    if (error) { toast.error('Failed to match invoice'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'matched', module: 'procurement', entity_type: 'invoice_verifications', entity_id: invoice.id, new_value: { status: 'matched' } });
    }
    
    toast.success('Invoice matched with PO and GRN');
    load();
  };

  const approveInvoice = async (invoice: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoice_verifications').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', invoice.id);
    if (error) { toast.error('Failed to approve invoice'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'procurement', entity_type: 'invoice_verifications', entity_id: invoice.id, new_value: { status: 'approved' } });
    }

    // Create payable in Finance module
    const { data: vendor } = await supabase.from('vendors').select('name').eq('id', invoice.purchase_orders?.vendor_id).single();
    await supabase.from('payables').insert({
      company_id: company.id,
      vendor_id: invoice.purchase_orders?.vendor_id,
      invoice_number: invoice.invoice_number,
      po_reference: invoice.purchase_orders?.po_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      amount: invoice.total_amount,
      status: 'pending',
      description: `Payment for ${vendor?.name || 'vendor'} - PO ${invoice.purchase_orders?.po_number}`,
      created_by: user?.id,
    });
    
    toast.success('Invoice approved for payment');
    load();
  };

  const rejectInvoice = async (invoice: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoice_verifications').update({ status: 'rejected' }).eq('id', invoice.id);
    if (error) { toast.error('Failed to reject invoice'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'rejected', module: 'procurement', entity_type: 'invoice_verifications', entity_id: invoice.id, new_value: { status: 'rejected' } });
    }
    
    toast.success('Invoice rejected');
    load();
  };

  const deleteInvoice = async () => {
    if (!company?.id || !invoiceToDelete) return;
    const { error } = await supabase.from('invoice_verifications').delete().eq('id', invoiceToDelete.id);
    if (error) { toast.error('Failed to delete invoice'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'procurement', entity_type: 'invoice_verifications', entity_id: invoiceToDelete.id });
    }
    
    toast.success('Invoice deleted');
    setDeleteDialogOpen(false);
    setInvoiceToDelete(null);
    load();
  };

  const viewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const pending = invoices.filter(i => i.status === 'pending_verification').length;
  const matched = invoices.filter(i => i.status === 'matched').length;
  const approved = invoices.filter(i => i.status === 'approved').length;
  const totalValue = invoices.reduce((a, i) => a + (i.total_amount ?? 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'invoice_number', header: 'Invoice Number',
      cell: (row) => <span className="font-mono text-sm font-medium text-blue-600">{row.invoice_number}</span>,
    },
    { key: 'purchase_orders', header: 'PO Reference', cell: (row) => <span className="text-sm">{row.purchase_orders?.po_number || '—'}</span> },
    { key: 'goods_received_notes', header: 'GRN Reference', cell: (row) => <span className="text-sm">{row.goods_received_notes?.grn_number || '—'}</span> },
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="text-sm">{row.purchase_orders?.vendors?.name || '—'}</span> },
    { key: 'invoice_date', header: 'Invoice Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.invoice_date)}</span> },
    { key: 'due_date', header: 'Due Date', cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.due_date)}</span> },
    { key: 'total_amount', header: 'Total Amount', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_amount ?? 0)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="procurement.invoice_verification.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view invoice verification</div>}>
      <div className="space-y-6">
        <PageHeader title="Invoice Verification" description="Match and verify invoices against POs and GRNs" breadcrumbs={[{ label: 'Procurement' }, { label: 'Invoice Verification' }]}>
          <Can resource="invoice_verification" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="invoice_verification" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Invoice Verification</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label>Purchase Order *</Label>
                    <Controller name="po_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select PO" /></SelectTrigger>
                        <SelectContent>{purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.po_number} - {po.vendors?.name} ({formatCurrency(po.total_amount)})</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    {errors.po_id && <p className="text-xs text-red-500 mt-1">{errors.po_id.message}</p>}
                  </div>
                  <div>
                    <Label>Goods Received Note *</Label>
                    <Controller name="grn_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select GRN" /></SelectTrigger>
                        <SelectContent>{grns.map(grn => <SelectItem key={grn.id} value={grn.id}>{grn.grn_number} ({formatCurrency(grn.total_value)})</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    {errors.grn_id && <p className="text-xs text-red-500 mt-1">{errors.grn_id.message}</p>}
                  </div>
                  <div><Label>Invoice Number *</Label><Input className="mt-1" {...register('invoice_number')} />{errors.invoice_number && <p className="text-xs text-red-500 mt-1">{errors.invoice_number.message}</p>}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Invoice Date *</Label><Input className="mt-1" type="date" {...register('invoice_date')} /></div>
                    <div><Label>Due Date *</Label><Input className="mt-1" type="date" {...register('due_date')} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Invoice Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('invoice_amount')} />{errors.invoice_amount && <p className="text-xs text-red-500 mt-1">{errors.invoice_amount.message}</p>}</div>
                    <div><Label>Tax Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('tax_amount')} /></div>
                  </div>
                  <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || purchaseOrders.length === 0 || grns.length === 0}>
                      {(purchaseOrders.length === 0 || grns.length === 0) ? 'Missing POs or GRNs' : isSubmitting ? 'Creating...' : 'Create Invoice'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Invoices" value={invoices.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending Verification" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Matched" value={matched} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Approved for Payment" value={approved} icon={<DollarSign className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={invoices}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Invoice Verification - {selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Invoice Number:</span> {selectedInvoice.invoice_number}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedInvoice.status} /></div>
                  <div><span className="text-gray-500">PO Reference:</span> {selectedInvoice.purchase_orders?.po_number || '—'}</div>
                  <div><span className="text-gray-500">GRN Reference:</span> {selectedInvoice.goods_received_notes?.grn_number || '—'}</div>
                  <div><span className="text-gray-500">Vendor:</span> {selectedInvoice.purchase_orders?.vendors?.name || '—'}</div>
                  <div><span className="text-gray-500">Invoice Date:</span> {formatDate(selectedInvoice.invoice_date)}</div>
                  <div><span className="text-gray-500">Due Date:</span> {formatDate(selectedInvoice.due_date)}</div>
                  <div><span className="text-gray-500">Invoice Amount:</span> {formatCurrency(selectedInvoice.invoice_amount || 0)}</div>
                  <div><span className="text-gray-500">Tax Amount:</span> {formatCurrency(selectedInvoice.tax_amount || 0)}</div>
                  <div><span className="text-gray-500">Total Amount:</span> {formatCurrency(selectedInvoice.total_amount || 0)}</div>
                </div>
                {selectedInvoice.notes && <div><span className="text-gray-500">Notes:</span> {selectedInvoice.notes}</div>}
                
                {selectedInvoice.status === 'pending_verification' && (
                  <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                    <Can resource="invoice_verification" action="match">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); matchInvoice(selectedInvoice); }}>Match Invoice</Button>
                    </Can>
                    <Can resource="invoice_verification" action="reject">
                      <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectInvoice(selectedInvoice); }}>Reject</Button>
                    </Can>
                  </div>
                )}
                {selectedInvoice.status === 'matched' && (
                  <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                    <Can resource="invoice_verification" action="approve">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setViewDialogOpen(false); approveInvoice(selectedInvoice); }}>Approve for Payment</Button>
                    </Can>
                    <Can resource="invoice_verification" action="reject">
                      <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectInvoice(selectedInvoice); }}>Reject</Button>
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
          title="Delete Invoice Verification"
          description="Are you sure you want to delete this invoice verification? This action cannot be undone."
          onConfirm={deleteInvoice}
        />
      </div>
    </PermissionGuard>
  );
}
