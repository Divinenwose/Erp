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
import { Wrench, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const equipmentSchema = z.object({
  equipment_name: z.string().min(1, 'Equipment name is required'),
  equipment_type: z.enum(['machine', 'vehicle', 'tool', 'instrument', 'conveyor', 'crane', 'forklift', 'other']),
  serial_number: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  purchase_date: z.string().optional(),
  location_id: z.string().optional(),
  capacity: z.coerce.number().optional(),
  status: z.enum(['operational', 'maintenance', 'breakdown', 'retired']),
  notes: z.string().optional(),
});
type EquipmentForm = z.infer<typeof equipmentSchema>;

export default function EquipmentPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.equipment.create');
  const canEdit = isAdmin || hasPermission('manufacturing.equipment.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.equipment.delete');

  const [equipment, setEquipment] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEquipment, setEditEquipment] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, operational: 0, maintenance: 0, breakdown: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: { status: 'operational', equipment_type: 'machine' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [eqRes, locRes] = await Promise.all([
      supabase
        .from('equipment')
        .select('*, warehouse_locations(location_code)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('warehouse_locations').select('id, location_code').eq('company_id', company.id),
    ]);

    if (eqRes.error) {
      console.error('Error loading equipment:', eqRes.error);
      toast.error('Failed to load equipment');
    }
    setEquipment(eqRes.data ?? []);
    setLocations(locRes.data ?? []);

    const total = eqRes.data?.length || 0;
    const operational = eqRes.data?.filter(e => e.status === 'operational').length || 0;
    const maintenance = eqRes.data?.filter(e => e.status === 'maintenance').length || 0;
    const breakdown = eqRes.data?.filter(e => e.status === 'breakdown').length || 0;
    setStats({ total, operational, maintenance, breakdown });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (eq: any) => {
    setEditEquipment(eq);
    reset({
      equipment_name: eq.equipment_name,
      equipment_type: eq.equipment_type,
      serial_number: eq.serial_number ?? '',
      manufacturer: eq.manufacturer ?? '',
      model: eq.model ?? '',
      purchase_date: eq.purchase_date ?? '',
      location_id: eq.location_id ?? '',
      capacity: eq.capacity,
      status: eq.status,
      notes: eq.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EquipmentForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editEquipment) {
      const { error } = await supabase
        .from('equipment')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editEquipment.id);

      if (error) {
        toast.error('Failed to update equipment');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'equipment',
          record_id: editEquipment.id,
        });
      }

      toast.success('Equipment updated');
    } else {
      const { error } = await supabase.from('equipment').insert({
        company_id: company.id,
        ...data,
      });

      if (error) {
        toast.error('Failed to add equipment');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'equipment',
        });
      }

      toast.success('Equipment added');
    }

    reset();
    setEditEquipment(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('equipment').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete equipment');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'equipment',
        record_id: deleteId,
      });
      toast.success('Equipment deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'equipment_name', header: 'Equipment Name', sortable: true },
    { key: 'equipment_type', header: 'Type', sortable: true },
    { key: 'serial_number', header: 'Serial #', sortable: true },
    { key: 'manufacturer', header: 'Manufacturer', sortable: true },
    { key: 'model', header: 'Model', sortable: true },
    { key: 'warehouse_locations', header: 'Location', cell: (v) => v?.location_code || '-' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (v) => <StatusBadge status={v} />,
    },
    { key: 'purchase_date', header: 'Purchase Date', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
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
      <PageHeader title="Equipment" description="Manage equipment and machinery" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Equipment' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditEquipment(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editEquipment ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Equipment Name *</Label>
                  <Input {...register('equipment_name')} placeholder="Equipment name" />
                  {errors.equipment_name && <p className="text-red-500 text-sm">{errors.equipment_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select {...register('equipment_type')} defaultValue="machine">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="machine">Machine</SelectItem>
                        <SelectItem value="vehicle">Vehicle</SelectItem>
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="instrument">Instrument</SelectItem>
                        <SelectItem value="conveyor">Conveyor</SelectItem>
                        <SelectItem value="crane">Crane</SelectItem>
                        <SelectItem value="forklift">Forklift</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.equipment_type && <p className="text-red-500 text-sm">{errors.equipment_type.message}</p>}
                  </div>
                  <div>
                    <Label>Status *</Label>
                    <Select {...register('status')} defaultValue="operational">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operational">Operational</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="breakdown">Breakdown</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && <p className="text-red-500 text-sm">{errors.status.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Serial Number</Label>
                    <Input {...register('serial_number')} placeholder="Serial number" />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input {...register('model')} placeholder="Model" />
                  </div>
                </div>
                <div>
                  <Label>Manufacturer</Label>
                  <Input {...register('manufacturer')} placeholder="Manufacturer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <Input type="date" {...register('purchase_date')} />
                  </div>
                  <div>
                    <Label>Capacity</Label>
                    <Input type="number" {...register('capacity')} placeholder="0" />
                  </div>
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
        <KPICard title="Total Equipment" value={stats.total} icon={<Wrench className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Operational" value={stats.operational} icon={<Wrench className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="In Maintenance" value={stats.maintenance} icon={<Wrench className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
        <KPICard title="Breakdown" value={stats.breakdown} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={equipment}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Equipment"
        description="Are you sure you want to delete this equipment? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
