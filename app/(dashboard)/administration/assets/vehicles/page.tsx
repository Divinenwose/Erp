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
import { Car, Plus, Edit, Trash2, MapPin, DollarSign, Gauge } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const vehicleSchema = z.object({
  vehicle_number: z.string().min(1, 'Required'),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional(),
  type: z.enum(['car', 'truck', 'van', 'motorcycle', 'other']),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']),
  purchase_date: z.string().optional(),
  purchase_cost: z.string().optional(),
  current_mileage: z.string().optional(),
  insurance_expiry: z.string().optional(),
  registration_expiry: z.string().optional(),
  branch_id: z.string().optional(),
  assigned_to: z.string().optional(),
});
type VehicleForm = z.infer<typeof vehicleSchema>;

export default function VehiclesPage() {
  const { company, user: currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { type: 'car', fuel_type: 'petrol' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [vehRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*, branches(name), assigned_to_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('vehicle_number'),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setVehicles(vehRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (vehicle: any) => {
    setEditVehicle(vehicle);
    reset({
      vehicle_number: vehicle.vehicle_number,
      make: vehicle.make ?? '',
      model: vehicle.model ?? '',
      year: vehicle.year?.toString() ?? '',
      type: vehicle.type,
      fuel_type: vehicle.fuel_type,
      purchase_date: vehicle.purchase_date ?? '',
      purchase_cost: vehicle.purchase_cost?.toString() ?? '',
      current_mileage: vehicle.current_mileage?.toString() ?? '',
      insurance_expiry: vehicle.insurance_expiry ?? '',
      registration_expiry: vehicle.registration_expiry ?? '',
      branch_id: vehicle.branch_id ?? undefined,
      assigned_to: vehicle.assigned_to ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: VehicleForm) => {
    if (!company?.id) return;

    const payload = {
      vehicle_number: data.vehicle_number,
      make: data.make,
      model: data.model,
      year: data.year ? parseInt(data.year) : null,
      type: data.type,
      fuel_type: data.fuel_type,
      purchase_date: data.purchase_date || null,
      purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : null,
      current_mileage: data.current_mileage ? parseInt(data.current_mileage) : null,
      insurance_expiry: data.insurance_expiry || null,
      registration_expiry: data.registration_expiry || null,
      branch_id: data.branch_id,
      assigned_to: data.assigned_to,
    };

    if (editVehicle) {
      const { error } = await supabase
        .from('vehicles')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editVehicle.id);

      if (error) {
        toast.error('Failed to update vehicle');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'vehicle_updated',
        module: 'assets',
        record_id: editVehicle.id,
        new_values: { vehicle_number: data.vehicle_number },
      });

      toast.success('Vehicle updated');
    } else {
      const { error } = await supabase.from('vehicles').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create vehicle');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'vehicle_created',
        module: 'assets',
        new_values: { vehicle_number: data.vehicle_number },
      });

      toast.success('Vehicle created');
    }

    reset();
    setEditVehicle(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('vehicles').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete vehicle');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'vehicle_deleted',
        module: 'assets',
        record_id: deleteId,
      });
      toast.success('Vehicle deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('vehicles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'vehicle_status_updated',
        module: 'assets',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Vehicle Number', 'Make', 'Model', 'Year', 'Type', 'Fuel Type', 'Mileage', 'Branch', 'Assigned To', 'Status', 'Insurance Expiry', 'Registration Expiry'];
    const rows = vehicles.map(v => [
      v.vehicle_number,
      v.make || '',
      v.model || '',
      v.year || '',
      v.type,
      v.fuel_type,
      v.current_mileage || '',
      v.branches?.name || '',
      v.assigned_to_profile ? `${v.assigned_to_profile.first_name} ${v.assigned_to_profile.last_name}` : '',
      v.status,
      v.insurance_expiry || '',
      v.registration_expiry || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicles.csv';
    a.click();
  };

  const typeColors: Record<string, string> = {
    car: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    truck: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    van: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    motorcycle: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const columns: Column<any>[] = [
    {
      key: 'vehicle_number',
      header: 'Vehicle',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Car className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.vehicle_number}</p>
            <p className="text-xs text-gray-400">{row.make} {row.model} {row.year}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={`${typeColors[row.type] || typeColors.other} capitalize`} variant="secondary">
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'fuel_type',
      header: 'Fuel',
      cell: (row) => <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{row.fuel_type}</span>,
    },
    {
      key: 'current_mileage',
      header: 'Mileage',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Gauge className="h-3 w-3" />
          <span>{row.current_mileage ? row.current_mileage.toLocaleString() : '—'} km</span>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.branches?.name || '—'}</span>,
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
                <Car className="h-4 w-4 mr-2" />Set Maintenance
              </DropdownMenuItem>
            )}
            {row.status === 'maintenance' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'active')}>
                <Car className="h-4 w-4 mr-2" />Set Active
              </DropdownMenuItem>
            )}
            <Can resource="assets.vehicles" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = vehicles.filter(v => v.status === 'active').length;
  const totalValue = vehicles.reduce((sum, v) => sum + (v.purchase_cost || 0), 0);

  return (
    <PermissionGuard permission="assets.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view vehicles</div>}>
      <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Manage company vehicles and fleet"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Assets' }, { label: 'Vehicles' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="assets.vehicles" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditVehicle(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild={false}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Vehicle Number *</Label>
                      <Input className="mt-1" {...register('vehicle_number')} />
                      {errors.vehicle_number && <p className="text-xs text-red-500 mt-1">{errors.vehicle_number.message}</p>}
                    </div>
                    <div>
                      <Label>Make</Label>
                      <Input className="mt-1" {...register('make')} placeholder="e.g., Toyota" />
                    </div>
                    <div>
                      <Label>Model</Label>
                      <Input className="mt-1" {...register('model')} placeholder="e.g., Camry" />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input className="mt-1" type="number" {...register('year')} placeholder="e.g., 2023" />
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Controller name="type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="car">Car</SelectItem>
                            <SelectItem value="truck">Truck</SelectItem>
                            <SelectItem value="van">Van</SelectItem>
                            <SelectItem value="motorcycle">Motorcycle</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Fuel Type *</Label>
                      <Controller name="fuel_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="petrol">Petrol</SelectItem>
                            <SelectItem value="diesel">Diesel</SelectItem>
                            <SelectItem value="electric">Electric</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
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
                      <Label>Current Mileage</Label>
                      <Input className="mt-1" type="number" {...register('current_mileage')} placeholder="km" />
                    </div>
                    <div>
                      <Label>Insurance Expiry</Label>
                      <Input className="mt-1" type="date" {...register('insurance_expiry')} />
                    </div>
                    <div>
                      <Label>Registration Expiry</Label>
                      <Input className="mt-1" type="date" {...register('registration_expiry')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditVehicle(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editVehicle ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Vehicles" value={vehicles.length} icon={<Car className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<Car className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Value" value={`$${totalValue.toFixed(2)}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        data={vehicles}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search vehicles..."
        searchKeys={['vehicle_number', 'make', 'model']}
        pageSize={15}
        emptyTitle="No vehicles"
        emptyDescription="Add vehicles to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Vehicle?"
        description="This will permanently delete the vehicle record."
        confirmLabel="Delete"
      />
      </div>
    </PermissionGuard>
  );
}
