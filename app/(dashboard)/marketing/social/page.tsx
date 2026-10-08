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
import { Globe, Plus, Edit, Trash2, Send, Calendar, Heart, MessageCircle, Share2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const socialPostSchema = z.object({
  content_id: z.string().optional(),
  platform: z.enum(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'other']),
  post_url: z.string().optional(),
  scheduled_date: z.string().optional(),
});
type SocialPostForm = z.infer<typeof socialPostSchema>;

export default function SocialMediaPage() {
  const { company, user: currentUser } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ published: 0, scheduled: 0, totalEngagement: 0, totalReach: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<SocialPostForm>({
    resolver: zodResolver(socialPostSchema),
    defaultValues: { platform: 'facebook' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [postsRes, contentRes] = await Promise.all([
      supabase
        .from('social_media_posts')
        .select('*, content:marketing_content(title), created_by_profile:profiles!social_media_posts_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('marketing_content').select('id, title').eq('company_id', company.id).eq('status', 'published'),
    ]);

    if (postsRes.error) {
      console.error('Error loading posts:', postsRes.error);
      toast.error('Failed to load posts');
    }
    setPosts(postsRes.data ?? []);
    setContent(contentRes.data ?? []);

    // Calculate stats
    const published = postsRes.data?.filter(p => p.status === 'published').length || 0;
    const scheduled = postsRes.data?.filter(p => p.status === 'scheduled').length || 0;
    const totalEngagement = postsRes.data?.reduce((sum, p) => sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0) || 0;
    const totalReach = postsRes.data?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
    setStats({ published, scheduled, totalEngagement, totalReach });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (post: any) => {
    setEditPost(post);
    reset({
      content_id: post.content_id ?? undefined,
      platform: post.platform,
      post_url: post.post_url ?? '',
      scheduled_date: post.scheduled_date ? post.scheduled_date.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: SocialPostForm) => {
    if (!company?.id) return;

    if (editPost) {
      const { error } = await supabase
        .from('social_media_posts')
        .update({
          content_id: data.content_id || null,
          platform: data.platform,
          post_url: data.post_url,
          scheduled_date: data.scheduled_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editPost.id);

      if (error) {
        toast.error('Failed to update post');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'social_post_updated',
        module: 'marketing',
        record_id: editPost.id,
      });

      toast.success('Post updated');
    } else {
      const { error } = await supabase.from('social_media_posts').insert({
        company_id: company.id,
        content_id: data.content_id || null,
        platform: data.platform,
        post_url: data.post_url,
        scheduled_date: data.scheduled_date || null,
        created_by: currentUser?.id,
        status: data.scheduled_date ? 'scheduled' : 'draft',
      });

      if (error) {
        toast.error('Failed to create post');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'social_post_created',
        module: 'marketing',
      });

      toast.success('Post created');
    }

    reset();
    setEditPost(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('social_media_posts')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete post');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'social_post_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Post deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === 'published') {
      updateData.published_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from('social_media_posts')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'social_post_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'platform', header: 'Platform', cell: (row) => <Badge variant="outline">{row.platform}</Badge> },
    { 
      key: 'content',
      header: 'Content', 
      cell: (row) => row.content?.title || 'Standalone Post'
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'scheduled_date',
      header: 'Scheduled Date', 
      cell: (row) => row.scheduled_date ? format(new Date(row.scheduled_date), 'MMM dd, yyyy HH:mm') : '-'
    },
    { 
      key: 'published_date',
      header: 'Published Date', 
      cell: (row) => row.published_date ? format(new Date(row.published_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'engagement',
      header: 'Engagement', 
      cell: (row) => (
        <div className="flex gap-2 text-sm">
          <span title="Likes"><Heart className="h-3 w-3 inline mr-1" />{row.likes || 0}</span>
          <span title="Comments"><MessageCircle className="h-3 w-3 inline mr-1" />{row.comments || 0}</span>
          <span title="Shares"><Share2 className="h-3 w-3 inline mr-1" />{row.shares || 0}</span>
        </div>
      )
    },
    { 
      key: 'views',
      header: 'Views', 
      cell: (row) => (
        <span title="Views"><Eye className="h-3 w-3 inline mr-1" />{row.views || 0}</span>
      )
    },
    { 
      key: 'engagement_rate',
      header: 'Engagement Rate', 
      cell: (row) => row.engagement_rate != null ? `${row.engagement_rate.toFixed(2)}%` : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="social" action="edit">
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
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'scheduled')}>
                  <Calendar className="h-4 w-4 mr-2" /> Schedule
                </DropdownMenuItem>
              )}
              {row.status === 'scheduled' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'published')}>
                  <Send className="h-4 w-4 mr-2" /> Publish Now
                </DropdownMenuItem>
              )}
              <Can resource="social" action="delete">
                <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </Can>
              {row.post_url && (
                <DropdownMenuItem onClick={() => window.open(row.post_url, '_blank')}>
                  <Globe className="h-4 w-4 mr-2" /> View Post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Social Media" description="Manage social media posts and engagement" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Social Media' }]}>
        <Can resource="social" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditPost(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editPost ? 'Edit Post' : 'New Post'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Linked Content</Label>
                  <Controller
                    name="content_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select content (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Standalone Post</SelectItem>
                          {content.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Platform *</Label>
                  <Controller
                    name="platform"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="twitter">Twitter/X</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="tiktok">TikTok</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Post URL</Label>
                  <Input {...register('post_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Scheduled Date</Label>
                  <Input type="datetime-local" {...register('scheduled_date')} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editPost ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Published Posts" value={stats.published} icon={<Send className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Scheduled Posts" value={stats.scheduled} icon={<Calendar className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Engagement" value={stats.totalEngagement} icon={<Heart className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
        <KPICard title="Total Reach" value={stats.totalReach} icon={<Eye className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={posts}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
