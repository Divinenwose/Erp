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
import { UserCheck, Plus, Edit, Trash2, Calendar, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const assignmentSchema = z.object({
  asset_type: z.enum(['furniture', 'equipment', 'vehicle']),
  asset_id: z.string().min(1, 'Required'),
  assigned_to: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});
type AssignmentForm = z.infer<typeof assignmentSchema>;

export default function AssetAssignmentsPage() {
  const { company, user: currentUser } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [furniture, setFurniture] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { asset_type: 'furniture' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [assignRes, furnRes, eqRes, vehRes, userRes] = await Promise.all([
      supabase
        .from('asset_assignments')
        .select('*, assigned_to_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('assigned_at', { ascending: false }),
      supabase.from('furniture').select('*').eq('company_id', company.id),
      supabase.from('equipment').select('*').eq('company_id', company.id),
      supabase.from('vehicles').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setAssignments(assignRes.data ?? []);
    setFurniture(furnRes.data ?? []);
    setEquipment(eqRes.data ?? []);
    setVehicles(vehRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

 useEffect(() => { load(); }, [company?.id]);

  const getAssetName = (assignment: any) => {
    if (assignment.asset_type === 'furniture') {
      const item = furniture.find(f => f.id === assignment.asset_id);
      return item ? item.name : 'Unknown';
    } else if (assignment.asset_type === 'equipment') {
      const item = equipment.find(e => e.id === assignment.asset_id);
      return item ? item.name : 'Unknown';
    } else if (assignment.asset_type === 'vehicle') {
      const item = vehicles.find(v => v.id === assignment.asset_id);
      return item ? item.vehicle_number : 'Unknown';
    }
    return 'Unknown';
  };

  const openEdit = (assignment: any) => {
    setEditAssignment(assignment);
    reset({
      asset_type: assignment.asset_type,
      asset_id: assignment.asset_id,
      assigned_to: assignment.assigned_to,
      notes: assignment.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: AssignmentForm) => {
    if (!company?.id) return;

    if (editAssignment) {
      const { error } = await supabase
        .from('asset_assignments')
        .update({ 
          asset_type: data.asset_type,
          asset_id: data.asset_id,
          assigned_to: data.assigned_to,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editAssignment.id);

      if (error) {
        toast.error('Failed to update assignment');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'asset_assignment_updated',
        module: 'assets',
        record_id: editAssignment.id,
        new_values: { assigned_to: data.assigned_to },
      });

      toast.success('Assignment updated');
    } else {
      const { error } = await supabase.from('asset_assignments').insert({
        company_id: company.id,
        asset_type: data.asset_type,
        asset_id: data.asset_id,
        assigned_to: data.assigned_to,
        assigned_by: currentUser?.id,
        notes: data.notes,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create assignment');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'asset_assignment_created',
        module: 'assets',
        new_values: { assigned_to: data.assigned_to },
      });

      toast.success('Assignment created');
   }

    reset();
    setEditAssignment(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('asset_assignments').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete assignment');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'asset_assignment_deleted',
        module: 'assets',
        record_id: deleteId,
      });
      toast.success('Assignment deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleReturn = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('asset_assignments')
      .update({ 
        status: 'returned',
        returned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as returned');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'asset_assignment_returned',
        module: 'assets',
        record_id: id,
      });
      toast.success('Asset returned');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Asset Type', 'Asset Name', 'Assigned To', 'Assigned At', 'Returned At', 'Status', 'Notes'];
    const rows = assignments.map(a => [
      a.asset_type,
      getAssetName(a),
      a.assigned_to_profile ? `${a.assigned_to_profile.first_name} ${a.assigned_to_profile.last_name}` : '',
      a.assigned_at,
      a.returned_at || '',
      a.status,
      a.notes || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_assignments.csv';
    a.click();
  };

  const getAssetOptions = (type: string) => {
    if (type === 'furniture') return furniture.map(f => ({ id: f.id, name: f.name }));
    if (type === 'equipment') return equipment.map(e => ({ id: e.id, name: e.name }));
    if (type === 'vehicle') return vehicles.map(v => ({ id: v.id, name: v.vehicle_number }));
    return [];
  };

  const typeColors: Record<string, string> = {
    furniture: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    equipment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    vehicle: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  const columns: Column<any>[] = [
    {
      key: 'asset',
      header: 'Asset',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{getAssetName(row)}</p>
            <Badge className={`${typeColors[row.asset_type] || typeColors.furniture} capitalize text-xs`} variant="secondary">
              {row.asset_type}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned To',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-gray-400" />
          <span className="text-sm">
            {row.assigned_to_profile ? `${row.assigned_to_profile.first_name} ${row.assigned_to_profile.last_name}` : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'assigned_at',
      header: 'Assigned',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{new Date(row.assigned_at).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: 'returned_at',
      header: 'Returned',
      sortable: true,
      cell: (row) => row.returned_at ? (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{new Date(row.returned_at).toLocaleDateString()}</span>
        </div>
      ) : <span className="text-sm text-gray-400">—</span>,
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
              <DropdownMenuItem onClick={() => handleReturn(row.id)}>
                <Calendar className="h-4 w-4 mr-2" />Return
              </DropdownMenuItem>
            )}
            <Can resource="assets.assignment" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = assignments.filter(a => a.status === 'active').length;

  return (
    <PermissionGuard permission="assets.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view asset assignments</div>}>
      <div className="space-y-6">
      <PageHeader
        title="Asset Assignments"
        description="Manage asset assignments to employees"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Assets' }, { label: 'Assignments' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="assets.assignment" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditAssignment(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />New Assignment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editAssignment ? 'Edit Assignment' : 'New Asset Assignment'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Asset Type *</Label>
                      <Controller name="asset_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="furniture">Furniture</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="vehicle">Vehicle</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Asset *</Label>
                      <Controller name="asset_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select asset" /></SelectTrigger>
                          <SelectContent>
                            {getAssetOptions(control._formValues.asset_type || 'furniture').map(opt => (
                              <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <Label>Assign To *</Label>
                      <Controller name="assigned_to" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditAssignment(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editAssignment ? 'Update' : 'Assign'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Assignments" value={assignments.length} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={assignments}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search assignments..."
        searchKeys={['notes']}
        pageSize={15}
        emptyTitle="No assignments"
        emptyDescription="Create an asset assignment to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Assignment?"
        description="This will permanently delete the assignment record."
        confirmLabel="Delete"
      />
      </div>
    </PermissionGuard>
  );
}
