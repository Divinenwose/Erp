'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { Can } from '@/components/rbac/PermissionGuard';
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
import { Sofa, Plus, Edit, Trash2, MapPin, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const furnitureSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  quantity: z.string().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  purchase_date: z.string().optional(),
  purchase_cost: z.string().optional(),
  current_value: z.string().optional(),
  location: z.string().optional(),
  branch_id: z.string().optional(),
  assigned_to: z.string().optional(),
});
type FurnitureForm = z.infer<typeof furnitureSchema>;

export default function FurniturePage() {
  const { company, user: currentUser } = useAuth();
  const [furniture, setFurniture] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FurnitureForm>({
    resolver: zodResolver(furnitureSchema),
    defaultValues: { condition: 'good' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [furnRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('furniture')
        .select('*, branches(name), assigned_to_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('name'),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setFurniture(furnRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      name: item.name,
      category: item.category ?? '',
      quantity: item.quantity?.toString() ?? '1',
      condition: item.condition,
      purchase_date: item.purchase_date ?? '',
      purchase_cost: item.purchase_cost?.toString() ?? '',
      current_value: item.current_value?.toString() ?? '',
      location: item.location ?? '',
      branch_id: item.branch_id ?? undefined,
      assigned_to: item.assigned_to ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FurnitureForm) => {
    if (!company?.id) return;

    const payload = {
      name: data.name,
      category: data.category,
      quantity: data.quantity ? parseInt(data.quantity) : 1,
      condition: data.condition,
      purchase_date: data.purchase_date || null,
      purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : null,
      current_value: data.current_value ? parseFloat(data.current_value) : null,
      location: data.location,
      branch_id: data.branch_id,
      assigned_to: data.assigned_to,
    };

    if (editItem) {
      const { error } = await supabase
        .from('furniture')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editItem.id);

      if (error) {
        toast.error('Failed to update furniture');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'furniture_updated',
        module: 'assets',
        record_id: editItem.id,
        new_values: { name: data.name },
      });

      toast.success('Furniture updated');
    } else {
      const { error } = await supabase.from('furniture').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create furniture');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'furniture_created',
        module: 'assets',
        new_values: { name: data.name },
      });

      toast.success('Furniture created');
    }

    reset();
    setEditItem(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('furniture').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete furniture');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'furniture_deleted',
        module: 'assets',
        record_id: deleteId,
      });
      toast.success('Furniture deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('furniture')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'furniture_status_updated',
        module: 'assets',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Category', 'Quantity', 'Condition', 'Location', 'Branch', 'Assigned To', 'Status', 'Purchase Cost', 'Current Value'];
    const rows = furniture.map(f => [
      f.name,
      f.category || '',
      f.quantity || '',
      f.condition,
      f.location || '',
      f.branches?.name || '',
      f.assigned_to_profile ? `${f.assigned_to_profile.first_name} ${f.assigned_to_profile.last_name}` : '',
      f.status,
      f.purchase_cost || '',
      f.current_value || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'furniture.csv';
    a.click();
  };

  const conditionColors: Record<string, string> = {
    excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Sofa className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.category && <p className="text-xs text-gray-400">{row.category}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      sortable: true,
      cell: (row) => <span className="text-sm">{row.quantity || 1}</span>,
    },
    {
      key: 'condition',
      header: 'Condition',
      sortable: true,
      cell: (row) => (
        <Badge className={conditionColors[row.condition] || conditionColors.good} variant="secondary">
          {row.condition}
        </Badge>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="h-3 w-3" />
          <span>{row.location || '—'}</span>
        </div>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned To',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.assigned_to_profile ? `${row.assigned_to_profile.first_name} ${row.assigned_to_profile.last_name}` : '—'}
        </span>
      ),
    },
    {
      key: 'purchase_cost',
      header: 'Cost',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <DollarSign className="h-3 w-3" />
          <span>{row.purchase_cost ? row.purchase_cost.toFixed(2) : '—'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
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
            {row.status === 'active' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'maintenance')}>
                <Sofa className="h-4 w-4 mr-2" />Set Maintenance
              </DropdownMenuItem>
            )}
            {row.status === 'maintenance' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'active')}>
                <Sofa className="h-4 w-4 mr-2" />Set Active
              </DropdownMenuItem>
            )}
            <Can resource="assets.furniture" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = furniture.filter(f => f.status === 'active').length;
  const totalValue = furniture.reduce((sum, f) => sum + (f.current_value || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Furniture"
        description="Manage office furniture and fixtures"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Assets' }, { label: 'Furniture' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="assets.furniture" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditItem(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Furniture
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editItem ? 'Edit Furniture' : 'Add Furniture'}</DialogTitle>
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
                      <Input className="mt-1" {...register('category')} placeholder="e.g., Desk, Chair" />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input className="mt-1" type="number" {...register('quantity')} defaultValue="1" />
                    </div>
                    <div>
                      <Label>Condition *</Label>
                      <Controller name="condition" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
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
                    <div>
                      <Label>Location</Label>
                      <Input className="mt-1" {...register('location')} placeholder="e.g., Floor 2" />
                    </div>
                    <div>
                      <Label>Assign To</Label>
                      <Controller name="assigned_to" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Purchase Date</Label>
                      <Input className="mt-1" type="date" {...register('purchase_date')} />
                    </div>
                    <div>
                      <Label>Purchase Cost</Label>
                      <Input className="mt-1" type="number" step="0.01" {...register('purchase_cost')} />
                    </div>
                    <div>
                      <Label>Current Value</Label>
                      <Input className="mt-1" type="number" step="0.01" {...register('current_value')} />
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
        <KPICard title="Total Items" value={furniture.length} icon={<Sofa className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<Sofa className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Value" value={`$${totalValue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        data={furniture}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search furniture..."
        searchKeys={['name', 'category', 'location']}
        pageSize={15}
        emptyTitle="No furniture"
        emptyDescription="Add furniture to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Furniture?"
        description="This will permanently delete the furniture record."
        confirmLabel="Delete"
      />
    </div>
  );
}
