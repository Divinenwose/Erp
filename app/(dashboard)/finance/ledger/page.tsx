'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, TrendingUp, TrendingDown, FileText, Plus, Download } from 'lucide-react';

const MOCK_ENTRIES = [
  { id: 1, date: 'Dec 20, 2024', ref: 'JE-2024-0124', description: 'Revenue recognition – SaaS subscriptions', debit: '$42,500', credit: '$42,500', account: '4000 – Revenue', status: 'posted' },
  { id: 2, date: 'Dec 19, 2024', ref: 'JE-2024-0123', description: 'Office supplies expense', debit: '$1,240', credit: '$1,240', account: '6200 – Office Supplies', status: 'posted' },
  { id: 3, date: 'Dec 18, 2024', ref: 'JE-2024-0122', description: 'Payroll disbursement Q4', debit: '$284,500', credit: '$284,500', account: '2100 – Payroll Payable', status: 'posted' },
  { id: 4, date: 'Dec 17, 2024', ref: 'JE-2024-0121', description: 'Equipment depreciation', debit: '$3,800', credit: '$3,800', account: '1500 – Fixed Assets', status: 'posted' },
  { id: 5, date: 'Dec 16, 2024', ref: 'JE-2024-0120', description: 'Vendor payment – AWS', debit: '$8,400', credit: '$8,400', account: '5100 – Cloud Services', status: 'draft' },
];

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="General Ledger"
        description="Double-entry bookkeeping and chart of accounts"
        breadcrumbs={[{ label: 'Finance' }, { label: 'General Ledger' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Entry</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Accounts"
          value={48}
          icon={<Database className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Total Debits"
          value="$4.5M"
          change={2.8}
          changeLabel="this period"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Total Credits"
          value="$4.5M"
          change={2.8}
          changeLabel="this period"
          icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
        />
        <KPICard
          title="Journal Entries"
          value={124}
          change={5.1}
          changeLabel="this month"
          icon={<FileText className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Journal Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Debit</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Credit</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_ENTRIES.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row.ref}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.description}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{row.debit}</td>
                    <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">{row.credit}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full ledger with trial balance, reconciliation, and period close workflows available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
