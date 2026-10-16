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
import { Calendar, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const eventCoverageRequestSchema = z.object({
  event_name: z.string().min(1, 'Event name is required'),
  event_type: z.enum(['conference', 'seminar', 'webinar', 'product_launch', 'trade_show', 'press_conference', 'internal_event', 'other']),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Event date is required'),
  venue: z.string().optional(),
  location: z.string().optional(),
  coverage_type: z.string().optional(),
  budget: z.string().optional(),
  deliverables: z.string().optional(),
});
type EventCoverageRequestForm = z.infer<typeof eventCoverageRequestSchema>;

export default function MediaEventCoveragePage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.event_coverage.create');
  const canEdit = isAdmin || hasPermission('media.event_coverage.edit');
  const canDelete = isAdmin || hasPermission('media.event_coverage.delete');
  const canApprove = isAdmin || hasPermission('media.event_coverage.approve');
  const canAssign = isAdmin || hasPermission('media.event_coverage.assign');

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ requested: 0, approved: 0, inProgress: 0, completed: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EventCoverageRequestForm>({
    resolver: zodResolver(eventCoverageRequestSchema),
    defaultValues: { event_type: 'conference' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('event_coverage_requests')
      .select('*, requested_by_profile:profiles!event_coverage_requests_requested_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load requests');
    }
    setRequests(data ?? []);

    const requested = data?.filter(r => r.status === 'requested').length || 0;
    const approved = data?.filter(r => r.status === 'approved').length || 0;
    const inProgress = data?.filter(r => r.status === 'in_progress').length || 0;
    const completed = data?.filter(r => r.status === 'completed').length || 0;
    setStats({ requested, approved, inProgress, completed });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditRequest(item);
    reset({
      event_name: item.event_name,
      event_type: item.event_type,
      description: item.description ?? '',
      event_date: item.event_date ? item.event_date.slice(0, 10) : '',
      venue: item.venue ?? '',
      location: item.location ?? '',
      coverage_type: item.coverage_type?.join(', ') ?? '',
      budget: item.budget?.toString() ?? '',
      deliverables: item.deliverables?.join(', ') ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EventCoverageRequestForm) => {
    if (!company?.id || !currentUser?.id) return;

    const coverageType = data.coverage_type ? data.coverage_type.split(',').map(t => t.trim()).filter(t => t) : [];
    const deliverables = data.deliverables ? data.deliverables.split(',').map(d => d.trim()).filter(d => d) : [];
    const requestNumber = `ECR-${Date.now()}`;

    if (editRequest) {
      const { error } = await supabase
        .from('event_coverage_requests')
        .update({
          event_name: data.event_name,
          event_type: data.event_type,
          description: data.description,
          event_date: data.event_date,
          venue: data.venue,
          location: data.location,
          coverage_type: coverageType,
          budget: data.budget ? parseFloat(data.budget) : null,
          deliverables,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editRequest.id);

      if (error) {
        toast.error('Failed to update request');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'event_coverage_requests',
        record_id: editRequest.id,
        new_value: { event_name: data.event_name },
      });

      toast.success('Request updated');
    } else {
      const { error } = await supabase.from('event_coverage_requests').insert({
        company_id: company.id,
        request_number: requestNumber,
        event_name: data.event_name,
        event_type: data.event_type,
        description: data.description,
        event_date: data.event_date,
        venue: data.venue,
        location: data.location,
        coverage_type: coverageType,
        budget: data.budget ? parseFloat(data.budget) : null,
        deliverables,
        requested_by: currentUser.id,
        status: 'requested',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create request');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'event_coverage_requests',
        new_value: { event_name: data.event_name, request_number: requestNumber },
      });

      toast.success('Request created');
    }

    reset();
    setEditRequest(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('event_coverage_requests')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete request');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'event_coverage_requests',
        record_id: deleteId,
      });
      toast.success('Request deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('event_coverage_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'event_coverage_requests',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'request_number', header: 'Number' },
    { key: 'event_name', header: 'Event Name' },
    { 
      key: 'event_type',
      header: 'Type', 
      cell: (row) => row.event_type?.replace('_', ' ') || '-' 
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'event_date',
      header: 'Event Date', 
      cell: (row) => format(new Date(row.event_date), 'MMM dd, yyyy')
    },
    { 
      key: 'venue',
      header: 'Venue', 
      cell: (row) => row.venue || '-'
    },
    { 
      key: 'budget',
      header: 'Budget', 
      cell: (row) => row.budget ? `$${row.budget.toLocaleString()}` : '-'
    },
    { 
      key: 'requested_by',
      header: 'Requested By', 
      cell: (row) => row.requested_by_profile 
        ? `${row.requested_by_profile.first_name} ${row.requested_by_profile.last_name}` 
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
            {row.status === 'requested' && canApprove && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'approved')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </DropdownMenuItem>
            )}
            {row.status === 'approved' && canAssign && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'in_progress')}>
                <Clock className="h-4 w-4 mr-2" /> Start Coverage
              </DropdownMenuItem>
            )}
            {row.status === 'in_progress' && canAssign && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'completed')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Complete
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
      <PageHeader title="Event Coverage" description="Manage event coverage requests and records" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Event Coverage' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditRequest(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editRequest ? 'Edit Request' : 'New Coverage Request'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Event Name *</Label>
                  <Input {...register('event_name')} placeholder="Event name" />
                  {errors.event_name && <p className="text-red-500 text-sm mt-1">{errors.event_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Event Type *</Label>
                    <Controller
                      name="event_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conference">Conference</SelectItem>
                            <SelectItem value="seminar">Seminar</SelectItem>
                            <SelectItem value="webinar">Webinar</SelectItem>
                            <SelectItem value="product_launch">Product Launch</SelectItem>
                            <SelectItem value="trade_show">Trade Show</SelectItem>
                            <SelectItem value="press_conference">Press Conference</SelectItem>
                            <SelectItem value="internal_event">Internal Event</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Event Date *</Label>
                    <Input type="date" {...register('event_date')} />
                    {errors.event_date && <p className="text-red-500 text-sm mt-1">{errors.event_date.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Venue</Label>
                    <Input {...register('venue')} placeholder="Event venue" />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input {...register('location')} placeholder="City, Country" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Event description" rows={2} />
                </div>
                <div>
                  <Label>Coverage Type (comma-separated)</Label>
                  <Input {...register('coverage_type')} placeholder="photography, videography, interviews, ..." />
                </div>
                <div>
                  <Label>Budget</Label>
                  <Input {...register('budget')} type="number" placeholder="0.00" />
                </div>
                <div>
                  <Label>Deliverables (comma-separated)</Label>
                  <Input {...register('deliverables')} placeholder="photos, video, article, ..." />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editRequest ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Requested" value={stats.requested} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Approved" value={stats.approved} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={requests}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        description="Are you sure you want to delete this coverage request?"
        loading={deleting}
      />
    </div>
  );
}
