'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Download, AlertTriangle, MoreHorizontal, Edit, Trash2, Barcode } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const prodSchema = z.object({
  name: z.string().min(1, 'Required'),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  unit_of_measure: z.string().default('unit'),
  cost_price: z.coerce.number().min(0).default(0),
  selling_price: z.coerce.number().min(0).default(0),
  reorder_level: z.coerce.number().int().min(0).default(0),
  product_type: z.string().default('product'),
  track_inventory: z.boolean().default(true),
  barcode: z.string().optional(),
});
type ProdForm = z.infer<typeof prodSchema>;

export default function ProductsPage() {
  const { company } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const { register, handleSubmit, reset, control, watch, formState: { errors, isSubmitting } } = useForm<ProdForm>({
    resolver: zodResolver(prodSchema),
    defaultValues: { product_type: 'product', unit_of_measure: 'unit', track_inventory: true },
  });

  const load = async () => {
    if (!company?.id) return;
    const [prodRes, catRes, invRes] = await Promise.all([
      supabase.from('products').select('*, categories(name)').eq('company_id', company.id).order('name'),
      supabase.from('categories').select('id, name').eq('company_id', company.id),
      supabase.from('inventory_items').select('product_id, quantity_on_hand').eq('company_id', company.id),
    ]);
    setProducts(prodRes.data ?? []);
    setCategories(catRes.data ?? []);
    const invMap: Record<string, number> = {};
    (invRes.data ?? []).forEach((item: any) => { invMap[item.product_id] = (invMap[item.product_id] ?? 0) + item.quantity_on_hand; });
    setInventory(invMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (prod: any) => {
    setEditProduct(prod);
    reset({ name: prod.name, sku: prod.sku ?? '', description: prod.description ?? '', category_id: prod.category_id ?? undefined, unit_of_measure: prod.unit_of_measure, cost_price: prod.cost_price, selling_price: prod.selling_price, reorder_level: prod.reorder_level, product_type: prod.product_type, track_inventory: prod.track_inventory, barcode: prod.barcode ?? '' });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ProdForm) => {
    if (!company?.id) return;
    if (editProduct) {
      const { error } = await supabase.from('products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editProduct.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Product updated');
    } else {
      const sku = data.sku || `SKU-${String(products.length + 1).padStart(4, '0')}`;
      const { error } = await supabase.from('products').insert({ ...data, company_id: company.id, sku, is_active: true });
      if (error) { toast.error('Failed to create product'); return; }
      toast.success('Product created');
    }
    reset(); setEditProduct(null); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('products').update({ is_active: false }).eq('id', deleteId);
    setProducts(prev => prev.filter(p => p.id !== deleteId));
    setDeleteId(null);
    toast.success('Product deactivated');
  };

  const filtered = typeFilter === 'all' ? products : products.filter(p => p.product_type === typeFilter);
  const totalValue = products.reduce((a, p) => a + (p.cost_price * (inventory[p.id] ?? 0)), 0);
  const lowStock = products.filter(p => p.track_inventory && (inventory[p.id] ?? 0) <= p.reorder_level && p.reorder_level > 0).length;

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Product', sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            <p className="text-xs text-gray-400">{row.sku ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.categories?.name ?? '—'}</span> },
    { key: 'cost_price', header: 'Cost Price', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.cost_price)}</span> },
    { key: 'selling_price', header: 'Selling Price', sortable: true, cell: (row) => <span className="text-sm font-medium">{formatCurrency(row.selling_price)}</span> },
    {
      key: 'stock', header: 'In Stock', sortable: true,
      cell: (row) => {
        const qty = inventory[row.id] ?? 0;
        const isLow = row.track_inventory && qty <= row.reorder_level && row.reorder_level > 0;
        return (
          <span className={cn('text-sm font-semibold', qty === 0 ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600')}>
            {row.track_inventory ? qty : '—'}
          </span>
        );
      },
    },
    { key: 'product_type', header: 'Type', cell: (row) => <span className="text-xs capitalize text-gray-500">{row.product_type}</span> },
    { key: 'is_active', header: 'Status', cell: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    {
      key: 'actions', header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description="Manage your product and service catalog" breadcrumbs={[{ label: 'Inventory' }, { label: 'Products' }]}>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditProduct(null); reset(); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editProduct ? 'Edit Product' : 'New Product'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Product Name *</Label><Input className="mt-1" {...register('name')} /></div>
                <div><Label>SKU</Label><Input className="mt-1" placeholder="Auto-generated" {...register('sku')} /></div>
                <div><Label>Barcode</Label><Input className="mt-1" {...register('barcode')} /></div>
                <div><Label>Category</Label>
                  <Controller name="category_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Type</Label>
                  <Controller name="product_type" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="product">Product</SelectItem><SelectItem value="service">Service</SelectItem><SelectItem value="consumable">Consumable</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Unit of Measure</Label>
                  <Controller name="unit_of_measure" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="unit">Unit</SelectItem><SelectItem value="kg">Kilogram</SelectItem><SelectItem value="liter">Liter</SelectItem><SelectItem value="meter">Meter</SelectItem><SelectItem value="box">Box</SelectItem><SelectItem value="license">License</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Cost Price ($)</Label><Input className="mt-1" type="number" step="0.01" {...register('cost_price')} /></div>
                <div><Label>Selling Price ($)</Label><Input className="mt-1" type="number" step="0.01" {...register('selling_price')} /></div>
                <div><Label>Reorder Level</Label><Input className="mt-1" type="number" {...register('reorder_level')} /></div>
                <div className="col-span-2"><Label>Description</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-16" {...register('description')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editProduct ? 'Update' : 'Create Product'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Products" value={products.length} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={products.filter(p => p.is_active).length} icon={<Package className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Low Stock Items" value={lowStock} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Inventory Value" value={formatCurrency(totalValue)} icon={<Package className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search products, SKU..."
        searchKeys={['name', 'sku', 'barcode', 'description']}
        pageSize={15}
        emptyTitle="No products yet"
        emptyDescription="Add products to start tracking inventory"
        emptyAction={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Product</Button>}
        toolbar={
          <select className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-950" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="product">Products</option>
            <option value="service">Services</option>
            <option value="consumable">Consumables</option>
          </select>
        }
      />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Deactivate Product?" description="The product will be hidden but its history preserved." confirmLabel="Deactivate" variant="warning" />
    </div>
  );
}
