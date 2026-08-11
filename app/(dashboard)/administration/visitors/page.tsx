'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { logAuditEvent } from '@/lib/audit';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserCheck, Plus, Search, Clock, CheckCircle2, LogOut, Download, Filter, Building2, Phone, Mail } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay } from 'date-fns';

const visitorSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  purpose: z.string().min(1, 'Required'),
  department_id: z.string().optional(),
  host_id: z.string().optional(),
  notes: z.string().optional(),
});
type VisitorForm = z.infer<typeof visitorSchema>;

export default function VisitorsPage() {
  const { company, user: currentUser } = useAuth();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<VisitorForm>({ resolver: zodResolver(visitorSchema) });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [visitorsRes, deptRes, empRes] = await Promise.all([
      supabase
        .from('visitors')
        .select('*, departments(name), employees(first_name, last_name), profiles(first_name, last_name)')
        .eq('company_id', company.id)
        .order('check_in', { ascending: false }),
      supabase.from('departments').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    setVisitors(visitorsRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: VisitorForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('visitors').insert({
      ...data,
      company_id: company.id,
      status: 'checked_in',
      check_in: new Date().toISOString(),
    });
    if (error) {
      toast.error('Failed to register visitor');
      return;
    }

    await logAuditEvent(company.id, currentUser?.id || '', {
      action: 'visitor_checked_in',
      module: 'visitors',
      new_value: { name: `${data.first_name} ${data.last_name}`, purpose: data.purpose },
    });

    toast.success('Visitor checked in');
    reset();
    setDialogOpen(false);
    load();
  };

  const checkout = async (id: string) => {
    if (!company?.id) return;
    const { error } = await supabase
      .from('visitors')
      .update({ status: 'checked_out', check_out: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to check out visitor');
      return;
    }

    await logAuditEvent(company.id, currentUser?.id || '', {
      action: 'visitor_checked_out',
      module: 'visitors',
    });

    toast.success('Visitor checked out');
    load();
  };

  const exportCSV = () => {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Purpose', 'Department', 'Host', 'Check In', 'Check Out', 'Status', 'Notes'];
    const rows = filteredVisitors.map(v => [
      `${v.first_name} ${v.last_name || ''}`,
      v.company_name || '',
      v.email || '',
      v.phone || '',
      v.purpose || '',
      v.departments?.name || '',
      v.employees ? `${v.employees.first_name} ${v.employees.last_name}` : '',
      v.check_in ? format(new Date(v.check_in), 'yyyy-MM-dd HH:mm') : '',
      v.check_out ? format(new Date(v.check_out), 'yyyy-MM-dd HH:mm') : '',
      v.status,
      v.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitors-${selectedDate}.csv`;
    a.click();
  };

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = !search ||
      `${v.first_name} ${v.last_name || ''} ${v.company_name || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus;
    const matchesDepartment = selectedDepartment === 'all' || v.department_id === selectedDepartment;
    const matchesDate = !selectedDate ||
      (v.check_in && v.check_in.startsWith(selectedDate));
    return matchesSearch && matchesStatus && matchesDepartment && matchesDate;
  });

  const checkedIn = visitors.filter(v => v.status === 'checked_in').length;
  const todayVisitors = visitors.filter(v => v.check_in && v.check_in.startsWith(format(new Date(), 'yyyy-MM-dd'))).length;

  return (
    <div className="space-y-6">
      <PermissionGuard permission="visitors.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view visitors</div>}>
        <PageHeader
          title="Visitor Management"
          description="Track and manage office visitors"
          breadcrumbs={[{ label: 'Administration' }, { label: 'Visitors' }]}
        >
          <div className="flex gap-2">
            <PermissionGuard permission="visitors.create">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Check In Visitor</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader><DialogTitle>Visitor Check-In</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>First Name *</Label><Input className="mt-1" {...register('first_name')} /></div>
                      <div><Label>Last Name</Label><Input className="mt-1" {...register('last_name')} /></div>
                      <div><Label>Company</Label><Input className="mt-1" {...register('company_name')} /></div>
                      <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                      <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                      <div>
                        <Label>Purpose *</Label>
                        <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('purpose')}>
                          <option value="">Select purpose</option>
                          <option value="meeting">Meeting</option>
                          <option value="interview">Interview</option>
                          <option value="delivery">Delivery</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="training">Training</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
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
                      <div>
                        <Label>Host</Label>
                        <Controller
                          name="host_id"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select host" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Check In</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </PermissionGuard>
            <PermissionGuard permission="visitors.export">
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />Export CSV
              </Button>
            </PermissionGuard>
          </div>
        </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Currently In" value={checkedIn} icon={<UserCheck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Today's Visitors" value={todayVisitors} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Visits" value={visitors.length} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Checked Out" value={visitors.filter(v => v.status === 'checked_out').length} icon={<LogOut className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search visitors..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto" />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filteredVisitors.length === 0 ? (
            <EmptyState icon={<UserCheck className="h-12 w-12" />} title="No visitors found" description="No visitors match your filters" action={<PermissionGuard permission="visitors.create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Check In Visitor</Button></PermissionGuard>} />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filteredVisitors.map(v => (
                <div key={v.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {v.first_name.charAt(0)}{v.last_name?.charAt(0) ?? ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{v.first_name} {v.last_name ?? ''}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{v.company_name ?? 'Individual'} · {v.purpose ?? 'General'}</p>
                  </div>
                  <div className="text-xs text-gray-400 hidden md:block">{v.check_in ? format(new Date(v.check_in), 'HH:mm') : ''}</div>
                  <StatusBadge status={v.status} />
                  {v.status === 'checked_in' && (
                    <PermissionGuard permission="visitors.checkout">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => checkout(v.id)}>
                        <LogOut className="h-3.5 w-3.5 mr-1" />Check Out
                      </Button>
                    </PermissionGuard>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </PermissionGuard>
    </div>
  );
}
