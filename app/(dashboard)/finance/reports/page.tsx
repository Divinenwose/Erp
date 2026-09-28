'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Download, Calendar, TrendingUp, Scale, PieChart, FileText, DollarSign, Users, Activity } from 'lucide-react';

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
  const [loading] = useState(false);

  return (
    <PermissionGuard permission="finance.reports.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view finance reports</div>}>
      <div className="space-y-6">
        <PageHeader title="Finance Reports" description="Generate and view financial reports" breadcrumbs={[{ label: 'Finance' }, { label: 'Reports' }]}>
          <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" />Date Range</Button>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Reports" value={reportTypes.length} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Available Reports" value={reportTypes.length} icon={<FileText className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
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
                  <Button variant="outline" size="sm" className="flex-1"><Download className="h-4 w-4 mr-2" />Generate</Button>
                  <Button variant="outline" size="sm"><Calendar className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PermissionGuard>
  );
}
