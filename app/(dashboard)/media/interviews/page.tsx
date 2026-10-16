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
import { Monitor, Plus, Edit, Trash2, CheckCircle, Clock, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const interviewSchema = z.object({
  interview_title: z.string().min(1, 'Interview title is required'),
  interview_type: z.enum(['tv', 'radio', 'podcast', 'print', 'online', 'webinar', 'other']),
  interviewer_name: z.string().optional(),
  media_outlet: z.string().optional(),
  interviewee_title: z.string().optional(),
  interview_date: z.string().min(1, 'Interview date is required'),
  interview_url: z.string().optional(),
  transcript_url: z.string().optional(),
  reach: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  key_topics: z.string().optional(),
  notes: z.string().optional(),
});
type InterviewForm = z.infer<typeof interviewSchema>;

export default function MediaInterviewsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.interviews.create');
  const canEdit = isAdmin || hasPermission('media.interviews.edit');
  const canDelete = isAdmin || hasPermission('media.interviews.delete');

  const [interviews, setInterviews] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInterview, setEditInterview] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ scheduled: 0, completed: 0, published: 0, totalReach: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<InterviewForm>({
    resolver: zodResolver(interviewSchema),
    defaultValues: { interview_type: 'online', sentiment: 'neutral' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [interviewsRes, usersRes] = await Promise.all([
      supabase
        .from('media_interviews')
        .select('*, interviewee_profile:profiles!media_interviews_interviewee_fkey(first_name, last_name), created_by_profile:profiles!media_interviews_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('interview_date', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    if (interviewsRes.error) {
      console.error('Error loading interviews:', interviewsRes.error);
      toast.error('Failed to load interviews');
    }
    setInterviews(interviewsRes.data ?? []);
    setUsers(usersRes.data ?? []);

    const scheduled = interviewsRes.data?.filter(i => i.status === 'scheduled').length || 0;
    const completed = interviewsRes.data?.filter(i => i.status === 'completed').length || 0;
    const published = interviewsRes.data?.filter(i => i.status === 'published').length || 0;
    const totalReach = interviewsRes.data?.reduce((sum, i) => sum + (i.reach || 0), 0) || 0;
    setStats({ scheduled, completed, published, totalReach });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditInterview(item);
    reset({
      interview_title: item.interview_title,
      interview_type: item.interview_type,
      interviewer_name: item.interviewer_name ?? '',
      media_outlet: item.media_outlet ?? '',
      interviewee_title: item.interviewee_title ?? '',
      interview_date: item.interview_date ? item.interview_date.slice(0, 16) : '',
      interview_url: item.interview_url ?? '',
      transcript_url: item.transcript_url ?? '',
      reach: item.reach?.toString() ?? '',
      sentiment: item.sentiment ?? 'neutral',
      key_topics: item.key_topics?.join(', ') ?? '',
      notes: item.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: InterviewForm) => {
    if (!company?.id || !currentUser?.id) return;

    const keyTopics = data.key_topics ? data.key_topics.split(',').map(t => t.trim()).filter(t => t) : [];

    if (editInterview) {
      const { error } = await supabase
        .from('media_interviews')
        .update({
          interview_title: data.interview_title,
          interview_type: data.interview_type,
          interviewer_name: data.interviewer_name,
          media_outlet: data.media_outlet,
          interviewee_title: data.interviewee_title,
          interview_date: data.interview_date,
          interview_url: data.interview_url,
          transcript_url: data.transcript_url,
          reach: data.reach ? parseInt(data.reach) : null,
          sentiment: data.sentiment,
          key_topics: keyTopics,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editInterview.id);

      if (error) {
        toast.error('Failed to update interview');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_interviews',
        record_id: editInterview.id,
        new_value: { interview_title: data.interview_title },
      });

      toast.success('Interview updated');
    } else {
      const { error } = await supabase.from('media_interviews').insert({
        company_id: company.id,
        interview_title: data.interview_title,
        interview_type: data.interview_type,
        interviewer_name: data.interviewer_name,
        media_outlet: data.media_outlet,
        interviewee_title: data.interviewee_title,
        interview_date: data.interview_date,
        interview_url: data.interview_url,
        transcript_url: data.transcript_url,
        reach: data.reach ? parseInt(data.reach) : null,
        sentiment: data.sentiment,
        key_topics: keyTopics,
        notes: data.notes,
        created_by: currentUser.id,
        status: 'scheduled',
      });

      if (error) {
        toast.error('Failed to create interview');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_interviews',
        new_value: { interview_title: data.interview_title },
      });

      toast.success('Interview created');
    }

    reset();
    setEditInterview(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_interviews')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete interview');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_interviews',
        record_id: deleteId,
      });
      toast.success('Interview deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('media_interviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'media_interviews',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'interview_title', header: 'Interview Title' },
    { 
      key: 'interview_type',
      header: 'Type', 
      cell: (row) => row.interview_type || '-'
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'interview_date',
      header: 'Interview Date', 
      cell: (row) => format(new Date(row.interview_date), 'MMM dd, yyyy')
    },
    { 
      key: 'media_outlet',
      header: 'Media Outlet', 
      cell: (row) => row.media_outlet || '-'
    },
    { 
      key: 'interviewee',
      header: 'Interviewee', 
      cell: (row) => row.interviewee_profile 
        ? `${row.interviewee_profile.first_name} ${row.interviewee_profile.last_name}` 
        : '-'
    },
    { 
      key: 'reach',
      header: 'Reach', 
      cell: (row) => row.reach ? row.reach.toLocaleString() : '-'
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
            {row.status === 'scheduled' && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'completed')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Mark Complete
              </DropdownMenuItem>
            )}
            {row.status === 'completed' && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'published')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Mark Published
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
      <PageHeader title="Interviews & Leadership Visibility" description="Manage leadership interviews and visibility" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Interviews' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditInterview(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editInterview ? 'Edit Interview' : 'New Interview'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Interview Title *</Label>
                  <Input {...register('interview_title')} placeholder="Interview title" />
                  {errors.interview_title && <p className="text-red-500 text-sm mt-1">{errors.interview_title.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Interview Type *</Label>
                    <Controller
                      name="interview_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tv">TV</SelectItem>
                            <SelectItem value="radio">Radio</SelectItem>
                            <SelectItem value="podcast">Podcast</SelectItem>
                            <SelectItem value="print">Print</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="webinar">Webinar</SelectItem>
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
                    <Label>Interview Date *</Label>
                    <Input type="datetime-local" {...register('interview_date')} />
                    {errors.interview_date && <p className="text-red-500 text-sm mt-1">{errors.interview_date.message}</p>}
                  </div>
                  <div>
                    <Label>Reach</Label>
                    <Input {...register('reach')} type="number" placeholder="Estimated reach" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Interviewer Name</Label>
                    <Input {...register('interviewer_name')} placeholder="Interviewer name" />
                  </div>
                  <div>
                    <Label>Media Outlet</Label>
                    <Input {...register('media_outlet')} placeholder="Outlet name" />
                  </div>
                </div>
                <div>
                  <Label>Interview URL</Label>
                  <Input {...register('interview_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Transcript URL</Label>
                  <Input {...register('transcript_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Key Topics (comma-separated)</Label>
                  <Input {...register('key_topics')} placeholder="topic1, topic2, ..." />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editInterview ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Scheduled" value={stats.scheduled} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Published" value={stats.published} icon={<Monitor className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Reach" value={stats.totalReach.toLocaleString()} icon={<Users className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={interviews}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Interview"
        description="Are you sure you want to delete this interview?"
        loading={deleting}
      />
    </div>
  );
}
