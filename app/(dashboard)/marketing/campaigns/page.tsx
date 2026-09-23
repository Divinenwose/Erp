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
import { Target, Plus, Edit, Trash2, AlertCircle, CheckCircle, Clock, Play, Pause } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const campaignSchema = z.object({
  campaign_name: z.string().min(1, 'Campaign name is required'),
  campaign_type: z.enum(['digital', 'print', 'social_media', 'email', 'event', 'brand_awareness', 'product_launch', 'promotion', 'other']),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  budget: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  target_audience: z.string().optional(),
  objectives: z.string().optional(),
  branch_id: z.string().optional(),
  assigned_to: z.string().optional(),
});
type CampaignForm = z.infer<typeof campaignSchema>;

export default function CampaignsPage() {
  const { company, user: currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, planned: 0, completed: 0, totalBudget: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { priority: 'medium', campaign_type: 'digital' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [campRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('marketing_campaigns')
        .select('*, branches(name), created_by_profile:profiles!marketing_campaigns_created_by_fkey(first_name, last_name), assigned_to_profile:profiles!marketing_campaigns_assigned_to_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    if (campRes.error) {
      console.error('Error loading campaigns:', campRes.error);
      toast.error('Failed to load campaigns');
    }
    setCampaigns(campRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);

    // Calculate stats
    const active = campRes.data?.filter(c => c.status === 'active').length || 0;
    const planned = campRes.data?.filter(c => c.status === 'planned').length || 0;
    const completed = campRes.data?.filter(c => c.status === 'completed').length || 0;
    const totalBudget = campRes.data?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0;
    setStats({ active, planned, completed, totalBudget });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (campaign: any) => {
    setEditCampaign(campaign);
    reset({
      campaign_name: campaign.campaign_name,
      campaign_type: campaign.campaign_type,
      description: campaign.description ?? '',
      start_date: campaign.start_date,
      end_date: campaign.end_date ?? '',
      budget: campaign.budget?.toString() ?? '',
      priority: campaign.priority,
      target_audience: campaign.target_audience ?? '',
      objectives: campaign.objectives?.join(', ') ?? '',
      branch_id: campaign.branch_id ?? undefined,
      assigned_to: campaign.assigned_to ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CampaignForm) => {
    if (!company?.id) return;

    const objectives = data.objectives ? data.objectives.split(',').map(o => o.trim()).filter(o => o) : [];

    if (editCampaign) {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({
          campaign_name: data.campaign_name,
          campaign_type: data.campaign_type,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date || null,
          budget: data.budget ? parseFloat(data.budget) : null,
          priority: data.priority,
          target_audience: data.target_audience,
          objectives,
          branch_id: data.branch_id,
          assigned_to: data.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editCampaign.id);

      if (error) {
        toast.error('Failed to update campaign');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'campaign_updated',
        module: 'marketing',
        record_id: editCampaign.id,
        new_values: { campaign_name: data.campaign_name },
      });

      toast.success('Campaign updated');
    } else {
      const { error } = await supabase.from('marketing_campaigns').insert({
        company_id: company.id,
        campaign_name: data.campaign_name,
        campaign_type: data.campaign_type,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        priority: data.priority,
        target_audience: data.target_audience,
        objectives,
        branch_id: data.branch_id,
        assigned_to: data.assigned_to,
        created_by: currentUser?.id,
        status: 'planned',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create campaign');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'campaign_created',
        module: 'marketing',
        new_values: { campaign_name: data.campaign_name },
      });

      toast.success('Campaign created');
    }

    reset();
    setEditCampaign(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('marketing_campaigns')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete campaign');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'campaign_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Campaign deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('marketing_campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'campaign_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { header: 'Campaign Name', accessor: 'campaign_name' },
    { 
      header: 'Type', 
      accessor: (row) => row.campaign_type?.replace('_', ' ') || '-' 
    },
    { 
      header: 'Status', 
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { 
      header: 'Priority', 
      accessor: (row) => (
        <Badge variant={row.priority === 'urgent' ? 'destructive' : row.priority === 'high' ? 'default' : 'secondary'}>
          {row.priority}
        </Badge>
      )
    },
    { 
      header: 'Start Date', 
      accessor: (row) => row.start_date ? format(new Date(row.start_date), 'MMM dd, yyyy') : '-'
    },
    { 
      header: 'Budget', 
      accessor: (row) => row.budget ? `$${row.budget.toLocaleString()}` : '-'
    },
    { 
      header: 'Assigned To', 
      accessor: (row) => row.assigned_to_profile 
        ? `${row.assigned_to_profile.first_name} ${row.assigned_to_profile.last_name}` 
        : '-'
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Can do="marketing.campaigns.edit">
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
              {row.status === 'planned' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                  <Play className="h-4 w-4 mr-2" /> Start Campaign
                </DropdownMenuItem>
              )}
              {row.status === 'active' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'paused')}>
                  <Pause className="h-4 w-4 mr-2" /> Pause Campaign
                </DropdownMenuItem>
              )}
              {row.status === 'paused' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                  <Play className="h-4 w-4 mr-2" /> Resume Campaign
                </DropdownMenuItem>
              )}
              {row.status !== 'completed' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'completed')}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete
                </DropdownMenuItem>
              )}
              <Can do="marketing.campaigns.delete">
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
      <PageHeader title="Campaigns" description="Manage marketing campaigns" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Campaigns' }]}>
        <Can do="marketing.campaigns.create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditCampaign(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editCampaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Campaign Name *</Label>
                  <Input {...register('campaign_name')} placeholder="Enter campaign name" />
                  {errors.campaign_name && <p className="text-red-500 text-sm mt-1">{errors.campaign_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Campaign Type *</Label>
                    <Controller
                      name="campaign_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="digital">Digital</SelectItem>
                            <SelectItem value="print">Print</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                            <SelectItem value="product_launch">Product Launch</SelectItem>
                            <SelectItem value="promotion">Promotion</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Priority *</Label>
                    <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Campaign description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" {...register('start_date')} />
                    {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>}
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" {...register('end_date')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Budget ($)</Label>
                    <Input type="number" {...register('budget')} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Controller
                      name="branch_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input {...register('target_audience')} placeholder="Describe target audience" />
                </div>
                <div>
                  <Label>Objectives (comma-separated)</Label>
                  <Textarea {...register('objectives')} placeholder="Increase awareness, generate leads, etc." rows={2} />
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Controller
                    name="assigned_to"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Assign to user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editCampaign ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Campaigns" value={stats.active} icon={<Play className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Planned Campaigns" value={stats.planned} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed Campaigns" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Budget" value={`$${stats.totalBudget.toLocaleString()}`} icon={<Target className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={campaigns}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
