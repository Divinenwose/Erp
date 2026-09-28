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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Download, Search, MoreHorizontal, Edit, Trash2, Send, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const invoiceSchema = z.object({
  customer_id: z.string().min(1, 'Required'),
  invoice_number: z.string().min(1, 'Required'),
  issue_date: z.string().min(1, 'Required'),
  due_date: z.string().optional(),
  subtotal: z.coerce.number().min(0),
  tax_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function InvoicesPage() {
  const { company, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentAmount, setPaymentAmount] = useState(0);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InvoiceForm>({ resolver: zodResolver(invoiceSchema) });

  const load = async () => {
    if (!company?.id) return;
    const [invoicesData, customersData] = await Promise.all([
      supabase.from('invoices').select('*, customers(name)').eq('company_id', company.id).order('issue_date', { ascending: false }),
      supabase.from('customers').select('*').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setInvoices(invoicesData.data ?? []);
    setCustomers(customersData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: InvoiceForm) => {
    if (!company?.id) return;
    const totalAmount = data.subtotal + data.tax_amount;
    const { error } = await supabase.from('invoices').insert({
      company_id: company.id,
      invoice_number: data.invoice_number,
      invoice_type: 'sales',
      customer_id: data.customer_id,
      issue_date: data.issue_date,
      due_date: data.due_date,
      subtotal: data.subtotal,
      tax_amount: data.tax_amount,
      total_amount: totalAmount,
      balance_due: totalAmount,
      paid_amount: 0,
      notes: data.notes,
      status: 'draft',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create invoice'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'invoices', entity_type: 'invoices', new_value: { invoice_number: data.invoice_number, amount: totalAmount } });
    }
    toast.success('Invoice created');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveInvoice = async (invoice: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoices').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', invoice.id);
    if (error) { toast.error('Failed to approve invoice'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'invoices', entity_type: 'invoices', entity_id: invoice.id, new_value: { status: 'approved' } });
    }
    toast.success('Invoice approved');
    load();
  };

  const sendInvoice = async (invoice: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id);
    if (error) { toast.error('Failed to send invoice'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'sent', module: 'invoices', entity_type: 'invoices', entity_id: invoice.id, new_value: { status: 'sent' } });
    }
    toast.success('Invoice sent');
    load();
  };

  const recordPayment = async () => {
    if (!company?.id || !selectedInvoice) return;
    const newPaidAmount = (selectedInvoice.paid_amount || 0) + paymentAmount;
    const newBalance = selectedInvoice.balance_due - paymentAmount;
    const newStatus = newBalance <= 0.01 ? 'paid' : 'partial';
    
    const { error } = await supabase.from('invoices').update({ 
      paid_amount: newPaidAmount, 
      balance_due: Math.max(0, newBalance),
      status: newStatus
    }).eq('id', selectedInvoice.id);
    
    if (error) { toast.error('Failed to record payment'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'payment_recorded', module: 'invoices', entity_type: 'invoices', entity_id: selectedInvoice.id, new_value: { amount: paymentAmount, new_balance: Math.max(0, newBalance) } });
    }
    toast.success('Payment recorded');
    setPaymentDialogOpen(false);
    setPaymentAmount(0);
    setSelectedInvoice(null);
    load();
  };

  const voidInvoice = async (invoice: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoices').update({ status: 'voided' }).eq('id', invoice.id);
    if (error) { toast.error('Failed to void invoice'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'voided', module: 'invoices', entity_type: 'invoices', entity_id: invoice.id, new_value: { status: 'voided' } });
    }
    toast.success('Invoice voided');
    load();
  };

  const deleteInvoice = async () => {
    if (!company?.id || !invoiceToDelete) return;
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceToDelete.id);
    if (error) { toast.error('Failed to delete invoice'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'invoices', entity_type: 'invoices', entity_id: invoiceToDelete.id });
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

  const openPaymentDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.balance_due);
    setPaymentDialogOpen(true);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !search || inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || inv.customers?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<any>[] = [
    { key: 'invoice_number', header: 'Invoice', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.invoice_number}</span> },
    { key: 'customers', header: 'Customer', cell: (row) => row.customers?.name || 'Unknown' },
    { key: 'issue_date', header: 'Issue Date', cell: (row) => formatDate(row.issue_date) },
    { key: 'total_amount', header: 'Total', cell: (row) => <span className="font-medium">{formatCurrency(row.total_amount)}</span> },
    { key: 'balance_due', header: 'Balance Due', cell: (row) => <span className="font-medium">{formatCurrency(row.balance_due)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;

  return (
    <PermissionGuard permission="finance.invoices.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view invoices</div>}>
      <div className="space-y-6">
        <PageHeader title="Invoices" description="Manage customer invoices and payments" breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices' }]}>

          <Can resource="invoices" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>

          <Can resource="invoices" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Customer *</Label>
                      <Select onValueChange={(v) => register('customer_id').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Invoice Number *</Label><Input className="mt-1" {...register('invoice_number')} placeholder="INV-2024-0001" /></div>
                    <div><Label>Issue Date *</Label><Input className="mt-1" type="date" {...register('issue_date')} /></div>
                    <div><Label>Due Date</Label><Input className="mt-1" type="date" {...register('due_date')} /></div>
                    <div><Label>Subtotal</Label><Input className="mt-1" type="number" step="0.01" {...register('subtotal')} /></div>
                    <div><Label>Tax Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('tax_amount')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Invoice</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Paid" value={formatCurrency(totalPaid)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={<XCircle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Overdue" value={overdueCount} icon={<Send className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredInvoices}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewInvoice(row)}><Edit className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'draft' && (
                      <Can resource="invoices" action="approve">
                        <DropdownMenuItem onClick={() => approveInvoice(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status === 'approved' && (
                      <Can resource="invoices" action="send">
                        <DropdownMenuItem onClick={() => sendInvoice(row)}><Send className="h-4 w-4 mr-2" />Send</DropdownMenuItem>
                      </Can>
                    )}
                    {row.balance_due > 0 && row.status !== 'voided' && (
                      <Can resource="invoices" action="record_payment">
                        <DropdownMenuItem onClick={() => openPaymentDialog(row)}><DollarSign className="h-4 w-4 mr-2" />Record Payment</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status !== 'paid' && row.status !== 'voided' && (
                      <Can resource="invoices" action="void">
                        <DropdownMenuItem onClick={() => voidInvoice(row)}><XCircle className="h-4 w-4 mr-2" />Void</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status !== 'paid' && row.status !== 'voided' && (
                      <Can resource="invoices" action="delete">
                        <DropdownMenuItem onClick={() => { setInvoiceToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </Can>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Invoice:</span> {selectedInvoice.invoice_number}</div>
                  <div><span className="text-gray-500">Customer:</span> {selectedInvoice.customers?.name}</div>
                  <div><span className="text-gray-500">Issue Date:</span> {formatDate(selectedInvoice.issue_date)}</div>
                  <div><span className="text-gray-500">Due Date:</span> {formatDate(selectedInvoice.due_date)}</div>
                  <div><span className="text-gray-500">Subtotal:</span> {formatCurrency(selectedInvoice.subtotal)}</div>
                  <div><span className="text-gray-500">Tax:</span> {formatCurrency(selectedInvoice.tax_amount)}</div>
                  <div><span className="text-gray-500">Total:</span> {formatCurrency(selectedInvoice.total_amount)}</div>
                  <div><span className="text-gray-500">Paid:</span> {formatCurrency(selectedInvoice.paid_amount)}</div>
                  <div className="col-span-2"><span className="text-gray-500">Balance Due:</span> {formatCurrency(selectedInvoice.balance_due)}</div>
                  <div className="col-span-2"><span className="text-gray-500">Status:</span> <StatusBadge status={selectedInvoice.status} /></div>
                </div>
                {selectedInvoice.notes && <div><span className="text-gray-500">Notes:</span> {selectedInvoice.notes}</div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p><span className="text-gray-500">Invoice:</span> {selectedInvoice.invoice_number}</p>
                  <p><span className="text-gray-500">Balance Due:</span> {formatCurrency(selectedInvoice.balance_due)}</p>
                </div>
                <div>
                  <Label>Payment Amount</Label>
                  <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setPaymentAmount(0); setSelectedInvoice(null); }}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={recordPayment}>Record Payment</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Invoice"
          description="Are you sure you want to delete this invoice? This action cannot be undone."
          onConfirm={deleteInvoice}
        />
      </div>
    </PermissionGuard>
  );
}
