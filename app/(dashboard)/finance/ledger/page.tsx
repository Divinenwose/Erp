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
import EmptyState from '@/components/common/EmptyState';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Database, TrendingUp, TrendingDown, FileText, Plus, Download, Search, MoreHorizontal, Edit, Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const journalEntrySchema = z.object({
  date: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  reference: z.string().optional(),
});
type JournalEntryForm = z.infer<typeof journalEntrySchema>;

const journalLineSchema = z.object({
  account_id: z.string().min(1, 'Required'),
  description: z.string().optional(),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
});
type JournalLineForm = z.infer<typeof journalLineSchema>;

export default function LedgerPage() {
  const { company, user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [entryLines, setEntryLines] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<JournalEntryForm>({ resolver: zodResolver(journalEntrySchema) });

  const load = async () => {
    if (!company?.id) return;
    const [entriesData, accountsData] = await Promise.all([
      supabase.from('journal_entries').select('*, journal_entry_lines(*, chart_of_accounts(account_number, name))').eq('company_id', company.id).order('date', { ascending: false }),
      supabase.from('chart_of_accounts').select('*').eq('company_id', company.id).eq('is_active', true).order('account_number'),
    ]);
    if (entriesData.error) toast.error(`Could not load journal entries: ${entriesData.error.message}`);
    if (accountsData.error) toast.error(`Could not load accounts: ${accountsData.error.message}`);
    setEntries(entriesData.data ?? []);
    setAccounts(accountsData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: JournalEntryForm) => {
    if (!company?.id) return;
    
    // Generate entry number
    const { data: maxEntry, error: maxError } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', company.id)
      .order('entry_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastNum = maxEntry?.entry_number ? parseInt(String(maxEntry.entry_number).replace('JE-', '')) : 0;
    const entryNumber = `JE-${String(lastNum + 1).padStart(4, '0')}`;
    
    const totalDebit = entryLines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = entryLines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error('Debits and credits must balance');
      return;
    }

    const { error: entryError } = await supabase.from('journal_entries').insert({
      company_id: company.id,
      entry_number: entryNumber,
      date: data.date,
      description: data.description,
      reference: data.reference,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'draft',
      created_by: user?.id,
    });

    if (entryError) { toast.error('Failed to create journal entry'); return; }

    // Get the created entry
    const { data: newEntry } = await supabase.from('journal_entries').select('id').eq('entry_number', entryNumber).single();
    
    if (newEntry) {
      const linesToInsert = entryLines.map(line => ({
        company_id: company.id,
        journal_entry_id: newEntry.id,
        account_id: line.account_id,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
      }));

      await supabase.from('journal_entry_lines').insert(linesToInsert);
    }

    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'journal_entries', entity_type: 'journal_entries', entity_id: newEntry?.id, new_value: { entry_number: entryNumber, entry_date: data.date } });
    }
    toast.success('Journal entry created');
    reset();
    setEntryLines([]);
    setDialogOpen(false);
    load();
  };

  const addLine = () => {
    setEntryLines([...entryLines, { account_id: '', description: '', debit: 0, credit: 0 }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...entryLines];
    updated[index] = { ...updated[index], [field]: value };
    setEntryLines(updated);
  };

  const removeLine = (index: number) => {
    setEntryLines(entryLines.filter((_, i) => i !== index));
  };

  const postEntry = async (entry: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('journal_entries').update({ status: 'posted', posted_at: new Date().toISOString() }).eq('id', entry.id);
    if (error) { toast.error('Failed to post entry'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'posted', module: 'journal_entries', entity_type: 'journal_entries', entity_id: entry.id, new_value: { status: 'posted' } });
    }
    toast.success('Journal entry posted');
    load();
  };

  const deleteEntry = async () => {
    if (!company?.id || !entryToDelete) return;
    const { error } = await supabase.from('journal_entries').delete().eq('id', entryToDelete.id);
    if (error) { toast.error('Failed to delete entry'); return; }
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'journal_entries', entity_type: 'journal_entries', entity_id: entryToDelete.id });
    }
    toast.success('Journal entry deleted');
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
    load();
  };

  const viewEntry = async (entry: any) => {
    setSelectedEntry(entry);
    const { data } = await supabase.from('journal_entry_lines').select('*, chart_of_accounts(account_number, name)').eq('journal_entry_id', entry.id);
    setEntryLines(data ?? []);
    setViewDialogOpen(true);
  };

  const columns: Column<any>[] = [
    { key: 'date', header: 'Date', cell: (row) => formatDate(row.date) },
    { key: 'entry_number', header: 'Reference', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.entry_number}</span> },
    { key: 'description', header: 'Description' },
    { key: 'total_debit', header: 'Debit', cell: (row) => <span className="text-emerald-600 font-medium">{formatCurrency(row.total_debit)}</span> },
    { key: 'total_credit', header: 'Credit', cell: (row) => <span className="text-rose-600 font-medium">{formatCurrency(row.total_credit)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalDebits = entries.reduce((sum, e) => sum + Number(e.total_debit || 0), 0);
  const totalCredits = entries.reduce((sum, e) => sum + Number(e.total_credit || 0), 0);

  return (
    <PermissionGuard permission="finance.ledger.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view general ledger</div>}>
      <div className="space-y-6">
        <PageHeader title="General Ledger" description="Double-entry bookkeeping and chart of accounts" breadcrumbs={[{ label: 'Finance' }, { label: 'General Ledger' }]}>
          <Can resource="ledger" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="ledger" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Entry</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Journal Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Date *</Label><Input className="mt-1" type="date" {...register('date')} /></div>
                    <div><Label>Reference</Label><Input className="mt-1" placeholder="JE-2024-0001" {...register('reference')} /></div>
                    <div className="col-span-2"><Label>Description *</Label><Input className="mt-1" {...register('description')} /></div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Entry Lines</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Add Line</Button>
                    </div>
                    <div className="space-y-2">
                      {entryLines.map((line, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start">
                          <div className="col-span-4">
                            <Select value={line.account_id} onValueChange={(v) => updateLine(index, 'account_id', v)}>
                              <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                              <SelectContent>
                                {accounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.account_number} - {acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3"><Input placeholder="Description" value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} /></div>
                          <div className="col-span-2"><Input type="number" step="0.01" placeholder="Debit" value={line.debit || ''} onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)} /></div>
                          <div className="col-span-2"><Input type="number" step="0.01" placeholder="Credit" value={line.credit || ''} onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)} /></div>
                          <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)}><Trash2 className="h-4 w-4 text-red-600" /></Button></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEntryLines([]); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || entryLines.length === 0}>Create Entry</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Accounts" value={accounts.length} icon={<Database className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Debits" value={formatCurrency(totalDebits)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Credits" value={formatCurrency(totalCredits)} icon={<TrendingDown className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
          <KPICard title="Journal Entries" value={entries.length} icon={<FileText className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search entries..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={entries.filter(e => !search || String(e.entry_number ?? '').toLowerCase().includes(search.toLowerCase()) || String(e.description ?? '').toLowerCase().includes(search.toLowerCase()))}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Journal Entry - {selectedEntry?.entry_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Date:</span> {formatDate(selectedEntry?.date)}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedEntry?.status} /></div>
                <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedEntry?.description}</div>
              </div>
              <div className="border dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-2">Account</th>
                      <th className="text-left px-4 py-2">Description</th>
                      <th className="text-right px-4 py-2">Debit</th>
                      <th className="text-right px-4 py-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {entryLines.map((line, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2">{line.chart_of_accounts?.account_number} - {line.chart_of_accounts?.name}</td>
                        <td className="px-4 py-2">{line.description}</td>
                        <td className="px-4 py-2 text-right text-emerald-600">{line.debit > 0 ? formatCurrency(line.debit) : ''}</td>
                        <td className="px-4 py-2 text-right text-rose-600">{line.credit > 0 ? formatCurrency(line.credit) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right text-emerald-600">{formatCurrency(selectedEntry?.total_debit)}</td>
                      <td className="px-4 py-2 text-right text-rose-600">{formatCurrency(selectedEntry?.total_credit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Journal Entry"
          description="Are you sure you want to delete this journal entry? This action cannot be undone."
          onConfirm={deleteEntry}
        />
      </div>
    </PermissionGuard>
  );
}
