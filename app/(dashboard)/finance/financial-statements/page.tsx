'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { exportExcel } from '@/lib/excel-export';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, PieChart, Scale, TrendingUp } from 'lucide-react';

type Invoice = {
  invoice_number: string;
  invoice_type: string | null;
  issue_date: string;
  status: string;
  total_amount: number | null;
  balance_due: number | null;
};

type Expense = {
  title: string;
  category: string | null;
  expense_date: string;
  status: string;
  amount: number;
};

type Account = {
  account_number: string;
  name: string;
  account_type: string;
  balance: number | null;
};

function getPeriodRange(period: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (period === 'last_month') {
    start.setMonth(start.getMonth() - 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  } else if (period === 'last_quarter') {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    start.setMonth(quarterStart - 3, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
  } else if (period === 'ytd') {
    start.setMonth(0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function FinancialStatementsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [selectedStatement, setSelectedStatement] = useState('income_statement');

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const [invoiceResult, expenseResult, accountResult] = await Promise.all([
      supabase.from('invoices').select('invoice_number, invoice_type, issue_date, status, total_amount, balance_due').eq('company_id', company.id),
      supabase.from('expenses').select('title, category, expense_date, status, amount').eq('company_id', company.id),
      supabase.from('chart_of_accounts').select('account_number, name, account_type, balance').eq('company_id', company.id),
    ]);
    if (invoiceResult.error || expenseResult.error || accountResult.error) {
      toast.error('Could not load financial statement data');
      setLoading(false);
      return;
    }
    setInvoices(invoiceResult.data ?? []);
    setExpenses(expenseResult.data ?? []);
    setAccounts(accountResult.data ?? []);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { void load(); }, [load]);

  const range = useMemo(() => getPeriodRange(selectedPeriod), [selectedPeriod]);
  const periodInvoices = invoices.filter(invoice => invoice.issue_date >= range.start && invoice.issue_date <= range.end);
  const periodExpenses = expenses.filter(expense => expense.expense_date >= range.start && expense.expense_date <= range.end);
  const revenue = periodInvoices
    .filter(invoice => invoice.invoice_type === 'sales' && invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0);
  const expenseTotal = periodExpenses
    .filter(expense => expense.status === 'approved')
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const netIncome = revenue - expenseTotal;
  const totalAssets = accounts
    .filter(account => account.account_type === 'asset')
    .reduce((sum, account) => sum + Number(account.balance ?? 0), 0);
  const netCashFlow = revenue - expenseTotal;

  const accountTotals = ['asset', 'liability', 'equity'].map(type => ({
    type,
    balance: accounts
      .filter(account => account.account_type === type)
      .reduce((sum, account) => sum + Number(account.balance ?? 0), 0),
  }));

  const statementRows = useMemo(() => {
    if (selectedStatement === 'balance_sheet') return accounts;
    return [
      ...periodInvoices.map(invoice => ({
        record_type: 'Invoice',
        reference: invoice.invoice_number,
        date: invoice.issue_date,
        status: invoice.status,
        amount: invoice.total_amount ?? 0,
        balance_due: invoice.balance_due ?? 0,
      })),
      ...periodExpenses.map(expense => ({
        record_type: 'Expense',
        reference: expense.title,
        category: expense.category,
        date: expense.expense_date,
        status: expense.status,
        amount: -Number(expense.amount ?? 0),
      })),
    ];
  }, [accounts, periodExpenses, periodInvoices, selectedStatement]);

  const exportStatement = () => {
    const summary = selectedStatement === 'balance_sheet'
      ? accountTotals
      : [
        { type: 'Paid revenue', amount: revenue },
        { type: 'Approved expenses', amount: expenseTotal },
        { type: 'Net income / cash flow', amount: netIncome },
      ];
    exportExcel(`financial-${selectedStatement}-${selectedPeriod}`, [
      { name: 'Summary', rows: summary },
      { name: selectedStatement === 'balance_sheet' ? 'Accounts' : 'Transactions', rows: statementRows },
    ]);
  };

  const selectedTitle = selectedStatement === 'balance_sheet'
    ? 'Balance Sheet'
    : selectedStatement === 'cash_flow'
      ? 'Cash Flow Statement'
      : 'Income Statement';

  return (
    <PermissionGuard permission="finance.financial_statements.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view financial statements</div>}>
      <div className="space-y-6">
        <PageHeader title="Financial Statements" description="Statements calculated from the company ledger, invoices, and approved expenses" breadcrumbs={[{ label: 'Finance' }, { label: 'Financial Statements' }]}>
          <Button variant="outline" size="sm" onClick={exportStatement} disabled={loading}>
            <Download className="h-4 w-4 mr-2" />Export Excel
          </Button>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Paid Revenue" value={formatCurrency(revenue)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Net Income" value={formatCurrency(netIncome)} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Assets" value={formatCurrency(totalAssets)} icon={<Scale className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Net Cash Flow" value={formatCurrency(netCashFlow)} icon={<PieChart className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold">{selectedTitle}</CardTitle>
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="last_quarter">Last Quarter</SelectItem>
                    <SelectItem value="ytd">Year to Date</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatement} onValueChange={setSelectedStatement}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income_statement">Income Statement</SelectItem>
                    <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                    <SelectItem value="cash_flow">Cash Flow Statement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedStatement === 'balance_sheet' ? (
              <div className="space-y-2">
                {accountTotals.map(item => (
                  <div key={item.type} className="flex justify-between border-b py-2 capitalize dark:border-gray-800">
                    <span>{item.type}</span><span className="font-medium">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between border-b py-2 dark:border-gray-800"><span>Paid Revenue</span><span className="font-medium">{formatCurrency(revenue)}</span></div>
                <div className="flex justify-between border-b py-2 dark:border-gray-800"><span>Approved Expenses</span><span className="font-medium">{formatCurrency(expenseTotal)}</span></div>
                <div className="flex justify-between py-2 font-semibold"><span>{selectedStatement === 'cash_flow' ? 'Net Cash Flow' : 'Net Income'}</span><span>{formatCurrency(netIncome)}</span></div>
                {!statementRows.length && <p className="pt-4 text-sm text-gray-500">No financial activity in this period.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
