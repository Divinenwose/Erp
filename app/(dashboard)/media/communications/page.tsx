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
import { Mail, Plus, Edit, Trash2, CheckCircle, Clock, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const communicationSchema = z.object({
  communication_type: z.enum(['announcement', 'policy_update', 'news', 'alert', 'celebration', 'other']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  target_audience: z.enum(['all', 'management', 'department', 'location', 'custom']),
  target_departments: z.string().optional(),
  target_locations: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  scheduled_date: z.string().optional(),
  channels: z.string().optional(),
});
type CommunicationForm = z.infer<typeof communicationSchema>;

export default function MediaCommunicationsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.communications.create');
  const canEdit = isAdmin || hasPermission('media.communications.edit');
  const canDelete = isAdmin || hasPermission('media.communications.delete');
  const canApprove = isAdmin || hasPermission('media.communications.approve');
  const canSend = isAdmin || hasPermission('media.communications.send');

  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editComm, setEditComm] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ draft: 0, scheduled: 0, sent: 0, totalRead: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CommunicationForm>({
    resolver: zodResolver(communicationSchema),
    defaultValues: { communication_type: 'announcement', priority: 'normal', target_audience: 'all' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('internal_communications')
      .select('*, created_by_profile:profiles!internal_communications_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading communications:', error);
      toast.error('Failed to load communications');
    }
    setCommunications(data ?? []);

    const draft = data?.filter(c => c.status === 'draft').length || 0;
    const scheduled = data?.filter(c => c.status === 'scheduled').length || 0;
    const sent = data?.filter(c => c.status === 'sent').length || 0;
    const totalRead = data?.reduce((sum, c) => sum + (c.read_count || 0), 0) || 0;
    setStats({ draft, scheduled, sent, totalRead });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditComm(item);
    reset({
      communication_type: item.communication_type,
      title: item.title,
      content: item.content,
      target_audience: item.target_audience,
      target_departments: item.target_departments?.join(', ') ?? '',
      target_locations: item.target_locations?.join(', ') ?? '',
      priority: item.priority,
      scheduled_date: item.scheduled_date ? item.scheduled_date.slice(0, 16) : '',
      channels: item.channels?.join(', ') ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CommunicationForm) => {
    if (!company?.id || !currentUser?.id) return;

    const targetDepartments = data.target_departments ? data.target_departments.split(',').map(d => d.trim()).filter(d => d) : [];
    const targetLocations = data.target_locations ? data.target_locations.split(',').map(l => l.trim()).filter(l => l) : [];
    const channels = data.channels ? data.channels.split(',').map(c => c.trim()).filter(c => c) : [];
    const communicationNumber = `IC-${Date.now()}`;

    if (editComm) {
      const { error } = await supabase
        .from('internal_communications')
        .update({
          communication_type: data.communication_type,
          title: data.title,
          content: data.content,
          target_audience: data.target_audience,
          target_departments: targetDepartments,
          target_locations: targetLocations,
          priority: data.priority,
          scheduled_date: data.scheduled_date || null,
          channels,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editComm.id);

      if (error) {
        toast.error('Failed to update communication');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'internal_communications',
        record_id: editComm.id,
        new_value: { title: data.title },
      });

      toast.success('Communication updated');
    } else {
      const { error } = await supabase.from('internal_communications').insert({
        company_id: company.id,
        communication_number: communicationNumber,
        communication_type: data.communication_type,
        title: data.title,
        content: data.content,
        target_audience: data.target_audience,
        target_departments: targetDepartments,
        target_locations: targetLocations,
        priority: data.priority,
        scheduled_date: data.scheduled_date || null,
        channels,
        created_by: currentUser.id,
        status: 'draft',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create communication');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'internal_communications',
        new_value: { title: data.title, communication_number: communicationNumber },
      });

      toast.success('Communication created');
    }

    reset();
    setEditComm(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('internal_communications')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete communication');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'internal_communications',
        record_id: deleteId,
      });
      toast.success('Communication deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('internal_communications')
      .update({ status, sent_date: status === 'sent' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'internal_communications',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'communication_number', header: 'Number' },
    { key: 'title', header: 'Title' },
    { 
      key: 'communication_type',
      header: 'Type', 
      cell: (row) => row.communication_type?.replace('_', ' ') || '-' 
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
      key: 'target_audience',
      header: 'Audience', 
      cell: (row) => row.target_audience || '-'
    },
    { 
      key: 'read_count',
      header: 'Read Count', 
      cell: (row) => row.read_count || 0
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
      <PageHeader title="Internal Communications" description="Manage company announcements and communications" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Communications' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditComm(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Communication
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editComm ? 'Edit Communication' : 'New Communication'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Communication Type *</Label>
                    <Controller
                      name="communication_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="announcement">Announcement</SelectItem>
                            <SelectItem value="policy_update">Policy Update</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="alert">Alert</SelectItem>
                            <SelectItem value="celebration">Celebration</SelectItem>
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
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Communication title" />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <Label>Content *</Label>
                  <Textarea {...register('content')} placeholder="Communication content" rows={5} />
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
                            <SelectItem value="management">Management</SelectItem>
                            <SelectItem value="department">Department</SelectItem>
                            <SelectItem value="location">Location</SelectItem>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Departments (comma-separated)</Label>
                    <Input {...register('target_departments')} placeholder="dept1, dept2, ..." />
                  </div>
                  <div>
                    <Label>Target Locations (comma-separated)</Label>
                    <Input {...register('target_locations')} placeholder="location1, location2, ..." />
                  </div>
                </div>
                <div>
                  <Label>Channels (comma-separated)</Label>
                  <Input {...register('channels')} placeholder="email, intranet, slack, sms" />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editComm ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Draft" value={stats.draft} icon={<Mail className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="Scheduled" value={stats.scheduled} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Sent" value={stats.sent} icon={<Send className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Reads" value={stats.totalRead} icon={<CheckCircle className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={communications}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Communication"
        description="Are you sure you want to delete this communication?"
        loading={deleting}
      />
    </div>
  );
}
