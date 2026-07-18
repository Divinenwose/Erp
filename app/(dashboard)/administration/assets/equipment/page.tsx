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
import { Cpu, Plus, Edit, Trash2, MapPin, DollarSign, Tag } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const equipmentSchema = z.object({
  name: z.string().min(1, 'Required'),
  serial_number: z.string().optional(),
  category: z.string().optional(),
  model: z.string().optional(),
  manufacturer: z.string().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']),
  purchase_date: z.string().optional(),
  purchase_cost: z.string().optional(),
  warranty_expiry: z.string().optional(),
  location: z.string().optional(),
  branch_id: z.string().optional(),
  assigned_to: z.string().optional(),
});
type EquipmentForm = z.infer<typeof equipmentSchema>;

export default function EquipmentPage() {
  const { company, user: currentUser } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: { condition: 'good' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [eqRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('equipment')
        .select('*, branches(name), assigned_to_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('name'),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setEquipment(eqRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({
      name: item.name,
      serial_number: item.serial_number ?? '',
      category: item.category ?? '',
      model: item.model ?? '',
      manufacturer: item.manufacturer ?? '',
      condition: item.condition,
      purchase_date: item.purchase_date ?? '',
      purchase_cost: item.purchase_cost?.toString() ?? '',
      warranty_expiry: item.warranty_expiry ?? '',
      location: item.location ?? '',
      branch_id: item.branch_id ?? undefined,
      assigned_to: item.assigned_to ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EquipmentForm) => {
    if (!company?.id) return;

    const payload = {
      name: data.name,
      serial_number: data.serial_number,
      category: data.category,
      model: data.model,
      manufacturer: data.manufacturer,
      condition: data.condition,
      purchase_date: data.purchase_date || null,
      purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : null,
      warranty_expiry: data.warranty_expiry || null,
      location: data.location,
      branch_id: data.branch_id,
      assigned_to: data.assigned_to,
    };

    if (editItem) {
      const { error } = await supabase
        .from('equipment')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editItem.id);

      if (error) {
        toast.error('Failed to update equipment');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'equipment_updated',
        module: 'assets',
        record_id: editItem.id,
        new_values: { name: data.name },
      });

      toast.success('Equipment updated');
    } else {
      const { error } = await supabase.from('equipment').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create equipment');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'equipment_created',
        module: 'assets',
        new_values: { name: data.name },
      });

      toast.success('Equipment created');
    }

    reset();
    setEditItem(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('equipment').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete equipment');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'equipment_deleted',
        module: 'assets',
        record_id: deleteId,
      });
      toast.success('Equipment deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('equipment')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'equipment_status_updated',
        module: 'assets',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Serial Number', 'Category', 'Model', 'Manufacturer', 'Condition', 'Location', 'Branch', 'Assigned To', 'Status', 'Purchase Cost'];
    const rows = equipment.map(e => [
      e.name,
      e.serial_number || '',
      e.category || '',
      e.model || '',
      e.manufacturer || '',
      e.condition,
      e.location || '',
      e.branches?.name || '',
      e.assigned_to_profile ? `${e.assigned_to_profile.first_name} ${e.assigned_to_profile.last_name}` : '',
      e.status,
      e.purchase_cost || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipment.csv';
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
            <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.serial_number && <p className="text-xs text-gray-400">SN: {row.serial_number}</p>}
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
      key: 'model',
      header: 'Model',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.model || '—'}</span>,
    },
    {
      key: 'manufacturer',
      header: 'Manufacturer',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.manufacturer || '—'}</span>,
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
                <Cpu className="h-4 w-4 mr-2" />Set Maintenance
              </DropdownMenuItem>
            )}
            {row.status === 'maintenance' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'active')}>
                <Cpu className="h-4 w-4 mr-2" />Set Active
              </DropdownMenuItem>
            )}
            <Can resource="assets.equipment" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = equipment.filter(e => e.status === 'active').length;
  const totalValue = equipment.reduce((sum, e) => sum + (e.purchase_cost || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        description="Manage office equipment and devices"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Assets' }, { label: 'Equipment' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="assets.equipment" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditItem(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Equipment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editItem ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Name *</Label>
                      <Input className="mt-1" {...register('name')} />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label>Serial Number</Label>
                      <Input className="mt-1" {...register('serial_number')} />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input className="mt-1" {...register('category')} placeholder="e.g., Laptop, Printer" />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Input className="mt-1" {...register('model')} />
                    </div>
                    <div>
                      <Label>Manufacturer</Label>
                      <Input className="mt-1" {...register('manufacturer')} />
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
                      <Label>Warranty Expiry</Label>
                      <Input className="mt-1" type="date" {...register('warranty_expiry')} />
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
        <KPICard title="Total Items" value={equipment.length} icon={<Cpu className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<Cpu className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Value" value={`$${totalValue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        data={equipment}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search equipment..."
        searchKeys={['name', 'serial_number', 'category', 'model', 'manufacturer']}
        pageSize={15}
        emptyTitle="No equipment"
        emptyDescription="Add equipment to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Equipment?"
        description="This will permanently delete the equipment record."
        confirmLabel="Delete"
      />
    </div>
  );
}
