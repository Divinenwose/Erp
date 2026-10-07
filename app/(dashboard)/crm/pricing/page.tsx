'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Plus, Download, Check, X, MoreHorizontal, Edit, Trash2, TrendingDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const pricingSchema = z.object({
  product_service: z.string().min(1, 'Required'),
  current_price: z.coerce.number().min(0),
  requested_price: z.coerce.number().min(0),
  reason: z.string().min(1, 'Required'),
  justification: z.string().optional(),
  opportunity_id: z.string().optional(),
  customer_id: z.string().optional(),
  notes: z.string().optional(),
});
type PricingForm = z.infer<typeof pricingSchema>;

export default function PricingPage() {
  const { company, user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<PricingForm>({
    resolver: zodResolver(pricingSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    const [reqRes, oppRes, custRes] = await Promise.all([
      supabase.from('pricing_requests').select('*, opportunities(title), customers(name), auth_users(email)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('opportunities').select('id, title').eq('company_id', company.id).eq('status', 'open'),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
    ]);
    setRequests(reqRes.data ?? []);
    setOpportunities(oppRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (req: any) => {
    setEditRequest(req);
    reset({
      product_service: req.product_service,
      current_price: req.current_price ?? 0,
      requested_price: req.requested_price ?? 0,
      reason: req.reason,
      justification: req.justification ?? '',
      opportunity_id: req.opportunity_id ?? '',
      customer_id: req.customer_id ?? '',
      notes: req.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: PricingForm) => {
    if (!company?.id) return;
    
    const discountPercentage = data.current_price > 0 ? ((data.current_price - data.requested_price) / data.current_price * 100) : 0;
    const requestNumber = editRequest?.request_number ?? `PR-${String(requests.length + 1).padStart(4, '0')}`;
    
    if (editRequest) {
      const { error } = await supabase.from('pricing_requests').update({ 
        ...data, 
        discount_percentage,
        updated_at: new Date().toISOString() 
      }).eq('id', editRequest.id);
      if (error) { toast.error('Failed to update request'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'pricing_requests', entity_id: editRequest.id, new_value: { product_service: data.product_service } });
      }
      
      toast.success('Request updated');
    } else {
      if (!company?.id) return;
      const { error } = await supabase.from('pricing_requests').insert({ 
        ...data, 
        company_id: company.id, 
        request_number: requestNumber,
        discount_percentage,
        status: 'pending',
        created_by: user?.id 
      });
      if (error) { toast.error('Failed to create request'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'pricing_requests', new_value: { product_service: data.product_service, request_number } });
      }
      
      toast.success('Request created');
    }
    
    reset();
    setEditRequest(null);
    setDialogOpen(false);
    load();
  };

  const approveRequest = async (req: any) => {
    await supabase.from('pricing_requests').update({ 
      status: 'approved', 
      approved_by: user?.id, 
      approved_at: new Date().toISOString() 
    }).eq('id', req.id);
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() } : r));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'crm', entity_type: 'pricing_requests', entity_id: req.id });
    }
    
    toast.success('Pricing request approved');
  };

  const rejectRequest = async (req: any) => {
    await supabase.from('pricing_requests').update({ 
      status: 'rejected', 
      rejected_by: user?.id, 
      rejected_at: new Date().toISOString(),
      rejection_reason: 'Rejected by user'
    }).eq('id', req.id);
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected', rejected_by: user?.id, rejected_at: new Date().toISOString() } : r));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'rejected', module: 'crm', entity_type: 'pricing_requests', entity_id: req.id });
    }
    
    toast.success('Pricing request rejected');
  };

  const deleteRequest = async () => {
    if (!deleteId) return;
    await supabase.from('pricing_requests').delete().eq('id', deleteId);
    setRequests(prev => prev.filter(r => r.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'pricing_requests', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Request deleted');
  };

  const viewRequest = (req: any) => {
    setSelectedRequest(req);
    setViewDialogOpen(true);
  };

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;
  const avgDiscount = requests.length > 0 ? requests.filter(r => r.status === 'approved').reduce((a, r) => a + (r.discount_percentage ?? 0), 0) / requests.filter(r => r.status === 'approved').length : 0;

  const columns: Column<any>[] = [
    { key: 'request_number', header: 'Number', sortable: true, cell: (row) => <span className="font-medium text-sm">{row.request_number}</span> },
    { key: 'product_service', header: 'Product/Service', sortable: true, cell: (row) => <span className="text-sm">{row.product_service}</span> },
    { key: 'customers', header: 'Customer', cell: (row) => <span className="text-sm text-blue-600">{row.customers?.name ?? '—'}</span> },
    { key: 'current_price', header: 'Current Price', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.current_price)}</span> },
    { key: 'requested_price', header: 'Requested Price', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.requested_price)}</span> },
    { key: 'discount_percentage', header: 'Discount %', sortable: true, cell: (row) => <span className="text-sm">{row.discount_percentage?.toFixed(1) ?? 0}%</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.pricing.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view pricing requests</div>}>
      <div className="space-y-6">
      <PageHeader title="Pricing & Discount Requests" description="Manage pricing and discount approval requests" breadcrumbs={[{ label: 'CRM' }, { label: 'Pricing' }]}>
        <Can resource="pricing" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="pricing" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditRequest(null); reset(); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Request</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editRequest ? 'Edit Request' : 'New Pricing Request'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div><Label>Product/Service *</Label><Input className="mt-1" {...register('product_service')} />{errors.product_service && <p className="text-xs text-red-500 mt-1">{errors.product_service.message}</p>}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Current Price</Label><Input className="mt-1" type="number" step="0.01" {...register('current_price')} /></div>
                  <div><Label>Requested Price</Label><Input className="mt-1" type="number" step="0.01" {...register('requested_price')} /></div>
                  <div><Label>Opportunity</Label>
                    <Controller name="opportunity_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select opportunity" /></SelectTrigger>
                        <SelectContent>{opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Customer</Label>
                    <Controller name="customer_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>
                <div><Label>Reason *</Label><Textarea className="mt-1" {...register('reason')} />{errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}</div>
                <div><Label>Justification</Label><Textarea className="mt-1" {...register('justification')} /></div>
                <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); setEditRequest(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editRequest ? 'Update' : 'Create Request'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Requests" value={requests.length} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Pending" value={pending} icon={<TrendingDown className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Approved" value={approved} icon={<Check className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Avg Discount" value={`${avgDiscount.toFixed(1)}%`} icon={<TrendingDown className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search requests..."
        searchKeys={['product_service', 'reason', 'justification']}
        rowKey="id"
        emptyTitle="No pricing requests yet"
        emptyDescription="Create your first pricing request to start tracking discounts"
        emptyAction={<Can resource="pricing" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Request</Button></Can>}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Pricing Request Details</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Number:</span> {selectedRequest.request_number}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedRequest.status} /></div>
                <div className="col-span-2"><span className="text-gray-500">Product/Service:</span> {selectedRequest.product_service}</div>
                <div><span className="text-gray-500">Current Price:</span> {formatCurrency(selectedRequest.current_price)}</div>
                <div><span className="text-gray-500">Requested Price:</span> {formatCurrency(selectedRequest.requested_price)}</div>
                <div className="font-semibold"><span className="text-gray-500">Discount:</span> {selectedRequest.discount_percentage?.toFixed(1)}%</div>
                <div><span className="text-gray-500">Customer:</span> {selectedRequest.customers?.name ?? '—'}</div>
                <div><span className="text-gray-500">Opportunity:</span> {selectedRequest.opportunities?.title ?? '—'}</div>
              </div>
              <div><span className="text-gray-500">Reason:</span> {selectedRequest.reason}</div>
              {selectedRequest.justification && <div><span className="text-gray-500">Justification:</span> {selectedRequest.justification}</div>}
              {selectedRequest.notes && <div><span className="text-gray-500">Notes:</span> {selectedRequest.notes}</div>}
              {selectedRequest.status === 'pending' ? (
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                  <Can resource="pricing" action="approve">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); approveRequest(selectedRequest); }}><Check className="h-4 w-4 mr-2" />Approve</Button>
                  </Can>
                  <Can resource="pricing" action="reject">
                    <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectRequest(selectedRequest); }}><X className="h-4 w-4 mr-2" />Reject</Button>
                  </Can>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteRequest} title="Delete Request?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
