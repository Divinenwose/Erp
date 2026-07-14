'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Plus, Download, CheckCircle2, Clock, FileText, MoreHorizontal, Eye, Edit, Send, Check, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const poSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor required'),
  issue_date: z.string().min(1, 'Required'),
  expected_delivery: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});
type POForm = z.infer<typeof poSchema>;

export default function PurchaseOrdersPage() {
  const { company } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<POForm>({
    resolver: zodResolver(poSchema),
    defaultValues: { issue_date: new Date().toISOString().split('T')[0] },
  });

  const load = async () => {
    if (!company?.id) return;
    const [poRes, vendRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, vendors(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, name').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setOrders(poRes.data ?? []);
    setVendors(vendRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: POForm) => {
    if (!company?.id) return;
    const num = `PO-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('purchase_orders').insert({ ...data, company_id: company.id, po_number: num, status: 'draft', currency: company.currency ?? 'USD' });
    if (error) { toast.error('Failed to create purchase order'); return; }
    toast.success('Purchase order created as draft');
    reset(); setDialogOpen(false); load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('purchase_orders').update({ status, ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}) }).eq('id', id);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Purchase order ${status}`);
    load();
  };

  const pending = orders.filter(o => o.status === 'pending').length;
  const approved = orders.filter(o => o.status === 'approved').length;
  const totalValue = orders.reduce((a, o) => a + (o.total_amount ?? 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'po_number', header: 'PO Number', sortable: true,
      cell: (row) => <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">{row.po_number}</span>,
    },
    { key: 'vendor', header: 'Vendor', sortable: true, cell: (row) => <span className="text-sm">{row.vendors?.name ?? '—'}</span> },
    { key: 'issue_date', header: 'Issue Date', sortable: true, cell: (row) => <span className="text-sm text-gray-500">{formatDate(row.issue_date)}</span> },
    { key: 'expected_delivery', header: 'Delivery Date', cell: (row) => <span className="text-sm text-gray-500">{row.expected_delivery ? formatDate(row.expected_delivery) : '—'}</span> },
    { key: 'total_amount', header: 'Total', sortable: true, cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_amount ?? 0)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions', header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
            {row.status === 'draft' && <DropdownMenuItem onClick={() => updateStatus(row.id, 'pending')}><Send className="h-4 w-4 mr-2" />Submit for Approval</DropdownMenuItem>}
            {row.status === 'pending' && <>
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'approved')}><Check className="h-4 w-4 mr-2 text-emerald-600" />Approve</DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'rejected')} className="text-red-600"><X className="h-4 w-4 mr-2" />Reject</DropdownMenuItem>
            </>}
            {row.status === 'approved' && <DropdownMenuItem onClick={() => updateStatus(row.id, 'received')}><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />Mark Received</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" description="Create and manage formal purchase orders" breadcrumbs={[{ label: 'Procurement' }, { label: 'Purchase Orders' }]}>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New PO</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Vendor *</Label>
                <Controller name="vendor_id" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                {errors.vendor_id && <p className="text-xs text-red-500 mt-1">{errors.vendor_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Issue Date *</Label><Input className="mt-1" type="date" {...register('issue_date')} /></div>
                <div><Label>Expected Delivery</Label><Input className="mt-1" type="date" {...register('expected_delivery')} /></div>
              </div>
              <div><Label>Notes</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-20" {...register('notes')} /></div>
              <div><Label>Terms & Conditions</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-16" placeholder="Net 30, FOB..." {...register('terms')} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting || vendors.length === 0}>
                  {vendors.length === 0 ? 'Add vendors first' : isSubmitting ? 'Creating...' : 'Create PO'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total POs" value={orders.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Pending Approval" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Approved" value={approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Value" value={formatCurrency(totalValue)} icon={<ShoppingCart className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search PO number, vendor..."
        searchKeys={['po_number']}
        pageSize={15}
        emptyTitle="No purchase orders yet"
        emptyDescription="Create purchase orders to formalize your procurement process"
        emptyAction={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New PO</Button>}
      />
    </div>
  );
}
