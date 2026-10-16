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
import { Inbox, Plus, Edit, Trash2, CheckCircle, Clock, Send, Users, Eye, MousePointerClick } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const newsletterSchema = z.object({
  newsletter_name: z.string().min(1, 'Newsletter name is required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  target_audience: z.enum(['all', 'subscribers', 'customers', 'employees', 'custom']),
  segment_criteria: z.string().optional(),
  scheduled_date: z.string().optional(),
});
type NewsletterForm = z.infer<typeof newsletterSchema>;

export default function MediaNewslettersPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.newsletters.create');
  const canEdit = isAdmin || hasPermission('media.newsletters.edit');
  const canDelete = isAdmin || hasPermission('media.newsletters.delete');
  const canApprove = isAdmin || hasPermission('media.newsletters.approve');
  const canSend = isAdmin || hasPermission('media.newsletters.send');

  const [newsletters, setNewsletters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNewsletter, setEditNewsletter] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ draft: 0, scheduled: 0, sent: 0, totalOpens: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<NewsletterForm>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { target_audience: 'all' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('newsletters')
      .select('*, created_by_profile:profiles!newsletters_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading newsletters:', error);
      toast.error('Failed to load newsletters');
    }
    setNewsletters(data ?? []);

    const draft = data?.filter(n => n.status === 'draft').length || 0;
    const scheduled = data?.filter(n => n.status === 'scheduled').length || 0;
    const sent = data?.filter(n => n.status === 'sent').length || 0;
    const totalOpens = data?.reduce((sum, n) => sum + (n.open_count || 0), 0) || 0;
    setStats({ draft, scheduled, sent, totalOpens });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditNewsletter(item);
    reset({
      newsletter_name: item.newsletter_name,
      subject: item.subject,
      content: item.content,
      target_audience: item.target_audience,
      segment_criteria: item.segment_criteria ? JSON.stringify(item.segment_criteria) : '',
      scheduled_date: item.scheduled_date ? item.scheduled_date.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: NewsletterForm) => {
    if (!company?.id || !currentUser?.id) return;

    const segmentCriteria = data.segment_criteria ? JSON.parse(data.segment_criteria) : null;
    const newsletterNumber = `NL-${Date.now()}`;

    if (editNewsletter) {
      const { error } = await supabase
        .from('newsletters')
        .update({
          newsletter_name: data.newsletter_name,
          subject: data.subject,
          content: data.content,
          target_audience: data.target_audience,
          segment_criteria: segmentCriteria,
          scheduled_date: data.scheduled_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editNewsletter.id);

      if (error) {
        toast.error('Failed to update newsletter');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'newsletters',
        record_id: editNewsletter.id,
        new_value: { newsletter_name: data.newsletter_name },
      });

      toast.success('Newsletter updated');
    } else {
      const { error } = await supabase.from('newsletters').insert({
        company_id: company.id,
        newsletter_number: newsletterNumber,
        newsletter_name: data.newsletter_name,
        subject: data.subject,
        content: data.content,
        target_audience: data.target_audience,
        segment_criteria: segmentCriteria,
        scheduled_date: data.scheduled_date || null,
        created_by: currentUser.id,
        status: 'draft',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create newsletter');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'newsletters',
        new_value: { newsletter_name: data.newsletter_name, newsletter_number: newsletterNumber },
      });

      toast.success('Newsletter created');
    }

    reset();
    setEditNewsletter(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('newsletters')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete newsletter');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'newsletters',
        record_id: deleteId,
      });
      toast.success('Newsletter deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('newsletters')
      .update({ status, sent_date: status === 'sent' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'newsletters',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'newsletter_number', header: 'Number' },
    { key: 'newsletter_name', header: 'Newsletter Name' },
    { key: 'subject', header: 'Subject' },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'target_audience',
      header: 'Audience', 
      cell: (row) => row.target_audience || '-'
    },
    { 
      key: 'sent_count',
      header: 'Sent', 
      cell: (row) => row.sent_count || 0
    },
    { 
      key: 'open_count',
      header: 'Opens', 
      cell: (row) => row.open_count || 0
    },
    { 
      key: 'click_count',
      header: 'Clicks', 
      cell: (row) => row.click_count || 0
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
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'scheduled')}>
                <Clock className="h-4 w-4 mr-2" /> Schedule
              </DropdownMenuItem>
            )}
            {(row.status === 'scheduled' || row.status === 'draft') && canSend && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'sent')}>
                <Send className="h-4 w-4 mr-2" /> Send Now
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
      <PageHeader title="Newsletters" description="Manage newsletter campaigns and analytics" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Newsletters' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditNewsletter(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Newsletter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editNewsletter ? 'Edit Newsletter' : 'New Newsletter'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Newsletter Name *</Label>
                  <Input {...register('newsletter_name')} placeholder="Newsletter name" />
                  {errors.newsletter_name && <p className="text-red-500 text-sm mt-1">{errors.newsletter_name.message}</p>}
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Input {...register('subject')} placeholder="Email subject line" />
                  {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
                </div>
                <div>
                  <Label>Content *</Label>
                  <Textarea {...register('content')} placeholder="Newsletter content" rows={8} />
                  {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Audience *</Label>
                    <Controller
                      name="target_audience"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="subscribers">Subscribers</SelectItem>
                            <SelectItem value="customers">Customers</SelectItem>
                            <SelectItem value="employees">Employees</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Scheduled Date</Label>
                    <Input type="datetime-local" {...register('scheduled_date')} />
                  </div>
                </div>
                <div>
                  <Label>Segment Criteria (JSON)</Label>
                  <Textarea {...register('segment_criteria')} placeholder='{"location": "US", "interest": "tech"}' rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editNewsletter ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Draft" value={stats.draft} icon={<Inbox className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="Scheduled" value={stats.scheduled} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Sent" value={stats.sent} icon={<Send className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Opens" value={stats.totalOpens} icon={<Eye className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={newsletters}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Newsletter"
        description="Are you sure you want to delete this newsletter?"
        loading={deleting}
      />
    </div>
  );
}
