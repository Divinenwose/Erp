'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Plus, Video, MapPin, FileText, Search, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format, isPast, isFuture, isToday, addMinutes } from 'date-fns';

const meetingSchema = z.object({
  title: z.string().min(1, 'Required'),
  type: z.enum(['devotion', 'check_in', 'weekly', 'management', 'training', 'other']),
  description: z.string().optional(),
  date: z.string().min(1, 'Required'),
  start_time: z.string().min(1, 'Required'),
  end_time: z.string().min(1, 'Required'),
  location: z.string().optional(),
  meeting_link: z.string().url().optional().or(z.literal('')),
  department_id: z.string().optional(),
  attendees: z.string().optional(),
  agenda: z.string().optional(),
});
type MeetingForm = z.infer<typeof meetingSchema>;

export default function MeetingsPage() {
  const { company, user: currentUser } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<MeetingForm>({ resolver: zodResolver(meetingSchema) });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [meetingsRes, deptRes] = await Promise.all([
      supabase
        .from('meetings')
        .select('*, departments(name), meeting_attendees(profiles(first_name, last_name))')
        .eq('company_id', company.id)
        .order('date', { ascending: true }),
      supabase.from('departments').select('*').eq('company_id', company.id),
    ]);

    setMeetings(meetingsRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: MeetingForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('meetings').insert({
      ...data,
      company_id: company.id,
      status: 'scheduled',
      created_by: currentUser?.id,
    });
    if (error) {
      toast.error('Failed to create meeting');
      return;
    }

    await logAuditEvent(company.id, currentUser?.id || '', {
      action: 'meeting_created',
      module: 'meetings',
      new_value: { title: data.title, type: data.type, date: data.date },
    });

    toast.success('Meeting scheduled');
    reset();
    setDialogOpen(false);
    load();
  };

  const getMeetingStatus = (meeting: any) => {
    const meetingDateTime = new Date(`${meeting.date}T${meeting.start_time}`);
    const endDateTime = new Date(`${meeting.date}T${meeting.end_time}`);
    const now = new Date();

    if (meeting.status === 'cancelled') return 'cancelled';
    if (meeting.status === 'completed') return 'completed';
 if (now > endDateTime) return 'completed';
    if (now > meetingDateTime) return 'in_progress';
    return 'scheduled';
  };

  const getMeetingTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      devotion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      check_in: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      weekly: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      management: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      training: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return badges[type] || badges.other;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return badges[status] || badges.scheduled;
  };

  const filteredMeetings = meetings.filter(m => {
    const status = getMeetingStatus(m);
    const matchesSearch = !search || m.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'all' || m.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const upcomingMeetings = meetings.filter(m => getMeetingStatus(m) === 'scheduled').length;
  const todayMeetings = meetings.filter(m => m.date === format(new Date(), 'yyyy-MM-dd')).length;
  const inProgressMeetings = meetings.filter(m => getMeetingStatus(m) === 'in_progress').length;

  return (
    <div className="space-y-6">
      <PermissionGuard permission="meetings.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view meetings</div>}>
        <PageHeader
          title="Meetings"
          description="Schedule and manage company meetings"
          breadcrumbs={[{ label: 'Administration' }, { label: 'Meetings' }]}
        >
          <div className="flex gap-2">
            <PermissionGuard permission="meetings.create">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><Label>Title *</Label><Input className="mt-1" {...register('title')} /></div>
                      <div>
                        <Label>Type *</Label>
                        <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('type')}>
                          <option value="devotion">Devotion</option>
                          <option value="check_in">Check-In</option>
                          <option value="weekly">Weekly</option>
                          <option value="management">Management</option>
                          <option value="training">Training</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <Label>Date *</Label>
                        <Input type="date" className="mt-1" {...register('date')} />
                      </div>
                      <div><Label>Start Time *</Label><Input type="time" className="mt-1" {...register('start_time')} /></div>
                      <div><Label>End Time *</Label><Input type="time" className="mt-1" {...register('end_time')} /></div>
                      <div className="col-span-2"><Label>Location</Label><Input className="mt-1" {...register('location')} placeholder="Room name or address" /></div>
                      <div className="col-span-2"><Label>Meeting Link</Label><Input className="mt-1" {...register('meeting_link')} placeholder="https://zoom.us/..." /></div>
                      <div className="col-span-2">
                        <Label>Department</Label>
                        <Controller
                          name="department_id"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                {departments.map((dept) => (
                                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="col-span-2"><Label>Description</Label><Textarea className="mt-1" {...register('description')} /></div>
                      <div className="col-span-2"><Label>Agenda</Label><Textarea className="mt-1" {...register('agenda')} /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Schedule</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </PermissionGuard>
          </div>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Upcoming" value={upcomingMeetings} icon={<Calendar className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Today" value={todayMeetings} icon={<Clock className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="In Progress" value={inProgressMeetings} icon={<CheckCircle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Total" value={meetings.length} icon={<Users className="h-4 w-4 text-purple-600" />} iconBg="bg-purple-50 dark:bg-purple-950/50" loading={loading} />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search meetings..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="devotion">Devotion</SelectItem>
                  <SelectItem value="check_in">Check-In</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filteredMeetings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No meetings found</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800">
                {filteredMeetings.map(m => {
                  const status = getMeetingStatus(m);
                  return (
                    <div key={m.id} className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className={`p-2 rounded-lg ${getMeetingTypeBadge(m.type)}`}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{m.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span>{format(new Date(m.date), 'MMM dd, yyyy')}</span>
                          <span>·</span>
                          <span>{m.start_time} - {m.end_time}</span>
                          {m.location && <><span>·</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span></>}
                        </p>
                      </div>
                      <Badge className={getMeetingTypeBadge(m.type)}>{m.type.replace('_', ' ')}</Badge>
                      <Badge className={getStatusBadge(status)}>{status.replace('_', ' ')}</Badge>
                      {m.meeting_link && (
                        <Button size="sm" variant="outline" className="h-8">
                          <Video className="h-4 w-4 mr-2" />
                          Join
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
}
