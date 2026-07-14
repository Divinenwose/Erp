'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, AlertTriangle, BarChart3, Plus, Download } from 'lucide-react';

const MOCK_AR = [
  { id: 1, customer: 'Acme Corp', invoice: 'INV-2024-0089', amount: '$42,500', dueDate: 'Dec 22, 2024', days: 2, status: 'due_soon' },
  { id: 2, customer: 'TechStart Inc', invoice: 'INV-2024-0084', amount: '$18,200', dueDate: 'Dec 15, 2024', days: -5, status: 'overdue' },
  { id: 3, customer: 'Global Retail Ltd', invoice: 'INV-2024-0081', amount: '$67,800', dueDate: 'Dec 28, 2024', days: 8, status: 'open' },
  { id: 4, customer: 'Metro Services', invoice: 'INV-2024-0078', amount: '$13,900', dueDate: 'Dec 10, 2024', days: -10, status: 'overdue' },
  { id: 5, customer: 'Sunrise Logistics', invoice: 'INV-2024-0075', amount: '$84,100', dueDate: 'Jan 5, 2025', days: 16, status: 'open' },
];

export default function ReceivablesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Receivable"
        description="Track outstanding invoices and customer payments"
        breadcrumbs={[{ label: 'Finance' }, { label: 'AR' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Outstanding"
          value="$284,500"
          change={-3.2}
          changeLabel="vs last month"
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Due This Week"
          value="$48,200"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Overdue"
          value="$32,100"
          change={-5.6}
          changeLabel="vs last month"
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
        />
        <KPICard
          title="Avg Days Outstanding"
          value={28}
          suffix=" days"
          icon={<BarChart3 className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Outstanding Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Days</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_AR.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.customer}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row.invoice}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{row.amount}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.dueDate}</td>
                    <td className={`px-4 py-3 text-right font-medium ${row.days < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {row.days < 0 ? `${Math.abs(row.days)}d overdue` : `${row.days}d left`}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full AR aging, automated reminders, and payment portal available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
