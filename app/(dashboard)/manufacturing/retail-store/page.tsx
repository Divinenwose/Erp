'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingBag, Truck, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DataTable, { Column } from '@/components/common/DataTable';
import KPICard from '@/components/common/KPICard';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';

export default function RetailStorePage() {
  const { company } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInventory = async () => {
      if (!company?.id) {
        setInventory([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('finished_goods_inventory')
        .select('id, quantity_on_hand, quantity_reserved, unit_cost, batch_number, products(name, sku), warehouses(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading retail store inventory:', error);
        toast.error('Failed to load store inventory');
        setInventory([]);
      } else {
        setInventory((data ?? []).map(item => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const warehouse = Array.isArray(item.warehouses) ? item.warehouses[0] : item.warehouses;
          return {
            ...item,
            product_name: product?.name ?? '',
            sku: product?.sku ?? '',
            warehouse_name: warehouse?.name ?? '',
          };
        }));
      }
      setLoading(false);
    };

    loadInventory();
  }, [company?.id]);

  const totalOnHand = inventory.reduce((total, item) => total + Number(item.quantity_on_hand || 0), 0);
  const totalReserved = inventory.reduce((total, item) => total + Number(item.quantity_reserved || 0), 0);
  const available = totalOnHand - totalReserved;
  const inventoryValue = inventory.reduce(
    (total, item) => total + Number(item.quantity_on_hand || 0) * Number(item.unit_cost || 0),
    0,
  );

  const columns: Column[] = [
    {
      key: 'product_name',
      header: 'Product',
      sortable: true,
      cell: row => row.product_name || 'Unknown product',
    },
    {
      key: 'sku',
      header: 'SKU',
      sortable: true,
      cell: row => row.sku || '-',
    },
    { key: 'quantity_on_hand', header: 'On Hand', sortable: true },
    {
      key: 'quantity_reserved',
      header: 'Reserved',
      sortable: true,
      cell: row => Number(row.quantity_reserved || 0),
    },
    {
      key: 'available',
      header: 'Available',
      sortable: true,
      cell: row => Number(row.quantity_on_hand || 0) - Number(row.quantity_reserved || 0),
    },
    {
      key: 'warehouse_name',
      header: 'Warehouse',
      cell: row => row.warehouse_name || 'Unassigned',
    },
    { key: 'batch_number', header: 'Batch', sortable: true, cell: row => row.batch_number ?? '-' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retail Store"
        description="Review finished-goods availability and inventory value for store fulfillment."
        breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Retail Store' }]}
      >
        <Button asChild variant="outline">
          <Link href="/manufacturing/finished-goods">
            <Warehouse className="mr-2 h-4 w-4" />
            Finished Goods
          </Link>
        </Button>
        <Button asChild>
          <Link href="/manufacturing/dispatch">
            <Truck className="mr-2 h-4 w-4" />
            Dispatch
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Product Lots" value={inventory.length} icon={<ShoppingBag className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Units On Hand" value={totalOnHand} icon={<Package className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Units Available" value={available} icon={<Truck className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Inventory Cost" value={inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} icon={<Warehouse className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={inventory}
        loading={loading}
        searchable
        searchKeys={['product_name', 'sku', 'warehouse_name', 'batch_number']}
        emptyTitle="No finished goods available"
        emptyDescription="Add finished goods inventory to make products available for store fulfillment."
        emptyAction={
          <Button asChild>
            <Link href="/manufacturing/finished-goods">Manage Finished Goods</Link>
          </Button>
        }
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Inventory cost is calculated from on-hand units and their recorded unit cost. Reserved stock is excluded from available units. Store fulfillment and shipment records are managed in Dispatch.
        {totalReserved > 0 ? ` ${totalReserved} units are currently reserved.` : ''}
      </p>
    </div>
  );
}
