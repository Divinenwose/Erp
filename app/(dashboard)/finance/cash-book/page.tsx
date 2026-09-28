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
import { Receipt, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const cashBookSchema = z.object({
  entry_type: z.enum(['receipt', 'payment']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  entry_date: z.string().min(1, 'Required'),
  account: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type CashBookForm = z.infer<typeof cashBookSchema>;

export default function CashBookPage() {
  const { company, user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CashBookForm>({ resolver: zodResolver(cashBookSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('cash_book_entries').select('*').eq('company_id', company.id).order('entry_date', { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: CashBookForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('cash_book_entries').insert({
      company_id: company.id,
      entry_type: data.entry_type,
      amount: data.amount,
      entry_date: data.entry_date,
      account: data.account,
      description: data.description,
      reference: data.reference,
      notes: data.notes,
      status: 'pending',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create entry'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'cash_book', entity_type: 'cash_book', new_value: { amount: data.amount, type: data.entry_type } });
    }
    toast.success('Cash book entry created');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveEntry = async (entry: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('cash_book_entries').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', entry.id);
    if (error) { toast.error('Failed to approve entry'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'cash_book', entity_type: 'cash_book', entity_id: entry.id, new_value: { status: 'approved' } });
    }
    toast.success('Entry approved');
    load();
  };

  const deleteEntry = async () => {
    if (!company?.id || !entryToDelete) return;
    const { error } = await supabase.from('cash_book_entries').delete().eq('id', entryToDelete.id);
    if (error) { toast.error('Failed to delete entry'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'cash_book', entity_type: 'cash_book', entity_id: entryToDelete.id });
    }
    toast.success('Entry deleted');
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
    load();
  };

  const viewEntry = (entry: any) => {
    setSelectedEntry(entry);
    setViewDialogOpen(true);
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.reference?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || e.entry_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const columns: Column<any>[] = [
    { key: 'entry_date', header: 'Date', cell: (row) => formatDate(row.entry_date) },
    { key: 'entry_type', header: 'Type', cell: (row) => <span className={row.entry_type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'}>{row.entry_type}</span> },
    { key: 'account', header: 'Account' },
    { key: 'description', header: 'Description' },
    { key: 'reference', header: 'Reference', cell: (row) => row.reference || '-' },
    { key: 'amount', header: 'Amount', cell: (row) => <span className={`font-medium ${row.entry_type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row.amount)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalReceipts = entries.filter(e => e.entry_type === 'receipt').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalPayments = entries.filter(e => e.entry_type === 'payment').reduce((sum, e) => sum + (e.amount || 0), 0);
  const netBalance = totalReceipts - totalPayments;

  return (
    <PermissionGuard permission="finance.cash_book.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view cash book</div>}>
      <div className="space-y-6">
        <PageHeader title="Cash Book" description="Daily cash receipts and payments" breadcrumbs={[{ label: 'Finance' }, { label: 'Cash Book' }]}>
          <Can resource="cash_book" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="cash_book" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add Cash Book Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Type *</Label>
                      <Select onValueChange={(v) => register('entry_type').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent><SelectItem value="receipt">Receipt</SelectItem><SelectItem value="payment">Payment</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('amount')} /></div>
                    <div><Label>Date *</Label><Input className="mt-1" type="date" {...register('entry_date')} /></div>
                    <div><Label>Account *</Label><Input className="mt-1" {...register('account')} placeholder="e.g., Main Bank, Cash" /></div>
                    <div><Label>Reference</Label><Input className="mt-1" {...register('reference')} placeholder="e.g., REF-001" /></div>
                    <div><Label>Description *</Label><Input className="mt-1" {...register('description')} placeholder="Description" /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Add Entry</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Receipts" value={formatCurrency(totalReceipts)} icon={<Receipt className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Payments" value={formatCurrency(totalPayments)} icon={<Receipt className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
          <KPICard title="Net Balance" value={formatCurrency(netBalance)} icon={<Receipt className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Entries" value={entries.length} icon={<Receipt className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search entries..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="receipt">Receipt</SelectItem><SelectItem value="payment">Payment</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredEntries}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Cash Book Entry Details</DialogTitle></DialogHeader>
            {selectedEntry && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Date:</span> {formatDate(selectedEntry.entry_date)}</div>
                  <div><span className="text-gray-500">Type:</span> <span className={selectedEntry.entry_type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'}>{selectedEntry.entry_type}</span></div>
                  <div><span className="text-gray-500">Account:</span> {selectedEntry.account}</div>
                  <div><span className="text-gray-500">Amount:</span> {formatCurrency(selectedEntry.amount)}</div>
                  <div className="col-span-2"><span className="text-gray-500">Reference:</span> {selectedEntry.reference || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedEntry.description}</div>
                  <div className="col-span-2"><span className="text-gray-500">Status:</span> <StatusBadge status={selectedEntry.status} /></div>
                  {selectedEntry.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedEntry.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Entry"
          description="Are you sure you want to delete this cash book entry? This action cannot be undone."
          onConfirm={deleteEntry}
        />
      </div>
    </PermissionGuard>
  );
}
