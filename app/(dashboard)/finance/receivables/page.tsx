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
import { TrendingUp, DollarSign, AlertTriangle, Calendar, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const receivableSchema = z.object({
  customer_id: z.string().min(1, 'Required'),
  invoice_number: z.string().min(1, 'Required'),
  invoice_date: z.string().min(1, 'Required'),
  due_date: z.string().min(1, 'Required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  notes: z.string().optional(),
});
type ReceivableForm = z.infer<typeof receivableSchema>;

export default function ReceivablesPage() {
  const { company, user } = useAuth();
  const [receivables, setReceivables] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receivableToDelete, setReceivableToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReceivableForm>({ resolver: zodResolver(receivableSchema), defaultValues: { currency: 'USD' } });

  const load = async () => {
    if (!company?.id) return;
    const [receivablesData, customersData] = await Promise.all([
      supabase.from('invoices').select('*, customers(name)').eq('company_id', company.id).eq('invoice_type', 'sales').order('due_date', { ascending: true }),
      supabase.from('customers').select('*').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setReceivables(receivablesData.data ?? []);
    setCustomers(customersData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: ReceivableForm) => {
    if (!company?.id) return;
    
    const { error } = await supabase.from('invoices').insert({
      company_id: company.id,
      invoice_number: data.invoice_number,
      invoice_type: 'sales',
      customer_id: data.customer_id,
      issue_date: data.invoice_date,
      due_date: data.due_date,
      subtotal: data.amount,
      total_amount: data.amount,
      balance_due: data.amount,
      currency: data.currency,
      notes: data.notes,
      status: 'pending',
      created_by: user?.id,
    });

    if (error) { toast.error('Failed to create receivable'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'invoices', entity_type: 'invoices', new_value: { invoice_number: data.invoice_number, amount: data.amount } });
    }
    toast.success('Receivable created');
    reset();
    setDialogOpen(false);
    load();
  };

  const recordPayment = async (receivable: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoices').update({ status: 'paid', paid_amount: receivable.balance_due, balance_due: 0 }).eq('id', receivable.id);
    if (error) { toast.error('Failed to record payment'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'paid', module: 'invoices', entity_type: 'invoices', entity_id: receivable.id, new_value: { status: 'paid' } });
    }
    toast.success('Payment recorded');
    load();
  };

  const writeOff = async (receivable: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoices').update({ status: 'written_off', balance_due: 0 }).eq('id', receivable.id);
    if (error) { toast.error('Failed to write off'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'written_off', module: 'invoices', entity_type: 'invoices', entity_id: receivable.id, new_value: { status: 'written_off' } });
    }
    toast.success('Invoice written off');
    load();
  };

  const deleteReceivable = async () => {
    if (!company?.id || !receivableToDelete) return;
    const { error } = await supabase.from('invoices').delete().eq('id', receivableToDelete.id);
    if (error) { toast.error('Failed to delete receivable'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'invoices', entity_type: 'invoices', entity_id: receivableToDelete.id });
    }
    toast.success('Receivable deleted');
    setDeleteDialogOpen(false);
    setReceivableToDelete(null);
    load();
  };

  const viewReceivable = (receivable: any) => {
    setSelectedReceivable(receivable);
    setViewDialogOpen(true);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getReceivableStatus = (dueDate: string, status: string) => {
    if (status === 'paid') return 'paid';
    if (status === 'written_off') return 'rejected';
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return 'overdue';
    if (days <= 7) return 'due_soon';
    return 'open';
  };

  const columns: Column<any>[] = [
    { key: 'customers', header: 'Customer', cell: (row) => row.customers?.name || 'Unknown' },
    { key: 'invoice_number', header: 'Invoice', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.invoice_number}</span> },
    { key: 'total_amount', header: 'Amount', cell: (row) => <span className="font-medium">{formatCurrency(row.total_amount)}</span> },
    { key: 'due_date', header: 'Due Date', cell: (row) => formatDate(row.due_date) },
    { key: 'days', header: 'Days', cell: (row) => {
      const days = getDaysUntilDue(row.due_date);
      return <span className={days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-600'}>{days}</span>;
    } },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={getReceivableStatus(row.due_date, row.status)} /> },
  ];

  const totalReceivables = receivables.reduce((sum, r) => sum + (r.balance_due || 0), 0);
  const overdueReceivables = receivables.filter(r => getReceivableStatus(r.due_date, r.status) === 'overdue').reduce((sum, r) => sum + (r.balance_due || 0), 0);
  const dueThisWeek = receivables.filter(r => {
    const days = getDaysUntilDue(r.due_date);
    return days >= 0 && days <= 7;
  }).reduce((sum, r) => sum + (r.balance_due || 0), 0);
  const collectedThisMonth = receivables.filter(r => r.status === 'paid' && new Date(r.updated_at).getMonth() === new Date().getMonth()).reduce((sum, r) => sum + (r.paid_amount || 0), 0);

  return (
    <PermissionGuard permission="finance.receivables.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view accounts receivable</div>}>
      <div className="space-y-6">
        <PageHeader title="Accounts Receivable" description="Track customer invoices and collections" breadcrumbs={[{ label: 'Finance' }, { label: 'Accounts Receivable' }]} >
          <Can resource="receivables" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="receivables" action="create">
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
                    <div><Label>Currency</Label>
                      <Select defaultValue="USD" onValueChange={(v) => register('currency').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Invoice Date *</Label><Input className="mt-1" type="date" {...register('invoice_date')} /></div>
                    <div><Label>Due Date *</Label><Input className="mt-1" type="date" {...register('due_date')} /></div>
                    <div><Label>Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('amount')} /></div>
                    <div><Label>Description</Label><Input className="mt-1" {...register('description')} /></div>
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
          <KPICard title="Total Receivables" value={formatCurrency(totalReceivables)} icon={<TrendingUp className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Overdue" value={formatCurrency(overdueReceivables)} icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
          <KPICard title="Due This Week" value={formatCurrency(dueThisWeek)} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Collected This Month" value={formatCurrency(collectedThisMonth)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search receivables..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredReceivables}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Invoice Details</DialogTitle></DialogHeader>
            {selectedReceivable && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Customer:</span> {selectedReceivable.customers?.name}</div>
                  <div><span className="text-gray-500">Invoice:</span> {selectedReceivable.invoice_number}</div>
                  <div><span className="text-gray-500">Issue Date:</span> {formatDate(selectedReceivable.issue_date)}</div>
                  <div><span className="text-gray-500">Due Date:</span> {formatDate(selectedReceivable.due_date)}</div>
                  <div><span className="text-gray-500">Amount:</span> {formatCurrency(selectedReceivable.total_amount)}</div>
                  <div><span className="text-gray-500">Balance Due:</span> {formatCurrency(selectedReceivable.balance_due)}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={getReceivableStatus(selectedReceivable.due_date, selectedReceivable.status)} /></div>
                  <div><span className="text-gray-500">Currency:</span> {selectedReceivable.currency}</div>
                </div>
                {selectedReceivable.description && <div><span className="text-gray-500">Description:</span> {selectedReceivable.description}</div>}
                {selectedReceivable.notes && <div><span className="text-gray-500">Notes:</span> {selectedReceivable.notes}</div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Receivable"
          description="Are you sure you want to delete this receivable? This action cannot be undone."
          onConfirm={deleteReceivable}
        />
      </div>
    </PermissionGuard>
  );
}
