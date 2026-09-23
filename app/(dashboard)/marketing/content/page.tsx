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
import { FileText, Plus, Edit, Trash2, CheckCircle, Clock, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content_type: z.enum(['blog_post', 'social_post', 'video', 'infographic', 'ebook', 'whitepaper', 'case_study', 'email', 'ad_copy', 'other']),
  description: z.string().optional(),
  content_url: z.string().optional(),
  platform: z.string().optional(),
  publish_date: z.string().optional(),
  seo_keywords: z.string().optional(),
  tags: z.string().optional(),
  campaign_id: z.string().optional(),
});
type ContentForm = z.infer<typeof contentSchema>;

export default function ContentPage() {
  const { company, user: currentUser } = useAuth();
  const [content, setContent] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ published: 0, draft: 0, review: 0, scheduled: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ContentForm>({
    resolver: zodResolver(contentSchema),
    defaultValues: { content_type: 'blog_post' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [contentRes, campaignRes] = await Promise.all([
      supabase
        .from('marketing_content')
        .select('*, campaigns(campaign_name), author_profile:profiles!marketing_content_author_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('marketing_campaigns').select('id, campaign_name').eq('company_id', company.id),
    ]);

    if (contentRes.error) {
      console.error('Error loading content:', contentRes.error);
      toast.error('Failed to load content');
    }
    setContent(contentRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);

    // Calculate stats
    const published = contentRes.data?.filter(c => c.status === 'published').length || 0;
    const draft = contentRes.data?.filter(c => c.status === 'draft').length || 0;
    const review = contentRes.data?.filter(c => c.status === 'review').length || 0;
    const scheduled = contentRes.data?.filter(c => c.status === 'scheduled').length || 0;
    setStats({ published, draft, review, scheduled });

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
      campaign_id: item.campaign_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ContentForm) => {
    if (!company?.id) return;

    const seoKeywords = data.seo_keywords ? data.seo_keywords.split(',').map(k => k.trim()).filter(k => k) : [];
    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [];

    if (editContent) {
      const { error } = await supabase
        .from('marketing_content')
        .update({
          title: data.title,
          content_type: data.content_type,
          description: data.description,
          content_url: data.content_url,
          platform: data.platform,
          publish_date: data.publish_date || null,
          seo_keywords: seoKeywords,
          tags,
          campaign_id: data.campaign_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editContent.id);

      if (error) {
        toast.error('Failed to update content');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'content_updated',
        module: 'marketing',
        record_id: editContent.id,
        new_values: { title: data.title },
      });

      toast.success('Content updated');
    } else {
      const { error } = await supabase.from('marketing_content').insert({
        company_id: company.id,
        title: data.title,
        content_type: data.content_type,
        description: data.description,
        content_url: data.content_url,
        platform: data.platform,
        publish_date: data.publish_date || null,
        seo_keywords: seoKeywords,
        tags,
        campaign_id: data.campaign_id,
        author: currentUser?.id,
        status: 'draft',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create content');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'content_created',
        module: 'marketing',
        new_values: { title: data.title },
      });

      toast.success('Content created');
    }

    reset();
    setEditContent(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('marketing_content')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete content');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'content_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Content deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('marketing_content')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'content_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { header: 'Title', accessor: 'title' },
    { 
      header: 'Type', 
      accessor: (row) => row.content_type?.replace('_', ' ') || '-' 
    },
    { 
      header: 'Status', 
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { 
      header: 'Platform', 
      accessor: (row) => row.platform || '-'
    },
    { 
      header: 'Publish Date', 
      accessor: (row) => row.publish_date ? format(new Date(row.publish_date), 'MMM dd, yyyy') : '-'
    },
    { 
      header: 'Campaign', 
      accessor: (row) => row.campaigns?.campaign_name || '-'
    },
    { 
      header: 'Author', 
      accessor: (row) => row.author_profile 
        ? `${row.author_profile.first_name} ${row.author_profile.last_name}` 
        : '-'
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Can do="marketing.content.edit">
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
                  <CheckCircle className="h-4 w-4 mr-2" /> Publish
                </DropdownMenuItem>
              )}
              <Can do="marketing.content.delete">
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
      <PageHeader title="Content" description="Create and manage marketing content" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Content' }]}>
        <Can do="marketing.content.create">
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
                            <SelectItem value="blog_post">Blog Post</SelectItem>
                            <SelectItem value="social_post">Social Post</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="infographic">Infographic</SelectItem>
                            <SelectItem value="ebook">Ebook</SelectItem>
                            <SelectItem value="whitepaper">Whitepaper</SelectItem>
                            <SelectItem value="case_study">Case Study</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="ad_copy">Ad Copy</SelectItem>
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
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Published" value={stats.published} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Draft" value={stats.draft} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="In Review" value={stats.review} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Scheduled" value={stats.scheduled} icon={<Send className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={content}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Content"
        description="Are you sure you want to delete this content? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
