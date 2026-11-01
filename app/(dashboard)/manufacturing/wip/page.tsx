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
import { Layers, Plus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const wipSchema = z.object({
  work_order_id: z.string().min(1, 'Work order is required'),
  production_run_id: z.string().optional(),
  product_id: z.string().optional(),
  warehouse_id: z.string().optional(),
  quantity: z.coerce.number().min(0, 'Quantity must be positive'),
  stage: z.string().optional(),
  notes: z.string().optional(),
});
type WIPForm = z.infer<typeof wipSchema>;

export default function WIPPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.wip.create');
  const canEdit = isAdmin || hasPermission('manufacturing.wip.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.wip.delete');

  const [wip, setWIP] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [productionRuns, setProductionRuns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWIP, setEditWIP] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ totalQuantity: 0, totalValue: 0, activeWOs: 0, stages: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WIPForm>({
    resolver: zodResolver(wipSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [wipRes, woRes, prRes, prodRes, whRes] = await Promise.all([
      supabase
        .from('wip_inventory')
        .select('*, work_orders(work_order_number, title), production_runs(run_number), products(name), warehouses(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('work_orders').select('id, work_order_number, title').eq('company_id', company.id),
      supabase.from('production_runs').select('id, run_number').eq('company_id', company.id),
      supabase.from('products').select('id, name').eq('company_id', company.id),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id),
    ]);

    if (wipRes.error) {
      console.error('Error loading WIP:', wipRes.error);
      toast.error('Failed to load WIP');
    }
    setWIP(wipRes.data ?? []);
    setWorkOrders(woRes.data ?? []);
    setProductionRuns(prRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setWarehouses(whRes.data ?? []);

    const totalQuantity = wipRes.data?.reduce((sum, w) => sum + (w.quantity || 0), 0) || 0;
    const activeWOs = new Set(wipRes.data?.map(w => w.work_order_id)).size || 0;
    const stages = new Set(wipRes.data?.map(w => w.stage)).size || 0;
    setStats({ totalQuantity, totalValue: 0, activeWOs, stages });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (w: any) => {
    setEditWIP(w);
    reset({
      work_order_id: w.work_order_id,
      production_run_id: w.production_run_id ?? '',
      product_id: w.product_id ?? '',
      warehouse_id: w.warehouse_id ?? '',
      quantity: w.quantity,
      stage: w.stage ?? '',
      notes: w.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: WIPForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editWIP) {
      const { error } = await supabase
        .from('wip_inventory')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editWIP.id);

      if (error) {
        toast.error('Failed to update WIP');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'wip_inventory',
          record_id: editWIP.id,
        });
      }

      toast.success('WIP updated');
    } else {
      const { error } = await supabase.from('wip_inventory').insert({
        company_id: company.id,
        ...data,
        started_at: new Date().toISOString(),
      });

      if (error) {
        toast.error('Failed to create WIP');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'wip_inventory',
        });
      }

      toast.success('WIP created');
    }

    reset();
    setEditWIP(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('wip_inventory').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete WIP');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'wip_inventory',
        record_id: deleteId,
      });
      toast.success('WIP deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'work_orders', header: 'Work Order', cell: (v) => v ? `${v.work_order_number}` : '-' },
    { key: 'production_runs', header: 'Production Run', cell: (v) => v?.run_number || '-' },
    { key: 'products', header: 'Product', cell: (v) => v?.name || '-' },
    { key: 'warehouses', header: 'Warehouse', cell: (v) => v?.name || '-' },
    { key: 'quantity', header: 'Quantity', sortable: true },
    { key: 'stage', header: 'Stage', sortable: true },
    { key: 'started_at', header: 'Started', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
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
      <PageHeader title="Work-in-Progress" description="Track WIP inventory" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'WIP' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditWIP(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> Add WIP
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editWIP ? 'Edit WIP' : 'Add WIP'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Work Order *</Label>
                  <Select {...register('work_order_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work order" />
                    </SelectTrigger>
                    <SelectContent>
                      {workOrders.map(wo => <SelectItem key={wo.id} value={wo.id}>{wo.work_order_number} - {wo.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.work_order_id && <p className="text-red-500 text-sm">{errors.work_order_id.message}</p>}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product</Label>
                    <Select {...register('product_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input type="number" {...register('quantity')} placeholder="0" />
                    {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity.message}</p>}
                  </div>
                  <div>
                    <Label>Stage</Label>
                    <Input {...register('stage')} placeholder="e.g., Assembly" />
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
        <KPICard title="Total Quantity" value={stats.totalQuantity.toLocaleString()} icon={<Layers className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Work Orders" value={stats.activeWOs} icon={<Layers className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Production Stages" value={stats.stages} icon={<Layers className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={wip}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete WIP"
        description="Are you sure you want to delete this WIP record? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
