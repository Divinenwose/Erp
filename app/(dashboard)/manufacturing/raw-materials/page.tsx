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
import { Package, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const rawMaterialSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  warehouse_id: z.string().optional(),
  quantity_on_hand: z.coerce.number().min(0, 'Quantity must be positive'),
  quantity_reserved: z.coerce.number().min(0, 'Reserved must be positive'),
  reorder_level: z.coerce.number().min(0, 'Reorder level must be positive'),
  reorder_quantity: z.coerce.number().min(0, 'Reorder quantity must be positive'),
  unit_cost: z.coerce.number().min(0, 'Unit cost must be positive'),
  notes: z.string().optional(),
});
type RawMaterialForm = z.infer<typeof rawMaterialSchema>;

export default function RawMaterialsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.raw_materials.create');
  const canEdit = isAdmin || hasPermission('manufacturing.raw_materials.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.raw_materials.delete');
  const canAdjust = isAdmin || hasPermission('manufacturing.raw_materials.adjust');

  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ totalStock: 0, lowStock: 0, totalValue: 0, reserved: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RawMaterialForm>({
    resolver: zodResolver(rawMaterialSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [rmRes, prodRes, whRes] = await Promise.all([
      supabase
        .from('raw_materials_inventory')
        .select('*, products(name, sku), warehouses(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku').eq('company_id', company.id),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id),
    ]);

    if (rmRes.error) {
      console.error('Error loading raw materials:', rmRes.error);
      toast.error('Failed to load raw materials');
    }
    setRawMaterials(rmRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setWarehouses(whRes.data ?? []);

    const totalStock = rmRes.data?.reduce((sum, r) => sum + (r.quantity_on_hand || 0), 0) || 0;
    const lowStock = rmRes.data?.filter(r => r.quantity_on_hand <= r.reorder_level).length || 0;
    const totalValue = rmRes.data?.reduce((sum, r) => sum + ((r.quantity_on_hand || 0) * (r.unit_cost || 0)), 0) || 0;
    const reserved = rmRes.data?.reduce((sum, r) => sum + (r.quantity_reserved || 0), 0) || 0;
    setStats({ totalStock, lowStock, totalValue, reserved });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (rm: any) => {
    setEditMaterial(rm);
    reset({
      product_id: rm.product_id,
      warehouse_id: rm.warehouse_id ?? '',
      quantity_on_hand: rm.quantity_on_hand,
      quantity_reserved: rm.quantity_reserved,
      reorder_level: rm.reorder_level,
      reorder_quantity: rm.reorder_quantity,
      unit_cost: rm.unit_cost,
      notes: rm.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RawMaterialForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editMaterial) {
      const { error } = await supabase
        .from('raw_materials_inventory')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editMaterial.id);

      if (error) {
        toast.error('Failed to update raw material');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'raw_materials_inventory',
          record_id: editMaterial.id,
        });
      }

      toast.success('Raw material updated');
    } else {
      const { error } = await supabase.from('raw_materials_inventory').insert({
        company_id: company.id,
        ...data,
      });

      if (error) {
        toast.error('Failed to add raw material');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'raw_materials_inventory',
        });
      }

      toast.success('Raw material added');
    }

    reset();
    setEditMaterial(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('raw_materials_inventory').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete raw material');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'raw_materials_inventory',
        record_id: deleteId,
      });
      toast.success('Raw material deleted');
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
    { key: 'reorder_level', header: 'Reorder Level', sortable: true },
    { key: 'unit_cost', header: 'Unit Cost', sortable: true, cell: (v) => `$${v?.toFixed(2) || '0.00'}` },
    {
      key: 'stock_status',
      header: 'Status',
      cell: (row) => {
        const isLow = row.quantity_on_hand <= row.reorder_level;
        return isLow ? (
          <span className="text-amber-600 font-medium text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Low Stock
          </span>
        ) : (
          <span className="text-emerald-600 font-medium text-xs">OK</span>
        );
      },
    },
    { key: 'last_counted_at', header: 'Last Counted', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
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
      <PageHeader title="Raw Materials" description="Manage raw material inventory" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Raw Materials' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditMaterial(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Raw Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMaterial ? 'Edit Raw Material' : 'Add Raw Material'}</DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reorder Level *</Label>
                    <Input type="number" {...register('reorder_level')} placeholder="0" />
                    {errors.reorder_level && <p className="text-red-500 text-sm">{errors.reorder_level.message}</p>}
                  </div>
                  <div>
                    <Label>Reorder Quantity *</Label>
                    <Input type="number" {...register('reorder_quantity')} placeholder="0" />
                    {errors.reorder_quantity && <p className="text-red-500 text-sm">{errors.reorder_quantity.message}</p>}
                  </div>
                </div>
                <div>
                  <Label>Unit Cost *</Label>
                  <Input type="number" step="0.01" {...register('unit_cost')} placeholder="0.00" />
                  {errors.unit_cost && <p className="text-red-500 text-sm">{errors.unit_cost.message}</p>}
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
        <KPICard title="Low Stock Items" value={stats.lowStock} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Value" value={`$${stats.totalValue.toLocaleString()}`} icon={<Package className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Reserved" value={stats.reserved.toLocaleString()} icon={<Package className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={rawMaterials}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Raw Material"
        description="Are you sure you want to delete this raw material record? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
