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
import { Wallet, Plus, Download, Search, MoreHorizontal, Eye, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const cashFlowSchema = z.object({
  flow_type: z.enum(['inflow', 'outflow']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  entry_date: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  description: z.string().optional(),
  reference: z.string().optional(),
});
type CashFlowForm = z.infer<typeof cashFlowSchema>;

export default function CashFlowPage() {
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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CashFlowForm>({ resolver: zodResolver(cashFlowSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('cash_flow_entries').select('*').eq('company_id', company.id).order('entry_date', { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: CashFlowForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('cash_flow_entries').insert({
      company_id: company.id,
      flow_type: data.flow_type,
      amount: data.amount,
      entry_date: data.entry_date,
      category: data.category,
      description: data.description,
      reference: data.reference,
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create entry'); return; }
    await logAuditEvent('cash_flow_entries', null, 'created', null, { flow_type: data.flow_type, amount: data.amount }, company.id, user?.id);
    toast.success('Cash flow entry created');
    reset();
    setDialogOpen(false);
    load();
  };

  const deleteEntry = async () => {
    if (!company?.id || !entryToDelete) return;
    const { error } = await supabase.from('cash_flow_entries').delete().eq('id', entryToDelete.id);
    if (error) { toast.error('Failed to delete entry'); return; }
    await logAuditEvent('cash_flow_entries', entryToDelete.id, 'deleted', null, null, company.id, user?.id);
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
    const matchesType = typeFilter === 'all' || e.flow_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const columns: Column<any>[] = [
    { key: 'entry_date', header: 'Date', cell: (row) => formatDate(row.entry_date) },
    { key: 'flow_type', header: 'Type', cell: (row) => <span className={row.flow_type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}>{row.flow_type}</span> },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    { key: 'reference', header: 'Reference', cell: (row) => row.reference || '-' },
    { key: 'amount', header: 'Amount', cell: (row) => <span className={`font-medium ${row.flow_type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(row.amount)}</span> },
  ];

  const totalInflow = entries.filter(e => e.flow_type === 'inflow').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalOutflow = entries.filter(e => e.flow_type === 'outflow').reduce((sum, e) => sum + (e.amount || 0), 0);
  const netCashFlow = totalInflow - totalOutflow;

  return (
    <PermissionGuard permission="finance.cash_flow.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view cash flow</div>}>
      <div className="space-y-6">
        <PageHeader title="Cash Flow" description="Track cash inflows and outflows" breadcrumbs={[{ label: 'Finance' }, { label: 'Cash Flow' }]}>
          <Can resource="cash_flow" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="cash_flow" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Entry</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add Cash Flow Entry</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Type *</Label>
                      <Select onValueChange={(v) => register('flow_type').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent><SelectItem value="inflow">Inflow</SelectItem><SelectItem value="outflow">Outflow</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('amount')} /></div>
                    <div><Label>Date *</Label><Input className="mt-1" type="date" {...register('entry_date')} /></div>
                    <div><Label>Category *</Label><Input className="mt-1" {...register('category')} placeholder="e.g., Sales, Expenses" /></div>
                    <div><Label>Reference</Label><Input className="mt-1" {...register('reference')} placeholder="e.g., INV-001" /></div>
                    <div><Label>Description</Label><Input className="mt-1" {...register('description')} /></div>
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
          <KPICard title="Total Inflow" value={formatCurrency(totalInflow)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Outflow" value={formatCurrency(totalOutflow)} icon={<TrendingDown className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
          <KPICard title="Net Cash Flow" value={formatCurrency(netCashFlow)} icon={<Wallet className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Entries" value={entries.length} icon={<Wallet className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
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
                <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="inflow">Inflow</SelectItem><SelectItem value="outflow">Outflow</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredEntries}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewEntry(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    <Can resource="cash_flow" action="delete">
                      <DropdownMenuItem onClick={() => { setEntryToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </Can>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Cash Flow Entry Details</DialogTitle></DialogHeader>
            {selectedEntry && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Date:</span> {formatDate(selectedEntry.entry_date)}</div>
                  <div><span className="text-gray-500">Type:</span> <span className={selectedEntry.flow_type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}>{selectedEntry.flow_type}</span></div>
                  <div><span className="text-gray-500">Category:</span> {selectedEntry.category}</div>
                  <div><span className="text-gray-500">Amount:</span> {formatCurrency(selectedEntry.amount)}</div>
                  <div className="col-span-2"><span className="text-gray-500">Reference:</span> {selectedEntry.reference || '-'}</div>
                  <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedEntry.description || '-'}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Entry"
          description="Are you sure you want to delete this cash flow entry? This action cannot be undone."
          onConfirm={deleteEntry}
        />
      </div>
    </PermissionGuard>
  );
}
