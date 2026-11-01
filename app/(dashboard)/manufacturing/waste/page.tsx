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
import { Archive, Plus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const wasteSchema = z.object({
  waste_type: z.enum(['material', 'defective_product', 'scrap', 'hazardous', 'packaging', 'other']),
  product_id: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Quantity must be positive'),
  unit: z.string().default('kg'),
  reason: z.string().min(1, 'Reason is required'),
  cost: z.coerce.number().min(0, 'Cost must be positive'),
  notes: z.string().optional(),
});
type WasteForm = z.infer<typeof wasteSchema>;

export default function WastePage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.waste.create');
  const canEdit = isAdmin || hasPermission('manufacturing.waste.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.waste.delete');

  const [waste, setWaste] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWaste, setEditWaste] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ totalRecords: 0, totalQuantity: 0, totalCost: 0, hazardous: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WasteForm>({
    resolver: zodResolver(wasteSchema),
    defaultValues: { unit: 'kg', waste_type: 'material' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [wasteRes, prodRes] = await Promise.all([
      supabase
        .from('process_waste')
        .select('*, products(name), created_profile:profiles!process_waste_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name').eq('company_id', company.id),
    ]);

    if (wasteRes.error) {
      console.error('Error loading waste records:', wasteRes.error);
      toast.error('Failed to load waste records');
    }
    setWaste(wasteRes.data ?? []);
    setProducts(prodRes.data ?? []);

    const totalRecords = wasteRes.data?.length || 0;
    const totalQuantity = wasteRes.data?.reduce((sum, w) => sum + (w.quantity || 0), 0) || 0;
    const totalCost = wasteRes.data?.reduce((sum, w) => sum + (w.cost || 0), 0) || 0;
    const hazardous = wasteRes.data?.filter(w => w.waste_type === 'hazardous').length || 0;
    setStats({ totalRecords, totalQuantity, totalCost, hazardous });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (w: any) => {
    setEditWaste(w);
    reset({
      waste_type: w.waste_type,
      product_id: w.product_id ?? '',
      quantity: w.quantity,
      unit: w.unit,
      reason: w.reason,
      cost: w.cost,
      notes: w.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: WasteForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editWaste) {
      const { error } = await supabase
        .from('process_waste')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editWaste.id);

      if (error) {
        toast.error('Failed to update waste record');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'process_waste',
          record_id: editWaste.id,
        });
      }

      toast.success('Waste record updated');
    } else {
      const { error } = await supabase.from('process_waste').insert({
        company_id: company.id,
        ...data,
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create waste record');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'process_waste',
        });
      }

      toast.success('Waste record created');
    }

    reset();
    setEditWaste(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('process_waste').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete waste record');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'process_waste',
        record_id: deleteId,
      });
      toast.success('Waste record deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'waste_type', header: 'Type', sortable: true },
    { key: 'products', header: 'Product', cell: (v) => v?.name || '-' },
    { key: 'quantity', header: 'Quantity', sortable: true },
    { key: 'unit', header: 'Unit', sortable: true },
    { key: 'cost', header: 'Cost', sortable: true, cell: (v) => `$${v?.toFixed(2) || '0.00'}` },
    { key: 'reason', header: 'Reason', sortable: true },
    { key: 'created_at', header: 'Date', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy') },
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
      <PageHeader title="Process Waste" description="Track waste and losses" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Waste' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditWaste(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> Record Waste
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editWaste ? 'Edit Waste Record' : 'Record Waste'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Type *</Label>
                  <Select {...register('waste_type')} defaultValue="material">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="defective_product">Defective Product</SelectItem>
                      <SelectItem value="scrap">Scrap</SelectItem>
                      <SelectItem value="hazardous">Hazardous</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.waste_type && <p className="text-red-500 text-sm">{errors.waste_type.message}</p>}
                </div>
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input type="number" step="0.01" {...register('quantity')} placeholder="0" />
                    {errors.quantity && <p className="text-red-500 text-sm">{errors.quantity.message}</p>}
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input {...register('unit')} placeholder="kg" />
                  </div>
                  <div>
                    <Label>Cost *</Label>
                    <Input type="number" step="0.01" {...register('cost')} placeholder="0.00" />
                    {errors.cost && <p className="text-red-500 text-sm">{errors.cost.message}</p>}
                  </div>
                </div>
                <div>
                  <Label>Reason *</Label>
                  <Textarea {...register('reason')} placeholder="Reason for waste" rows={2} />
                  {errors.reason && <p className="text-red-500 text-sm">{errors.reason.message}</p>}
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
        <KPICard title="Total Records" value={stats.totalRecords} icon={<Archive className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Quantity" value={stats.totalQuantity.toLocaleString()} icon={<Archive className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Cost" value={`$${stats.totalCost.toLocaleString()}`} icon={<Archive className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Hazardous" value={stats.hazardous} icon={<Archive className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={waste}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Waste Record"
        description="Are you sure you want to delete this waste record? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
