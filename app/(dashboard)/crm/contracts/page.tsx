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
import { FileText, Plus, Download, DollarSign, Check, X, MoreHorizontal, Edit, Trash2, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const contractSchema = z.object({
  contract_number: z.string().optional(),
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  opportunity_id: z.string().optional(),
  customer_id: z.string().optional(),
  proposal_id: z.string().optional(),
  contract_type: z.string().default('new_business'),
  contract_value: z.coerce.number().min(0).default(0),
  currency: z.string().default('USD'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  terms: z.string().optional(),
  renewal_terms: z.string().optional(),
  notes: z.string().optional(),
});
type ContractForm = z.infer<typeof contractSchema>;

export default function ContractsPage() {
  const { company, user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editContract, setEditContract] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: { contract_type: 'new_business', currency: 'USD' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [contRes, oppRes, custRes, propRes] = await Promise.all([
      supabase.from('sales_contracts').select('*, opportunities(title), customers(name), sales_proposals(proposal_number)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('opportunities').select('id, title').eq('company_id', company.id).eq('status', 'won'),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
      supabase.from('sales_proposals').select('id, proposal_number, title').eq('company_id', company.id).eq('status', 'approved'),
    ]);
    setContracts(contRes.data ?? []);
    setOpportunities(oppRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setProposals(propRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (cont: any) => {
    setEditContract(cont);
    reset({
      contract_number: cont.contract_number ?? '',
      title: cont.title,
      description: cont.description ?? '',
      opportunity_id: cont.opportunity_id ?? '',
      customer_id: cont.customer_id ?? '',
      proposal_id: cont.proposal_id ?? '',
      contract_type: cont.contract_type,
      contract_value: cont.contract_value ?? 0,
      currency: cont.currency ?? 'USD',
      start_date: cont.start_date ?? '',
      end_date: cont.end_date ?? '',
      terms: cont.terms ?? '',
      renewal_terms: cont.renewal_terms ?? '',
      notes: cont.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ContractForm) => {
    if (!company?.id) return;
    
    const contractNumber = editContract?.contract_number ?? `CTR-${String(contracts.length + 1).padStart(4, '0')}`;
    
    if (editContract) {
      const { error } = await supabase.from('sales_contracts').update({ 
        ...data, 
        updated_at: new Date().toISOString() 
      }).eq('id', editContract.id);
      if (error) { toast.error('Failed to update contract'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'sales_contracts', entity_id: editContract.id, new_value: { title: data.title } });
      }
      
      toast.success('Contract updated');
    } else {
      if (!company?.id) return;
      const { error } = await supabase.from('sales_contracts').insert({ 
        ...data, 
        company_id: company.id, 
        contract_number: contractNumber,
        status: 'draft',
        created_by: user?.id 
      });
      if (error) { toast.error('Failed to create contract'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'sales_contracts', new_value: { title: data.title, contract_number: contractNumber } });
      }
      
      toast.success('Contract created');
    }
    
    reset({ contract_type: 'new_business', currency: 'USD' });
    setEditContract(null);
    setDialogOpen(false);
    load();
  };

  const approveContract = async (cont: any) => {
    await supabase.from('sales_contracts').update({ 
      status: 'active', 
      approved_by: user?.id, 
      approved_at: new Date().toISOString() 
    }).eq('id', cont.id);
    setContracts(prev => prev.map(c => c.id === cont.id ? { ...c, status: 'active', approved_by: user?.id, approved_at: new Date().toISOString() } : c));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'crm', entity_type: 'sales_contracts', entity_id: cont.id });
    }
    
    // Finance integration: Create invoice when contract is approved
    if (cont.contract_value > 0 && company?.id) {
      const invoiceNumber = `INV-${String(Date.now()).slice(-8)}`;
      await supabase.from('invoices').insert({
        company_id: company.id,
        invoice_number: invoiceNumber,
        invoice_type: 'sales',
        customer_id: cont.customer_id,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: cont.end_date ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: cont.contract_value,
        tax_amount: 0,
        total_amount: cont.contract_value,
        balance_due: cont.contract_value,
        paid_amount: 0,
        currency: cont.currency ?? 'USD',
        notes: `Contract: ${cont.contract_number}`,
        status: 'pending',
        created_by: user?.id,
      });
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'finance', entity_type: 'invoices', new_value: { invoice_number: invoiceNumber, amount: cont.contract_value, reference: cont.contract_number } });
      }
    }
    
    toast.success('Contract approved and invoice created');
  };

  const signContract = async (cont: any) => {
    await supabase.from('sales_contracts').update({ 
      signed_by_company: true,
      signed_at: new Date().toISOString() 
    }).eq('id', cont.id);
    setContracts(prev => prev.map(c => c.id === cont.id ? { ...c, signed_by_company: true, signed_at: new Date().toISOString() } : c));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'signed', module: 'crm', entity_type: 'sales_contracts', entity_id: cont.id });
    }
    
    toast.success('Contract signed');
  };

  const deleteContract = async () => {
    if (!deleteId) return;
    await supabase.from('sales_contracts').delete().eq('id', deleteId);
    setContracts(prev => prev.filter(c => c.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'sales_contracts', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Contract deleted');
  };

  const viewContract = (cont: any) => {
    setSelectedContract(cont);
    setViewDialogOpen(true);
  };

  const draft = contracts.filter(c => c.status === 'draft').length;
  const active = contracts.filter(c => c.status === 'active').length;
  const signed = contracts.filter(c => c.signed_by_company && c.signed_by_customer).length;
  const totalValue = contracts.filter(c => c.status === 'active').reduce((a, c) => a + (c.contract_value ?? 0), 0);

  const columns: Column<any>[] = [
    { key: 'contract_number', header: 'Number', sortable: true, cell: (row) => <span className="font-medium text-sm">{row.contract_number}</span> },
    { key: 'title', header: 'Title', sortable: true, cell: (row) => <span className="text-sm">{row.title}</span> },
    { key: 'customers', header: 'Customer', cell: (row) => <span className="text-sm text-blue-600">{row.customers?.name ?? '—'}</span> },
    { key: 'contract_type', header: 'Type', cell: (row) => <span className="text-sm capitalize">{row.contract_type?.replace(/_/g, ' ')}</span> },
    { key: 'contract_value', header: 'Value', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.contract_value)}</span> },
    { key: 'start_date', header: 'Start Date', sortable: true, cell: (row) => <span className="text-sm">{row.start_date ? formatDate(row.start_date) : '—'}</span> },
    { key: 'end_date', header: 'End Date', sortable: true, cell: (row) => <span className="text-sm">{row.end_date ? formatDate(row.end_date) : '—'}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.contracts.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view contracts</div>}>
      <div className="space-y-6">
      <PageHeader title="Sales Contracts" description="Manage contracts and deals" breadcrumbs={[{ label: 'CRM' }, { label: 'Contracts' }]}>
        <Can resource="contracts" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="contracts" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditContract(null); reset({ contract_type: 'new_business', currency: 'USD' }); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Contract</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editContract ? 'Edit Contract' : 'New Contract'}</DialogTitle></DialogHeader>
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
                  <div><Label>Proposal</Label>
                    <Controller name="proposal_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select proposal" /></SelectTrigger>
                        <SelectContent>{proposals.map(p => <SelectItem key={p.id} value={p.id}>{p.proposal_number}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Contract Type</Label>
                    <Controller name="contract_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_business">New Business</SelectItem>
                          <SelectItem value="renewal">Renewal</SelectItem>
                          <SelectItem value="amendment">Amendment</SelectItem>
                          <SelectItem value="extension">Extension</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Contract Value</Label><Input className="mt-1" type="number" step="0.01" {...register('contract_value')} /></div>
                  <div><Label>Currency</Label>
                    <Controller name="currency" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Start Date</Label><Input className="mt-1" type="date" {...register('start_date')} /></div>
                  <div><Label>End Date</Label><Input className="mt-1" type="date" {...register('end_date')} /></div>
                </div>
                <div><Label>Terms</Label><Textarea className="mt-1" {...register('terms')} /></div>
                <div><Label>Renewal Terms</Label><Textarea className="mt-1" {...register('renewal_terms')} /></div>
                <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset({ contract_type: 'new_business', currency: 'USD' }); setEditContract(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editContract ? 'Update' : 'Create Contract'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Contracts" value={contracts.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Draft" value={draft} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<Check className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Active Value" value={formatCurrency(totalValue)} icon={<DollarSign className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search contracts..."
        searchKeys={['title', 'contract_number', 'description']}
        rowKey="id"
        emptyTitle="No contracts yet"
        emptyDescription="Create your first contract to start tracking deals"
        emptyAction={<Can resource="contracts" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Contract</Button></Can>}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Contract Details</DialogTitle></DialogHeader>
          {selectedContract && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Number:</span> {selectedContract.contract_number}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedContract.status} /></div>
                <div className="col-span-2"><span className="text-gray-500">Title:</span> {selectedContract.title}</div>
                <div><span className="text-gray-500">Customer:</span> {selectedContract.customers?.name ?? '—'}</div>
                <div><span className="text-gray-500">Opportunity:</span> {selectedContract.opportunities?.title ?? '—'}</div>
                <div><span className="text-gray-500">Proposal:</span> {selectedContract.sales_proposals?.proposal_number ?? '—'}</div>
                <div><span className="text-gray-500">Type:</span> {selectedContract.contract_type?.replace(/_/g, ' ')}</div>
                <div className="font-semibold"><span className="text-gray-500">Value:</span> {formatCurrency(selectedContract.contract_value)}</div>
                <div><span className="text-gray-500">Start Date:</span> {selectedContract.start_date ? formatDate(selectedContract.start_date) : '—'}</div>
                <div><span className="text-gray-500">End Date:</span> {selectedContract.end_date ? formatDate(selectedContract.end_date) : '—'}</div>
                <div><span className="text-gray-500">Signed by Company:</span> {selectedContract.signed_by_company ? 'Yes' : 'No'}</div>
                <div><span className="text-gray-500">Signed by Customer:</span> {selectedContract.signed_by_customer ? 'Yes' : 'No'}</div>
              </div>
              {selectedContract.terms && <div><span className="text-gray-500">Terms:</span> {selectedContract.terms}</div>}
              {selectedContract.renewal_terms && <div><span className="text-gray-500">Renewal Terms:</span> {selectedContract.renewal_terms}</div>}
              {selectedContract.notes && <div><span className="text-gray-500">Notes:</span> {selectedContract.notes}</div>}
              {selectedContract.status === 'draft' ? (
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                  <Can resource="contracts" action="approve">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); approveContract(selectedContract); }}><Check className="h-4 w-4 mr-2" />Approve</Button>
                  </Can>
                </div>
              ) : selectedContract.status === 'active' && !selectedContract.signed_by_company ? (
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                  <Can resource="contracts" action="sign">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setViewDialogOpen(false); signContract(selectedContract); }}><RefreshCw className="h-4 w-4 mr-2" />Sign</Button>
                  </Can>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteContract} title="Delete Contract?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
