'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, TrendingUp, TrendingDown, CreditCard, PieChart, Database, BarChart3, Wallet, Building2, Receipt, Calculator, FileCheck, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FinanceOverviewPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    outstandingAR: 0,
    outstandingAP: 0,
    cashBalance: 0,
    pendingApprovals: 0,
    overdueInvoices: 0,
  });
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);

  const canView = isAdmin || hasPermission('finance.view');
  const canInvoices = isAdmin || hasPermission('finance.invoices.view');
  const canExpenses = isAdmin || hasPermission('finance.expenses.view');
  const canReceivables = isAdmin || hasPermission('finance.receivables.view');
  const canPayables = isAdmin || hasPermission('finance.payables.view');
  const canBudgets = isAdmin || hasPermission('finance.budgets.view');
  const canLedger = isAdmin || hasPermission('finance.ledger.view');
  const canReports = isAdmin || hasPermission('finance.reports.view');
  const canCashFlow = isAdmin || hasPermission('finance.cash_flow.view');
  const canPettyCash = isAdmin || hasPermission('finance.petty_cash.view');
  const canTax = isAdmin || hasPermission('finance.tax.view');
  const canAudit = isAdmin || hasPermission('finance.audit.view');

  const modules = [
    { title: 'General Ledger', description: 'Chart of accounts & journals', icon: Database, href: '/finance/ledger', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'finance.ledger.view' },
    { title: 'Invoices', description: 'Billing and collections', icon: FileText, href: '/finance/invoices', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'finance.invoices.view' },
    { title: 'Expenses', description: 'Expense management', icon: CreditCard, href: '/finance/expenses', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'finance.expenses.view' },
    { title: 'Budgets', description: 'Budget planning & tracking', icon: PieChart, href: '/finance/budgets', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'finance.budgets.view' },
    { title: 'Accounts Receivable', description: 'Customer payments', icon: TrendingUp, href: '/finance/receivables', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600', permission: 'finance.receivables.view' },
    { title: 'Accounts Payable', description: 'Vendor payments', icon: TrendingDown, href: '/finance/payables', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600', permission: 'finance.payables.view' },
    { title: 'Cash Flow', description: 'Cash flow management', icon: Wallet, href: '/finance/cash-flow', color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600', permission: 'finance.cash_flow.view' },
    { title: 'Cash Book', description: 'Daily cash book', icon: Receipt, href: '/finance/cash-book', color: 'bg-lime-50 dark:bg-lime-950/30', iconColor: 'text-lime-600', permission: 'finance.cash_book.view' },
    { title: 'Petty Cash', description: 'Petty cash funds', icon: Wallet, href: '/finance/petty-cash', color: 'bg-yellow-50 dark:bg-yellow-950/30', iconColor: 'text-yellow-600', permission: 'finance.petty_cash.view' },
    { title: 'Payment Vouchers', description: 'Payment vouchers', icon: FileCheck, href: '/finance/payment-vouchers', color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600', permission: 'finance.payment_vouchers.view' },
    { title: 'Reimbursements', description: 'Employee reimbursements', icon: CreditCard, href: '/finance/reimbursements', color: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600', permission: 'finance.reimbursements.view' },
    { title: 'Bank Accounts', description: 'Bank account management', icon: Building2, href: '/finance/bank-accounts', color: 'bg-sky-50 dark:bg-sky-950/30', iconColor: 'text-sky-600', permission: 'finance.bank_accounts.view' },
    { title: 'Bank Reconciliation', description: 'Bank reconciliation', icon: Calculator, href: '/finance/bank-reconciliation', color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600', permission: 'finance.bank_reconciliation.view' },
    { title: 'Tax Compliance', description: 'Tax filings & payments', icon: AlertCircle, href: '/finance/tax', color: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-600', permission: 'finance.tax.view' },
    { title: 'Financial Periods', description: 'Period management', icon: Calendar, href: '/finance/periods', color: 'bg-purple-50 dark:bg-purple-950/30', iconColor: 'text-purple-600', permission: 'finance.periods.view' },
    { title: 'Trial Balance', description: 'Trial balance reports', icon: Calculator, href: '/finance/trial-balance', color: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', iconColor: 'text-fuchsia-600', permission: 'finance.trial_balance.view' },
    { title: 'Financial Statements', description: 'Financial statements', icon: BarChart3, href: '/finance/statements', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'finance.statements.view' },
    { title: 'Audit Logs', description: 'Finance audit trail', icon: FileCheck, href: '/finance/audit', color: 'bg-gray-50 dark:bg-gray-950/30', iconColor: 'text-gray-600', permission: 'finance.audit.view' },
    { title: 'Approval Workflows', description: 'Approval workflows', icon: FileCheck, href: '/finance/approvals', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'finance.approvals.view' },
    { title: 'Reports', description: 'Financial reports', icon: BarChart3, href: '/finance/reports', color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600', permission: 'finance.reports.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  useEffect(() => {
    if (!company?.id || !canView) return;
    loadKPIs();
  }, [company?.id, canView]);

  const loadKPIs = async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      const [invoicesRes, expensesRes, cashFlowRes, bankAccountsRes] = await Promise.all([
        supabase.from('invoices').select('total_amount, status, balance_due').eq('company_id', company.id),
        supabase.from('expenses').select('amount, status').eq('company_id', company.id),
        supabase.from('cash_flow_entries').select('amount, flow_type, entry_date').eq('company_id', company.id).order('entry_date', { ascending: false }).limit(6),
        supabase.from('bank_accounts').select('current_balance').eq('company_id', company.id).eq('status', 'active'),
      ]);

      const invoices = invoicesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const cashFlowEntries = cashFlowRes.data ?? [];
      const bankAccounts = bankAccountsRes.data ?? [];

      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
      const outstandingAR = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + (i.balance_due || 0), 0);
      const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

      const approvedExpenses = expenses.filter(e => e.status === 'approved');
      const totalExpenses = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const pendingApprovals = expenses.filter(e => e.status === 'pending').length;

      const cashBalance = bankAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

      const cashFlowByMonth = cashFlowEntries.reduce((acc: any, entry) => {
        const month = new Date(entry.entry_date).toLocaleString('default', { month: 'short' });
        if (!acc[month]) acc[month] = { month, inflow: 0, outflow: 0 };
        if (entry.flow_type === 'inflow') acc[month].inflow += entry.amount || 0;
        else acc[month].outflow += entry.amount || 0;
        return acc;
      }, {});

      const cashFlowData = Object.values(cashFlowByMonth).slice(-6);

      setKpis({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        outstandingAR,
        outstandingAP: 0, // Will be calculated from payables table
        cashBalance,
        pendingApprovals,
        overdueInvoices,
      });
      setCashFlowData(cashFlowData);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to view Finance module</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Finance & Accounting" description="Complete financial management for your organization" breadcrumbs={[{ label: 'Finance' }]}>
        {canInvoices && <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/finance/invoices">Create Invoice</Link></Button>}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canInvoices && <KPICard title="Total Revenue" value={formatCurrency(kpis.totalRevenue)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
        {canExpenses && <KPICard title="Total Expenses" value={formatCurrency(kpis.totalExpenses)} icon={<TrendingDown className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />}
        {canInvoices && canExpenses && <KPICard title="Net Profit" value={formatCurrency(kpis.netProfit)} icon={<TrendingUp className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />}
        {canReceivables && <KPICard title="Outstanding AR" value={formatCurrency(kpis.outstandingAR)} icon={<CreditCard className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />}
        {canPayables && <KPICard title="Outstanding AP" value={formatCurrency(kpis.outstandingAP)} icon={<TrendingDown className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />}
        {canCashFlow && <KPICard title="Cash Balance" value={formatCurrency(kpis.cashBalance)} icon={<Wallet className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50 dark:bg-cyan-950/50" loading={loading} />}
        {canExpenses && <KPICard title="Pending Approvals" value={kpis.pendingApprovals} icon={<AlertCircle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />}
        {canInvoices && <KPICard title="Overdue Invoices" value={kpis.overdueInvoices} icon={<FileText className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
          </Link>
        ))}
      </div>

      {(canInvoices || canExpenses) && cashFlowData.length > 0 && <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><CardTitle className="text-sm font-semibold">Cash Flow (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="inflow" stroke="#10B981" strokeWidth={2} dot={false} name="Cash In" />
              <Line type="monotone" dataKey="outflow" stroke="#EF4444" strokeWidth={2} dot={false} name="Cash Out" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}
    </div>
  );
}
