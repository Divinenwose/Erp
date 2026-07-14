'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, Package, TrendingUp, BarChart3, Plus, Download } from 'lucide-react';

const MOCK_WAREHOUSES = [
  { id: 1, name: 'Main Warehouse', location: 'Chicago, IL', capacity: 4000, stock: 3214, manager: 'Tom Reed', status: 'active' },
  { id: 2, name: 'East Distribution Center', location: 'Newark, NJ', capacity: 3000, stock: 2480, manager: 'Lisa Park', status: 'active' },
  { id: 3, name: 'West Coast Hub', location: 'Los Angeles, CA', capacity: 2000, stock: 1840, manager: 'Chris Wu', status: 'active' },
  { id: 4, name: 'South Depot', location: 'Houston, TX', capacity: 1000, stock: 308, manager: 'Maria Lopez', status: 'active' },
];

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
          value={4}
          icon={<Warehouse className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Total Capacity"
          value="10,000"
          suffix=" units"
          icon={<Package className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
        <KPICard
          title="Total Stock"
          value="7,842"
          suffix=" units"
          change={1.4}
          changeLabel="this week"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Utilization"
          value="78%"
          change={2.1}
          changeLabel="this month"
          icon={<BarChart3 className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MOCK_WAREHOUSES.map(wh => {
          const utilization = Math.round((wh.stock / wh.capacity) * 100);
          return (
            <Card key={wh.id} className="dark:bg-gray-900 dark:border-gray-800 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{wh.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{wh.location}</p>
                  </div>
                  <StatusBadge status={wh.status} />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Capacity</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{wh.capacity.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">In Stock</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{wh.stock.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manager</p>
                    <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">{wh.manager}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Utilization</span>
                    <span>{utilization}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${utilization >= 90 ? 'bg-rose-500' : utilization >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${utilization}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="py-4 px-5">
          <p className="text-xs text-gray-400 text-center">Full warehouse management with zone mapping, picking routes, and multi-location transfers available in the complete module.</p>
        </CardContent>
      </Card>
    </div>
  );
}
