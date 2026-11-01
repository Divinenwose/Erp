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
import { Wrench, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const maintenanceSchema = z.object({
  equipment_id: z.string().min(1, 'Equipment is required'),
  maintenance_type: z.enum(['preventive', 'corrective', 'predictive', 'emergency', 'other']),
  scheduled_date: z.string().min(1, 'Scheduled date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().optional(),
  estimated_hours: z.coerce.number().min(0, 'Estimated hours must be positive'),
  description: z.string().optional(),
  notes: z.string().optional(),
});
type MaintenanceForm = z.infer<typeof maintenanceSchema>;

export default function MaintenancePage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.maintenance.create');
  const canEdit = isAdmin || hasPermission('manufacturing.maintenance.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.maintenance.delete');
  const canComplete = isAdmin || hasPermission('manufacturing.maintenance.complete');

  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMaintenance, setEditMaintenance] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ scheduled: 0, inProgress: 0, completed: 0, overdue: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MaintenanceForm>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { maintenance_type: 'preventive', priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [maintRes, eqRes, empRes] = await Promise.all([
      supabase
        .from('equipment_maintenance')
        .select('*, equipment(equipment_name), assigned_profile:profiles!equipment_maintenance_assigned_to_fkey(first_name, last_name), completed_profile:profiles!equipment_maintenance_completed_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('equipment').select('id, equipment_name').eq('company_id', company.id),
      supabase.from('employees').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    if (maintRes.error) {
      console.error('Error loading maintenance:', maintRes.error);
      toast.error('Failed to load maintenance records');
    }
    setMaintenance(maintRes.data ?? []);
    setEquipment(eqRes.data ?? []);
    setEmployees(empRes.data ?? []);

    const scheduled = maintRes.data?.filter(m => m.status === 'scheduled').length || 0;
    const inProgress = maintRes.data?.filter(m => m.status === 'in_progress').length || 0;
    const completed = maintRes.data?.filter(m => m.status === 'completed').length || 0;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = maintRes.data?.filter(m => m.status === 'scheduled' && m.scheduled_date < today).length || 0;
    setStats({ scheduled, inProgress, completed, overdue });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (m: any) => {
    setEditMaintenance(m);
    reset({
      equipment_id: m.equipment_id,
      maintenance_type: m.maintenance_type,
      scheduled_date: m.scheduled_date,
      priority: m.priority,
      assigned_to: m.assigned_to ?? '',
      estimated_hours: m.estimated_hours,
      description: m.description ?? '',
      notes: m.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: MaintenanceForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editMaintenance) {
      const { error } = await supabase
        .from('equipment_maintenance')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editMaintenance.id);

      if (error) {
        toast.error('Failed to update maintenance');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'equipment_maintenance',
          record_id: editMaintenance.id,
        });
      }

      toast.success('Maintenance updated');
    } else {
      const { error } = await supabase.from('equipment_maintenance').insert({
        company_id: company.id,
        ...data,
        status: 'scheduled',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create maintenance');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'equipment_maintenance',
        });
      }

      toast.success('Maintenance scheduled');
    }

    reset();
    setEditMaintenance(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('equipment_maintenance').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete maintenance');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'equipment_maintenance',
        record_id: deleteId,
      });
      toast.success('Maintenance deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleComplete = async (m: any) => {
    if (!canComplete || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('equipment_maintenance')
      .update({
        status: 'completed',
        completed_by: currentUser.id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', m.id);

    if (error) {
      toast.error('Failed to complete maintenance');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'completed',
        module: 'manufacturing',
        entity_type: 'equipment_maintenance',
        record_id: m.id,
      });
      toast.success('Maintenance completed');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'equipment', header: 'Equipment', cell: (v) => v?.equipment_name || '-' },
    { key: 'maintenance_type', header: 'Type', sortable: true },
    { key: 'priority', header: 'Priority', sortable: true },
    { key: 'scheduled_date', header: 'Scheduled', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy') },
    { key: 'estimated_hours', header: 'Est. Hours', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (v) => <StatusBadge status={v} />,
    },
    { key: 'assigned_profile', header: 'Assigned To', cell: (v) => v ? `${v.first_name} ${v.last_name}` : '-' },
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
            {row.status !== 'completed' && canComplete && <DropdownMenuItem onClick={() => handleComplete(row)}>Complete</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Equipment Maintenance" description="Schedule and track maintenance" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Maintenance' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditMaintenance(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> Schedule Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMaintenance ? 'Edit Maintenance' : 'Schedule Maintenance'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Equipment *</Label>
                  <Select {...register('equipment_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map(e => <SelectItem key={e.id} value={e.id}>{e.equipment_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.equipment_id && <p className="text-red-500 text-sm">{errors.equipment_id.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select {...register('maintenance_type')} defaultValue="preventive">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventive">Preventive</SelectItem>
                        <SelectItem value="corrective">Corrective</SelectItem>
                        <SelectItem value="predictive">Predictive</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.maintenance_type && <p className="text-red-500 text-sm">{errors.maintenance_type.message}</p>}
                  </div>
                  <div>
                    <Label>Priority *</Label>
                    <Select {...register('priority')} defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.priority && <p className="text-red-500 text-sm">{errors.priority.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scheduled Date *</Label>
                    <Input type="date" {...register('scheduled_date')} />
                    {errors.scheduled_date && <p className="text-red-500 text-sm">{errors.scheduled_date.message}</p>}
                  </div>
                  <div>
                    <Label>Est. Hours</Label>
                    <Input type="number" {...register('estimated_hours')} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Select {...register('assigned_to')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Maintenance description" rows={2} />
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
        <KPICard title="Scheduled" value={stats.scheduled} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Wrench className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Overdue" value={stats.overdue} icon={<Clock className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={maintenance}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Maintenance"
        description="Are you sure you want to delete this maintenance record? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
