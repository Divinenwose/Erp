'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Clock, CheckCircle2, XCircle, Plus, Download } from 'lucide-react';

const MOCK_EXPENSES = [
  { id: 1, employee: 'Alice Johnson', category: 'Travel', description: 'Flight to NYC conference', amount: '$1,240', date: 'Dec 18, 2024', status: 'approved' },
  { id: 2, employee: 'Bob Martinez', category: 'Meals', description: 'Client dinner – Q4 deal close', amount: '$380', date: 'Dec 19, 2024', status: 'pending' },
  { id: 3, employee: 'Carol Lee', category: 'Software', description: 'Figma annual subscription', amount: '$576', date: 'Dec 17, 2024', status: 'approved' },
  { id: 4, employee: 'David Kim', category: 'Training', description: 'PMP certification exam', amount: '$555', date: 'Dec 15, 2024', status: 'pending' },
  { id: 5, employee: 'Eva Williams', category: 'Office', description: 'Standing desk – home office', amount: '$890', date: 'Dec 12, 2024', status: 'rejected' },
];

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and approve employee expense reports"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Expenses' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Submit Expense</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Expenses"
          value="$124,500"
          change={8.2}
          changeLabel="this month"
          icon={<CreditCard className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Pending Approval"
          value={8}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Approved"
          value="$98,200"
          change={5.4}
          changeLabel="this month"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Rejected"
          value={2}
          icon={<XCircle className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Expense Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_EXPENSES.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.employee}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.category}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.description}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{row.amount}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full expense management with receipt scanning and multi-level approvals available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
