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
import { Megaphone, Plus, Edit, Trash2, Send, CheckCircle, FileText, Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const pressReleaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  release_date: z.string().optional(),
  distribution_channels: z.string().optional(),
  media_outlets: z.string().optional(),
  contact_person: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  campaign_id: z.string().optional(),
});
type PressReleaseForm = z.infer<typeof pressReleaseSchema>;

export default function PRPage() {
  const { company, user: currentUser } = useAuth();
  const [pressReleases, setPressReleases] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPR, setEditPR] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ published: 0, draft: 0, review: 0, totalCoverage: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<PressReleaseForm>({
    resolver: zodResolver(pressReleaseSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [prRes, campaignRes] = await Promise.all([
      supabase
        .from('press_releases')
        .select('*, campaigns(campaign_name), created_by_profile:profiles!press_releases_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('marketing_campaigns').select('id, campaign_name').eq('company_id', company.id),
    ]);

    if (prRes.error) {
      console.error('Error loading press releases:', prRes.error);
      toast.error('Failed to load press releases');
    }
    setPressReleases(prRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);

    // Calculate stats
    const published = prRes.data?.filter(p => p.status === 'published').length || 0;
    const draft = prRes.data?.filter(p => p.status === 'draft').length || 0;
    const review = prRes.data?.filter(p => p.status === 'review').length || 0;
    
    // Get total coverage count
    const coverageRes = await supabase.from('pr_coverage').select('id').in(
      'press_release_id', 
      prRes.data?.map(p => p.id) || []
    );
    const totalCoverage = coverageRes.data?.length || 0;
    
    setStats({ published, draft, review, totalCoverage });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (pr: any) => {
    setEditPR(pr);
    reset({
      title: pr.title,
      summary: pr.summary ?? '',
      content: pr.content,
      release_date: pr.release_date ? pr.release_date.slice(0, 10) : '',
      distribution_channels: pr.distribution_channels?.join(', ') ?? '',
      media_outlets: pr.media_outlets?.join(', ') ?? '',
      contact_person: pr.contact_person ?? '',
      contact_email: pr.contact_email ?? '',
      campaign_id: pr.campaign_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: PressReleaseForm) => {
    if (!company?.id) return;

    const distributionChannels = data.distribution_channels ? data.distribution_channels.split(',').map(c => c.trim()).filter(c => c) : [];
    const mediaOutlets = data.media_outlets ? data.media_outlets.split(',').map(m => m.trim()).filter(m => m) : [];

    if (editPR) {
      const { error } = await supabase
        .from('press_releases')
        .update({
          title: data.title,
          summary: data.summary,
          content: data.content,
          release_date: data.release_date || null,
          distribution_channels: distributionChannels,
          media_outlets: mediaOutlets,
          contact_person: data.contact_person,
          contact_email: data.contact_email,
          campaign_id: data.campaign_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editPR.id);

      if (error) {
        toast.error('Failed to update press release');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'press_release_updated',
        module: 'marketing',
        record_id: editPR.id,
        new_values: { title: data.title },
      });

      toast.success('Press release updated');
    } else {
      const { error } = await supabase.from('press_releases').insert({
        company_id: company.id,
        title: data.title,
        summary: data.summary,
        content: data.content,
        release_date: data.release_date || null,
        distribution_channels: distributionChannels,
        media_outlets: mediaOutlets,
        contact_person: data.contact_person,
        contact_email: data.contact_email,
        campaign_id: data.campaign_id,
        created_by: currentUser?.id,
        status: 'draft',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create press release');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'press_release_created',
        module: 'marketing',
        new_values: { title: data.title },
      });

      toast.success('Press release created');
    }

    reset();
    setEditPR(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('press_releases')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete press release');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'press_release_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Press release deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('press_releases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'press_release_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'title', header: 'Title' },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'release_date',
      header: 'Release Date', 
      cell: (row) => row.release_date ? format(new Date(row.release_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'contact_person',
      header: 'Contact', 
      cell: (row) => row.contact_person || '-'
    },
    { 
      key: 'campaign',
      header: 'Campaign', 
      cell: (row) => row.campaigns?.campaign_name || '-'
    },
    { 
      key: 'created_by',
      header: 'Created By', 
      cell: (row) => row.created_by_profile 
        ? `${row.created_by_profile.first_name} ${row.created_by_profile.last_name}` 
        : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="pr" action="edit">
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
              {row.status === 'draft' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'review')}>
                  <Send className="h-4 w-4 mr-2" /> Submit for Review
                </DropdownMenuItem>
              )}
              {row.status === 'review' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'approved')}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve
                </DropdownMenuItem>
              )}
              {row.status === 'approved' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'published')}>
                  <Megaphone className="h-4 w-4 mr-2" /> Publish
                </DropdownMenuItem>
              )}
              <Can resource="pr" action="delete">
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
      <PageHeader title="Press Releases" description="Manage PR and communications" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Press Releases' }]}>
        <Can resource="pr" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditPR(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Press Release
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editPR ? 'Edit Press Release' : 'New Press Release'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Press release title" />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <Label>Summary</Label>
                  <Textarea {...register('summary')} placeholder="Brief summary" rows={2} />
                </div>
                <div>
                  <Label>Content *</Label>
                  <Textarea {...register('content')} placeholder="Full press release content" rows={8} />
                  {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
                </div>
                <div>
                  <Label>Release Date</Label>
                  <Input type="date" {...register('release_date')} />
                </div>
                <div>
                  <Label>Distribution Channels (comma-separated)</Label>
                  <Input {...register('distribution_channels')} placeholder="Email, Social Media, News Wire, etc." />
                </div>
                <div>
                  <Label>Target Media Outlets (comma-separated)</Label>
                  <Input {...register('media_outlets')} placeholder="TechCrunch, Forbes, etc." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    <Input {...register('contact_person')} placeholder="Name" />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input type="email" {...register('contact_email')} placeholder="email@example.com" />
                    {errors.contact_email && <p className="text-red-500 text-sm mt-1">{errors.contact_email.message}</p>}
                  </div>
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
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editPR ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Published" value={stats.published} icon={<Megaphone className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Draft" value={stats.draft} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="In Review" value={stats.review} icon={<Send className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Media Coverage" value={stats.totalCoverage} icon={<Globe className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={pressReleases}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Press Release"
        description="Are you sure you want to delete this press release? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
