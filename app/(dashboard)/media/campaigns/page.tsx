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
import { Target, Plus, Edit, Trash2, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const campaignSchema = z.object({
  campaign_name: z.string().min(1, 'Campaign name is required'),
  campaign_type: z.enum(['brand_awareness', 'product_launch', 'promotional', 'event_promotion', 'crisis_management', 'internal_communication', 'other']),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  budget: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  target_audience: z.string().optional(),
  objectives: z.string().optional(),
  assigned_to: z.string().optional(),
});
type CampaignForm = z.infer<typeof campaignSchema>;

export default function MediaCampaignsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.campaigns.create');
  const canEdit = isAdmin || hasPermission('media.campaigns.edit');
  const canDelete = isAdmin || hasPermission('media.campaigns.delete');
  const canApprove = isAdmin || hasPermission('media.campaigns.approve');

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, planned: 0, completed: 0, totalBudget: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { campaign_type: 'brand_awareness', priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [campaignRes, usersRes] = await Promise.all([
      supabase
        .from('media_campaigns')
        .select('*, assigned_to_profile:profiles!media_campaigns_assigned_to_fkey(first_name, last_name), created_by_profile:profiles!media_campaigns_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    if (campaignRes.error) {
      console.error('Error loading campaigns:', campaignRes.error);
      toast.error('Failed to load campaigns');
    }
    setCampaigns(campaignRes.data ?? []);
    setUsers(usersRes.data ?? []);

    const active = campaignRes.data?.filter(c => c.status === 'active').length || 0;
    const planned = campaignRes.data?.filter(c => c.status === 'planned').length || 0;
    const completed = campaignRes.data?.filter(c => c.status === 'completed').length || 0;
    const totalBudget = campaignRes.data?.reduce((sum, c) => sum + (c.budget || 0), 0) || 0;
    setStats({ active, planned, completed, totalBudget });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditCampaign(item);
    reset({
      campaign_name: item.campaign_name,
      campaign_type: item.campaign_type,
      description: item.description ?? '',
      start_date: item.start_date,
      end_date: item.end_date ? item.end_date.slice(0, 10) : '',
      budget: item.budget?.toString() ?? '',
      priority: item.priority,
      target_audience: item.target_audience ?? '',
      objectives: item.objectives?.join(', ') ?? '',
      assigned_to: item.assigned_to ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CampaignForm) => {
    if (!company?.id || !currentUser?.id) return;

    const objectives = data.objectives ? data.objectives.split(',').map(o => o.trim()).filter(o => o) : [];
    const campaignNumber = `MC-${Date.now()}`;

    if (editCampaign) {
      const { error } = await supabase
        .from('media_campaigns')
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
          assigned_to: data.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editCampaign.id);

      if (error) {
        toast.error('Failed to update campaign');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_campaigns',
        record_id: editCampaign.id,
        new_value: { campaign_name: data.campaign_name },
      });

      toast.success('Campaign updated');
    } else {
      const { error } = await supabase.from('media_campaigns').insert({
        company_id: company.id,
        campaign_number: campaignNumber,
        campaign_name: data.campaign_name,
        campaign_type: data.campaign_type,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        priority: data.priority,
        target_audience: data.target_audience,
        objectives,
        created_by: currentUser.id,
        assigned_to: data.assigned_to,
        status: 'planned',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create campaign');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_campaigns',
        new_value: { campaign_name: data.campaign_name, campaign_number: campaignNumber },
      });

      toast.success('Campaign created');
    }

    reset();
    setEditCampaign(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_campaigns')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete campaign');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_campaigns',
        record_id: deleteId,
      });
      toast.success('Campaign deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('media_campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'media_campaigns',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'campaign_number', header: 'Number' },
    { key: 'campaign_name', header: 'Campaign Name' },
    { 
      key: 'campaign_type',
      header: 'Type', 
      cell: (row) => row.campaign_type?.replace('_', ' ') || '-' 
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'priority',
      header: 'Priority', 
      cell: (row) => <span className={`capitalize ${row.priority === 'high' || row.priority === 'urgent' ? 'text-red-600 font-semibold' : ''}`}>{row.priority}</span>
    },
    { 
      key: 'start_date',
      header: 'Start Date', 
      cell: (row) => format(new Date(row.start_date), 'MMM dd, yyyy')
    },
    { 
      key: 'end_date',
      header: 'End Date', 
      cell: (row) => row.end_date ? format(new Date(row.end_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'budget',
      header: 'Budget', 
      cell: (row) => row.budget ? `$${row.budget.toLocaleString()}` : '-'
    },
    { 
      key: 'assigned_to',
      header: 'Assigned To', 
      cell: (row) => row.assigned_to_profile 
        ? `${row.assigned_to_profile.first_name} ${row.assigned_to_profile.last_name}` 
        : '-'
    },
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
          <DropdownMenuContent>
            {canEdit && (
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {row.status === 'planned' && canApprove && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Activate
              </DropdownMenuItem>
            )}
            {row.status === 'active' && canApprove && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'completed')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Complete
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Media Campaigns" description="Manage media campaigns and initiatives" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Campaigns' }]}>
        {canCreate && (
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
                  <Input {...register('campaign_name')} placeholder="Campaign name" />
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
                            <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                            <SelectItem value="product_launch">Product Launch</SelectItem>
                            <SelectItem value="promotional">Promotional</SelectItem>
                            <SelectItem value="event_promotion">Event Promotion</SelectItem>
                            <SelectItem value="crisis_management">Crisis Management</SelectItem>
                            <SelectItem value="internal_communication">Internal Communication</SelectItem>
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
                    <Label>Budget</Label>
                    <Input {...register('budget')} type="number" placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <Controller
                      name="assigned_to"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
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
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Campaign description" rows={3} />
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input {...register('target_audience')} placeholder="Target audience description" />
                </div>
                <div>
                  <Label>Objectives (comma-separated)</Label>
                  <Input {...register('objectives')} placeholder="objective1, objective2, ..." />
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
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active" value={stats.active} icon={<Target className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Planned" value={stats.planned} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Budget" value={`$${stats.totalBudget.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={campaigns}
        loading={loading}
        searchable
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
