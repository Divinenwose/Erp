'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logEmployeeRequestEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { formatDate, formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, ArrowRightLeft, UserCheck, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const REQUEST_TYPES = [
  { value: 'confirmation', label: 'Confirmation', icon: UserCheck },
  { value: 'promotion', label: 'Promotion', icon: TrendingUp },
  { value: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  { value: 'status_change', label: 'Status Change', icon: RefreshCw },
];

const STATUS_OPTIONS = ['active', 'probation', 'on_leave', 'suspended', 'resigned', 'terminated', 'retired', 'inactive'];

export default function EmployeeRequestsPage() {
  const searchParams = useSearchParams();
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canView = isAdmin || hasPermission('hr.employee_requests.view');
  const canManage = isAdmin || hasPermission('hr.employee_requests.manage');

  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [dueForConfirmation, setDueForConfirmation] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formType, setFormType] = useState('confirmation');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formNewDept, setFormNewDept] = useState('');
  const [formNewBranch, setFormNewBranch] = useState('');
  const [formNewTitle, setFormNewTitle] = useState('');
  const [formNewSalary, setFormNewSalary] = useState('');
  const [formNewStatus, setFormNewStatus] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formReason, setFormReason] = useState('');

  useEffect(() => {
    if (!company?.id || !canView) { setLoading(false); return; }
    loadAll();
  }, [company?.id, canView]);

  useEffect(() => {
    const preselect = searchParams.get('employee');
    const preselectType = searchParams.get('type');
    if (preselect) setFormEmployeeId(preselect);
    if (preselectType) setFormType(preselectType);
    if (preselect) setDialogOpen(true);
  }, [searchParams]);

  const loadAll = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [reqRes, empRes, deptRes, branchRes] = await Promise.all([
      supabase.from('employee_requests')
        .select('*, employees:employee_id(first_name, last_name, employee_number), current_dept:current_department_id(name), new_dept:new_department_id(name), current_branch:current_branch_id(name), new_branch:new_branch_id(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('employees').select('id, first_name, last_name, employee_number, department_id, branch_id, job_title, salary, employment_status, probation_end_date').eq('company_id', company.id).eq('employment_status', 'active'),
      supabase.from('departments').select('id, name').eq('company_id', company.id),
      supabase.from('branches').select('id, name').eq('company_id', company.id),
    ]);

    setRequests(reqRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setBranches(branchRes.data ?? []);

    // Employees approaching confirmation (probation ending within 30 days)
    // with no existing pending/approved confirmation request.
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const existingConfirmationEmployeeIds = new Set(
      (reqRes.data ?? []).filter(r => r.request_type === 'confirmation' && ['pending', 'approved'].includes(r.status)).map(r => r.employee_id)
    );
    const due = (empRes.data ?? []).filter(e =>
      e.probation_end_date && e.probation_end_date <= in30Days && e.probation_end_date >= today &&
      !existingConfirmationEmployeeIds.has(e.id)
    );
    setDueForConfirmation(due);

    setLoading(false);
  };

  const resolveCurrentEmployeeId = async (): Promise<string | null> => {
    if (!currentUser?.id || !company?.id) return null;
    const { data } = await supabase.from('employees').select('id').eq('user_id', currentUser.id).eq('company_id', company.id).maybeSingle();
    return data?.id ?? null;
  };

  const resetForm = () => {
    setFormType('confirmation'); setFormEmployeeId(''); setFormNewDept(''); setFormNewBranch('');
    setFormNewTitle(''); setFormNewSalary(''); setFormNewStatus(''); setFormEffectiveDate(''); setFormReason('');
  };

  const handleSubmitRequest = async () => {
    if (!company?.id || !formEmployeeId || !formEffectiveDate) {
      toast.error('Employee and effective date are required');
      return;
    }
    const employee = employees.find(e => e.id === formEmployeeId);
    if (!employee) { toast.error('Employee not found'); return; }

    setSubmitting(true);
    const requestedBy = await resolveCurrentEmployeeId();

    const payload: any = {
      company_id: company.id,
      employee_id: formEmployeeId,
      request_type: formType,
      effective_date: formEffectiveDate,
      reason: formReason.trim() || null,
      status: 'pending',
      requested_by: requestedBy,
      current_department_id: employee.department_id,
      current_branch_id: employee.branch_id,
      current_job_title: employee.job_title,
      current_salary: employee.salary,
      current_status: employee.employment_status,
    };

    if (formType === 'promotion') {
      payload.new_job_title = formNewTitle.trim() || null;
      payload.new_salary = formNewSalary ? parseFloat(formNewSalary) : null;
      if (formNewDept) payload.new_department_id = formNewDept;
    } else if (formType === 'transfer') {
      payload.new_department_id = formNewDept || null;
      payload.new_branch_id = formNewBranch || null;
      payload.new_job_title = formNewTitle.trim() || null;
    } else if (formType === 'status_change') {
      payload.new_status = formNewStatus || null;
    } else if (formType === 'confirmation') {
      payload.new_status = 'active';
    }

    const { data: inserted, error } = await supabase.from('employee_requests').insert(payload).select().single();
    setSubmitting(false);

    if (error || !inserted) {
      toast.error('Failed to submit request');
      return;
    }

    if (currentUser?.id) {
      await logEmployeeRequestEvent(company.id, currentUser.id, 'request_submitted', inserted.id, undefined, payload);
    }

    toast.success('Request submitted');
    resetForm();
    setDialogOpen(false);
    loadAll();
  };

  const handleDecision = async (request: any, approve: boolean) => {
    if (!company?.id) return;
    const decidedBy = await resolveCurrentEmployeeId();

    const { error: reqError } = await supabase.from('employee_requests').update({
      status: approve ? 'approved' : 'rejected',
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    }).eq('id', request.id);

    if (reqError) {
      toast.error('Failed to update request');
      return;
    }

    if (approve) {
      // Apply the change to the employee record
      const empUpdate: any = {};
      if (request.new_department_id) empUpdate.department_id = request.new_department_id;
      if (request.new_branch_id) empUpdate.branch_id = request.new_branch_id;
      if (request.new_job_title) empUpdate.job_title = request.new_job_title;
      if (request.new_salary != null) empUpdate.salary = request.new_salary;
      if (request.new_status) empUpdate.employment_status = request.new_status;

      if (Object.keys(empUpdate).length > 0) {
        await supabase.from('employees').update(empUpdate).eq('id', request.employee_id);
      }

      // Preserve history — before/after captured from the request itself
      await supabase.from('employee_employment_history').insert({
        company_id: company.id,
        employee_id: request.employee_id,
        event_type: request.request_type,
        effective_date: request.effective_date,
        previous_department_id: request.current_department_id,
        new_department_id: request.new_department_id,
        previous_branch_id: request.current_branch_id,
        new_branch_id: request.new_branch_id,
        previous_job_title: request.current_job_title,
        new_job_title: request.new_job_title,
        previous_salary: request.current_salary,
        new_salary: request.new_salary,
        previous_status: request.current_status,
        new_status: request.new_status,
        reason: request.reason,
        recorded_by: decidedBy,
      });

      // Notify the employee, if their record is linked to a login account
      const { data: empRow } = await supabase.from('employees').select('user_id, first_name').eq('id', request.employee_id).maybeSingle();
      if (empRow?.user_id) {
        await sendNotification(company.id, empRow.user_id, {
          title: `${REQUEST_TYPES.find(t => t.value === request.request_type)?.label ?? 'Employment'} request approved`,
          message: `Your ${request.request_type.replace('_', ' ')} has been approved, effective ${request.effective_date}.`,
          type: 'success',
          module: 'hr_employee_requests',
          reference_id: request.id,
          action_url: '/hr/employees',
        });
      }
    }

    if (currentUser?.id) {
      await logEmployeeRequestEvent(company.id, currentUser.id, approve ? 'request_approved' : 'request_rejected', request.id);
    }

    toast.success(approve ? 'Request approved and applied' : 'Request rejected');
    loadAll();
  };

  const filtered = requests.filter(r => (!typeFilter || r.request_type === typeFilter) && (!statusFilter || r.status === statusFilter));

  const columns: Column[] = [
    { key: 'employee', header: 'Employee', cell: (r: any) => <Link href={`/hr/employees/${r.employee_id}`} className="hover:underline text-sm font-medium">{r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : '-'}</Link> },
    { key: 'type', header: 'Type', cell: (r: any) => <Badge variant="outline" className="capitalize">{r.request_type.replace('_', ' ')}</Badge> },
    { key: 'change', header: 'Change', cell: (r: any) => (
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {r.new_dept?.name && `→ ${r.new_dept.name} `}
        {r.new_branch?.name && `→ ${r.new_branch.name} `}
        {r.new_job_title && `→ ${r.new_job_title} `}
        {r.new_salary != null && `→ ${formatCurrency(r.new_salary)} `}
        {r.new_status && `→ ${r.new_status}`}
      </span>
    ) },
    { key: 'effective_date', header: 'Effective', cell: (r: any) => formatDate(r.effective_date) },
    { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: 'Actions', cell: (r: any) => canManage && r.status === 'pending' ? (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => handleDecision(r, true)}><CheckCircle className="h-3 w-3 mr-1" />Approve</Button>
        <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => handleDecision(r, false)}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
      </div>
    ) : null },
  ];

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employee Requests" breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Employee Requests' }]} />
        <EmptyState title="No access" description="You don't have permission to view employee lifecycle requests." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Requests"
        description="Confirmation, promotion, transfer, and status-change requests"
        breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Employee Requests' }]}
      >
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />New Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Employee Request</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {(formType === 'promotion' || formType === 'transfer') && (
                  <div className="space-y-2">
                    <Label>New Department</Label>
                    <Select value={formNewDept} onValueChange={setFormNewDept}>
                      <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                      <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {formType === 'transfer' && (
                  <div className="space-y-2">
                    <Label>New Branch</Label>
                    <Select value={formNewBranch} onValueChange={setFormNewBranch}>
                      <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                      <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {(formType === 'promotion' || formType === 'transfer') && (
                  <div className="space-y-2"><Label>New Job Title</Label><Input value={formNewTitle} onChange={(e) => setFormNewTitle(e.target.value)} placeholder="Leave blank if unchanged" /></div>
                )}
                {formType === 'promotion' && (
                  <div className="space-y-2"><Label>New Salary</Label><Input type="number" step="0.01" value={formNewSalary} onChange={(e) => setFormNewSalary(e.target.value)} placeholder="Leave blank if unchanged" /></div>
                )}
                {formType === 'status_change' && (
                  <div className="space-y-2">
                    <Label>New Status</Label>
                    <Select value={formNewStatus} onValueChange={setFormNewStatus}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2"><Label>Effective Date *</Label><Input type="date" value={formEffectiveDate} onChange={(e) => setFormEffectiveDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Reason / Recommendation</Label><Textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} /></div>
                <Button className="w-full" onClick={handleSubmitRequest} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Pending" value={loading ? 0 : requests.filter(r => r.status === 'pending').length} icon={<RefreshCw className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Approved" value={loading ? 0 : requests.filter(r => r.status === 'approved').length} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Due for Confirmation" value={loading ? 0 : dueForConfirmation.length} icon={<UserCheck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Rejected" value={loading ? 0 : requests.filter(r => r.status === 'rejected').length} icon={<XCircle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      {dueForConfirmation.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Approaching Confirmation</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {dueForConfirmation.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div>
                  <Link href={`/hr/employees/${e.id}`} className="text-sm font-medium hover:underline">{e.first_name} {e.last_name}</Link>
                  <p className="text-xs text-gray-500">Probation ends {formatDate(e.probation_end_date)}</p>
                </div>
                {canManage && (
                  <Button size="sm" variant="outline" onClick={() => { setFormEmployeeId(e.id); setFormType('confirmation'); setDialogOpen(true); }}>Start Confirmation</Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable columns={columns} data={filtered} loading={loading} emptyTitle="No requests yet" />
        </CardContent>
      </Card>
    </div>
  );
}
