'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, Package, TrendingUp, BarChart3, Plus, Download } from 'lucide-react';

export default function WarehousesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations and stock levels"
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Warehouses' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Warehouse</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Warehouses"
          value={0}
          icon={<Warehouse className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Total Capacity"
          value="0"
          suffix=" units"
          icon={<Package className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
        <KPICard
          title="Total Stock"
          value="0"
          suffix=" units"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Utilization"
          value="0%"
          icon={<BarChart3 className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="dark:bg-gray-900 dark:border-gray-800 sm:col-span-2">
          <CardContent className="p-6 text-center text-sm text-gray-500">No warehouses recorded.</CardContent>
        </Card>
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="py-4 px-5">
          <p className="text-xs text-gray-400 text-center">Warehouse records will appear here when added.</p>
        </CardContent>
      </Card>
    </div>
  );
}
