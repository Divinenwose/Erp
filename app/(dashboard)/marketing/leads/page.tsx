'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
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
import { UserPlus, Plus, Edit, Trash2, Mail, Phone, CheckCircle, X, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const leadSchema = z.object({
  lead_name: z.string().min(1, 'Lead name is required'),
  company_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  lead_source: z.enum(['website', 'social_media', 'referral', 'event', 'advertising', 'email_campaign', 'cold_call', 'other']),
  lead_status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  estimated_value: z.string().optional(),
  notes: z.string().optional(),
  campaign_id: z.string().optional(),
});
type LeadForm = z.infer<typeof leadSchema>;

export default function MarketingLeadsPage() {
  const { company, user: currentUser } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, new: 0, qualified: 0, closedWon: 0, totalValue: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { lead_source: 'website', lead_status: 'new' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [leadsRes, campaignRes] = await Promise.all([
      supabase
        .from('marketing_leads')
        .select('*, campaigns(campaign_name), created_by_profile:profiles!marketing_leads_created_by_fkey(first_name, last_name), assigned_to_profile:profiles!marketing_leads_assigned_to_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('marketing_campaigns').select('id, campaign_name').eq('company_id', company.id),
    ]);

    if (leadsRes.error) {
      console.error('Error loading leads:', leadsRes.error);
      toast.error('Failed to load leads');
    }
    setLeads(leadsRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);

    // Calculate stats
    const total = leadsRes.data?.length || 0;
    const newLeads = leadsRes.data?.filter(l => l.lead_status === 'new').length || 0;
    const qualified = leadsRes.data?.filter(l => l.lead_status === 'qualified').length || 0;
    const closedWon = leadsRes.data?.filter(l => l.lead_status === 'closed_won').length || 0;
    const totalValue = leadsRes.data?.reduce((sum, l) => sum + (l.estimated_value || 0), 0) || 0;
    setStats({ total, new: newLeads, qualified, closedWon, totalValue });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (lead: any) => {
    setEditLead(lead);
    reset({
      lead_name: lead.lead_name,
      company_name: lead.company_name ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      lead_source: lead.lead_source,
      lead_status: lead.lead_status,
      estimated_value: lead.estimated_value?.toString() ?? '',
      notes: lead.notes ?? '',
      campaign_id: lead.campaign_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: LeadForm) => {
    if (!company?.id) return;

    if (editLead) {
      const { error } = await supabase
        .from('marketing_leads')
        .update({
          lead_name: data.lead_name,
          company_name: data.company_name,
          email: data.email,
          phone: data.phone,
          lead_source: data.lead_source,
          lead_status: data.lead_status,
          estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
          notes: data.notes,
          campaign_id: data.campaign_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editLead.id);

      if (error) {
        toast.error('Failed to update lead');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_lead_updated',
        module: 'marketing',
        record_id: editLead.id,
        new_values: { lead_name: data.lead_name },
      });

      toast.success('Lead updated');
    } else {
      const { error } = await supabase.from('marketing_leads').insert({
        company_id: company.id,
        lead_name: data.lead_name,
        company_name: data.company_name,
        email: data.email,
        phone: data.phone,
        lead_source: data.lead_source,
        lead_status: data.lead_status,
        estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
        notes: data.notes,
        campaign_id: data.campaign_id,
        created_by: currentUser?.id,
      });

      if (error) {
        toast.error('Failed to create lead');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_lead_created',
        module: 'marketing',
        new_values: { lead_name: data.lead_name },
      });

      toast.success('Lead created');
    }

    reset();
    setEditLead(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('marketing_leads')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete lead');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_lead_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Lead deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('marketing_leads')
      .update({ lead_status: status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_lead_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { lead_status: status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'lead_name', header: 'Lead Name' },
    { 
      key: 'company_name',
      header: 'Company', 
      cell: (row) => row.company_name || '-'
    },
    { 
      key: 'lead_status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.lead_status} />
    },
    { 
      key: 'lead_source',
      header: 'Source', 
      cell: (row) => <Badge variant="outline">{row.lead_source?.replace('_', ' ')}</Badge>
    },
    { 
      key: 'email',
      header: 'Email', 
      cell: (row) => row.email ? (
        <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
          <Mail className="h-3 w-3" /> {row.email}
        </a>
      ) : '-'
    },
    { 
      key: 'phone',
      header: 'Phone', 
      cell: (row) => row.phone || '-'
    },
    { 
      key: 'estimated_value',
      header: 'Estimated Value', 
      cell: (row) => row.estimated_value ? `$${row.estimated_value.toLocaleString()}` : '-'
    },
    { 
      key: 'campaign',
      header: 'Campaign', 
      cell: (row) => row.campaigns?.campaign_name || '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can do="marketing.leads.edit">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'contacted')}>
                <Mail className="h-4 w-4 mr-2" /> Mark Contacted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'qualified')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Qualify
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'closed_won')}>
                <TrendingUp className="h-4 w-4 mr-2" /> Close Won
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'closed_lost')}>
                <X className="h-4 w-4 mr-2" /> Close Lost
              </DropdownMenuItem>
              <Can do="marketing.leads.delete">
                <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Leads" description="Manage marketing leads and opportunities" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Leads' }]}>
        <Can do="marketing.leads.create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditLead(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editLead ? 'Edit Lead' : 'New Lead'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Lead Name *</Label>
                    <Input {...register('lead_name')} placeholder="Full name" />
                    {errors.lead_name && <p className="text-red-500 text-sm mt-1">{errors.lead_name.message}</p>}
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input {...register('company_name')} placeholder="Company" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" {...register('email')} placeholder="email@example.com" />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input {...register('phone')} placeholder="+1 234 567 890" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Lead Source *</Label>
                    <Controller
                      name="lead_source"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="advertising">Advertising</SelectItem>
                            <SelectItem value="email_campaign">Email Campaign</SelectItem>
                            <SelectItem value="cold_call">Cold Call</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Status *</Label>
                    <Controller
                      name="lead_status"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal">Proposal</SelectItem>
                            <SelectItem value="negotiation">Negotiation</SelectItem>
                            <SelectItem value="closed_won">Closed Won</SelectItem>
                            <SelectItem value="closed_lost">Closed Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>Estimated Value ($)</Label>
                  <Input type="number" {...register('estimated_value')} placeholder="0.00" />
                </div>
                <div>
                  <Label>Campaign</Label>
                  <Controller
                    name="campaign_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.campaign_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editLead ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Leads" value={stats.total} icon={<UserPlus className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="New Leads" value={stats.new} icon={<UserPlus className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Qualified" value={stats.qualified} icon={<CheckCircle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Closed Won" value={stats.closedWon} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Pipeline Value" value={`$${stats.totalValue.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4 text-green-600" />} iconBg="bg-green-50 dark:bg-green-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
