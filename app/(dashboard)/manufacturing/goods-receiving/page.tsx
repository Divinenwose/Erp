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
import { Truck, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const receivingSchema = z.object({
  warehouse_id: z.string().optional(),
  purchase_order_id: z.string().optional(),
  vendor_id: z.string().optional(),
  received_date: z.string().min(1, 'Received date is required'),
  notes: z.string().optional(),
});
type ReceivingForm = z.infer<typeof receivingSchema>;

export default function GoodsReceivingPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.goods_receiving.create');
  const canEdit = isAdmin || hasPermission('manufacturing.goods_receiving.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.goods_receiving.delete');
  const canComplete = isAdmin || hasPermission('manufacturing.goods_receiving.complete');

  const [receiving, setReceiving] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReceiving, setEditReceiving] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0, total: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReceivingForm>({
    resolver: zodResolver(receivingSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [recRes, whRes, poRes, vendRes] = await Promise.all([
      supabase
        .from('goods_receiving')
        .select('*, warehouses(name), purchase_orders(po_number), vendors(name), received_profile:profiles!goods_receiving_received_by_fkey(first_name, last_name), inspected_profile:profiles!goods_receiving_inspected_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id),
      supabase.from('purchase_orders').select('id, po_number').eq('company_id', company.id),
      supabase.from('vendors').select('id, name').eq('company_id', company.id),
    ]);

    if (recRes.error) {
      console.error('Error loading receiving:', recRes.error);
      toast.error('Failed to load receiving records');
    }
    setReceiving(recRes.data ?? []);
    setWarehouses(whRes.data ?? []);
    setPurchaseOrders(poRes.data ?? []);
    setVendors(vendRes.data ?? []);

    const pending = recRes.data?.filter(r => r.status === 'pending').length || 0;
    const inProgress = recRes.data?.filter(r => r.status === 'in_progress').length || 0;
    const completed = recRes.data?.filter(r => r.status === 'completed').length || 0;
    setStats({ pending, inProgress, completed, total: recRes.data?.length || 0 });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (rec: any) => {
    setEditReceiving(rec);
    reset({
      warehouse_id: rec.warehouse_id ?? '',
      purchase_order_id: rec.purchase_order_id ?? '',
      vendor_id: rec.vendor_id ?? '',
      received_date: rec.received_date,
      notes: rec.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ReceivingForm) => {
    if (!company?.id || !currentUser?.id) return;

    const receivingNumber = `GRN-${Date.now()}`;

    if (editReceiving) {
      const { error } = await supabase
        .from('goods_receiving')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editReceiving.id);

      if (error) {
        toast.error('Failed to update receiving record');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'goods_receiving',
          record_id: editReceiving.id,
        });
      }

      toast.success('Receiving record updated');
    } else {
      const { error } = await supabase.from('goods_receiving').insert({
        company_id: company.id,
        receiving_number: receivingNumber,
        ...data,
        status: 'pending',
        received_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create receiving record');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'goods_receiving',
          new_value: { receivingNumber },
        });
      }

      toast.success('Receiving record created');
    }

    reset();
    setEditReceiving(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('goods_receiving').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete receiving record');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'goods_receiving',
        record_id: deleteId,
      });
      toast.success('Receiving record deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleComplete = async (rec: any) => {
    if (!canComplete || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('goods_receiving')
      .update({
        status: 'completed',
        inspected_by: currentUser.id,
        inspected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', rec.id);

    if (error) {
      toast.error('Failed to complete receiving');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'completed',
        module: 'manufacturing',
        entity_type: 'goods_receiving',
        record_id: rec.id,
      });
      toast.success('Receiving completed');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'receiving_number', header: 'GRN Number', sortable: true },
    { key: 'warehouses', header: 'Warehouse', cell: (v) => v?.name || '-' },
    { key: 'purchase_orders', header: 'PO Number', cell: (v) => v?.po_number || '-' },
    { key: 'vendors', header: 'Vendor', cell: (v) => v?.name || '-' },
    { key: 'received_date', header: 'Received Date', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy') },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (v) => <StatusBadge status={v} />,
    },
    { key: 'created_at', header: 'Created', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy') },
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
      <PageHeader title="Goods Receiving" description="Process incoming goods" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Goods Receiving' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditReceiving(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Receiving
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editReceiving ? 'Edit Receiving' : 'New Receiving'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Warehouse</Label>
                    <Select {...register('warehouse_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Purchase Order</Label>
                    <Select {...register('purchase_order_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select PO" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseOrders.map(po => <SelectItem key={po.id} value={po.id}>{po.po_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Select {...register('vendor_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Received Date *</Label>
                  <Input type="date" {...register('received_date')} />
                  {errors.received_date && <p className="text-red-500 text-sm">{errors.received_date.message}</p>}
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
        <KPICard title="Total" value={stats.total} icon={<Truck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Pending" value={stats.pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Truck className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={receiving}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Receiving"
        description="Are you sure you want to delete this receiving record? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
