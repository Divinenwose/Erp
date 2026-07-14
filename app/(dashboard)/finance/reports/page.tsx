'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, BarChart3, PieChart, Download, Plus } from 'lucide-react';

const REPORT_TYPES = [
  { icon: TrendingUp, title: 'Profit & Loss', description: 'Income statement showing revenue, expenses, and net profit for any period.', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  { icon: BarChart3, title: 'Balance Sheet', description: 'Snapshot of assets, liabilities, and equity at a specific date.', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  { icon: PieChart, title: 'Cash Flow Statement', description: 'Track cash inflows and outflows across operating, investing, and financing activities.', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/50' },
  { icon: FileText, title: 'Trial Balance', description: 'List all debit and credit balances for every account to verify the ledger.', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  { icon: TrendingUp, title: 'Budget vs Actual', description: 'Compare planned budget against actual spending across departments.', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/50' },
  { icon: BarChart3, title: 'Expense Analysis', description: 'Detailed breakdown of expenses by category, department, and time period.', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/50' },
];

export default function FinancialReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Generate and export financial statements and analytics"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Reports' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export All</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Custom Report</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((report, i) => {
          const Icon = report.icon;
          return (
            <Card key={i} className="dark:bg-gray-900 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg shrink-0 ${report.bg}`}>
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{report.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{report.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs flex-1">Preview</Button>
                  <Button size="sm" className="text-xs flex-1 bg-blue-600 hover:bg-blue-700">
                    <Download className="h-3 w-3 mr-1" />Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="py-10">
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="Full Financial Reporting Suite Coming Soon"
            description="The complete module includes scheduled reports, custom date ranges, multi-currency consolidation, audit trails, and one-click export to PDF, Excel, and CSV."
          />
        </CardContent>
      </Card>
    </div>
  );
}
