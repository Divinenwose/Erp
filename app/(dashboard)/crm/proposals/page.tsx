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
import { FileText, Plus, Download, DollarSign, Check, X, MoreHorizontal, Edit, Trash2, Send, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const proposalSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  opportunity_id: z.string().optional(),
  customer_id: z.string().optional(),
  subtotal: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  currency: z.string().default('USD'),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
});
type ProposalForm = z.infer<typeof proposalSchema>;

export default function ProposalsPage() {
  const { company, user } = useAuth();
  const [proposals, setProposals] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editProposal, setEditProposal] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ProposalForm>({
    resolver: zodResolver(proposalSchema),
    defaultValues: { currency: 'USD' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [propRes, oppRes, custRes] = await Promise.all([
      supabase.from('sales_proposals').select('*, opportunities(title), customers(name), auth_users(email)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('opportunities').select('id, title').eq('company_id', company.id).eq('status', 'open'),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
    ]);
    setProposals(propRes.data ?? []);
    setOpportunities(oppRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (prop: any) => {
    setEditProposal(prop);
    reset({
      title: prop.title,
      description: prop.description ?? '',
      opportunity_id: prop.opportunity_id ?? '',
      customer_id: prop.customer_id ?? '',
      subtotal: prop.subtotal ?? 0,
      tax_amount: prop.tax_amount ?? 0,
      discount_amount: prop.discount_amount ?? 0,
      currency: prop.currency ?? 'USD',
      valid_until: prop.valid_until ?? '',
      notes: prop.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ProposalForm) => {
    if (!company?.id) return;
    
    const totalAmount = (data.subtotal ?? 0) + (data.tax_amount ?? 0) - (data.discount_amount ?? 0);
    const proposalNumber = editProposal?.proposal_number ?? `PROP-${String(proposals.length + 1).padStart(4, '0')}`;
    
    if (editProposal) {
      const { error } = await supabase.from('sales_proposals').update({ 
        ...data, 
        total_amount: totalAmount,
        updated_at: new Date().toISOString() 
      }).eq('id', editProposal.id);
      if (error) { toast.error('Failed to update proposal'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'sales_proposals', entity_id: editProposal.id, new_value: { title: data.title } });
      }
      
      toast.success('Proposal updated');
    } else {
      if (!company?.id) return;
      const { error } = await supabase.from('sales_proposals').insert({ 
        ...data, 
        company_id: company.id, 
        proposal_number: proposalNumber,
        total_amount: totalAmount,
        status: 'draft',
        created_by: user?.id 
      });
      if (error) { toast.error('Failed to create proposal'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'sales_proposals', new_value: { title: data.title, proposal_number: proposalNumber } });
      }
      
      toast.success('Proposal created');
    }
    
    reset({ currency: 'USD' });
    setEditProposal(null);
    setDialogOpen(false);
    load();
  };

  const approveProposal = async (prop: any) => {
    await supabase.from('sales_proposals').update({ 
      status: 'approved', 
      approved_by: user?.id, 
      approved_at: new Date().toISOString() 
    }).eq('id', prop.id);
    setProposals(prev => prev.map(p => p.id === prop.id ? { ...p, status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() } : p));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'crm', entity_type: 'sales_proposals', entity_id: prop.id });
    }
    
    toast.success('Proposal approved');
  };

  const rejectProposal = async (prop: any) => {
    await supabase.from('sales_proposals').update({ 
      status: 'rejected', 
      rejected_by: user?.id, 
      rejected_at: new Date().toISOString(),
      rejection_reason: 'Rejected by user'
    }).eq('id', prop.id);
    setProposals(prev => prev.map(p => p.id === prop.id ? { ...p, status: 'rejected', rejected_by: user?.id, rejected_at: new Date().toISOString() } : p));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'rejected', module: 'crm', entity_type: 'sales_proposals', entity_id: prop.id });
    }
    
    toast.success('Proposal rejected');
  };

  const deleteProposal = async () => {
    if (!deleteId) return;
    await supabase.from('sales_proposals').delete().eq('id', deleteId);
    setProposals(prev => prev.filter(p => p.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'sales_proposals', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Proposal deleted');
  };

  const viewProposal = (prop: any) => {
    setSelectedProposal(prop);
    setViewDialogOpen(true);
  };

  const draft = proposals.filter(p => p.status === 'draft').length;
  const approved = proposals.filter(p => p.status === 'approved').length;
  const pending = proposals.filter(p => p.status === 'pending').length;
  const totalValue = proposals.filter(p => p.status === 'approved').reduce((a, p) => a + (p.total_amount ?? 0), 0);

  const columns: Column<any>[] = [
    { key: 'proposal_number', header: 'Number', sortable: true, cell: (row) => <span className="font-medium text-sm">{row.proposal_number}</span> },
    { key: 'title', header: 'Title', sortable: true, cell: (row) => <span className="text-sm">{row.title}</span> },
    { key: 'customers', header: 'Customer', cell: (row) => <span className="text-sm text-blue-600">{row.customers?.name ?? '—'}</span> },
    { key: 'opportunities', header: 'Opportunity', cell: (row) => <span className="text-sm text-gray-500">{row.opportunities?.title ?? '—'}</span> },
    { key: 'total_amount', header: 'Value', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.total_amount)}</span> },
    { key: 'valid_until', header: 'Valid Until', sortable: true, cell: (row) => <span className="text-sm">{row.valid_until ? formatDate(row.valid_until) : '—'}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.proposals.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view proposals</div>}>
      <div className="space-y-6">
      <PageHeader title="Proposals & Quotations" description="Manage sales proposals and quotations" breadcrumbs={[{ label: 'CRM' }, { label: 'Proposals' }]}>
        <Can resource="proposals" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="proposals" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditProposal(null); reset({ currency: 'USD' }); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Proposal</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editProposal ? 'Edit Proposal' : 'New Proposal'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div><Label>Title *</Label><Input className="mt-1" {...register('title')} />{errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}</div>
                <div><Label>Description</Label><Textarea className="mt-1" {...register('description')} /></div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div><Label>Subtotal</Label><Input className="mt-1" type="number" step="0.01" {...register('subtotal')} /></div>
                  <div><Label>Tax Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('tax_amount')} /></div>
                  <div><Label>Discount Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('discount_amount')} /></div>
                  <div><Label>Currency</Label>
                    <Controller name="currency" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Valid Until</Label><Input className="mt-1" type="date" {...register('valid_until')} /></div>
                </div>
                <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset({ currency: 'USD' }); setEditProposal(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editProposal ? 'Update' : 'Create Proposal'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Proposals" value={proposals.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Draft" value={draft} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="Pending" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Approved Value" value={formatCurrency(totalValue)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={proposals}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search proposals..."
        searchKeys={['title', 'proposal_number', 'description', 'notes']}
        rowKey="id"
        emptyTitle="No proposals yet"
        emptyDescription="Create your first proposal to start tracking quotations"
        emptyAction={<Can resource="proposals" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Proposal</Button></Can>}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Proposal Details</DialogTitle></DialogHeader>
          {selectedProposal && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Number:</span> {selectedProposal.proposal_number}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedProposal.status} /></div>
                <div className="col-span-2"><span className="text-gray-500">Title:</span> {selectedProposal.title}</div>
                <div><span className="text-gray-500">Customer:</span> {selectedProposal.customers?.name ?? '—'}</div>
                <div><span className="text-gray-500">Opportunity:</span> {selectedProposal.opportunities?.title ?? '—'}</div>
                <div><span className="text-gray-500">Subtotal:</span> {formatCurrency(selectedProposal.subtotal)}</div>
                <div><span className="text-gray-500">Tax:</span> {formatCurrency(selectedProposal.tax_amount)}</div>
                <div><span className="text-gray-500">Discount:</span> {formatCurrency(selectedProposal.discount_amount)}</div>
                <div className="col-span-2 font-semibold"><span className="text-gray-500">Total:</span> {formatCurrency(selectedProposal.total_amount)}</div>
                <div><span className="text-gray-500">Valid Until:</span> {selectedProposal.valid_until ? formatDate(selectedProposal.valid_until) : '—'}</div>
                <div><span className="text-gray-500">Currency:</span> {selectedProposal.currency}</div>
              </div>
              {selectedProposal.description && <div><span className="text-gray-500">Description:</span> {selectedProposal.description}</div>}
              {selectedProposal.notes && <div><span className="text-gray-500">Notes:</span> {selectedProposal.notes}</div>}
              {selectedProposal.status === 'draft' || selectedProposal.status === 'pending' ? (
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                  <Can resource="proposals" action="approve">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); approveProposal(selectedProposal); }}><Check className="h-4 w-4 mr-2" />Approve</Button>
                  </Can>
                  <Can resource="proposals" action="reject">
                    <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectProposal(selectedProposal); }}><X className="h-4 w-4 mr-2" />Reject</Button>
                  </Can>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteProposal} title="Delete Proposal?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
