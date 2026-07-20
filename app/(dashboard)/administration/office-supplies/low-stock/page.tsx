'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, DollarSign, Building2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';

export default function LowStockPage() {
  const { company } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data } = await supabase
      .from('office_supplies_inventory')
      .select('*, branches(name)')
      .eq('company_id', company.id)
      .order('name');

    const lowStockItems = (data || []).filter(
      (item: any) => item.min_stock_level && item.quantity <= item.min_stock_level
    );

    setInventory(lowStockItems);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const exportCSV = () => {
    const headers = ['Name', 'Category', 'SKU', 'Current Quantity', 'Unit', 'Min Stock Level', 'Shortage', 'Unit Cost', 'Total Value', 'Location', 'Branch'];
    const rows = inventory.map(i => [
      i.name,
      i.category || '',
      i.sku || '',
      i.quantity,
      i.unit,
      i.min_stock_level || '',
      Math.max(0, (i.min_stock_level || 0) - i.quantity),
      i.unit_cost || '',
      (i.quantity * (i.unit_cost || 0)).toFixed(2),
      i.location || '',
      i.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'low_stock_items.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Item',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.sku && <p className="text-xs text-gray-400">SKU: {row.sku}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.category || '—'}</span>,
    },
    {
      key: 'quantity',
      header: 'Current Qty',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{row.quantity} {row.unit}</span>
        </div>
      ),
    },
    {
      key: 'min_stock_level',
      header: 'Min Level',
      sortable: true,
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.min_stock_level} {row.unit}</span>,
    },
    {
      key: 'shortage',
      header: 'Shortage',
      sortable: true,
      cell: (row) => {
        const shortage = Math.max(0, (row.min_stock_level || 0) - row.quantity);
        return (
          <Badge variant="destructive" className="text-xs">
            {shortage} {row.unit}
          </Badge>
        );
      },
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <DollarSign className="h-3 w-3" />
          <span>{row.unit_cost ? row.unit_cost.toFixed(2) : '—'}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.location || '—'}</span>,
    },
    {
      key: 'branch',
      header: 'Branch',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="h-3 w-3" />
          <span>{row.branches?.name || '—'}</span>
        </div>
      ),
    },
  ];

  const totalShortage = inventory.reduce((sum, i) => sum + Math.max(0, (i.min_stock_level || 0) - i.quantity), 0);
  const reorderCost = inventory.reduce((sum, i) => {
    const shortage = Math.max(0, (i.min_stock_level || 0) - i.quantity);
    return sum + (shortage * (i.unit_cost || 0));
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low Stock Items"
        description="View items below minimum stock level"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Office Supplies' }, { label: 'Low Stock' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Low Stock Items" value={inventory.length} icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Total Shortage" value={`${totalShortage} units`} icon={<Package className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Reorder Cost" value={`$${reorderCost.toFixed(2)}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        data={inventory}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search items..."
        searchKeys={['name', 'category', 'sku']}
        pageSize={15}
        emptyTitle="No low stock items"
        emptyDescription="All items are above minimum stock level"
      />
    </div>
  );
}
