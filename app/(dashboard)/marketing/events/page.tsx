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
import { Calendar, Plus, Edit, Trash2, CheckCircle, Users, DollarSign, MapPin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const eventSchema = z.object({
  event_name: z.string().min(1, 'Event name is required'),
  event_type: z.enum(['conference', 'seminar', 'webinar', 'product_launch', 'trade_show', 'sponsorship', 'networking', 'other']),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  venue: z.string().optional(),
  location: z.string().optional(),
  expected_attendees: z.string().optional(),
  budget: z.string().optional(),
  campaign_id: z.string().optional(),
});
type EventForm = z.infer<typeof eventSchema>;

export default function EventsPage() {
  const { company, user: currentUser } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ upcoming: 0, inProgress: 0, completed: 0, totalAttendees: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { event_type: 'conference' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [eventsRes, campaignRes] = await Promise.all([
      supabase
        .from('marketing_events')
        .select('*, campaigns(campaign_name), organizer_profile:profiles!marketing_events_organizer_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('start_date', { ascending: false }),
      supabase.from('marketing_campaigns').select('id, campaign_name').eq('company_id', company.id),
    ]);

    if (eventsRes.error) {
      console.error('Error loading events:', eventsRes.error);
      toast.error('Failed to load events');
    }
    setEvents(eventsRes.data ?? []);
    setCampaigns(campaignRes.data ?? []);

    // Calculate stats
    const now = new Date();
    const upcoming = eventsRes.data?.filter(e => new Date(e.start_date) > now).length || 0;
    const inProgress = eventsRes.data?.filter(e => {
      const start = new Date(e.start_date);
      const end = e.end_date ? new Date(e.end_date) : start;
      return start <= now && end >= now;
    }).length || 0;
    const completed = eventsRes.data?.filter(e => e.status === 'completed').length || 0;
    const totalAttendees = eventsRes.data?.reduce((sum, e) => sum + (e.actual_attendees || 0), 0) || 0;
    setStats({ upcoming, inProgress, completed, totalAttendees });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (event: any) => {
    setEditEvent(event);
    reset({
      event_name: event.event_name,
      event_type: event.event_type,
      description: event.description ?? '',
      start_date: event.start_date,
      end_date: event.end_date ?? '',
      venue: event.venue ?? '',
      location: event.location ?? '',
      expected_attendees: event.expected_attendees?.toString() ?? '',
      budget: event.budget?.toString() ?? '',
      campaign_id: event.campaign_id ?? undefined,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EventForm) => {
    if (!company?.id) return;

    if (editEvent) {
      const { error } = await supabase
        .from('marketing_events')
        .update({
          event_name: data.event_name,
          event_type: data.event_type,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date || null,
          venue: data.venue,
          location: data.location,
          expected_attendees: data.expected_attendees ? parseInt(data.expected_attendees) : null,
          budget: data.budget ? parseFloat(data.budget) : null,
          campaign_id: data.campaign_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editEvent.id);

      if (error) {
        toast.error('Failed to update event');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'event_updated',
        module: 'marketing',
        record_id: editEvent.id,
        new_values: { event_name: data.event_name },
      });

      toast.success('Event updated');
    } else {
      const { error } = await supabase.from('marketing_events').insert({
        company_id: company.id,
        event_name: data.event_name,
        event_type: data.event_type,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date || null,
        venue: data.venue,
        location: data.location,
        expected_attendees: data.expected_attendees ? parseInt(data.expected_attendees) : null,
        budget: data.budget ? parseFloat(data.budget) : null,
        campaign_id: data.campaign_id,
        organizer: currentUser?.id,
        status: 'planned',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create event');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'event_created',
        module: 'marketing',
        new_values: { event_name: data.event_name },
      });

      toast.success('Event created');
    }

    reset();
    setEditEvent(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('marketing_events')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete event');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'event_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Event deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('marketing_events')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'event_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
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
      key: 'start_date',
      header: 'Start Date', 
      cell: (row) => row.start_date ? format(new Date(row.start_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'venue',
      header: 'Venue', 
      cell: (row) => row.venue || '-'
    },
    { 
      key: 'location',
      header: 'Location', 
      cell: (row) => row.location || '-'
    },
    { 
      key: 'expected_attendees',
      header: 'Expected', 
      cell: (row) => row.expected_attendees || '-'
    },
    { 
      key: 'actual_attendees',
      header: 'Actual', 
      cell: (row) => row.actual_attendees || '-'
    },
    { 
      key: 'budget',
      header: 'Budget', 
      cell: (row) => row.budget ? `$${row.budget.toLocaleString()}` : '-'
    },
    { 
      key: 'campaign',
      header: 'Campaign', 
      cell: (row) => row.campaigns?.campaign_name || '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="events" action="edit">
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
              {row.status === 'planned' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'confirmed')}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Confirm Event
                </DropdownMenuItem>
              )}
              {row.status === 'confirmed' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'in_progress')}>
                  <Calendar className="h-4 w-4 mr-2" /> Start Event
                </DropdownMenuItem>
              )}
              {row.status === 'in_progress' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'completed')}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Complete Event
                </DropdownMenuItem>
              )}
              <Can resource="events" action="delete">
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
      <PageHeader title="Events" description="Manage marketing events and sponsorships" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Events' }]}>
        <Can resource="events" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditEvent(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Event Name *</Label>
                  <Input {...register('event_name')} placeholder="Enter event name" />
                  {errors.event_name && <p className="text-red-500 text-sm mt-1">{errors.event_name.message}</p>}
                </div>
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
                          <SelectItem value="sponsorship">Sponsorship</SelectItem>
                          <SelectItem value="networking">Networking</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Event description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="datetime-local" {...register('start_date')} />
                    {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>}
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="datetime-local" {...register('end_date')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Venue</Label>
                    <Input {...register('venue')} placeholder="Venue name" />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input {...register('location')} placeholder="City, Country" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Expected Attendees</Label>
                    <Input type="number" {...register('expected_attendees')} placeholder="0" />
                  </div>
                  <div>
                    <Label>Budget ($)</Label>
                    <Input type="number" {...register('budget')} placeholder="0.00" />
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
                    {isSubmitting ? 'Saving...' : editEvent ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Upcoming Events" value={stats.upcoming} icon={<Calendar className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Users className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed Events" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Attendees" value={stats.totalAttendees} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={events}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
