'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Shuffle, Plus, Download } from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  inbound: { icon: <ArrowDownToLine className="h-3.5 w-3.5" />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50' },
  outbound: { icon: <ArrowUpFromLine className="h-3.5 w-3.5" />, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50' },
  transfer: { icon: <Shuffle className="h-3.5 w-3.5" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50' },
};

export default function MovementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="Track all inventory inbound, outbound, and transfer activity"
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Movements' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Log Movement</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Movements Today"
          value={0}
          icon={<ArrowLeftRight className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Inbound"
          value={0}
          icon={<ArrowDownToLine className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Outbound"
          value={0}
          icon={<ArrowUpFromLine className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
        />
        <KPICard
          title="Transfers"
          value={0}
          icon={<Shuffle className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Movement Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Product</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No stock movements recorded.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Stock movements will appear here when recorded.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
