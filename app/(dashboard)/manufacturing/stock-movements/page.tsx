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
import { TrendingUp, Plus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const stockMovementSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  warehouse_id: z.string().optional(),
  location_id: z.string().optional(),
  movement_type: z.enum(['receipt', 'issue', 'transfer', 'adjustment', 'return', 'scrap', 'production_in', 'production_out']),
  quantity: z.coerce.number().min(0.01, 'Quantity must be positive'),
  unit_cost: z.coerce.number().min(0, 'Unit cost must be positive'),
  reference_type: z.string().optional(),
  reference_id: z.string().optional(),
  work_order_id: z.string().optional(),
  production_run_id: z.string().optional(),
  notes: z.string().optional(),
});
type StockMovementForm = z.infer<typeof stockMovementSchema>;

export default function StockMovementsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.stock_movements.create');
  const canEdit = isAdmin || hasPermission('manufacturing.stock_movements.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.stock_movements.delete');

  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [productionRuns, setProductionRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMovement, setEditMovement] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ totalMovements: 0, receipts: 0, issues: 0, transfers: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StockMovementForm>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: { movement_type: 'receipt' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [movRes, prodRes, whRes, locRes, woRes, prRes] = await Promise.all([
      supabase
        .from('manufacturing_stock_movements')
        .select('*, products(name, sku), warehouses(name), warehouse_locations(location_code), work_orders(work_order_number), production_runs(run_number), created_profile:profiles!manufacturing_stock_movements_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku').eq('company_id', company.id),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id),
      supabase.from('warehouse_locations').select('id, location_code').eq('company_id', company.id),
      supabase.from('work_orders').select('id, work_order_number').eq('company_id', company.id),
      supabase.from('production_runs').select('id, run_number').eq('company_id', company.id),
    ]);

    if (movRes.error) {
      console.error('Error loading stock movements:', movRes.error);
      toast.error('Failed to load stock movements');
    }
    setMovements(movRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setWarehouses(whRes.data ?? []);
    setLocations(locRes.data ?? []);
    setWorkOrders(woRes.data ?? []);
    setProductionRuns(prRes.data ?? []);

    const totalMovements = movRes.data?.length || 0;
    const receipts = movRes.data?.filter(m => m.movement_type === 'receipt').length || 0;
    const issues = movRes.data?.filter(m => m.movement_type === 'issue').length || 0;
    const transfers = movRes.data?.filter(m => m.movement_type === 'transfer').length || 0;
    setStats({ totalMovements, receipts, issues, transfers });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (m: any) => {
    setEditMovement(m);
    reset({
      product_id: m.product_id,
      warehouse_id: m.warehouse_id ?? '',
      location_id: m.location_id ?? '',
      movement_type: m.movement_type,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      reference_type: m.reference_type ?? '',
      reference_id: m.reference_id ?? '',
      work_order_id: m.work_order_id ?? '',
      production_run_id: m.production_run_id ?? '',
      notes: m.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: StockMovementForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editMovement) {
      const { error } = await supabase
        .from('manufacturing_stock_movements')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editMovement.id);

      if (error) {
        toast.error('Failed to update stock movement');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'manufacturing_stock_movements',
          record_id: editMovement.id,
        });
      }

      toast.success('Stock movement updated');
    } else {
      const { error } = await supabase.from('manufacturing_stock_movements').insert({
        company_id: company.id,
        ...data,
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create stock movement');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'manufacturing_stock_movements',
        });
      }

      toast.success('Stock movement created');
    }

    reset();
    setEditMovement(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('manufacturing_stock_movements').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete stock movement');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'manufacturing_stock_movements',
        record_id: deleteId,
      });
      toast.success('Stock movement deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'products', header: 'Product', cell: (v) => v ? `${v.name} (${v.sku})` : '-' },
    { key: 'warehouses', header: 'Warehouse', cell: (v) => v?.name || '-' },
    { key: 'warehouse_locations', header: 'Location', cell: (v) => v?.location_code || '-' },
    { key: 'movement_type', header: 'Type', sortable: true },
    { key: 'quantity', header: 'Quantity', sortable: true },
    { key: 'unit_cost', header: 'Unit Cost', sortable: true, cell: (v) => `$${v?.toFixed(2) || '0.00'}` },
    { key: 'reference_type', header: 'Reference', sortable: true },
    { key: 'created_at', header: 'Date', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy HH:mm') },
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
      <PageHeader title="Stock Movements" description="Track stock movements and adjustments" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Stock Movements' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditMovement(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Movement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMovement ? 'Edit Stock Movement' : 'New Stock Movement'}</DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label>Location</Label>
                    <Select {...register('location_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.location_code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Movement Type *</Label>
                  <Select {...register('movement_type')} defaultValue="receipt">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                      <SelectItem value="scrap">Scrap</SelectItem>
                      <SelectItem value="production_in">Production In</SelectItem>
                      <SelectItem value="production_out">Production Out</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.movement_type && <p className="text-red-500 text-sm">{errors.movement_type.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input type="number" step="0.01" {...register('quantity')} placeholder="0" />
                    {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity.message}</p>}
                  </div>
                  <div>
                    <Label>Unit Cost *</Label>
                    <Input type="number" step="0.01" {...register('unit_cost')} placeholder="0.00" />
                    {errors.unit_cost && <p className="text-red-500 text-sm">{errors.unit_cost.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reference Type</Label>
                    <Input {...register('reference_type')} placeholder="e.g., PO, WO" />
                  </div>
                  <div>
                    <Label>Reference ID</Label>
                    <Input {...register('reference_id')} placeholder="Reference ID" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Work Order</Label>
                    <Select {...register('work_order_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work order" />
                      </SelectTrigger>
                      <SelectContent>
                        {workOrders.map(wo => <SelectItem key={wo.id} value={wo.id}>{wo.work_order_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Production Run</Label>
                    <Select {...register('production_run_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select production run" />
                      </SelectTrigger>
                      <SelectContent>
                        {productionRuns.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.run_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
        <KPICard title="Total Movements" value={stats.totalMovements} icon={<TrendingUp className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Receipts" value={stats.receipts} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Issues" value={stats.issues} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Transfers" value={stats.transfers} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={movements}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Stock Movement"
        description="Are you sure you want to delete this stock movement? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
