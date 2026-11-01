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
import { Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const shiftSchema = z.object({
  shift_name: z.string().min(1, 'Shift name is required'),
  shift_type: z.enum(['morning', 'afternoon', 'night', 'rotating', 'custom']),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  break_duration: z.coerce.number().min(0, 'Break duration must be positive'),
  notes: z.string().optional(),
});
type ShiftForm = z.infer<typeof shiftSchema>;

export default function ShiftsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.shifts.create');
  const canEdit = isAdmin || hasPermission('manufacturing.shifts.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.shifts.delete');
  const canAssign = isAdmin || hasPermission('manufacturing.shifts.assign');

  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editShift, setEditShift] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, employees: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ShiftForm>({
    resolver: zodResolver(shiftSchema),
    defaultValues: { shift_type: 'morning', break_duration: 0 },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('workforce_shifts')
      .select('*, created_profile:profiles!workforce_shifts_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading shifts:', error);
      toast.error('Failed to load shifts');
    }
    setShifts(data ?? []);

    const total = data?.length || 0;
    const active = data?.filter(s => s.is_active).length || 0;
    const employees = data?.reduce((sum, s) => sum + (s.employee_count || 0), 0) || 0;
    setStats({ total, active, employees });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (s: any) => {
    setEditShift(s);
    reset({
      shift_name: s.shift_name,
      shift_type: s.shift_type,
      start_time: s.start_time,
      end_time: s.end_time,
      break_duration: s.break_duration,
      notes: s.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ShiftForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editShift) {
      const { error } = await supabase
        .from('workforce_shifts')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editShift.id);

      if (error) {
        toast.error('Failed to update shift');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'workforce_shifts',
          record_id: editShift.id,
        });
      }

      toast.success('Shift updated');
    } else {
      const { error } = await supabase.from('workforce_shifts').insert({
        company_id: company.id,
        ...data,
        is_active: true,
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create shift');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'workforce_shifts',
        });
      }

      toast.success('Shift created');
    }

    reset();
    setEditShift(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('workforce_shifts').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete shift');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'workforce_shifts',
        record_id: deleteId,
      });
      toast.success('Shift deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'shift_name', header: 'Shift Name', sortable: true },
    { key: 'shift_type', header: 'Type', sortable: true },
    { key: 'start_time', header: 'Start Time', sortable: true },
    { key: 'end_time', header: 'End Time', sortable: true },
    { key: 'break_duration', header: 'Break (min)', sortable: true },
    { key: 'employee_count', header: 'Employees', sortable: true },
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
      <PageHeader title="Workforce Shifts" description="Manage workforce shifts" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Shifts' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditShift(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editShift ? 'Edit Shift' : 'New Shift'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Shift Name *</Label>
                  <Input {...register('shift_name')} placeholder="Morning Shift" />
                  {errors.shift_name && <p className="text-red-500 text-sm">{errors.shift_name.message}</p>}
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select {...register('shift_type')} defaultValue="morning">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="rotating">Rotating</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.shift_type && <p className="text-red-500 text-sm">{errors.shift_type.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time *</Label>
                    <Input type="time" {...register('start_time')} />
                    {errors.start_time && <p className="text-red-500 text-sm">{errors.start_time.message}</p>}
                  </div>
                  <div>
                    <Label>End Time *</Label>
                    <Input type="time" {...register('end_time')} />
                    {errors.end_time && <p className="text-red-500 text-sm">{errors.end_time.message}</p>}
                  </div>
                </div>
                <div>
                  <Label>Break Duration (minutes)</Label>
                  <Input type="number" {...register('break_duration')} placeholder="0" />
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
        <KPICard title="Total Shifts" value={stats.total} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Shifts" value={stats.active} icon={<Clock className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Employees" value={stats.employees} icon={<Clock className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={shifts}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Shift"
        description="Are you sure you want to delete this shift? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
