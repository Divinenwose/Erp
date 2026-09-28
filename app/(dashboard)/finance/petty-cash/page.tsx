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
import { Wallet, Plus, Download, Search, MoreHorizontal, Eye, Trash2, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const pettyCashSchema = z.object({
  fund_name: z.string().min(1, 'Required'),
  custodian: z.string().min(1, 'Required'),
  initial_amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  current_balance: z.coerce.number().min(0).default(0),
  location: z.string().optional(),
  notes: z.string().optional(),
});
type PettyCashForm = z.infer<typeof pettyCashSchema>;

export default function PettyCashPage() {
  const { company, user } = useAuth();
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [replenishDialogOpen, setReplenishDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fundToDelete, setFundToDelete] = useState<any>(null);
  const [replenishAmount, setReplenishAmount] = useState(0);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PettyCashForm>({ resolver: zodResolver(pettyCashSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('petty_cash_funds').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    setFunds(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: PettyCashForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('petty_cash_funds').insert({
      company_id: company.id,
      fund_name: data.fund_name,
      custodian: data.custodian,
      initial_amount: data.initial_amount,
      current_balance: data.initial_amount,
      location: data.location,
      notes: data.notes,
      status: 'active',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create fund'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'created', module: 'petty_cash', entity_type: 'petty_cash_funds', new_value: { fund_name: data.fund_name, amount: data.initial_amount } });
    toast.success('Petty cash fund created');
    reset();
    setDialogOpen(false);
    load();
  };

  const replenishFund = async () => {
    if (!company?.id || !selectedFund) return;
    const newBalance = selectedFund.current_balance + replenishAmount;
    const { error } = await supabase.from('petty_cash_funds').update({ current_balance: newBalance }).eq('id', selectedFund.id);
    if (error) { toast.error('Failed to replenish fund'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'replenished', module: 'petty_cash', entity_type: 'petty_cash_funds', entity_id: selectedFund.id, new_value: { amount: replenishAmount, new_balance } });
    toast.success('Fund replenished');
    setReplenishDialogOpen(false);
    setReplenishAmount(0);
    setSelectedFund(null);
    load();
  };

  const deleteFund = async () => {
    if (!company?.id || !fundToDelete) return;
    const { error } = await supabase.from('petty_cash_funds').delete().eq('id', fundToDelete.id);
    if (error) { toast.error('Failed to delete fund'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deleted', module: 'petty_cash', entity_type: 'petty_cash_funds', entity_id: fundToDelete.id });
    toast.success('Fund deleted');
    setDeleteDialogOpen(false);
    setFundToDelete(null);
    load();
  };

  const viewFund = (fund: any) => {
    setSelectedFund(fund);
    setViewDialogOpen(true);
  };

  const openReplenishDialog = (fund: any) => {
    setSelectedFund(fund);
    setReplenishDialogOpen(true);
  };

  const filteredFunds = funds.filter(f => {
    const matchesSearch = !search || f.fund_name?.toLowerCase().includes(search.toLowerCase()) || f.custodian?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<any>[] = [
    { key: 'fund_name', header: 'Fund Name' },
    { key: 'custodian', header: 'Custodian' },
    { key: 'location', header: 'Location', cell: (row) => row.location || '-' },
    { key: 'initial_amount', header: 'Initial', cell: (row) => formatCurrency(row.initial_amount) },
    { key: 'current_balance', header: 'Current Balance', cell: (row) => <span className="font-medium">{formatCurrency(row.current_balance)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalBalance = funds.reduce((sum, f) => sum + (f.current_balance || 0), 0);
  const totalInitial = funds.reduce((sum, f) => sum + (f.initial_amount || 0), 0);
  const activeFunds = funds.filter(f => f.status === 'active').length;

  return (
    <PermissionGuard permission="finance.petty_cash.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view petty cash</div>}>
      <div className="space-y-6">
        <PageHeader title="Petty Cash" description="Manage petty cash funds and transactions" breadcrumbs={[{ label: 'Finance' }, { label: 'Petty Cash' }]}>
          <Can resource="petty_cash" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="petty_cash" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Create Fund</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Create Petty Cash Fund</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>Fund Name *</Label><Input className="mt-1" {...register('fund_name')} placeholder="e.g., Office Petty Cash" /></div>
                    <div><Label>Custodian *</Label><Input className="mt-1" {...register('custodian')} placeholder="Name of custodian" /></div>
                    <div><Label>Location</Label><Input className="mt-1" {...register('location')} placeholder="e.g., Front Desk" /></div>
                    <div><Label>Initial Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('initial_amount')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Fund</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Balance" value={formatCurrency(totalBalance)} icon={<Wallet className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Initial" value={formatCurrency(totalInitial)} icon={<Wallet className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Active Funds" value={activeFunds} icon={<Wallet className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Total Funds" value={funds.length} icon={<Wallet className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search funds..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredFunds}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Petty Cash Fund Details</DialogTitle></DialogHeader>
            {selectedFund && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Fund Name:</span> {selectedFund.fund_name}</div>
                  <div><span className="text-gray-500">Custodian:</span> {selectedFund.custodian}</div>
                  <div><span className="text-gray-500">Location:</span> {selectedFund.location || '-'}</div>
                  <div><span className="text-gray-500">Initial Amount:</span> {formatCurrency(selectedFund.initial_amount)}</div>
                  <div><span className="text-gray-500">Current Balance:</span> {formatCurrency(selectedFund.current_balance)}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedFund.status} /></div>
                  {selectedFund.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedFund.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Replenish Dialog */}
        <Dialog open={replenishDialogOpen} onOpenChange={setReplenishDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Replenish Fund</DialogTitle></DialogHeader>
            {selectedFund && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p><span className="text-gray-500">Fund:</span> {selectedFund.fund_name}</p>
                  <p><span className="text-gray-500">Current Balance:</span> {formatCurrency(selectedFund.current_balance)}</p>
                </div>
                <div>
                  <Label>Replenishment Amount</Label>
                  <Input type="number" step="0.01" value={replenishAmount} onChange={(e) => setReplenishAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setReplenishDialogOpen(false); setReplenishAmount(0); setSelectedFund(null); }}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={replenishFund}>Replenish</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Fund"
          description="Are you sure you want to delete this petty cash fund? This action cannot be undone."
          onConfirm={deleteFund}
        />
      </div>
    </PermissionGuard>
  );
}
