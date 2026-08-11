'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Bell, Clock, MapPin, Users, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const eventSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  event_type: z.enum(['meeting', 'holiday', 'training', 'deadline', 'reminder', 'other']),
  reminder_minutes: z.number().optional(),
  attendees: z.string().optional(),
});
type EventForm = z.infer<typeof eventSchema>;

export default function AdminCalendarPage() {
  const { company, user: currentUser } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('all');

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EventForm>({ resolver: zodResolver(eventSchema) });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const { data } = await supabase
      .from('admin_calendar_events')
      .select('*')
      .eq('company_id', company.id)
      .gte('event_date', monthStart.toISOString().split('T')[0])
      .lte('event_date', monthEnd.toISOString().split('T')[0])
      .order('event_date', { ascending: true });

    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id, currentDate]);

  const onSubmit = async (data: EventForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('admin_calendar_events').insert({
      ...data,
      company_id: company.id,
      created_by: currentUser?.id,
    });
    if (error) {
      toast.error('Failed to create event');
      return;
    }

    await logAuditEvent(company.id, currentUser?.id || '', {
      action: 'calendar_event_created',
      module: 'calendar',
      new_value: { title: data.title, type: data.event_type, date: data.event_date },
    });

    toast.success('Event created');
    reset();
    setDialogOpen(false);
    load();
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfMonth = monthStart.getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  calendarDays.push(...daysInMonth);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => e.event_date === dateStr);
  };

  const getEventTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      meeting: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      holiday: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      training: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      deadline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      reminder: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return badges[type] || badges.other;
  };

  const filteredEvents = selectedType === 'all' 
    ? events 
    : events.filter(e => e.event_type === selectedType);

  const todayEvents = events.filter(e => e.event_date === format(new Date(), 'yyyy-MM-dd')).length;
  const thisMonthEvents = events.length;

  const openDialogForDate = (date: Date) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    reset({ event_date: format(date, 'yyyy-MM-dd') });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PermissionGuard permission="calendar.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view calendar</div>}>
        <PageHeader
          title="Administrative Calendar"
          description="View and manage administrative events and reminders"
          breadcrumbs={[{ label: 'Administration' }, { label: 'Calendar' }]}
        >
          <div className="flex gap-2">
            <PermissionGuard permission="calendar.create">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader><DialogTitle>Add Calendar Event</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><Label>Title *</Label><Input className="mt-1" {...register('title')} /></div>
                      <div>
                        <Label>Date *</Label>
                        <Input type="date" className="mt-1" {...register('event_date')} defaultValue={selectedDate || undefined} />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('event_type')}>
                          <option value="meeting">Meeting</option>
                          <option value="holiday">Holiday</option>
                          <option value="training">Training</option>
                          <option value="deadline">Deadline</option>
                          <option value="reminder">Reminder</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div><Label>Start Time</Label><Input type="time" className="mt-1" {...register('start_time')} /></div>
                      <div><Label>End Time</Label><Input type="time" className="mt-1" {...register('end_time')} /></div>
                      <div className="col-span-2"><Label>Location</Label><Input className="mt-1" {...register('location')} /></div>
                      <div className="col-span-2"><Label>Reminder (minutes before)</Label><Input type="number" className="mt-1" {...register('reminder_minutes')} /></div>
                      <div className="col-span-2"><Label>Description</Label><Textarea className="mt-1" {...register('description')} /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Add Event</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </PermissionGuard>
          </div>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Today's Events</span>
              </div>
              <p className="text-2xl font-bold mt-2">{todayEvents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
              </div>
              <p className="text-2xl font-bold mt-2">{thisMonthEvents}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button size="sm" variant="outline" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
                <Button size="sm" variant="outline" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="meeting">Meetings</SelectItem>
                  <SelectItem value="holiday">Holidays</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="deadline">Deadlines</SelectItem>
                  <SelectItem value="reminder">Reminders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, index) => {
                if (!date) return <div key={index} className="h-24" />;
                const dayEvents = getEventsForDay(date);
                const isTodayDate = isToday(date);

                return (
                  <div
                    key={index}
                    onClick={() => openDialogForDate(date)}
                    className={`h-24 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      isTodayDate ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <div className={`text-sm font-medium ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {format(date, 'd')}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs px-1 py-0.5 rounded truncate ${getEventTypeBadge(event.event_type)}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
}
