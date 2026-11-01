'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Plus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const finishedGoodsSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  warehouse_id: z.string().optional(),
  quantity_on_hand: z.coerce.number().min(0, 'Quantity must be positive'),
  quantity_reserved: z.coerce.number().min(0, 'Reserved must be positive'),
  unit_cost: z.coerce.number().min(0, 'Unit cost must be positive'),
  batch_number: z.string().optional(),
  lot_number: z.string().optional(),
  expiry_date: z.string().optional(),
  production_date: z.string().optional(),
  notes: z.string().optional(),
});
type FinishedGoodsForm = z.infer<typeof finishedGoodsSchema>;

export default function FinishedGoodsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.finished_goods.create');
  const canEdit = isAdmin || hasPermission('manufacturing.finished_goods.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.finished_goods.delete');
  const canAdjust = isAdmin || hasPermission('manufacturing.finished_goods.adjust');

  const [finishedGoods, setFinishedGoods] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFG, setEditFG] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ totalStock: 0, totalValue: 0, reserved: 0, expiringSoon: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FinishedGoodsForm>({
    resolver: zodResolver(finishedGoodsSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [fgRes, prodRes, whRes] = await Promise.all([
      supabase
        .from('finished_goods_inventory')
        .select('*, products(name, sku), warehouses(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku').eq('company_id', company.id),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id),
    ]);

    if (fgRes.error) {
      console.error('Error loading finished goods:', fgRes.error);
      toast.error('Failed to load finished goods');
    }
    setFinishedGoods(fgRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setWarehouses(whRes.data ?? []);

    const totalStock = fgRes.data?.reduce((sum, f) => sum + (f.quantity_on_hand || 0), 0) || 0;
    const totalValue = fgRes.data?.reduce((sum, f) => sum + ((f.quantity_on_hand || 0) * (f.unit_cost || 0)), 0) || 0;
    const reserved = fgRes.data?.reduce((sum, f) => sum + (f.quantity_reserved || 0), 0) || 0;
    const today = new Date();
    const expiringSoon = fgRes.data?.filter(f => f.expiry_date && new Date(f.expiry_date) <= new Date(today.setDate(today.getDate() + 30))).length || 0;
    setStats({ totalStock, totalValue, reserved, expiringSoon });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (fg: any) => {
    setEditFG(fg);
    reset({
      product_id: fg.product_id,
      warehouse_id: fg.warehouse_id ?? '',
      quantity_on_hand: fg.quantity_on_hand,
      quantity_reserved: fg.quantity_reserved,
      unit_cost: fg.unit_cost,
      batch_number: fg.batch_number ?? '',
      lot_number: fg.lot_number ?? '',
      expiry_date: fg.expiry_date ?? '',
      production_date: fg.production_date ?? '',
      notes: fg.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FinishedGoodsForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editFG) {
      const { error } = await supabase
        .from('finished_goods_inventory')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editFG.id);

      if (error) {
        toast.error('Failed to update finished goods');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'finished_goods_inventory',
          record_id: editFG.id,
        });
      }

      toast.success('Finished goods updated');
    } else {
      const { error } = await supabase.from('finished_goods_inventory').insert({
        company_id: company.id,
        ...data,
      });

      if (error) {
        toast.error('Failed to add finished goods');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'finished_goods_inventory',
        });
      }

      toast.success('Finished goods added');
    }

    reset();
    setEditFG(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('finished_goods_inventory').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete finished goods');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'finished_goods_inventory',
        record_id: deleteId,
      });
      toast.success('Finished goods deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'products', header: 'Product', cell: (v) => v ? `${v.name} (${v.sku})` : '-' },
    { key: 'warehouses', header: 'Warehouse', cell: (v) => v?.name || '-' },
    { key: 'quantity_on_hand', header: 'On Hand', sortable: true },
    { key: 'quantity_reserved', header: 'Reserved', sortable: true },
    { key: 'batch_number', header: 'Batch', sortable: true },
    { key: 'lot_number', header: 'Lot', sortable: true },
    { key: 'expiry_date', header: 'Expiry', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
    { key: 'unit_cost', header: 'Unit Cost', sortable: true, cell: (v) => `$${v?.toFixed(2) || '0.00'}` },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Finished Goods" description="Manage finished goods inventory" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Finished Goods' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditFG(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Finished Goods
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editFG ? 'Edit Finished Goods' : 'Add Finished Goods'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Product *</Label>
                  <Select {...register('product_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.product_id && <p className="text-red-500 text-sm">{errors.product_id.message}</p>}
                </div>
                <div>
                  <Label>Warehouse</Label>
                  <Select {...register('warehouse_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity on Hand *</Label>
                    <Input type="number" {...register('quantity_on_hand')} placeholder="0" />
                    {errors.quantity_on_hand && <p className="text-red-500 text-sm">{errors.quantity_on_hand.message}</p>}
                  </div>
                  <div>
                    <Label>Reserved</Label>
                    <Input type="number" {...register('quantity_reserved')} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Label>Unit Cost *</Label>
                  <Input type="number" step="0.01" {...register('unit_cost')} placeholder="0.00" />
                  {errors.unit_cost && <p className="text-red-500 text-sm">{errors.unit_cost.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Batch Number</Label>
                    <Input {...register('batch_number')} placeholder="BATCH-001" />
                  </div>
                  <div>
                    <Label>Lot Number</Label>
                    <Input {...register('lot_number')} placeholder="LOT-001" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Production Date</Label>
                    <Input type="date" {...register('production_date')} />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input type="date" {...register('expiry_date')} />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Stock" value={stats.totalStock.toLocaleString()} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Value" value={`$${stats.totalValue.toLocaleString()}`} icon={<Package className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Reserved" value={stats.reserved.toLocaleString()} icon={<Package className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Expiring Soon" value={stats.expiringSoon} icon={<Package className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={finishedGoods}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Finished Goods"
        description="Are you sure you want to delete this finished goods record? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
