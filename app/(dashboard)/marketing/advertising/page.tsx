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
import { MonitorPlay, Plus, Edit, Trash2, Play, Pause, DollarSign, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const adCampaignSchema = z.object({
  ad_name: z.string().min(1, 'Ad name is required'),
  ad_type: z.enum(['display', 'search', 'social', 'video', 'native', 'print', 'tv', 'radio', 'outdoor', 'other']),
  platform: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  budget: z.string().optional(),
  target_audience: z.string().optional(),
  creative_assets: z.string().optional(),
  tracking_pixel: z.string().optional(),
  conversion_goal: z.string().optional(),
  marketing_campaign_id: z.string().optional(),
});
type AdCampaignForm = z.infer<typeof adCampaignSchema>;

export default function AdvertisingPage() {
  const { company, user: currentUser } = useAuth();
  const [adCampaigns, setAdCampaigns] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAd, setEditAd] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, planned: 0, totalBudget: 0, totalSpend: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<AdCampaignForm>({
    resolver: zodResolver(adCampaignSchema),
    defaultValues: { ad_type: 'display' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [adRes, campaignRes] = await Promise.all([
      supabase
        .from('advertising_campaigns')
        .select('*, marketing_campaigns(campaign_name), created_by_profile:profiles!advertising_campaigns_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('marketing_campaigns').select('id, campaign_name').eq('company_id', company.id),
    ]);

    if (adRes.error) {
      console.error('Error loading ad campaigns:', adRes.error);
      toast.error('Failed to load ad campaigns');
    }
    setAdCampaigns(adRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);

    // Calculate stats
    const active = adRes.data?.filter(a => a.status === 'active').length || 0;
    const planned = adRes.data?.filter(a => a.status === 'planned').length || 0;
    const totalBudget = adRes.data?.reduce((sum, a) => sum + (a.budget || 0), 0) || 0;
    const totalSpend = adRes.data?.reduce((sum, a) => sum + (a.actual_spend || 0), 0) || 0;
    setStats({ active, planned, totalBudget, totalSpend });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (ad: any) => {
    setEditAd(ad);
    reset({
      ad_name: ad.ad_name,
      ad_type: ad.ad_type,
      platform: ad.platform ?? '',
      start_date: ad.start_date,
      end_date: ad.end_date ?? '',
      budget: ad.budget?.toString() ?? '',
      target_audience: ad.target_audience ?? '',
      creative_assets: ad.creative_assets?.join(', ') ?? '',
      tracking_pixel: ad.tracking_pixel ?? '',
      conversion_goal: ad.conversion_goal ?? '',
      marketing_campaign_id: ad.marketing_campaign_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: AdCampaignForm) => {
    if (!company?.id) return;

    const creativeAssets = data.creative_assets ? data.creative_assets.split(',').map(a => a.trim()).filter(a => a) : [];

    if (editAd) {
      const { error } = await supabase
        .from('advertising_campaigns')
        .update({
          ad_name: data.ad_name,
          ad_type: data.ad_type,
          platform: data.platform,
          start_date: data.start_date,
          end_date: data.end_date || null,
          budget: data.budget ? parseFloat(data.budget) : null,
          target_audience: data.target_audience,
          creative_assets: creativeAssets,
          tracking_pixel: data.tracking_pixel,
          conversion_goal: data.conversion_goal,
          marketing_campaign_id: data.marketing_campaign_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editAd.id);

      if (error) {
        toast.error('Failed to update ad campaign');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'ad_campaign_updated',
        module: 'marketing',
        record_id: editAd.id,
        new_values: { ad_name: data.ad_name },
      });

      toast.success('Ad campaign updated');
    } else {
      const { error } = await supabase.from('advertising_campaigns').insert({
        company_id: company.id,
        ad_name: data.ad_name,
        ad_type: data.ad_type,
        platform: data.platform,
        start_date: data.start_date,
        end_date: data.end_date || null,
        budget: data.budget ? parseFloat(data.budget) : null,
        target_audience: data.target_audience,
        creative_assets: creativeAssets,
        tracking_pixel: data.tracking_pixel,
        conversion_goal: data.conversion_goal,
        marketing_campaign_id: data.marketing_campaign_id,
        created_by: currentUser?.id,
        status: 'planned',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create ad campaign');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'ad_campaign_created',
        module: 'marketing',
        new_values: { ad_name: data.ad_name },
      });

      toast.success('Ad campaign created');
    }

    reset();
    setEditAd(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('advertising_campaigns')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete ad campaign');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'ad_campaign_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Ad campaign deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('advertising_campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'ad_campaign_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'ad_name', header: 'Ad Name' },
    { 
      key: 'ad_type',
      header: 'Type', 
      cell: (row) => row.ad_type || '-'
    },
    { 
      key: 'platform',
      header: 'Platform', 
      cell: (row) => row.platform || '-'
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'start_date',
      header: 'Start Date', 
      cell: (row) => row.start_date ? format(new Date(row.start_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'budget',
      header: 'Budget', 
      cell: (row) => row.budget ? `$${row.budget.toLocaleString()}` : '-'
    },
    { 
      key: 'actual_spend',
      header: 'Actual Spend', 
      cell: (row) => row.actual_spend ? `$${row.actual_spend.toLocaleString()}` : '-'
    },
    { 
      key: 'campaign',
      header: 'Campaign', 
      cell: (row) => row.marketing_campaigns?.campaign_name || '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="advertising" action="edit">
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
              <Can resource="advertising" action="delete">
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
      <PageHeader title="Advertising" description="Manage advertising campaigns and media planning" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Advertising' }]}>
        <Can resource="advertising" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditAd(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Ad Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editAd ? 'Edit Ad Campaign' : 'New Ad Campaign'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Ad Name *</Label>
                  <Input {...register('ad_name')} placeholder="Enter ad name" />
                  {errors.ad_name && <p className="text-red-500 text-sm mt-1">{errors.ad_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ad Type *</Label>
                    <Controller
                      name="ad_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="display">Display</SelectItem>
                            <SelectItem value="search">Search</SelectItem>
                            <SelectItem value="social">Social</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="native">Native</SelectItem>
                            <SelectItem value="print">Print</SelectItem>
                            <SelectItem value="tv">TV</SelectItem>
                            <SelectItem value="radio">Radio</SelectItem>
                            <SelectItem value="outdoor">Outdoor</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Platform</Label>
                    <Input {...register('platform')} placeholder="Google, Facebook, etc." />
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
                    <Label>Budget ($)</Label>
                    <Input type="number" {...register('budget')} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Marketing Campaign</Label>
                    <Controller
                      name="marketing_campaign_id"
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
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Input {...register('target_audience')} placeholder="Describe target audience" />
                </div>
                <div>
                  <Label>Creative Assets (comma-separated URLs)</Label>
                  <Input {...register('creative_assets')} placeholder="https://..., https://..." />
                </div>
                <div>
                  <Label>Tracking Pixel</Label>
                  <Input {...register('tracking_pixel')} placeholder="Pixel code or URL" />
                </div>
                <div>
                  <Label>Conversion Goal</Label>
                  <Input {...register('conversion_goal')} placeholder="e.g., Sign-ups, Purchases" />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editAd ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Campaigns" value={stats.active} icon={<Play className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Planned Campaigns" value={stats.planned} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Budget" value={`$${stats.totalBudget.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Actual Spend" value={`$${stats.totalSpend.toLocaleString()}`} icon={<MonitorPlay className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={adCampaigns}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Ad Campaign"
        description="Are you sure you want to delete this ad campaign? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
