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
import { FileText, Plus, Edit, Trash2, CheckCircle, Clock, Send, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content_type: z.enum(['digital', 'print', 'video', 'audio', 'infographic', 'blog_post', 'article', 'press_release', 'social_post', 'newsletter', 'other']),
  description: z.string().optional(),
  content_url: z.string().optional(),
  platform: z.string().optional(),
  publish_date: z.string().optional(),
  seo_keywords: z.string().optional(),
  tags: z.string().optional(),
  media_request_id: z.string().optional(),
  media_campaign_id: z.string().optional(),
});
type ContentForm = z.infer<typeof contentSchema>;

export default function MediaContentPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.content.create');
  const canEdit = isAdmin || hasPermission('media.content.edit');
  const canDelete = isAdmin || hasPermission('media.content.delete');
  const canApprove = isAdmin || hasPermission('media.content.approve');
  const canPublish = isAdmin || hasPermission('media.content.publish');
  const canArchive = isAdmin || hasPermission('media.content.archive');

  const [content, setContent] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [stats, setStats] = useState({ published: 0, draft: 0, review: 0, archived: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ContentForm>({
    resolver: zodResolver(contentSchema),
    defaultValues: { content_type: 'digital' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [contentRes, requestRes, campaignRes] = await Promise.all([
      supabase
        .from('media_content')
        .select('*, media_requests(title), media_campaigns(campaign_name), author_profile:profiles!media_content_author_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('media_requests').select('id, title').eq('company_id', company.id),
      supabase.from('media_campaigns').select('id, campaign_name').eq('company_id', company.id),
    ]);

    if (contentRes.error) {
      console.error('Error loading content:', contentRes.error);
      toast.error('Failed to load content');
    }
    setContent(contentRes.data ?? []);
    setRequests(requestRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);

    const published = contentRes.data?.filter(c => c.status === 'published').length || 0;
    const draft = contentRes.data?.filter(c => c.status === 'draft').length || 0;
    const review = contentRes.data?.filter(c => c.status === 'review').length || 0;
    const archived = contentRes.data?.filter(c => c.status === 'archived').length || 0;
    setStats({ published, draft, review, archived });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditContent(item);
    reset({
      title: item.title,
      content_type: item.content_type,
      description: item.description ?? '',
      content_url: item.content_url ?? '',
      platform: item.platform ?? '',
      publish_date: item.publish_date ? item.publish_date.slice(0, 10) : '',
      seo_keywords: item.seo_keywords?.join(', ') ?? '',
      tags: item.tags?.join(', ') ?? '',
      media_request_id: item.media_request_id ?? undefined,
      media_campaign_id: item.media_campaign_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ContentForm) => {
    if (!company?.id || !currentUser?.id) return;

    const seoKeywords = data.seo_keywords ? data.seo_keywords.split(',').map(k => k.trim()).filter(k => k) : [];
    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const contentNumber = `MCN-${Date.now()}`;

    if (editContent) {
      const { error } = await supabase
        .from('media_content')
        .update({
          title: data.title,
          content_type: data.content_type,
          description: data.description,
          content_url: data.content_url,
          platform: data.platform,
          publish_date: data.publish_date || null,
          seo_keywords: seoKeywords,
          tags,
          media_request_id: data.media_request_id,
          media_campaign_id: data.media_campaign_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editContent.id);

      if (error) {
        toast.error('Failed to update content');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_content',
        record_id: editContent.id,
        new_value: { title: data.title },
      });

      toast.success('Content updated');
    } else {
      const { error } = await supabase.from('media_content').insert({
        company_id: company.id,
        content_number: contentNumber,
        title: data.title,
        content_type: data.content_type,
        description: data.description,
        content_url: data.content_url,
        platform: data.platform,
        publish_date: data.publish_date || null,
        seo_keywords: seoKeywords,
        tags,
        media_request_id: data.media_request_id,
        media_campaign_id: data.media_campaign_id,
        author: currentUser.id,
        status: 'draft',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create content');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_content',
        new_value: { title: data.title, content_number: contentNumber },
      });

      toast.success('Content created');
    }

    reset();
    setEditContent(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_content')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete content');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_content',
        record_id: deleteId,
      });
      toast.success('Content deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const handleArchive = async () => {
    if (!archiveId || !company?.id || !currentUser?.id) return;
    setArchiving(true);

    const { error } = await supabase
      .from('media_content')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', archiveId);

    if (error) {
      toast.error('Failed to archive content');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'archived',
        module: 'media',
        entity_type: 'media_content',
        record_id: archiveId,
      });
      toast.success('Content archived');
    }

    setArchiveId(null);
    setArchiving(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('media_content')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'media_content',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'content_number', header: 'Number' },
    { key: 'title', header: 'Title' },
    { 
      key: 'content_type',
      header: 'Type', 
      cell: (row) => row.content_type?.replace('_', ' ') || '-' 
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'platform',
      header: 'Platform', 
      cell: (row) => row.platform || '-'
    },
    { 
      key: 'publish_date',
      header: 'Publish Date', 
      cell: (row) => row.publish_date ? format(new Date(row.publish_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'campaign',
      header: 'Campaign', 
      cell: (row) => row.media_campaigns?.campaign_name || '-'
    },
    { 
      key: 'author',
      header: 'Author', 
      cell: (row) => row.author_profile 
        ? `${row.author_profile.first_name} ${row.author_profile.last_name}` 
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
            {row.status !== 'archived' && canArchive && (
              <DropdownMenuItem onClick={() => setArchiveId(row.id)}>
                <Archive className="h-4 w-4 mr-2" /> Archive
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
      <PageHeader title="Content Management" description="Create and manage media content" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Content' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditContent(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editContent ? 'Edit Content' : 'New Content'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Content title" />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Content Type *</Label>
                    <Controller
                      name="content_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="digital">Digital</SelectItem>
                            <SelectItem value="print">Print</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="infographic">Infographic</SelectItem>
                            <SelectItem value="blog_post">Blog Post</SelectItem>
                            <SelectItem value="article">Article</SelectItem>
                            <SelectItem value="press_release">Press Release</SelectItem>
                            <SelectItem value="social_post">Social Post</SelectItem>
                            <SelectItem value="newsletter">Newsletter</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Platform</Label>
                    <Input {...register('platform')} placeholder="Website, Facebook, etc." />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Content description" rows={3} />
                </div>
                <div>
                  <Label>Content URL</Label>
                  <Input {...register('content_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Publish Date</Label>
                  <Input type="date" {...register('publish_date')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Media Request</Label>
                    <Controller
                      name="media_request_id"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select request" />
                          </SelectTrigger>
                          <SelectContent>
                            {requests.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
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
                  <Label>SEO Keywords (comma-separated)</Label>
                  <Input {...register('seo_keywords')} placeholder="keyword1, keyword2, ..." />
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input {...register('tags')} placeholder="tag1, tag2, ..." />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editContent ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Published" value={stats.published} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Draft" value={stats.draft} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="In Review" value={stats.review} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Archived" value={stats.archived} icon={<Archive className="h-4 w-4 text-purple-600" />} iconBg="bg-purple-50 dark:bg-purple-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={content}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Content"
        description="Are you sure you want to delete this content? This action cannot be undone."
        loading={deleting}
      />

      <ConfirmDialog
        open={archiveId !== null}
        onClose={() => setArchiveId(null)}
        onConfirm={handleArchive}
        title="Archive Content"
        description="Are you sure you want to archive this content?"
        loading={archiving}
      />
    </div>
  );
}
