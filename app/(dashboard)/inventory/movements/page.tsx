'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Shuffle, Plus, Download } from 'lucide-react';

const MOCK_MOVEMENTS = [
  { id: 1, ref: 'MOV-2024-0024', type: 'inbound', product: 'Industrial Motor Controller', qty: '+50', from: 'Supplier', to: 'Main Warehouse', date: 'Dec 20, 2024 09:14', status: 'completed' },
  { id: 2, ref: 'MOV-2024-0023', type: 'outbound', product: 'Safety Relay Module', qty: '-12', from: 'Main Warehouse', to: 'Customer Order', date: 'Dec 20, 2024 08:42', status: 'completed' },
  { id: 3, ref: 'MOV-2024-0022', type: 'transfer', product: 'Hydraulic Valve Assembly', qty: '20', from: 'Main Warehouse', to: 'East Distribution Center', date: 'Dec 19, 2024 15:30', status: 'in_transit' },
  { id: 4, ref: 'MOV-2024-0021', type: 'inbound', product: 'Pressure Sensor 10 Bar', qty: '+100', from: 'Supplier', to: 'West Coast Hub', date: 'Dec 19, 2024 11:20', status: 'completed' },
  { id: 5, ref: 'MOV-2024-0020', type: 'outbound', product: 'Pneumatic Cylinder 50mm', qty: '-25', from: 'East Distribution Center', to: 'Customer Order', date: 'Dec 19, 2024 09:05', status: 'completed' },
];

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
          value={24}
          change={4.3}
          changeLabel="vs yesterday"
          icon={<ArrowLeftRight className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Inbound"
          value={12}
          icon={<ArrowDownToLine className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Outbound"
          value={10}
          icon={<ArrowUpFromLine className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
        />
        <KPICard
          title="Transfers"
          value={2}
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
                {MOCK_MOVEMENTS.map(row => {
                  const cfg = TYPE_CONFIG[row.type] ?? TYPE_CONFIG.transfer;
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row.ref}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.icon}{row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.product}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.qty.startsWith('+') ? 'text-emerald-600' : row.qty.startsWith('-') ? 'text-rose-600' : 'text-blue-600'}`}>{row.qty}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.from}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.to}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{row.date}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full stock movement tracking with lot traceability and automated reorder triggers available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
