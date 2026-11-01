'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Warehouse, Plus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const locationSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  location_code: z.string().min(1, 'Location code is required'),
  location_name: z.string().optional(),
  location_type: z.enum(['shelf', 'bin', 'zone', 'aisle', 'room', 'cold_storage', 'hazardous', 'other']),
  capacity: z.coerce.number().min(0, 'Capacity must be positive'),
  parent_location_id: z.string().optional(),
  notes: z.string().optional(),
});
type LocationForm = z.infer<typeof locationSchema>;

export default function WarehouseLocationsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.warehouse_locations.create');
  const canEdit = isAdmin || hasPermission('manufacturing.warehouse_locations.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.warehouse_locations.delete');

  const [locations, setLocations] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ totalLocations: 0, activeLocations: 0, totalCapacity: 0, utilization: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { location_type: 'shelf' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [locRes, whRes] = await Promise.all([
      supabase
        .from('warehouse_locations')
        .select('*, warehouses(name), parent_location:warehouse_locations_parent_location_id_fkey(location_code)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id),
    ]);

    if (locRes.error) {
      console.error('Error loading locations:', locRes.error);
      toast.error('Failed to load locations');
    }
    setLocations(locRes.data ?? []);
    setWarehouses(whRes.data ?? []);

    const totalLocations = locRes.data?.length || 0;
    const activeLocations = locRes.data?.filter(l => l.is_active).length || 0;
    const totalCapacity = locRes.data?.reduce((sum, l) => sum + (l.capacity || 0), 0) || 0;
    const utilization = locRes.data?.reduce((sum, l) => sum + (l.current_utilization || 0), 0) || 0;
    setStats({ totalLocations, activeLocations, totalCapacity, utilization });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (loc: any) => {
    setEditLocation(loc);
    reset({
      warehouse_id: loc.warehouse_id,
      location_code: loc.location_code,
      location_name: loc.location_name ?? '',
      location_type: loc.location_type,
      capacity: loc.capacity,
      parent_location_id: loc.parent_location_id ?? '',
      notes: loc.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: LocationForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editLocation) {
      const { error } = await supabase
        .from('warehouse_locations')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editLocation.id);

      if (error) {
        toast.error('Failed to update location');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'warehouse_locations',
          record_id: editLocation.id,
        });
      }

      toast.success('Location updated');
    } else {
      const { error } = await supabase.from('warehouse_locations').insert({
        company_id: company.id,
        ...data,
        is_active: true,
      });

      if (error) {
        toast.error('Failed to create location');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'warehouse_locations',
        });
      }

      toast.success('Location created');
    }

    reset();
    setEditLocation(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('warehouse_locations').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete location');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'warehouse_locations',
        record_id: deleteId,
      });
      toast.success('Location deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'location_code', header: 'Code', sortable: true },
    { key: 'location_name', header: 'Name', sortable: true },
    { key: 'warehouses', header: 'Warehouse', cell: (v) => v?.name || '-' },
    { key: 'location_type', header: 'Type', sortable: true },
    { key: 'capacity', header: 'Capacity', sortable: true },
    { key: 'current_utilization', header: 'Utilization', sortable: true },
    { key: 'parent_location', header: 'Parent', cell: (v) => v?.location_code || '-' },
    {
      key: 'is_active',
      header: 'Status',
      cell: (v) => <StatusBadge status={v ? 'active' : 'inactive'} />,
    },
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
      <PageHeader title="Warehouse Locations" description="Manage warehouse storage locations" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Warehouse Locations' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditLocation(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Location
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editLocation ? 'Edit Location' : 'New Location'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Warehouse *</Label>
                  <Select {...register('warehouse_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.warehouse_id && <p className="text-red-500 text-sm">{errors.warehouse_id.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location Code *</Label>
                    <Input {...register('location_code')} placeholder="A-01-01" />
                    {errors.location_code && <p className="text-red-500 text-sm">{errors.location_code.message}</p>}
                  </div>
                  <div>
                    <Label>Location Name</Label>
                    <Input {...register('location_name')} placeholder="Shelf A1" />
                  </div>
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select {...register('location_type')} defaultValue="shelf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shelf">Shelf</SelectItem>
                      <SelectItem value="bin">Bin</SelectItem>
                      <SelectItem value="zone">Zone</SelectItem>
                      <SelectItem value="aisle">Aisle</SelectItem>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="cold_storage">Cold Storage</SelectItem>
                      <SelectItem value="hazardous">Hazardous</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.location_type && <p className="text-red-500 text-sm">{errors.location_type.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Capacity</Label>
                    <Input type="number" {...register('capacity')} placeholder="0" />
                  </div>
                  <div>
                    <Label>Parent Location</Label>
                    <Select {...register('parent_location_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.location_code}</SelectItem>)}
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
        <KPICard title="Total Locations" value={stats.totalLocations} icon={<Warehouse className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Locations" value={stats.activeLocations} icon={<Warehouse className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Capacity" value={stats.totalCapacity.toLocaleString()} icon={<Warehouse className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Current Utilization" value={stats.utilization.toLocaleString()} icon={<Warehouse className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={locations}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
