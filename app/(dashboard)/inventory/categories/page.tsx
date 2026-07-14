'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, CheckCircle2, Package, Plus, Download } from 'lucide-react';

const MOCK_CATEGORIES = [
  { id: 1, name: 'Electronics', description: 'Electronic components and control systems', products: 84, active: 80, status: 'active' },
  { id: 2, name: 'Mechanical', description: 'Mechanical parts and assemblies', products: 62, active: 58, status: 'active' },
  { id: 3, name: 'Pneumatics', description: 'Pneumatic systems and components', products: 38, active: 36, status: 'active' },
  { id: 4, name: 'Sensors', description: 'Industrial sensors and measurement devices', products: 44, active: 42, status: 'active' },
  { id: 5, name: 'Safety Equipment', description: 'Workplace safety products', products: 28, active: 24, status: 'active' },
  { id: 6, name: 'Consumables', description: 'Day-to-day consumable items', products: 18, active: 18, status: 'active' },
  { id: 7, name: 'Legacy Parts', description: 'Discontinued or legacy components', products: 10, active: 10, status: 'inactive' },
];

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize products into logical categories"
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Categories' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Category</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total Categories"
          value={18}
          icon={<Tag className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Active"
          value={16}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Total Products"
          value={284}
          change={2.1}
          changeLabel="this month"
          icon={<Package className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Category List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Products</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Active Products</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_CATEGORIES.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.description}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.products}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.active}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full category management with hierarchical nesting and attribute templates available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
