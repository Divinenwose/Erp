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
import { Truck, Plus, Edit, Trash2, Package, Clock, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const courierSchema = z.object({
  courier_company: z.string().min(1, 'Required'),
  tracking_number: z.string().optional(),
  recipient_name: z.string().min(1, 'Required'),
  type: z.enum(['incoming', 'outgoing']),
  package_type: z.string().optional(),
  weight: z.string().optional(),
  received_by: z.string().optional(),
  delivered_by: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type CourierForm = z.infer<typeof courierSchema>;

export default function CourierRegisterPage() {
  const { company, user: currentUser } = useAuth();
  const [couriers, setCouriers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCourier, setEditCourier] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CourierForm>({
    resolver: zodResolver(courierSchema),
    defaultValues: { type: 'incoming' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [courRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('courier_register')
        .select('*, branches(name), received_by_profile(first_name, last_name), delivered_by_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('received_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setCouriers(courRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (courier: any) => {
    setEditCourier(courier);
    reset({
      courier_company: courier.courier_company,
      tracking_number: courier.tracking_number ?? '',
      recipient_name: courier.recipient_name,
      type: courier.type,
      package_type: courier.package_type ?? '',
      weight: courier.weight?.toString() ?? '',
      received_by: courier.received_by ?? undefined,
      delivered_by: courier.delivered_by ?? undefined,
      branch_id: courier.branch_id ?? undefined,
      notes: courier.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CourierForm) => {
    if (!company?.id) return;

    const payload = {
      courier_company: data.courier_company,
      tracking_number: data.tracking_number,
      recipient_name: data.recipient_name,
      type: data.type,
      package_type: data.package_type,
      weight: data.weight ? parseFloat(data.weight) : null,
      received_by: data.received_by,
      delivered_by: data.delivered_by,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editCourier) {
      const { error } = await supabase
        .from('courier_register')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editCourier.id);

      if (error) {
        toast.error('Failed to update courier record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'courier_updated',
        module: 'reception',
        record_id: editCourier.id,
        new_values: { tracking_number: data.tracking_number },
      });

      toast.success('Courier record updated');
    } else {
      const { error } = await supabase.from('courier_register').insert({
        company_id: company.id,
        ...payload,
        received_date: new Date().toISOString(),
        status: 'received',
      });

      if (error) {
        toast.error('Failed to create courier record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'courier_created',
        module: 'reception',
        new_values: { tracking_number: data.tracking_number },
      });

      toast.success('Courier record created');
    }

    reset();
    setEditCourier(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('courier_register').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete courier record');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'courier_deleted',
        module: 'reception',
        record_id: deleteId,
      });
      toast.success('Courier record deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleDeliver = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('courier_register')
      .update({ 
        status: 'delivered',
        delivered_date: new Date().toISOString(),
        delivered_by: currentUser?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as delivered');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'courier_delivered',
        module: 'reception',
        record_id: id,
      });
      toast.success('Marked as delivered');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Courier Company', 'Tracking Number', 'Recipient', 'Type', 'Package Type', 'Weight', 'Received Date', 'Delivered Date', 'Status', 'Branch'];
    const rows = couriers.map(c => [
      c.courier_company,
      c.tracking_number || '',
      c.recipient_name,
      c.type,
      c.package_type || '',
      c.weight || '',
      c.received_date,
      c.delivered_date || '',
      c.status,
      c.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'courier_register.csv';
    a.click();
  };

  const typeColors: Record<string, string> = {
    incoming: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    outgoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const columns: Column<any>[] = [
    {
      key: 'courier_company',
      header: 'Courier',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.courier_company}</p>
            {row.tracking_number && <p className="text-xs text-gray-400">{row.tracking_number}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'recipient_name',
      header: 'Recipient',
      sortable: true,
      cell: (row) => <span className="text-sm font-medium">{row.recipient_name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={`${typeColors[row.type] || typeColors.incoming} capitalize`} variant="secondary">
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'package_type',
      header: 'Package',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.package_type || '—'}</span>,
    },
    {
      key: 'received_date',
      header: 'Received',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.received_date).toLocaleDateString()}</span>
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
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="h-3 w-3" />
          <span>{row.branches?.name || '—'}</span>
        </div>
      ),
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
            {row.status === 'received' && (
              <DropdownMenuItem onClick={() => handleDeliver(row.id)}>
                <Package className="h-4 w-4 mr-2" />Mark Delivered
              </DropdownMenuItem>
            )}
            <Can resource="reception.courier" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const received = couriers.filter(c => c.status === 'received').length;
  const delivered = couriers.filter(c => c.status === 'delivered').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courier Register"
        description="Track incoming and outgoing courier packages"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Reception' }, { label: 'Courier' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="reception.courier" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditCourier(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Courier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editCourier ? 'Edit Courier' : 'Add Courier'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Courier Company *</Label>
                      <Input className="mt-1" {...register('courier_company')} />
                      {errors.courier_company && <p className="text-xs text-red-500 mt-1">{errors.courier_company.message}</p>}
                    </div>
                    <div>
                      <Label>Tracking Number</Label>
                      <Input className="mt-1" {...register('tracking_number')} />
                    </div>
                    <div>
                      <Label>Recipient Name *</Label>
                      <Input className="mt-1" {...register('recipient_name')} />
                      {errors.recipient_name && <p className="text-xs text-red-500 mt-1">{errors.recipient_name.message}</p>}
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Controller name="type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="incoming">Incoming</SelectItem>
                            <SelectItem value="outgoing">Outgoing</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Package Type</Label>
                      <Input className="mt-1" {...register('package_type')} placeholder="e.g., Document, Parcel" />
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input className="mt-1" type="number" step="0.1" {...register('weight')} />
                    </div>
                    <div>
                      <Label>Received By</Label>
                      <Controller name="received_by" control={control} render={({ field }) => (
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
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditCourier(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editCourier ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Couriers" value={couriers.length} icon={<Truck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Received" value={received} icon={<Package className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Delivered" value={delivered} icon={<Package className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={couriers}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search couriers..."
        searchKeys={['courier_company', 'tracking_number', 'recipient_name']}
        pageSize={15}
        emptyTitle="No courier records"
        emptyDescription="Add courier records to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Courier Record?"
        description="This will permanently delete the courier record."
        confirmLabel="Delete"
      />
    </div>
  );
}
