'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, DollarSign, RefreshCw, Plus, Download } from 'lucide-react';

const MOCK_CONTRACTS = [
  { id: 1, title: 'AWS Enterprise Agreement', vendor: 'Amazon Web Services', value: '$240,000', startDate: 'Jan 1, 2024', endDate: 'Dec 31, 2024', status: 'active' },
  { id: 2, title: 'Office Lease – HQ', vendor: 'City Properties Inc', value: '$480,000', startDate: 'Jun 1, 2023', endDate: 'May 31, 2025', status: 'active' },
  { id: 3, title: 'Salesforce CRM License', vendor: 'Salesforce Inc', value: '$96,000', startDate: 'Jan 1, 2024', endDate: 'Dec 31, 2024', status: 'expiring_soon' },
  { id: 4, title: 'Security Services', vendor: 'SecurePro Ltd', value: '$60,000', startDate: 'Mar 1, 2024', endDate: 'Feb 28, 2025', status: 'expiring_soon' },
  { id: 5, title: 'Cleaning & Maintenance', vendor: 'CleanCo Services', value: '$24,000', startDate: 'Jan 1, 2024', endDate: 'Dec 31, 2025', status: 'active' },
];

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Manage vendor and supplier contracts"
        breadcrumbs={[{ label: 'Procurement' }, { label: 'Contracts' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Contract</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Contracts"
          value={18}
          icon={<FileText className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Expiring Soon"
          value={4}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Total Value"
          value="$2.1M"
          change={3.4}
          changeLabel="this year"
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Renewals Due"
          value={4}
          icon={<RefreshCw className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Active Contracts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Contract</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Vendor</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Start</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">End</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_CONTRACTS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.vendor}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{row.value}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.startDate}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.endDate}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full contract lifecycle management with e-signatures, clause library, and renewal automation available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
