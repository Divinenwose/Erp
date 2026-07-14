'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, AlertTriangle, Users, Plus, Download } from 'lucide-react';

const MOCK_AP = [
  { id: 1, vendor: 'AWS', invoice: 'BILL-2024-0042', amount: '$8,400', dueDate: 'Dec 22, 2024', days: 2, status: 'due_soon' },
  { id: 2, vendor: 'Office Pro Ltd', invoice: 'BILL-2024-0039', amount: '$3,200', dueDate: 'Dec 18, 2024', days: -2, status: 'overdue' },
  { id: 3, vendor: 'Salesforce Inc', invoice: 'BILL-2024-0036', amount: '$24,000', dueDate: 'Dec 31, 2024', days: 11, status: 'open' },
  { id: 4, vendor: 'HubSpot', invoice: 'BILL-2024-0033', amount: '$9,200', dueDate: 'Dec 28, 2024', days: 8, status: 'open' },
  { id: 5, vendor: 'Delta Supplies', invoice: 'BILL-2024-0030', amount: '$5,600', dueDate: 'Dec 12, 2024', days: -8, status: 'overdue' },
];

export default function PayablesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Payable"
        description="Manage vendor invoices and outgoing payments"
        breadcrumbs={[{ label: 'Finance' }, { label: 'AP' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Bill</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Payable"
          value="$198,300"
          change={2.1}
          changeLabel="vs last month"
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Due This Week"
          value="$42,800"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Overdue"
          value="$12,400"
          change={-8.2}
          changeLabel="vs last month"
          icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
        />
        <KPICard
          title="Active Vendors"
          value={34}
          icon={<Users className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Outstanding Bills</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Vendor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Bill #</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Due Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Days</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_AP.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.vendor}</td>
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
            <p className="text-xs text-gray-400">Full AP automation with scheduled payments, early payment discounts, and vendor portal available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
