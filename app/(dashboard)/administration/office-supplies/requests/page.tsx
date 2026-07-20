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
import { ClipboardList, Plus, Edit, Trash2, Clock, UserCheck, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const requestSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  quantity: z.string().min(1, 'Required'),
  unit: z.enum(['piece', 'box', 'pack', 'set', 'kg', 'liter', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  requested_by: z.string().optional(),
  reason: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type RequestForm = z.infer<typeof requestSchema>;

export default function RequestsPage() {
  const { company, user: currentUser } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { unit: 'piece', priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [reqRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('office_supplies_requests')
        .select('*, branches(name), requested_by_profile(first_name, last_name), approved_by_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('requested_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setRequests(reqRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (request: any) => {
    setEditRequest(request);
    reset({
      item_name: request.item_name,
      category: request.category ?? '',
      quantity: request.quantity?.toString() ?? '1',
      unit: request.unit,
      priority: request.priority,
      requested_by: request.requested_by ?? undefined,
      reason: request.reason ?? '',
      branch_id: request.branch_id ?? undefined,
      notes: request.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RequestForm) => {
    if (!company?.id) return;

    const payload = {
      item_name: data.item_name,
      category: data.category,
      quantity: parseInt(data.quantity),
      unit: data.unit,
      priority: data.priority,
      requested_by: data.requested_by,
      reason: data.reason,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editRequest) {
      const { error } = await supabase
        .from('office_supplies_requests')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editRequest.id);

      if (error) {
        toast.error('Failed to update request');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_request_updated',
        module: 'office_supplies',
        record_id: editRequest.id,
        new_values: { item_name: data.item_name },
      });

      toast.success('Request updated');
    } else {
      const { error } = await supabase.from('office_supplies_requests').insert({
        company_id: company.id,
        ...payload,
        requested_date: new Date().toISOString(),
        status: 'pending',
      });

      if (error) {
        toast.error('Failed to create request');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_request_created',
        module: 'office_supplies',
        new_values: { item_name: data.item_name },
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

    const { error } = await supabase.from('office_supplies_requests').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete request');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_request_deleted',
        module: 'office_supplies',
        record_id: deleteId,
      });
      toast.success('Request deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleApprove = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('office_supplies_requests')
      .update({ 
        status: 'approved',
        approved_by: currentUser?.id,
        approved_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to approve request');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_request_approved',
        module: 'office_supplies',
        record_id: id,
      });
      toast.success('Request approved');
      load();
    }
  };

  const handleReject = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('office_supplies_requests')
      .update({ 
        status: 'rejected',
        approved_by: currentUser?.id,
        approved_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_request_rejected',
        module: 'office_supplies',
        record_id: id,
      });
      toast.success('Request rejected');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Priority', 'Requested By', 'Requested Date', 'Approved By', 'Approved Date', 'Status', 'Branch'];
    const rows = requests.map(r => [
      r.item_name,
      r.category || '',
      r.quantity,
      r.unit,
      r.priority,
      r.requested_by_profile ? `${r.requested_by_profile.first_name} ${r.requested_by_profile.last_name}` : '',
      r.requested_date,
      r.approved_by_profile ? `${r.approved_by_profile.first_name} ${r.approved_by_profile.last_name}` : '',
      r.approved_date || '',
      r.status,
      r.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'office_supplies_requests.csv';
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
      key: 'item_name',
      header: 'Item',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.item_name}</p>
            {row.category && <p className="text-xs text-gray-400">{row.category}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      cell: (row) => <span className="text-sm font-medium">{row.quantity} {row.unit}</span>,
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
      key: 'requested_by',
      header: 'Requested By',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <UserCheck className="h-3 w-3" />
          <span>{row.requested_by_profile ? `${row.requested_by_profile.first_name} ${row.requested_by_profile.last_name}` : '—'}</span>
        </div>
      ),
    },
    {
      key: 'requested_date',
      header: 'Requested',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.requested_date).toLocaleDateString()}</span>
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
      key: 'branch',
      header: 'Branch',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.branches?.name || '—'}</span>,
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
              <>
                <DropdownMenuItem onClick={() => handleApprove(row.id)}>
                  <ClipboardList className="h-4 w-4 mr-2" />Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject(row.id)}>
                  <ClipboardList className="h-4 w-4 mr-2" />Reject
                </DropdownMenuItem>
              </>
            )}
            <Can resource="office_supplies.requests" action="delete">
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
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office Supplies Requests"
        description="Manage office supplies requisition requests"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Office Supplies' }, { label: 'Requests' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="office_supplies.requests" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditRequest(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />New Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editRequest ? 'Edit Request' : 'New Supply Request'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Item Name *</Label>
                      <Input className="mt-1" {...register('item_name')} />
                      {errors.item_name && <p className="text-xs text-red-500 mt-1">{errors.item_name.message}</p>}
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input className="mt-1" {...register('category')} placeholder="e.g., Stationery" />
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
                      <Label>Requested By</Label>
                      <Controller name="requested_by" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
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
                      <Label>Reason</Label>
                      <Textarea className="mt-1" rows={2} {...register('reason')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditRequest(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editRequest ? 'Update' : 'Submit'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Requests" value={requests.length} icon={<ClipboardList className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Pending" value={pending} icon={<Clock className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Approved" value={approved} icon={<ClipboardList className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Rejected" value={rejected} icon={<ClipboardList className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        data={requests}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search requests..."
        searchKeys={['item_name', 'category', 'reason']}
        pageSize={15}
        emptyTitle="No requests"
        emptyDescription="Create supply requests to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Request?"
        description="This will permanently delete the request."
        confirmLabel="Delete"
      />
    </div>
  );
}
