'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Download, Calendar, TrendingUp, Scale, PieChart, FileText, DollarSign, Users, Activity } from 'lucide-react';
import { exportExcel } from '@/lib/excel-export';
import { toast } from 'sonner';

const reportTypes = [
  { id: 'cash_flow', title: 'Cash Flow Statement', description: 'Analyze cash inflows and outflows', icon: TrendingUp, color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
  { id: 'balance_sheet', title: 'Balance Sheet', description: 'Snapshot of assets, liabilities, and equity', icon: Scale, color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
  { id: 'income_statement', title: 'Income Statement', description: 'Revenue, expenses, and profit over a period', icon: BarChart3, color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
  { id: 'ar_aging', title: 'Accounts Receivable Aging', description: 'Track overdue customer invoices', icon: Calendar, color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
  { id: 'ap_aging', title: 'Accounts Payable Aging', description: 'Monitor outstanding vendor bills', icon: FileText, color: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600' },
  { id: 'budget_vs_actual', title: 'Budget vs. Actual', description: 'Compare planned vs. actual expenditures', icon: PieChart, color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600' },
  { id: 'expense_analysis', title: 'Expense Analysis', description: 'Detailed expense breakdown by category', icon: DollarSign, color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600' },
  { id: 'revenue_analysis', title: 'Revenue Analysis', description: 'Revenue trends and performance metrics', icon: Activity, color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600' },
  { id: 'vendor_performance', title: 'Vendor Performance', description: 'Track vendor metrics and relationships', icon: Users, color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600' },
];

export default function FinanceReportsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportRows, setReportRows] = useState<Record<string, unknown[]>>({});

  useEffect(() => {
    if (!company?.id) return;
    const loadReports = async () => {
      setLoading(true);
      const [invoicesRes, expensesRes, budgetsRes, accountsRes, vendorsRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('company_id', company.id),
        supabase.from('expenses').select('*, employees(first_name, last_name, employee_number, departments(name))').eq('company_id', company.id),
        supabase.from('budgets').select('*, departments(name)').eq('company_id', company.id),
        supabase.from('chart_of_accounts').select('*').eq('company_id', company.id),
        supabase.from('vendors').select('*').eq('company_id', company.id),
      ]);
      const failed = [invoicesRes, expensesRes, budgetsRes, accountsRes, vendorsRes].find(result => result.error);
      if (failed?.error) {
        toast.error('Could not load the finance reports');
        setLoading(false);
        return;
      }

      const invoices = invoicesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const budgets = budgetsRes.data ?? [];
      const accounts = accountsRes.data ?? [];
      const vendors = vendorsRes.data ?? [];
      setReportRows({
        cash_flow: [
          ...invoices.map(invoice => ({ transaction_type: 'Invoice', transaction_date: invoice.issue_date, amount: invoice.total_amount, status: invoice.status, reference: invoice.invoice_number })),
          ...expenses.map(expense => ({ transaction_type: 'Expense', transaction_date: expense.expense_date, amount: -Number(expense.amount ?? 0), status: expense.status, reference: expense.expense_number })),
        ],
        balance_sheet: accounts.filter(account => ['asset', 'liability', 'equity'].includes(account.account_type)),
        income_statement: [
          ...invoices.filter(invoice => invoice.invoice_type === 'sales').map(invoice => ({ type: 'Revenue', date: invoice.issue_date, amount: invoice.total_amount, status: invoice.status, reference: invoice.invoice_number })),
          ...expenses.map(expense => ({ type: 'Expense', date: expense.expense_date, amount: expense.amount, status: expense.status, reference: expense.expense_number, category: expense.category })),
        ],
        ar_aging: invoices.filter(invoice => invoice.invoice_type === 'sales' && Number(invoice.balance_due ?? 0) > 0),
        ap_aging: invoices.filter(invoice => invoice.invoice_type !== 'sales' && Number(invoice.balance_due ?? 0) > 0),
        budget_vs_actual: budgets,
        expense_analysis: expenses,
        revenue_analysis: invoices.filter(invoice => invoice.invoice_type === 'sales'),
        vendor_performance: vendors,
      });
      setLoading(false);
    };
    void loadReports();
  }, [company?.id]);

  return (
    <PermissionGuard permission="finance.reports.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view finance reports</div>}>
      <div className="space-y-6">
        <PageHeader title="Finance Reports" description="Export financial statements and operational records from current company data" breadcrumbs={[{ label: 'Finance' }, { label: 'Reports' }]} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Report Types" value={reportTypes.length} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Finance Records" value={Object.values(reportRows).reduce((count, rows) => count + rows.length, 0)} icon={<FileText className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => (
            <Card key={report.id} className="dark:bg-gray-900 dark:border-gray-800 hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg ${report.color} flex items-center justify-center mb-3`}>
                  <report.icon className={`h-6 w-6 ${report.iconColor}`} />
                </div>
                <CardTitle className="text-base font-semibold">{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{report.description}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => exportExcel(`${report.id}-report`, [{ name: report.title, rows: reportRows[report.id] ?? [] }])}
                  >
                    <Download className="h-4 w-4 mr-2" />Export Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PermissionGuard>
  );
}
