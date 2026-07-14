'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Clock, CheckCircle2, DollarSign, Plus, Download } from 'lucide-react';

const MOCK_ORDERS = [
  { id: 1, orderNum: 'SO-2024-0124', customer: 'Acme Corporation', items: 8, amount: '$84,200', orderDate: 'Dec 19, 2024', deliveryDate: 'Dec 30, 2024', status: 'fulfilled' },
  { id: 2, orderNum: 'SO-2024-0123', customer: 'TechStart Inc', items: 3, amount: '$18,600', orderDate: 'Dec 18, 2024', deliveryDate: 'Jan 5, 2025', status: 'pending' },
  { id: 3, orderNum: 'SO-2024-0122', customer: 'Global Retail Ltd', items: 15, amount: '$142,000', orderDate: 'Dec 17, 2024', deliveryDate: 'Jan 10, 2025', status: 'processing' },
  { id: 4, orderNum: 'SO-2024-0121', customer: 'Metro Services', items: 2, amount: '$8,400', orderDate: 'Dec 16, 2024', deliveryDate: 'Dec 22, 2024', status: 'fulfilled' },
  { id: 5, orderNum: 'SO-2024-0120', customer: 'Sunrise Logistics', items: 6, amount: '$36,800', orderDate: 'Dec 15, 2024', deliveryDate: 'Dec 28, 2024', status: 'pending' },
];

export default function SalesOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Track and manage customer sales orders"
        breadcrumbs={[{ label: 'CRM' }, { label: 'Sales Orders' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Order</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Orders"
          value={124}
          change={6.1}
          changeLabel="this month"
          icon={<ShoppingCart className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Pending"
          value={18}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Fulfilled"
          value={98}
          change={4.3}
          changeLabel="this month"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Total Value"
          value="$1.2M"
          change={9.2}
          changeLabel="this month"
          icon={<DollarSign className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Sales Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Items</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Delivery</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_ORDERS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row.orderNum}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.customer}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.items}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{row.amount}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.orderDate}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.deliveryDate}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full order management with fulfillment, shipping tracking, and invoicing available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
