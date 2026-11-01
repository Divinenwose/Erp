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

const dispatchSchema = z.object({
  warehouse_id: z.string().optional(),
  customer_id: z.string().optional(),
  sales_order_id: z.string().optional(),
  shipment_number: z.string().min(1, 'Shipment number is required'),
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
  shipping_address: z.string().optional(),
  estimated_delivery: z.string().optional(),
  notes: z.string().optional(),
});
type DispatchForm = z.infer<typeof dispatchSchema>;

export default function DispatchPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.dispatch.create');
  const canEdit = isAdmin || hasPermission('manufacturing.dispatch.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.dispatch.delete');
  const canShip = isAdmin || hasPermission('manufacturing.dispatch.ship');
  const canTrack = isAdmin || hasPermission('manufacturing.dispatch.track');

  const [dispatches, setDispatches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDispatch, setEditDispatch] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ pending: 0, shipped: 0, inTransit: 0, delivered: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DispatchForm>({
    resolver: zodResolver(dispatchSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [dispRes, whRes, custRes, soRes] = await Promise.all([
      supabase
        .from('dispatch_shipments')
        .select('*, warehouses(name), created_profile:profiles!dispatch_shipments_created_by_fkey(first_name, last_name), shipped_profile:profiles!dispatch_shipments_shipped_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('id, name').eq('company_id', company.id),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
      supabase.from('sales_orders').select('id, order_number').eq('company_id', company.id),
    ]);

    if (dispRes.error) {
      console.error('Error loading dispatches:', dispRes.error);
      toast.error('Failed to load dispatches');
    }
    setDispatches(dispRes.data ?? []);
    setWarehouses(whRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setSalesOrders(soRes.data ?? []);

    const pending = dispRes.data?.filter(d => d.status === 'pending').length || 0;
    const shipped = dispRes.data?.filter(d => d.status === 'shipped').length || 0;
    const inTransit = dispRes.data?.filter(d => d.status === 'in_transit').length || 0;
    const delivered = dispRes.data?.filter(d => d.status === 'delivered').length || 0;
    setStats({ pending, shipped, inTransit, delivered });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (disp: any) => {
    setEditDispatch(disp);
    reset({
      warehouse_id: disp.warehouse_id ?? '',
      customer_id: disp.customer_id ?? '',
      sales_order_id: disp.sales_order_id ?? '',
      shipment_number: disp.shipment_number,
      carrier: disp.carrier ?? '',
      tracking_number: disp.tracking_number ?? '',
      shipping_address: disp.shipping_address ?? '',
      estimated_delivery: disp.estimated_delivery ?? '',
      notes: disp.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: DispatchForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editDispatch) {
      const { error } = await supabase
        .from('dispatch_shipments')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editDispatch.id);

      if (error) {
        toast.error('Failed to update dispatch');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'dispatch_shipments',
          record_id: editDispatch.id,
        });
      }

      toast.success('Dispatch updated');
    } else {
      const { error } = await supabase.from('dispatch_shipments').insert({
        company_id: company.id,
        ...data,
        status: 'pending',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create dispatch');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'dispatch_shipments',
          new_value: { shipment_number: data.shipment_number },
        });
      }

      toast.success('Dispatch created');
    }

    reset();
    setEditDispatch(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('dispatch_shipments').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete dispatch');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'dispatch_shipments',
        record_id: deleteId,
      });
      toast.success('Dispatch deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleShip = async (disp: any) => {
    if (!canShip || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('dispatch_shipments')
      .update({
        status: 'shipped',
        shipped_by: currentUser.id,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disp.id);

    if (error) {
      toast.error('Failed to ship dispatch');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'shipped',
        module: 'manufacturing',
        entity_type: 'dispatch_shipments',
        record_id: disp.id,
      });
      toast.success('Dispatch shipped');
      load();
    }
  };

  const handleDeliver = async (disp: any) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('dispatch_shipments')
      .update({
        status: 'delivered',
        actual_delivery: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disp.id);

    if (error) {
      toast.error('Failed to mark as delivered');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'delivered',
        module: 'manufacturing',
        entity_type: 'dispatch_shipments',
        record_id: disp.id,
      });
      toast.success('Dispatch marked as delivered');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'shipment_number', header: 'Shipment #', sortable: true },
    { key: 'warehouses', header: 'Warehouse', cell: (v) => v?.name || '-' },
    { key: 'carrier', header: 'Carrier', sortable: true },
    { key: 'tracking_number', header: 'Tracking #', sortable: true },
    { key: 'estimated_delivery', header: 'Est. Delivery', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (v) => <StatusBadge status={v} />,
    },
    { key: 'shipped_at', header: 'Shipped', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
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
            {row.status === 'pending' && canShip && <DropdownMenuItem onClick={() => handleShip(row)}>Ship</DropdownMenuItem>}
            {row.status === 'shipped' && <DropdownMenuItem onClick={() => handleDeliver(row)}>Mark Delivered</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dispatch & Shipments" description="Manage outgoing shipments" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Dispatch' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditDispatch(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Dispatch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editDispatch ? 'Edit Dispatch' : 'New Dispatch'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Shipment Number *</Label>
                  <Input {...register('shipment_number')} placeholder="SHP-001" />
                  {errors.shipment_number && <p className="text-red-500 text-sm">{errors.shipment_number.message}</p>}
                </div>
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
                    <Label>Customer</Label>
                    <Select {...register('customer_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Sales Order</Label>
                  <Select {...register('sales_order_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales order" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesOrders.map(so => <SelectItem key={so.id} value={so.id}>{so.order_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Carrier</Label>
                    <Input {...register('carrier')} placeholder="e.g., FedEx, UPS" />
                  </div>
                  <div>
                    <Label>Tracking Number</Label>
                    <Input {...register('tracking_number')} placeholder="Tracking number" />
                  </div>
                </div>
                <div>
                  <Label>Shipping Address</Label>
                  <Textarea {...register('shipping_address')} placeholder="Full shipping address" rows={2} />
                </div>
                <div>
                  <Label>Estimated Delivery</Label>
                  <Input type="date" {...register('estimated_delivery')} />
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
        <KPICard title="Pending" value={stats.pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Shipped" value={stats.shipped} icon={<Truck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Transit" value={stats.inTransit} icon={<Truck className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
        <KPICard title="Delivered" value={stats.delivered} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={dispatches}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Dispatch"
        description="Are you sure you want to delete this dispatch? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
