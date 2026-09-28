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
import { Building2, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const bankAccountSchema = z.object({
  account_name: z.string().min(1, 'Required'),
  account_number: z.string().min(1, 'Required'),
  bank_name: z.string().min(1, 'Required'),
  account_type: z.string().min(1, 'Required'),
  currency: z.string().default('USD'),
  opening_balance: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});
type BankAccountForm = z.infer<typeof bankAccountSchema>;

export default function BankAccountsPage() {
  const { company, user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BankAccountForm>({ resolver: zodResolver(bankAccountSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('bank_accounts').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    setAccounts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: BankAccountForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('bank_accounts').insert({
      company_id: company.id,
      account_name: data.account_name,
      account_number: data.account_number,
      bank_name: data.bank_name,
      account_type: data.account_type,
      currency: data.currency,
      opening_balance: data.opening_balance,
      current_balance: data.opening_balance,
      notes: data.notes,
      status: 'active',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create account'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'created', module: 'bank_accounts', entity_type: 'bank_accounts', new_value: { account_name: data.account_name, bank_name: data.bank_name } });
    toast.success('Bank account created');
    reset();
    setDialogOpen(false);
    load();
  };

  const activateAccount = async (account: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('bank_accounts').update({ status: 'active' }).eq('id', account.id);
    if (error) { toast.error('Failed to activate account'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'activated', module: 'bank_accounts', entity_type: 'bank_accounts', entity_id: account.id, new_value: { status: 'active' } });
    toast.success('Account activated');
    load();
  };

  const deactivateAccount = async (account: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('bank_accounts').update({ status: 'inactive' }).eq('id', account.id);
    if (error) { toast.error('Failed to deactivate account'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deactivated', module: 'bank_accounts', entity_type: 'bank_accounts', entity_id: account.id, new_value: { status: 'inactive' } });
    toast.success('Account deactivated');
    load();
  };

  const deleteAccount = async () => {
    if (!company?.id || !accountToDelete) return;
    const { error } = await supabase.from('bank_accounts').delete().eq('id', accountToDelete.id);
    if (error) { toast.error('Failed to delete account'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deleted', module: 'bank_accounts', entity_type: 'bank_accounts', entity_id: accountToDelete.id });
    toast.success('Account deleted');
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
    load();
  };

  const viewAccount = (account: any) => {
    setSelectedAccount(account);
    setViewDialogOpen(true);
  };

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = !search || a.account_name?.toLowerCase().includes(search.toLowerCase()) || a.bank_name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<any>[] = [
    { key: 'account_name', header: 'Account Name' },
    { key: 'bank_name', header: 'Bank' },
    { key: 'account_number', header: 'Account Number', cell: (row) => <span className="font-mono text-xs">{row.account_number}</span> },
    { key: 'account_type', header: 'Type' },
    { key: 'currency', header: 'Currency' },
    { key: 'current_balance', header: 'Balance', cell: (row) => <span className="font-medium">{formatCurrency(row.current_balance)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const activeAccounts = accounts.filter(a => a.status === 'active').length;

  return (
    <PermissionGuard permission="finance.bank_accounts.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view bank accounts</div>}>
      <div className="space-y-6">
        <PageHeader title="Bank Accounts" description="Manage bank accounts and balances" breadcrumbs={[{ label: 'Finance' }, { label: 'Bank Accounts' }]}>
          <Can resource="bank_accounts" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="bank_accounts" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Account</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>Account Name *</Label><Input className="mt-1" {...register('account_name')} placeholder="e.g., Main Operating Account" /></div>
                    <div><Label>Bank Name *</Label><Input className="mt-1" {...register('bank_name')} placeholder="e.g., Chase Bank" /></div>
                    <div><Label>Account Number *</Label><Input className="mt-1" {...register('account_number')} placeholder="e.g., ****1234" /></div>
                    <div><Label>Account Type *</Label>
                      <Select onValueChange={(v) => register('account_type').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent><SelectItem value="checking">Checking</SelectItem><SelectItem value="savings">Savings</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Currency *</Label>
                      <Select onValueChange={(v) => register('currency').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
                        <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Opening Balance</Label><Input className="mt-1" type="number" step="0.01" {...register('opening_balance')} defaultValue={0} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Add Account</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Balance" value={formatCurrency(totalBalance)} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Active Accounts" value={activeAccounts} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Accounts" value={accounts.length} icon={<Building2 className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search accounts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredAccounts}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewAccount(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'inactive' && (
                      <Can resource="bank_accounts" action="activate">
                        <DropdownMenuItem onClick={() => activateAccount(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Activate</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status === 'active' && (
                      <Can resource="bank_accounts" action="deactivate">
                        <DropdownMenuItem onClick={() => deactivateAccount(row)}><XCircle className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
                      </Can>
                    )}
                    <Can resource="bank_accounts" action="delete">
                      <DropdownMenuItem onClick={() => { setAccountToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
            <DialogHeader><DialogTitle>Bank Account Details</DialogTitle></DialogHeader>
            {selectedAccount && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Account Name:</span> {selectedAccount.account_name}</div>
                  <div><span className="text-gray-500">Bank:</span> {selectedAccount.bank_name}</div>
                  <div><span className="text-gray-500">Account Number:</span> {selectedAccount.account_number}</div>
                  <div><span className="text-gray-500">Type:</span> {selectedAccount.account_type}</div>
                  <div><span className="text-gray-500">Currency:</span> {selectedAccount.currency}</div>
                  <div><span className="text-gray-500">Opening Balance:</span> {formatCurrency(selectedAccount.opening_balance)}</div>
                  <div><span className="text-gray-500">Current Balance:</span> {formatCurrency(selectedAccount.current_balance)}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedAccount.status} /></div>
                  {selectedAccount.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedAccount.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Account"
          description="Are you sure you want to delete this bank account? This action cannot be undone."
          onConfirm={deleteAccount}
        />
      </div>
    </PermissionGuard>
  );
}
