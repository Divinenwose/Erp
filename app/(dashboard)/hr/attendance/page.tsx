'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import DataTable from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Clock, Download, Plus, LogIn, LogOut, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AttendancePage() {
  const { company } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date().toISOString().split('T')[0]);
  const [clockDialogOpen, setClockDialogOpen] = useState(false);
  const [clockMode, setClockMode] = useState<'in' | 'out'>('in');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!company?.id) return;
    const [attRes, empRes] = await Promise.all([
      supabase.from('attendance').select('*, employees(first_name, last_name, job_title)').eq('company_id', company.id).order('date', { ascending: false }).order('check_in', { ascending: false }).limit(100),
      supabase.from('employees').select('id, first_name, last_name').eq('company_id', company.id).eq('employment_status', 'active'),
    ]);
    setRecords(attRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [company?.id]);

  const handleClockAction = async () => {
    if (!company?.id || !selectedEmployee) { toast.error('Please select an employee'); return; }
    setSubmitting(true);
    const now = new Date().toISOString();

    if (clockMode === 'in') {
      const existing = records.find(r => r.employee_id === selectedEmployee && r.date === today && r.check_in && !r.check_out);
      if (existing) { toast.error('Employee already checked in today'); setSubmitting(false); return; }
      const { error } = await supabase.from('attendance').insert({
        company_id: company.id, employee_id: selectedEmployee, date: today, check_in: now, status: 'present', notes,
      });
      if (error) { toast.error('Failed to clock in'); setSubmitting(false); return; }
      toast.success('Clock in recorded');
    } else {
      const existing = records.find(r => r.employee_id === selectedEmployee && r.date === today && r.check_in && !r.check_out);
      if (!existing) { toast.error('No active clock-in found for today'); setSubmitting(false); return; }
      const checkInTime = new Date(existing.check_in);
      const checkOutTime = new Date(now);
      const workHours = Math.round(((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)) * 10) / 10;
      const { error } = await supabase.from('attendance').update({ check_out: now, work_hours: workHours }).eq('id', existing.id);
      if (error) { toast.error('Failed to clock out'); setSubmitting(false); return; }
      toast.success(`Clocked out. ${workHours}h worked`);
    }

    setSelectedEmployee(''); setNotes(''); setClockDialogOpen(false);
    setSubmitting(false);
    loadData();
  };

  const todayRecords = records.filter(r => r.date === today);
  const presentToday = todayRecords.filter(r => r.status === 'present' || r.check_in).length;
  const totalHoursToday = todayRecords.reduce((a, r) => a + (r.work_hours ?? 0), 0);
  const avgHours = records.length > 0 ? (records.reduce((a, r) => a + (r.work_hours ?? 0), 0) / records.filter(r => r.work_hours).length || 0) : 0;
  const currentlyIn = records.filter(r => r.date === today && r.check_in && !r.check_out).length;

  const formatTime = (ts: string) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    {
      key: 'employee', header: 'Employee', sortable: true,
      cell: (row: any) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white text-sm">{row.employees?.first_name} {row.employees?.last_name}</p>
          <p className="text-xs text-gray-400">{row.employees?.job_title ?? '—'}</p>
        </div>
      ),
    },
    { key: 'date', header: 'Date', sortable: true, cell: (row: any) => <span className="text-sm">{formatDate(row.date)}</span> },
    { key: 'check_in', header: 'Check In', cell: (row: any) => <span className={cn('text-sm font-medium', row.check_in ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400')}>{formatTime(row.check_in)}</span> },
    { key: 'check_out', header: 'Check Out', cell: (row: any) => <span className={cn('text-sm font-medium', row.check_out ? 'text-red-600 dark:text-red-400' : 'text-gray-400')}>{formatTime(row.check_out)}</span> },
    { key: 'work_hours', header: 'Hours', sortable: true, cell: (row: any) => <span className="text-sm font-semibold">{row.work_hours ? `${row.work_hours}h` : row.check_in && !row.check_out ? <span className="text-blue-500 animate-pulse">In progress</span> : '—'}</span> },
    { key: 'status', header: 'Status', cell: (row: any) => <StatusBadge status={row.status ?? 'present'} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Track employee clock-in/out and working hours" breadcrumbs={[{ label: 'HR' }, { label: 'Attendance' }]}>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Dialog open={clockDialogOpen} onOpenChange={setClockDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Clock className="h-4 w-4 mr-2" />Clock In/Out</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setClockMode('in')}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors', clockMode === 'in' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800')}
                >
                  <LogIn className="h-4 w-4" />Clock In
                </button>
                <button
                  onClick={() => setClockMode('out')}
                  className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors', clockMode === 'out' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800')}
                >
                  <LogOut className="h-4 w-4" />Clock Out
                </button>
              </div>

              <div>
                <Label>Employee *</Label>
                <select
                  className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                  value={selectedEmployee}
                  onChange={e => setSelectedEmployee(e.target.value)}
                >
                  <option value="">Select employee</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>

              {selectedEmployee && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-sm">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Clock className="h-4 w-4" />
                    <span>Current time: <strong>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                  {clockMode === 'out' && (() => {
                    const existing = records.find(r => r.employee_id === selectedEmployee && r.date === today && r.check_in && !r.check_out);
                    return existing ? (
                      <p className="text-xs text-blue-500 mt-1">Clocked in at: {formatTime(existing.check_in)}</p>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No active clock-in found for today.</p>
                    );
                  })()}
                </div>
              )}

              <div>
                <Label>Notes (optional)</Label>
                <Input className="mt-1" placeholder="e.g. Remote work, late arrival" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setClockDialogOpen(false)}>Cancel</Button>
                <Button
                  disabled={!selectedEmployee || submitting}
                  className={clockMode === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                  onClick={handleClockAction}
                >
                  {submitting ? 'Processing...' : clockMode === 'in' ? 'Confirm Clock In' : 'Confirm Clock Out'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Today summary bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium">Today — {formatDate(today)}</p>
            <h2 className="text-2xl font-bold mt-0.5">{presentToday} employees in</h2>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{currentlyIn}</p>
              <p className="text-blue-200 text-xs">Currently in</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{totalHoursToday.toFixed(0)}h</p>
              <p className="text-blue-200 text-xs">Total hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{avgHours.toFixed(1)}h</p>
              <p className="text-blue-200 text-xs">Avg hours/day</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Present Today" value={presentToday} icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Currently In" value={currentlyIn} icon={<Activity className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Avg Hours/Day" value={`${avgHours.toFixed(1)}h`} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Records" value={records.length} icon={<UserCheck className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        data={records as any[]}
        columns={columns as any[]}
        loading={loading}
        searchPlaceholder="Search by employee name..."
        searchKeys={['date'] as any}
        pageSize={15}
        emptyTitle="No attendance records"
        emptyDescription="Use Clock In/Out to record employee attendance"
        emptyAction={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setClockDialogOpen(true)}><Clock className="h-4 w-4 mr-2" />Clock In Employee</Button>}
      />
    </div>
  );
}
