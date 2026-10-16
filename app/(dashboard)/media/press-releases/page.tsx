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
import { Megaphone, Plus, Edit, Trash2, CheckCircle, Clock, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  media_campaign_id: z.string().optional(),
});
type PressReleaseForm = z.infer<typeof pressReleaseSchema>;

export default function MediaPressReleasesPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.press_releases.create');
  const canEdit = isAdmin || hasPermission('media.press_releases.edit');
  const canDelete = isAdmin || hasPermission('media.press_releases.delete');
  const canApprove = isAdmin || hasPermission('media.press_releases.approve');
  const canPublish = isAdmin || hasPermission('media.press_releases.publish');

  const [pressReleases, setPressReleases] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRelease, setEditRelease] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ published: 0, draft: 0, review: 0, scheduled: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<PressReleaseForm>({
    resolver: zodResolver(pressReleaseSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [releasesRes, campaignRes] = await Promise.all([
      supabase
        .from('media_press_releases')
        .select('*, media_campaigns(campaign_name), created_by_profile:profiles!media_press_releases_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('media_campaigns').select('id, campaign_name').eq('company_id', company.id),
    ]);

    if (releasesRes.error) {
      console.error('Error loading press releases:', releasesRes.error);
      toast.error('Failed to load press releases');
    }
    setPressReleases(releasesRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);

    const published = releasesRes.data?.filter(r => r.status === 'published').length || 0;
    const draft = releasesRes.data?.filter(r => r.status === 'draft').length || 0;
    const review = releasesRes.data?.filter(r => r.status === 'review').length || 0;
    const scheduled = releasesRes.data?.filter(r => r.status === 'scheduled').length || 0;
    setStats({ published, draft, review, scheduled });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditRelease(item);
    reset({
      title: item.title,
      summary: item.summary ?? '',
      content: item.content,
      release_date: item.release_date ? item.release_date.slice(0, 10) : '',
      distribution_channels: item.distribution_channels?.join(', ') ?? '',
      media_outlets: item.media_outlets?.join(', ') ?? '',
      contact_person: item.contact_person ?? '',
      contact_email: item.contact_email ?? '',
      contact_phone: item.contact_phone ?? '',
      media_campaign_id: item.media_campaign_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: PressReleaseForm) => {
    if (!company?.id || !currentUser?.id) return;

    const distributionChannels = data.distribution_channels ? data.distribution_channels.split(',').map(c => c.trim()).filter(c => c) : [];
    const mediaOutlets = data.media_outlets ? data.media_outlets.split(',').map(o => o.trim()).filter(o => o) : [];
    const releaseNumber = `PR-${Date.now()}`;

    if (editRelease) {
      const { error } = await supabase
        .from('media_press_releases')
        .update({
          title: data.title,
          summary: data.summary,
          content: data.content,
          release_date: data.release_date || null,
          distribution_channels: distributionChannels,
          media_outlets: mediaOutlets,
          contact_person: data.contact_person,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          media_campaign_id: data.media_campaign_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editRelease.id);

      if (error) {
        toast.error('Failed to update press release');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_press_releases',
        record_id: editRelease.id,
        new_value: { title: data.title },
      });

      toast.success('Press release updated');
    } else {
      const { error } = await supabase.from('media_press_releases').insert({
        company_id: company.id,
        release_number: releaseNumber,
        title: data.title,
        summary: data.summary,
        content: data.content,
        release_date: data.release_date || null,
        distribution_channels: distributionChannels,
        media_outlets: mediaOutlets,
        contact_person: data.contact_person,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        media_campaign_id: data.media_campaign_id,
        created_by: currentUser.id,
        status: 'draft',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create press release');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_press_releases',
        new_value: { title: data.title, release_number: releaseNumber },
      });

      toast.success('Press release created');
    }

    reset();
    setEditRelease(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_press_releases')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete press release');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_press_releases',
        record_id: deleteId,
      });
      toast.success('Press release deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('media_press_releases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'media_press_releases',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'release_number', header: 'Number' },
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
      key: 'campaign',
      header: 'Campaign', 
      cell: (row) => row.media_campaigns?.campaign_name || '-'
    },
    { 
      key: 'contact',
      header: 'Contact', 
      cell: (row) => row.contact_person || '-'
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
            {row.status === 'draft' && canApprove && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'review')}>
                <Send className="h-4 w-4 mr-2" /> Submit for Review
              </DropdownMenuItem>
            )}
            {row.status === 'review' && canApprove && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'approved')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </DropdownMenuItem>
            )}
            {row.status === 'approved' && canPublish && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'published')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Publish
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
      <PageHeader title="Press Releases" description="Manage PR and press releases" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Press Releases' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditRelease(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Press Release
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editRelease ? 'Edit Press Release' : 'New Press Release'}</DialogTitle>
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
                  <Textarea {...register('content')} placeholder="Full press release content" rows={6} />
                  {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Release Date</Label>
                    <Input type="date" {...register('release_date')} />
                  </div>
                  <div>
                    <Label>Media Campaign</Label>
                    <Controller
                      name="media_campaign_id"
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
                  <Label>Distribution Channels (comma-separated)</Label>
                  <Input {...register('distribution_channels')} placeholder="email, website, social, ..." />
                </div>
                <div>
                  <Label>Media Outlets (comma-separated)</Label>
                  <Input {...register('media_outlets')} placeholder="outlet1, outlet2, ..." />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    <Input {...register('contact_person')} placeholder="Name" />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input {...register('contact_email')} type="email" placeholder="email@example.com" />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input {...register('contact_phone')} placeholder="+1 234 567 890" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editRelease ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Published" value={stats.published} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Draft" value={stats.draft} icon={<Megaphone className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="In Review" value={stats.review} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Scheduled" value={stats.scheduled} icon={<Send className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
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
