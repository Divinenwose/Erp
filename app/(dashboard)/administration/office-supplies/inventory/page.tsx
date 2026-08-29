'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
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
import { Package, Plus, Edit, Trash2, AlertTriangle, DollarSign, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const inventorySchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.string().min(1, 'Required'),
  unit: z.enum(['piece', 'box', 'pack', 'set', 'kg', 'liter', 'other']),
  min_stock_level: z.string().optional(),
  unit_cost: z.string().optional(),
  location: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type InventoryForm = z.infer<typeof inventorySchema>;

export default function InventoryPage() {
  const { company, user: currentUser } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { unit: 'piece' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [invRes, branchRes] = await Promise.all([
      supabase
        .from('office_supplies_inventory')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('name'),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setInventory(invRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      name: item.name,
      category: item.category ?? '',
      sku: item.sku ?? '',
      quantity: item.quantity?.toString() ?? '0',
      unit: item.unit,
      min_stock_level: item.min_stock_level?.toString() ?? '',
      unit_cost: item.unit_cost?.toString() ?? '',
      location: item.location ?? '',
      branch_id: item.branch_id ?? undefined,
      notes: item.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: InventoryForm) => {
    if (!company?.id) return;

    const payload = {
      name: data.name,
      category: data.category,
      sku: data.sku,
      quantity: parseInt(data.quantity),
      unit: data.unit,
      min_stock_level: data.min_stock_level ? parseInt(data.min_stock_level) : null,
      unit_cost: data.unit_cost ? parseFloat(data.unit_cost) : null,
      location: data.location,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editItem) {
      const { error } = await supabase
        .from('office_supplies_inventory')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editItem.id);

      if (error) {
        toast.error('Failed to update inventory item');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_inventory_updated',
        module: 'office_supplies',
        record_id: editItem.id,
        new_values: { name: data.name },
      });

      toast.success('Inventory item updated');
    } else {
      const { error } = await supabase.from('office_supplies_inventory').insert({
        company_id: company.id,
        ...payload,
        status: 'in_stock',
      });

      if (error) {
        toast.error('Failed to create inventory item');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_inventory_created',
        module: 'office_supplies',
        new_values: { name: data.name },
      });

      toast.success('Inventory item created');
    }

    reset();
    setEditItem(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('office_supplies_inventory').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete inventory item');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_inventory_deleted',
        module: 'office_supplies',
        record_id: deleteId,
      });
      toast.success('Inventory item deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleRestock = async (id: string, quantity: number) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('office_supplies_inventory')
      .update({ 
        quantity,
        status: quantity > 0 ? 'in_stock' : 'out_of_stock',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update quantity');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_inventory_restocked',
        module: 'office_supplies',
        record_id: id,
      });
      toast.success('Quantity updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Category', 'SKU', 'Quantity', 'Unit', 'Min Stock Level', 'Unit Cost', 'Total Value', 'Location', 'Status', 'Branch'];
    const rows = inventory.map(i => [
      i.name,
      i.category || '',
      i.sku || '',
      i.quantity,
      i.unit,
      i.min_stock_level || '',
      i.unit_cost || '',
      (i.quantity * (i.unit_cost || 0)).toFixed(2),
      i.location || '',
      i.status,
      i.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'office_supplies_inventory.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
      header: 'Quantity',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{row.quantity} {row.unit}</span>
          {row.min_stock_level && row.quantity <= row.min_stock_level && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />Low
            </Badge>
          )}
        </div>
      ),
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
      key: 'total_value',
      header: 'Total Value',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <DollarSign className="h-3 w-3" />
          <span>{(row.quantity * (row.unit_cost || 0)).toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.location || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
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
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-10',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 mr-2" />Edit
            </DropdownMenuItem>
            <Can resource="office_supplies.inventory" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const inStock = inventory.filter(i => i.status === 'in_stock').length;
  const lowStock = inventory.filter(i => i.min_stock_level && i.quantity <= i.min_stock_level).length;
  const totalValue = inventory.reduce((sum, i) => sum + (i.quantity * (i.unit_cost || 0)), 0);

  return (
    <PermissionGuard permission="office_supplies.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view office supplies inventory</div>}>
      <div className="space-y-6">
      <PageHeader
        title="Office Supplies Inventory"
        description="Manage office supplies and stock levels"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Office Supplies' }, { label: 'Inventory' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="office_supplies.inventory" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditItem(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editItem ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Name *</Label>
                      <Input className="mt-1" {...register('name')} />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input className="mt-1" {...register('category')} placeholder="e.g., Stationery" />
                    </div>
                    <div>
                      <Label>SKU</Label>
                      <Input className="mt-1" {...register('sku')} />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input className="mt-1" type="number" {...register('quantity')} />
                      {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>}
                    </div>
                    <div>
                      <Label>Unit *</Label>
                      <Controller name="unit" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piece">Piece</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="pack">Pack</SelectItem>
                            <SelectItem value="set">Set</SelectItem>
                            <SelectItem value="kg">Kilogram</SelectItem>
                            <SelectItem value="liter">Liter</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Min Stock Level</Label>
                      <Input className="mt-1" type="number" {...register('min_stock_level')} />
                    </div>
                    <div>
                      <Label>Unit Cost</Label>
                      <Input className="mt-1" type="number" step="0.01" {...register('unit_cost')} />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input className="mt-1" {...register('location')} placeholder="e.g., Shelf A" />
                    </div>
                    <div>
                      <Label>Branch</Label>
                      <Controller name="branch_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditItem(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editItem ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Items" value={inventory.length} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Stock" value={inStock} icon={<Package className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Low Stock" value={lowStock} icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Total Value" value={`$${totalValue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        data={inventory}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search inventory..."
        searchKeys={['name', 'category', 'sku']}
        pageSize={15}
        emptyTitle="No inventory items"
        emptyDescription="Add inventory items to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Inventory Item?"
        description="This will permanently delete the inventory item."
        confirmLabel="Delete"
      />
      </div>
    </PermissionGuard>
  );
}
