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
import { RefreshCw, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const reconciliationSchema = z.object({
  bank_account_id: z.string().min(1, 'Required'),
  statement_date: z.string().min(1, 'Required'),
  statement_balance: z.coerce.number().min(0),
  book_balance: z.coerce.number().min(0),
  difference: z.coerce.number().default(0),
  notes: z.string().optional(),
});
type ReconciliationForm = z.infer<typeof reconciliationSchema>;

export default function BankReconciliationPage() {
  const { company, user } = useAuth();
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reconciliationToDelete, setReconciliationToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReconciliationForm>({ resolver: zodResolver(reconciliationSchema) });

  const load = async () => {
    if (!company?.id) return;
    const [reconciliationsData, bankAccountsData] = await Promise.all([
      supabase.from('bank_reconciliations').select('*, bank_accounts(account_name)').eq('company_id', company.id).order('statement_date', { ascending: false }),
      supabase.from('bank_accounts').select('*').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setReconciliations(reconciliationsData.data ?? []);
    setBankAccounts(bankAccountsData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: ReconciliationForm) => {
    if (!company?.id) return;
    const difference = data.book_balance - data.statement_balance;
    const { error } = await supabase.from('bank_reconciliations').insert({
      company_id: company.id,
      bank_account_id: data.bank_account_id,
      statement_date: data.statement_date,
      statement_balance: data.statement_balance,
      book_balance: data.book_balance,
      difference: difference,
      notes: data.notes,
      status: 'pending',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create reconciliation'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'created', module: 'bank_reconciliations', entity_type: 'bank_reconciliations', new_value: { statement_date: data.statement_date, difference } });
    toast.success('Reconciliation created');
    reset();
    setDialogOpen(false);
    load();
  };

  const completeReconciliation = async (reconciliation: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('bank_reconciliations').update({ status: 'completed', completed_by: user?.id, completed_at: new Date().toISOString() }).eq('id', reconciliation.id);
    if (error) { toast.error('Failed to complete reconciliation'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'completed', module: 'bank_reconciliations', entity_type: 'bank_reconciliations', entity_id: reconciliation.id, new_value: { status: 'completed' } });
    toast.success('Reconciliation completed');
    load();
  };

  const deleteReconciliation = async () => {
    if (!company?.id || !reconciliationToDelete) return;
    const { error } = await supabase.from('bank_reconciliations').delete().eq('id', reconciliationToDelete.id);
    if (error) { toast.error('Failed to delete reconciliation'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deleted', module: 'bank_reconciliations', entity_type: 'bank_reconciliations', entity_id: reconciliationToDelete.id });
    toast.success('Reconciliation deleted');
    setDeleteDialogOpen(false);
    setReconciliationToDelete(null);
    load();
  };

  const viewReconciliation = (reconciliation: any) => {
    setSelectedReconciliation(reconciliation);
    setViewDialogOpen(true);
  };

  const filteredReconciliations = reconciliations.filter(r => {
    const matchesSearch = !search || r.bank_accounts?.account_name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<any>[] = [
    { key: 'statement_date', header: 'Statement Date', cell: (row) => formatDate(row.statement_date) },
    { key: 'bank_accounts', header: 'Bank Account', cell: (row) => row.bank_accounts?.account_name || 'Unknown' },
    { key: 'statement_balance', header: 'Statement Balance', cell: (row) => formatCurrency(row.statement_balance) },
    { key: 'book_balance', header: 'Book Balance', cell: (row) => formatCurrency(row.book_balance) },
    { key: 'difference', header: 'Difference', cell: (row) => <span className={row.difference === 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(row.difference)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const pendingCount = reconciliations.filter(r => r.status === 'pending').length;
  const completedCount = reconciliations.filter(r => r.status === 'completed').length;

  return (
    <PermissionGuard permission="finance.bank_reconciliation.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view bank reconciliation</div>}>
      <div className="space-y-6">
        <PageHeader title="Bank Reconciliation" description="Reconcile bank statements with book records" breadcrumbs={[{ label: 'Finance' }, { label: 'Bank Reconciliation' }]}>
          <Can resource="bank_reconciliation" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="bank_reconciliation" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Reconciliation</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Bank Reconciliation</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Bank Account *</Label>
                      <Select onValueChange={(v) => register('bank_account_id').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.account_name} - {b.bank_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Statement Date *</Label><Input className="mt-1" type="date" {...register('statement_date')} /></div>
                    <div><Label>Statement Balance *</Label><Input className="mt-1" type="number" step="0.01" {...register('statement_balance')} /></div>
                    <div><Label>Book Balance *</Label><Input className="mt-1" type="number" step="0.01" {...register('book_balance')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Reconciliation</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Reconciliations" value={reconciliations.length} icon={<RefreshCw className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending" value={pendingCount} icon={<RefreshCw className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Completed" value={completedCount} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search reconciliations..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredReconciliations}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewReconciliation(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'pending' && (
                      <Can resource="bank_reconciliation" action="complete">
                        <DropdownMenuItem onClick={() => completeReconciliation(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Complete</DropdownMenuItem>
                      </Can>
                    )}
                    <Can resource="bank_reconciliation" action="delete">
                      <DropdownMenuItem onClick={() => { setReconciliationToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
            <DialogHeader><DialogTitle>Reconciliation Details</DialogTitle></DialogHeader>
            {selectedReconciliation && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Bank Account:</span> {selectedReconciliation.bank_accounts?.account_name}</div>
                  <div><span className="text-gray-500">Statement Date:</span> {formatDate(selectedReconciliation.statement_date)}</div>
                  <div><span className="text-gray-500">Statement Balance:</span> {formatCurrency(selectedReconciliation.statement_balance)}</div>
                  <div><span className="text-gray-500">Book Balance:</span> {formatCurrency(selectedReconciliation.book_balance)}</div>
                  <div><span className="text-gray-500">Difference:</span> <span className={selectedReconciliation.difference === 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(selectedReconciliation.difference)}</span></div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedReconciliation.status} /></div>
                  {selectedReconciliation.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedReconciliation.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Reconciliation"
          description="Are you sure you want to delete this reconciliation? This action cannot be undone."
          onConfirm={deleteReconciliation}
        />
      </div>
    </PermissionGuard>
  );
}
