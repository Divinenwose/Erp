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
import EmptyState from '@/components/common/EmptyState';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Target, Plus, Search, TrendingUp, Users, DollarSign, Award, MoreHorizontal, Edit, Trash2, Eye, Send, Check, X, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const leadSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  job_title: z.string().optional(),
  source: z.string().optional(),
  marketing_campaign_id: z.string().optional(),
  rating: z.string().default('warm'),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
});
type LeadForm = z.infer<typeof leadSchema>;

const sourceColors: Record<string, string> = {
  website: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  referral: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  email: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  social: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cold_call: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  event: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

export default function LeadsPage() {
  const { company, user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadToDelete, setLeadToDelete] = useState<any>(null);
  const [editLead, setEditLead] = useState<any | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<LeadForm>({ resolver: zodResolver(leadSchema), defaultValues: { rating: 'warm' } });

  const load = async () => {
    if (!company?.id) return;
    const [leadRes, empRes, campRes] = await Promise.all([
      supabase.from('leads').select('*, employees(full_name), marketing_campaigns(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, full_name').eq('company_id', company.id).eq('status', 'active'),
      supabase.from('marketing_campaigns').select('id, name').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setLeads(leadRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setCampaigns(campRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: LeadForm) => {
    if (!company?.id) return;
    
    if (editLead) {
      const { error } = await supabase.from('leads').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editLead.id);
      if (error) { toast.error('Failed to update lead'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'leads', entity_id: editLead.id, new_value: { first_name: data.first_name, last_name: data.last_name } });
      }
      
      toast.success('Lead updated');
    } else {
      const { error } = await supabase.from('leads').insert({ ...data, company_id: company.id, status: 'new' });
      if (error) { toast.error('Failed to create lead'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'leads', new_value: { first_name: data.first_name, last_name: data.last_name } });
      }
      
      toast.success('Lead created');
    }
    
    reset(); setEditLead(null); setDialogOpen(false); load();
  };

  const convertToOpportunity = async (lead: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('opportunities').insert({
      company_id: company.id,
      title: `${lead.first_name} ${lead.last_name ?? ''} - ${lead.company_name ?? 'Opportunity'}`,
      lead_id: lead.id,
      stage: 'prospecting',
      probability: 20,
      status: 'open',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to convert to opportunity'); return; }
    
    await supabase.from('leads').update({ status: 'converted', converted_at: new Date().toISOString() }).eq('id', lead.id);
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'converted', module: 'crm', entity_type: 'leads', entity_id: lead.id, new_value: { status: 'converted' } });
    }
    
    toast.success('Lead converted to opportunity');
    load();
  };

  const deleteLead = async () => {
    if (!company?.id || !leadToDelete) return;
    const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id);
    if (error) { toast.error('Failed to delete lead'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'leads', entity_id: leadToDelete.id });
    }
    
    toast.success('Lead deleted');
    setDeleteDialogOpen(false);
    setLeadToDelete(null);
    load();
  };

  const viewLead = (lead: any) => {
    setSelectedLead(lead);
    setViewDialogOpen(true);
  };

  const openEdit = (lead: any) => {
    setEditLead(lead);
    reset({ 
      first_name: lead.first_name, 
      last_name: lead.last_name ?? '', 
      email: lead.email ?? '', 
      phone: lead.phone ?? '', 
      company_name: lead.company_name ?? '', 
      job_title: lead.job_title ?? '', 
      source: lead.source ?? '', 
      marketing_campaign_id: lead.marketing_campaign_id ?? '',
      rating: lead.rating, 
      assigned_to: lead.assigned_to ?? '', 
      notes: lead.notes ?? '' 
    });
    setDialogOpen(true);
  };

  const newLeads = leads.filter(l => l.status === 'new').length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const qualified = leads.filter(l => l.status === 'qualified').length;

  const ratingColors: Record<string, string> = {
    hot: 'text-red-600',
    warm: 'text-amber-600',
    cold: 'text-blue-600',
  };

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Name',
      cell: (row) => <span className="font-medium text-sm">{row.first_name} {row.last_name ?? ''}</span>,
    },
    { key: 'company_name', header: 'Company', cell: (row) => <span className="text-sm text-gray-500">{row.company_name ?? '—'}</span> },
    { key: 'email', header: 'Email', cell: (row) => <span className="text-sm text-gray-500">{row.email ?? '—'}</span> },
    { key: 'phone', header: 'Phone', cell: (row) => <span className="text-sm text-gray-500">{row.phone ?? '—'}</span> },
    { key: 'source', header: 'Source', cell: (row) => row.source ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColors[row.source] ?? 'bg-gray-100 text-gray-600'}`}>{row.source.replace(/_/g, ' ')}</span> : <span className="text-gray-400">—</span> },
    { key: 'rating', header: 'Rating', cell: (row) => <span className={`text-xs font-semibold ${ratingColors[row.rating] ?? 'text-gray-500'}`}>{row.rating}</span> },
    { key: 'employees', header: 'Assigned To', cell: (row) => <span className="text-sm text-gray-500">{row.employees?.full_name ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.leads.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view leads</div>}>
      <div className="space-y-6">
      <PageHeader title="Leads" description="Track and manage sales leads" breadcrumbs={[{ label: 'CRM' }, { label: 'Leads' }]}>
        <Can resource="leads" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="leads" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditLead(null); reset(); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Lead</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input className="mt-1" {...register('first_name')} />{errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}</div>
                <div><Label>Last Name</Label><Input className="mt-1" {...register('last_name')} /></div>
                <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                <div><Label>Company</Label><Input className="mt-1" {...register('company_name')} /></div>
                <div><Label>Job Title</Label><Input className="mt-1" {...register('job_title')} /></div>
                <div><Label>Source</Label>
                  <Controller name="source" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="email">Email Campaign</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Marketing Campaign</Label>
                  <Controller name="marketing_campaign_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                      <SelectContent>{campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Rating</Label>
                  <Controller name="rating" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hot">Hot</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cold">Cold</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Assigned To</Label>
                  <Controller name="assigned_to" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Assign to" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); setEditLead(null); }}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editLead ? 'Update Lead' : 'Add Lead'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Leads" value={leads.length} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="New" value={newLeads} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Qualified" value={qualified} icon={<Award className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Converted" value={converted} icon={<Users className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={leads}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search leads..."
            searchKeys={['first_name', 'last_name', 'company_name', 'email', 'phone']}
            rowKey="id"
            emptyTitle="No leads yet"
            emptyDescription="Add your first lead to start building your pipeline"
            emptyAction={<Can resource="leads" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Lead</Button></Can>}
          />
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
          {selectedLead && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Name:</span> {selectedLead.first_name} {selectedLead.last_name ?? ''}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedLead.status} /></div>
                <div><span className="text-gray-500">Company:</span> {selectedLead.company_name ?? '—'}</div>
                <div><span className="text-gray-500">Job Title:</span> {selectedLead.job_title ?? '—'}</div>
                <div><span className="text-gray-500">Email:</span> {selectedLead.email ?? '—'}</div>
                <div><span className="text-gray-500">Phone:</span> {selectedLead.phone ?? '—'}</div>
                <div><span className="text-gray-500">Source:</span> {selectedLead.source?.replace(/_/g, ' ') ?? '—'}</div>
                <div><span className="text-gray-500">Rating:</span> {selectedLead.rating}</div>
                <div><span className="text-gray-500">Assigned To:</span> {selectedLead.employees?.full_name ?? '—'}</div>
                <div><span className="text-gray-500">Campaign:</span> {selectedLead.marketing_campaigns?.name ?? '—'}</div>
              </div>
              {selectedLead.notes && <div><span className="text-gray-500">Notes:</span> {selectedLead.notes}</div>}
              {selectedLead.status === 'new' || selectedLead.status === 'contacted' || selectedLead.status === 'qualified' ? (
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                  <Can resource="leads" action="convert">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); convertToOpportunity(selectedLead); }}>Convert to Opportunity</Button>
                  </Can>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        onConfirm={deleteLead}
      />
    </div>
    </PermissionGuard>
  );
}
