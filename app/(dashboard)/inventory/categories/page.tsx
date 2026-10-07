'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, CheckCircle2, Package, Plus, Download } from 'lucide-react';

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
          value={0}
          icon={<Tag className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Active"
          value={0}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Total Products"
          value={0}
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
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No categories recorded.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Categories will appear here when added.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
