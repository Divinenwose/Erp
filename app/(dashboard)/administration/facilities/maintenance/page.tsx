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
import { Wrench, Plus, Edit, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const maintenanceSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  branch_id: z.string().optional(),
  assigned_to: z.string().optional(),
});
type MaintenanceForm = z.infer<typeof maintenanceSchema>;

export default function MaintenanceRequestsPage() {
  const { company, user: currentUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<MaintenanceForm>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [reqRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('maintenance_requests')
        .select('*, branches(name), requested_by_profile(first_name, last_name), assigned_to_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('requested_at', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setRequests(reqRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (req: any) => {
    setEditRequest(req);
    reset({
      title: req.title,
      description: req.description ?? '',
      priority: req.priority,
      branch_id: req.branch_id ?? undefined,
      assigned_to: req.assigned_to ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: MaintenanceForm) => {
    if (!company?.id) return;

    if (editRequest) {
      const { error } = await supabase
        .from('maintenance_requests')
        .update({
          title: data.title,
          description: data.description,
          priority: data.priority,
          branch_id: data.branch_id,
          assigned_to: data.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editRequest.id);

      if (error) {
        toast.error('Failed to update request');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'maintenance_request_updated',
        module: 'facilities',
        record_id: editRequest.id,
        new_values: { title: data.title },
      });

      toast.success('Request updated');
    } else {
      const { error } = await supabase.from('maintenance_requests').insert({
        company_id: company.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        branch_id: data.branch_id,
        assigned_to: data.assigned_to,
        requested_by: currentUser?.id,
        status: 'pending',
      });

      if (error) {
        toast.error('Failed to create request');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'maintenance_request_created',
        module: 'facilities',
        new_values: { title: data.title },
      });

      toast.success('Request created');
    }

    reset();
    setEditRequest(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('maintenance_requests').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete request');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'maintenance_request_deleted',
        module: 'facilities',
        record_id: deleteId,
      });
      toast.success('Request deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('maintenance_requests')
      .update({ 
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'maintenance_request_status_updated',
        module: 'facilities',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Title', 'Description', 'Priority', 'Status', 'Branch', 'Requested By', 'Assigned To', 'Requested At'];
    const rows = requests.map(r => [
      r.title,
      r.description || '',
      r.priority,
      r.status,
      r.branches?.name || '',
      `${r.requested_by_profile?.first_name || ''} ${r.requested_by_profile?.last_name || ''}`,
      `${r.assigned_to_profile?.first_name || ''} ${r.assigned_to_profile?.last_name || ''}`,
      r.requested_at,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maintenance_requests.csv';
    a.click();
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{row.title}</p>
          {row.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      cell: (row) => (
        <Badge className={priorityColors[row.priority] || priorityColors.medium} variant="secondary">
          {row.priority}
        </Badge>
      ),
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
      key: 'requested_at',
      header: 'Requested',
      sortable: true,
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(row.requested_at).toLocaleDateString()}</span>,
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
            {row.status === 'pending' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'in_progress')}>
                <Clock className="h-4 w-4 mr-2" />Start
              </DropdownMenuItem>
            )}
            {row.status === 'in_progress' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'completed')}>
                <CheckCircle className="h-4 w-4 mr-2" />Complete
              </DropdownMenuItem>
            )}
            <Can resource="facilities.maintenance" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const pending = requests.filter(r => r.status === 'pending').length;
  const inProgress = requests.filter(r => r.status === 'in_progress').length;
  const completed = requests.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Requests"
        description="Manage facility maintenance requests"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Facilities' }, { label: 'Maintenance' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="facilities.maintenance" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditRequest(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editRequest ? 'Edit Request' : 'New Maintenance Request'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div>
                    <Label>Title *</Label>
                    <Input className="mt-1" {...register('title')} />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea className="mt-1" rows={3} {...register('description')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority *</Label>
                      <Controller name="priority" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
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
                    <div className="col-span-2">
                      <Label>Assign To</Label>
                      <Controller name="assigned_to" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditRequest(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editRequest ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Requests" value={requests.length} icon={<Wrench className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Pending" value={pending} icon={<Clock className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="In Progress" value={inProgress} icon={<AlertCircle className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Completed" value={completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={requests}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search requests..."
        searchKeys={['title', 'description']}
        pageSize={15}
        emptyTitle="No maintenance requests"
        emptyDescription="Create a maintenance request to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Request?"
        description="This will permanently delete the maintenance request."
        confirmLabel="Delete"
      />
    </div>
  );
}
