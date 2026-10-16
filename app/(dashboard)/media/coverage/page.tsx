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
import { Clapperboard, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const coverageSchema = z.object({
  media_outlet: z.string().min(1, 'Media outlet is required'),
  outlet_type: z.enum(['newspaper', 'magazine', 'tv', 'radio', 'online', 'blog', 'social_media', 'other']),
  publication_date: z.string().optional(),
  article_title: z.string().optional(),
  article_url: z.string().optional(),
  author: z.string().optional(),
  reach: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  notes: z.string().optional(),
});
type CoverageForm = z.infer<typeof coverageSchema>;

export default function MediaCoveragePage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.coverage.create');
  const canEdit = isAdmin || hasPermission('media.coverage.edit');
  const canDelete = isAdmin || hasPermission('media.coverage.delete');

  const [coverage, setCoverage] = useState<any[]>([]);
  const [pressReleases, setPressReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCoverage, setEditCoverage] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, positive: 0, neutral: 0, negative: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CoverageForm>({
    resolver: zodResolver(coverageSchema),
    defaultValues: { outlet_type: 'online', sentiment: 'neutral' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [coverageRes, releasesRes] = await Promise.all([
      supabase
        .from('media_coverage')
        .select('*, press_releases(title)')
        .eq('company_id', company.id)
        .order('publication_date', { ascending: false }),
      supabase.from('media_press_releases').select('id, title').eq('company_id', company.id),
    ]);

    if (coverageRes.error) {
      console.error('Error loading coverage:', coverageRes.error);
      toast.error('Failed to load coverage');
    }
    setCoverage(coverageRes.data ?? []);
    setPressReleases(releasesRes.data ?? []);

    const total = coverageRes.data?.length || 0;
    const positive = coverageRes.data?.filter(c => c.sentiment === 'positive').length || 0;
    const neutral = coverageRes.data?.filter(c => c.sentiment === 'neutral').length || 0;
    const negative = coverageRes.data?.filter(c => c.sentiment === 'negative').length || 0;
    setStats({ total, positive, neutral, negative });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditCoverage(item);
    reset({
      media_outlet: item.media_outlet,
      outlet_type: item.outlet_type,
      publication_date: item.publication_date ? item.publication_date.slice(0, 10) : '',
      article_title: item.article_title ?? '',
      article_url: item.article_url ?? '',
      author: item.author ?? '',
      reach: item.reach?.toString() ?? '',
      sentiment: item.sentiment ?? 'neutral',
      notes: item.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CoverageForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editCoverage) {
      const { error } = await supabase
        .from('media_coverage')
        .update({
          media_outlet: data.media_outlet,
          outlet_type: data.outlet_type,
          publication_date: data.publication_date || null,
          article_title: data.article_title,
          article_url: data.article_url,
          author: data.author,
          reach: data.reach ? parseInt(data.reach) : null,
          sentiment: data.sentiment,
          notes: data.notes,
        })
        .eq('id', editCoverage.id);

      if (error) {
        toast.error('Failed to update coverage');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_coverage',
        record_id: editCoverage.id,
        new_value: { media_outlet: data.media_outlet },
      });

      toast.success('Coverage updated');
    } else {
      const { error } = await supabase.from('media_coverage').insert({
        company_id: company.id,
        press_release_id: pressReleases[0]?.id,
        media_outlet: data.media_outlet,
        outlet_type: data.outlet_type,
        publication_date: data.publication_date || null,
        article_title: data.article_title,
        article_url: data.article_url,
        author: data.author,
        reach: data.reach ? parseInt(data.reach) : null,
        sentiment: data.sentiment,
        notes: data.notes,
      });

      if (error) {
        toast.error('Failed to create coverage');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_coverage',
        new_value: { media_outlet: data.media_outlet },
      });

      toast.success('Coverage created');
    }

    reset();
    setEditCoverage(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_coverage')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete coverage');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_coverage',
        record_id: deleteId,
      });
      toast.success('Coverage deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const columns: Column[] = [
    { key: 'media_outlet', header: 'Media Outlet' },
    { 
      key: 'outlet_type',
      header: 'Type', 
      cell: (row) => row.outlet_type?.replace('_', ' ') || '-' 
    },
    { 
      key: 'publication_date',
      header: 'Publication Date', 
      cell: (row) => row.publication_date ? format(new Date(row.publication_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'article_title',
      header: 'Article Title', 
      cell: (row) => row.article_title || '-'
    },
    { 
      key: 'reach',
      header: 'Reach', 
      cell: (row) => row.reach ? row.reach.toLocaleString() : '-'
    },
    { 
      key: 'sentiment',
      header: 'Sentiment', 
      cell: (row) => (
        <span className={`capitalize ${
          row.sentiment === 'positive' ? 'text-green-600' :
          row.sentiment === 'negative' ? 'text-red-600' :
          'text-gray-600'
        }`}>{row.sentiment || '-'}</span>
      )
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
      <PageHeader title="PR & Media Coverage" description="Track media coverage and PR mentions" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Coverage' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditCoverage(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Coverage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editCoverage ? 'Edit Coverage' : 'New Coverage'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Media Outlet *</Label>
                  <Input {...register('media_outlet')} placeholder="Outlet name" />
                  {errors.media_outlet && <p className="text-red-500 text-sm mt-1">{errors.media_outlet.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Outlet Type *</Label>
                    <Controller
                      name="outlet_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newspaper">Newspaper</SelectItem>
                            <SelectItem value="magazine">Magazine</SelectItem>
                            <SelectItem value="tv">TV</SelectItem>
                            <SelectItem value="radio">Radio</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="blog">Blog</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Sentiment</Label>
                    <Controller
                      name="sentiment"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sentiment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="neutral">Neutral</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Publication Date</Label>
                    <Input type="date" {...register('publication_date')} />
                  </div>
                  <div>
                    <Label>Reach</Label>
                    <Input {...register('reach')} type="number" placeholder="Estimated reach" />
                  </div>
                </div>
                <div>
                  <Label>Article Title</Label>
                  <Input {...register('article_title')} placeholder="Article title" />
                </div>
                <div>
                  <Label>Article URL</Label>
                  <Input {...register('article_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Author</Label>
                  <Input {...register('author')} placeholder="Author name" />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editCoverage ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Coverage" value={stats.total} icon={<Clapperboard className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Positive" value={stats.positive} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Neutral" value={stats.neutral} icon={<Clock className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="Negative" value={stats.negative} icon={<Trash2 className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={coverage}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Coverage"
        description="Are you sure you want to delete this coverage record?"
        loading={deleting}
      />
    </div>
  );
}
