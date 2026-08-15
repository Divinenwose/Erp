'use client';

import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Warehouse, Activity, TrendingDown, AlertTriangle, Layers } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const stockData = [
  { category: 'Electronics', inStock: 450, reorderPoint: 100 },
  { category: 'Furniture', inStock: 120, reorderPoint: 30 },
  { category: 'Supplies', inStock: 890, reorderPoint: 200 },
  { category: 'Machinery', inStock: 45, reorderPoint: 10 },
  { category: 'Raw Mat.', inStock: 2400, reorderPoint: 500 },
];

export default function InventoryOverviewPage() {
  const { hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canProducts = isAdmin || hasPermission('inventory.products.view');
  const canWarehouses = isAdmin || hasPermission('inventory.warehouses.view');
  const canMovements = isAdmin || hasPermission('inventory.movements.view');

  const modules = [
    { title: 'Products', description: 'Product catalog', icon: Package, href: '/inventory/products', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'inventory.products.view' },
    { title: 'Categories', description: 'Product categories', icon: Layers, href: '/inventory/categories', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'inventory.categories.view' },
    { title: 'Warehouses', description: 'Storage locations', icon: Warehouse, href: '/inventory/warehouses', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'inventory.warehouses.view' },
    { title: 'Stock Movements', description: 'In/out tracking', icon: Activity, href: '/inventory/movements', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'inventory.movements.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory & Warehouse" description="Manage products, stock levels, and warehouse operations" breadcrumbs={[{ label: 'Inventory' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/inventory/products">Add Product</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canProducts && <KPICard title="Total Products" value={284} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />}
        {canProducts && <KPICard title="Total Stock Value" value={formatCurrency(2840000)} change={3.4} changeLabel="vs last month" icon={<TrendingDown className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />}
        {canMovements && <KPICard title="Low Stock Items" value={12} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />}
        {canWarehouses && <KPICard title="Warehouses" value={4} icon={<Warehouse className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
          </Link>
        ))}
      </div>

      {canProducts && <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><CardTitle className="text-sm font-semibold">Stock Levels by Category</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="inStock" fill="#3B82F6" radius={[4, 4, 0, 0]} name="In Stock" />
              <Bar dataKey="reorderPoint" fill="#FCA5A5" radius={[4, 4, 0, 0]} name="Reorder Point" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}
    </div>
  );
}
