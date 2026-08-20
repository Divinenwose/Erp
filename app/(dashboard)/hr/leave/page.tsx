'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logLeaveEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, Plus, Search, CheckCircle2, Clock, XCircle, Wallet } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const leaveSchema = z.object({
  employee_id: z.string().min(1, 'Required'),
  leave_type_id: z.string().min(1, 'Required'),
  start_date: z.string().min(1, 'Required'),
  end_date: z.string().min(1, 'Required'),
  reason: z.string().optional(),
});
type LeaveForm = z.infer<typeof leaveSchema>;

export default function LeavePage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('hr.leave.create');
  const canApprove = isAdmin || hasPermission('hr.leave.approve');
  const canViewBalances = isAdmin || hasPermission('hr.leave.balances.view');

  const [requests, setRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<LeaveForm>({ resolver: zodResolver(leaveSchema) });
  const watchEmployee = watch('employee_id');
  const watchType = watch('leave_type_id');

  const loadData = async () => {
    if (!company?.id) return;
    const [req, types, emps, bal] = await Promise.all([
      supabase.from('leave_requests').select('*, employees(first_name, last_name), leave_types(name, color)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('leave_types').select('*').eq('company_id', company.id),
      supabase.from('employees').select('id, first_name, last_name, user_id').eq('company_id', company.id).eq('employment_status', 'active'),
      canViewBalances ? supabase.from('leave_balances').select('*').eq('company_id', company.id) : Promise.resolve({ data: [] } as any),
    ]);
    setRequests(req.data ?? []);
    if (!types.data?.length) {
      await supabase.from('leave_types').insert([
        { company_id: company.id, name: 'Annual Leave', code: 'AL', days_per_year: 20, color: '#3B82F6' },
        { company_id: company.id, name: 'Sick Leave', code: 'SL', days_per_year: 10, color: '#EF4444' },
        { company_id: company.id, name: 'Personal Leave', code: 'PL', days_per_year: 5, color: '#8B5CF6' },
        { company_id: company.id, name: 'Maternity Leave', code: 'ML', days_per_year: 90, color: '#F59E0B' },
      ]);
      const { data: newTypes } = await supabase.from('leave_types').select('*').eq('company_id', company.id);
      setLeaveTypes(newTypes ?? []);
    } else {
      setLeaveTypes(types.data);
    }
    setEmployees(emps.data ?? []);
    setBalances(bal.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [company?.id, canViewBalances]);

  // Remaining balance for the employee/type currently selected in the form,
  // computed from the stored entitlement/carry-forward plus live usage from
  // leave_requests — never a duplicated, potentially-stale "used" count.
  const currentYear = new Date().getFullYear();
  const selectedBalance = (() => {
    if (!watchEmployee || !watchType) return null;
    const balRow = balances.find(b => b.employee_id === watchEmployee && b.leave_type_id === watchType && b.year === currentYear);
    const leaveType = leaveTypes.find(t => t.id === watchType);
    const entitled = balRow ? balRow.entitled_days + balRow.carried_forward_days : (leaveType?.days_per_year ?? 0);
    const used = requests
      .filter(r => r.employee_id === watchEmployee && r.leave_type_id === watchType && ['approved', 'pending'].includes(r.status) && new Date(r.start_date).getFullYear() === currentYear)
      .reduce((sum, r) => sum + Number(r.days_requested || 0), 0);
    return { entitled, used, remaining: entitled - used };
  })();

  const resolveCurrentEmployeeId = async (): Promise<string | null> => {
    if (!currentUser?.id || !company?.id) return null;
    const { data } = await supabase.from('employees').select('id').eq('user_id', currentUser.id).eq('company_id', company.id).maybeSingle();
    return data?.id ?? null;
  };

  const onSubmit = async (data: LeaveForm) => {
    if (!company?.id) return;
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (selectedBalance && days > selectedBalance.remaining) {
      toast.error(`Insufficient balance: ${selectedBalance.remaining} day(s) remaining, ${days} requested`);
      return;
    }

    const { data: inserted, error } = await supabase.from('leave_requests').insert({
      ...data,
      company_id: company.id,
      days_requested: days,
      status: 'pending',
    }).select().single();
    if (error || !inserted) { toast.error('Failed to submit request'); return; }

    if (currentUser?.id) {
      await logLeaveEvent(company.id, currentUser.id, 'leave_submitted', inserted.id, undefined, data);
    }

    toast.success('Leave request submitted');
    reset(); setDialogOpen(false); loadData();
  };

  const updateStatus = async (request: any, status: 'approved' | 'rejected') => {
    if (!company?.id) return;
    const approverId = await resolveCurrentEmployeeId();

    const { error } = await supabase.from('leave_requests').update({
      status,
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    }).eq('id', request.id);

    if (error) { toast.error('Failed to update request'); return; }

    if (currentUser?.id) {
      await logLeaveEvent(company.id, currentUser.id, status === 'approved' ? 'leave_approved' : 'leave_rejected', request.id);
    }

    const { data: empRow } = await supabase.from('employees').select('user_id').eq('id', request.employee_id).maybeSingle();
    if (empRow?.user_id) {
      await sendNotification(company.id, empRow.user_id, {
        title: `Leave request ${status}`,
        message: `Your ${request.leave_types?.name ?? 'leave'} request (${formatDate(request.start_date)} – ${formatDate(request.end_date)}) was ${status}.`,
        type: status === 'approved' ? 'success' : 'warning',
        module: 'hr_leave',
        reference_id: request.id,
        action_url: '/hr/leave',
      });
    }

    toast.success(`Request ${status}`);
    loadData();
  };

  const filtered = requests.filter(r => !search || `${r.employees?.first_name} ${r.employees?.last_name}`.toLowerCase().includes(search.toLowerCase()));
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;

  const balanceRows = employees.map(emp => {
    return leaveTypes.map(lt => {
      const balRow = balances.find(b => b.employee_id === emp.id && b.leave_type_id === lt.id && b.year === currentYear);
      const entitled = balRow ? balRow.entitled_days + balRow.carried_forward_days : lt.days_per_year;
      const used = requests
        .filter(r => r.employee_id === emp.id && r.leave_type_id === lt.id && r.status === 'approved' && new Date(r.start_date).getFullYear() === currentYear)
        .reduce((sum, r) => sum + Number(r.days_requested || 0), 0);
      const pendingDays = requests
        .filter(r => r.employee_id === emp.id && r.leave_type_id === lt.id && r.status === 'pending' && new Date(r.start_date).getFullYear() === currentYear)
        .reduce((sum, r) => sum + Number(r.days_requested || 0), 0);
      return { employee: emp, leaveType: lt, entitled, used, pending: pendingDays, remaining: entitled - used - pendingDays };
    });
  }).flat();

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Management" description="Manage employee leave requests" breadcrumbs={[{ label: 'HR' }, { label: 'Leave' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Leave Request</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Employee *</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('employee_id')}>
                    <option value="">Select employee</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                  {errors.employee_id && <p className="text-xs text-red-500 mt-1">{errors.employee_id.message}</p>}
                </div>
                <div>
                  <Label>Leave Type *</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('leave_type_id')}>
                    <option value="">Select type</option>
                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {errors.leave_type_id && <p className="text-xs text-red-500 mt-1">{errors.leave_type_id.message}</p>}
                </div>
                {selectedBalance && (
                  <p className="text-xs text-gray-500">Remaining balance: <strong>{selectedBalance.remaining}</strong> day(s) of {selectedBalance.entitled}</p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date *</Label><Input className="mt-1" type="date" {...register('start_date')} /></div>
                  <div><Label>End Date *</Label><Input className="mt-1" type="date" {...register('end_date')} /></div>
                </div>
                <div><Label>Reason</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-20" {...register('reason')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Submit</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Requests" value={requests.length} icon={<Calendar className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Pending" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Approved" value={approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Rejected" value={requests.filter(r => r.status === 'rejected').length} icon={<XCircle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          {canViewBalances && <TabsTrigger value="balances">Balances</TabsTrigger>}
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search requests..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              {filtered.length === 0 ? (
                <EmptyState icon={<Calendar className="h-12 w-12" />} title="No leave requests" description="All leave requests will appear here" />
              ) : (
                <div className="divide-y dark:divide-gray-800">
                  {filtered.map(r => (
                    <div key={r.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.leave_types?.color ?? '#3B82F6' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {r.employees?.first_name} {r.employees?.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {r.leave_types?.name} · {formatDate(r.start_date)} – {formatDate(r.end_date)} · {r.days_requested} day(s)
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                      {r.status === 'pending' && canApprove && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => updateStatus(r, 'approved')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus(r, 'rejected')}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canViewBalances && (
          <TabsContent value="balances" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Wallet className="h-4 w-4" />Leave Balances ({currentYear})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {balanceRows.length === 0 ? (
                  <EmptyState title="No balance data" description="No active employees or leave types found." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 border-b dark:border-gray-800">
                        <tr>
                          <th className="text-left p-3">Employee</th>
                          <th className="text-left p-3">Leave Type</th>
                          <th className="text-right p-3">Entitled</th>
                          <th className="text-right p-3">Used</th>
                          <th className="text-right p-3">Pending</th>
                          <th className="text-right p-3">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-800">
                        {balanceRows.map((row, i) => (
                          <tr key={i}>
                            <td className="p-3">{row.employee.first_name} {row.employee.last_name}</td>
                            <td className="p-3">{row.leaveType.name}</td>
                            <td className="p-3 text-right">{row.entitled}</td>
                            <td className="p-3 text-right">{row.used}</td>
                            <td className="p-3 text-right">{row.pending}</td>
                            <td className={`p-3 text-right font-semibold ${row.remaining < 0 ? 'text-red-600' : ''}`}>{row.remaining}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
