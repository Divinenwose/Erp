'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scale, Download, Search, Calendar } from 'lucide-react';

export default function TrialBalancePage() {
  const { company } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('chart_of_accounts').select('*').eq('company_id', company.id).order('account_code', { ascending: true });
    setAccounts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = !search || a.account_name?.toLowerCase().includes(search.toLowerCase()) || a.account_code?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<any>[] = [
    { key: 'account_code', header: 'Account Code', cell: (row) => <span className="font-mono text-xs">{row.account_code}</span> },
    { key: 'account_name', header: 'Account Name' },
    { key: 'account_type', header: 'Type' },
    { key: 'debit_balance', header: 'Debit', cell: (row) => {
      const debit = row.account_type === 'asset' || row.account_type === 'expense' ? (row.current_balance || 0) : 0;
      return <span className="font-medium">{formatCurrency(debit)}</span>;
    }},
    { key: 'credit_balance', header: 'Credit', cell: (row) => {
      const credit = row.account_type === 'liability' || row.account_type === 'equity' || row.account_type === 'revenue' ? (row.current_balance || 0) : 0;
      return <span className="font-medium">{formatCurrency(credit)}</span>;
    }},
  ];

  const totalDebit = accounts.reduce((sum, a) => {
    if (a.account_type === 'asset' || a.account_type === 'expense') return sum + (a.current_balance || 0);
    return sum;
  }, 0);

  const totalCredit = accounts.reduce((sum, a) => {
    if (a.account_type === 'liability' || a.account_type === 'equity' || a.account_type === 'revenue') return sum + (a.current_balance || 0);
    return sum;
  }, 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <PermissionGuard permission="finance.trial_balance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view trial balance</div>}>
      <div className="space-y-6">
        <PageHeader title="Trial Balance" description="View trial balance for financial verification" breadcrumbs={[{ label: 'Finance' }, { label: 'Trial Balance' }]}>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" />As of Date</Button>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Debits" value={formatCurrency(totalDebit)} icon={<Scale className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Credits" value={formatCurrency(totalCredit)} icon={<Scale className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Difference" value={formatCurrency(Math.abs(totalDebit - totalCredit))} icon={<Scale className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Status" value={isBalanced ? 'Balanced' : 'Unbalanced'} icon={<Scale className={`h-4 w-4 ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`} />} iconBg={isBalanced ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-rose-50 dark:bg-rose-950/50'} loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search accounts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="current">Current Period</SelectItem><SelectItem value="last_month">Last Month</SelectItem><SelectItem value="last_quarter">Last Quarter</SelectItem><SelectItem value="ytd">Year to Date</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredAccounts}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
