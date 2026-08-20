'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Briefcase, Calendar, FileText, Clock, TrendingUp, Plus, Mail, Phone,
  MapPin, Users, Upload,
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'bio_data', label: 'Bio-data' },
  { value: 'contract', label: 'Contract' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'confirmation_letter', label: 'Confirmation Letter' },
  { value: 'promotion_letter', label: 'Promotion Letter' },
  { value: 'transfer_letter', label: 'Transfer Letter' },
  { value: 'warning_letter', label: 'Warning Letter' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'identification', label: 'Identification' },
  { value: 'other', label: 'Other' },
];

const EVENT_TYPES = [
  { value: 'promotion', label: 'Promotion' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'confirmation', label: 'Confirmation' },
  { value: 'salary_change', label: 'Salary Change' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'department_change', label: 'Department Change' },
];

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();

  const canDocumentsView = isAdmin || hasPermission('hr.employees.documents.view');
  const canDocumentsManage = isAdmin || hasPermission('hr.employees.documents.manage');
  const canHistoryView = isAdmin || hasPermission('hr.employees.history.view');
  const canHistoryManage = isAdmin || hasPermission('hr.employees.history.manage');
  const canAttendance = isAdmin || hasPermission('hr.attendance.view');
  const canLeave = isAdmin || hasPermission('hr.leave.view');

  const [employee, setEmployee] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<{ present: number; absent: number; late: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docType, setDocType] = useState('other');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [submittingDoc, setSubmittingDoc] = useState(false);

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [eventType, setEventType] = useState('promotion');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [submittingHistory, setSubmittingHistory] = useState(false);

  useEffect(() => {
    if (!company?.id || !employeeId) return;
    loadAll();
  }, [company?.id, employeeId]);

  const loadAll = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data: empData } = await supabase
      .from('employees')
      .select('*, departments(name), branches(name), manager:manager_id(first_name, last_name)')
      .eq('id', employeeId)
      .eq('company_id', company.id)
      .maybeSingle();
    setEmployee(empData);

    if (canDocumentsView) {
      const { data } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });
      setDocuments(data ?? []);
    }

    if (canHistoryView) {
      const { data } = await supabase
        .from('employee_employment_history')
        .select('*, previous_department:previous_department_id(name), new_department:new_department_id(name), previous_branch:previous_branch_id(name), new_branch:new_branch_id(name), recorded_by_employee:recorded_by(first_name, last_name)')
        .eq('employee_id', employeeId)
        .eq('company_id', company.id)
        .order('effective_date', { ascending: false });
      setHistory(data ?? []);
    }

    if (canLeave) {
      const { data } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name, color)')
        .eq('employee_id', employeeId)
        .eq('company_id', company.id)
        .order('start_date', { ascending: false })
        .limit(10);
      setLeaveRequests(data ?? []);
    }

    if (canAttendance && empData?.user_id) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('employee_id', empData.user_id)
        .eq('company_id', company.id)
        .gte('attendance_date', thirtyDaysAgo);
      const rows = data ?? [];
      setAttendanceSummary({
        present: rows.filter(r => r.status === 'present').length,
        absent: rows.filter(r => r.status === 'absent').length,
        late: rows.filter(r => r.status === 'late').length,
      });
    }

    setLoading(false);
  };

  const resolveRecorderId = async (): Promise<string | null> => {
    if (!currentUser?.id || !company?.id) return null;
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('company_id', company.id)
      .maybeSingle();
    return data?.id ?? null;
  };

  const handleAddDocument = async () => {
    if (!company?.id || !docTitle.trim()) {
      toast.error('Document title is required');
      return;
    }
    setSubmittingDoc(true);
    const uploadedBy = await resolveRecorderId();
    const { error } = await supabase.from('employee_documents').insert({
      company_id: company.id,
      employee_id: employeeId,
      document_type: docType,
      title: docTitle.trim(),
      file_url: docUrl.trim() || null,
      uploaded_by: uploadedBy,
    });
    setSubmittingDoc(false);
    if (error) {
      toast.error('Failed to add document');
      return;
    }
    toast.success('Document added');
    setDocTitle(''); setDocUrl(''); setDocType('other');
    setDocDialogOpen(false);
    loadAll();
  };

  const handleAddHistory = async () => {
    if (!company?.id || !effectiveDate) {
      toast.error('Effective date is required');
      return;
    }
    setSubmittingHistory(true);
    const recordedBy = await resolveRecorderId();
    const { error } = await supabase.from('employee_employment_history').insert({
      company_id: company.id,
      employee_id: employeeId,
      event_type: eventType,
      effective_date: effectiveDate,
      previous_job_title: employee?.job_title ?? null,
      previous_department_id: employee?.department_id ?? null,
      previous_salary: employee?.salary ?? null,
      previous_status: employee?.employment_status ?? null,
      reason: reason.trim() || null,
      recorded_by: recordedBy,
    });
    setSubmittingHistory(false);
    if (error) {
      toast.error('Failed to record event');
      return;
    }
    toast.success('Employment event recorded');
    setEffectiveDate(''); setReason(''); setEventType('promotion');
    setHistoryDialogOpen(false);
    loadAll();
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Employee Not Found" breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Employees', href: '/hr/employees' }, { label: 'Not Found' }]} />
        <EmptyState title="Employee not found" description="This employee doesn't exist or you don't have access to view them." />
      </div>
    );
  }

  const canRequestActions = isAdmin || hasPermission('hr.employee_requests.manage');

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.first_name} ${employee.last_name}`}
        description={employee.job_title || 'Employee Profile'}
        breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Employees', href: '/hr/employees' }, { label: `${employee.first_name} ${employee.last_name}` }]}
      >
        {canRequestActions && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild><Link href={`/hr/employee-requests?employee=${employeeId}&type=confirmation`}>Start Confirmation</Link></Button>
            <Button size="sm" variant="outline" asChild><Link href={`/hr/employee-requests?employee=${employeeId}&type=promotion`}>Submit Promotion</Link></Button>
            <Button size="sm" variant="outline" asChild><Link href={`/hr/employee-requests?employee=${employeeId}&type=transfer`}>Submit Transfer</Link></Button>
          </div>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-lg font-bold">
              {getInitials(`${employee.first_name} ${employee.last_name}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{employee.first_name} {employee.last_name}</h2>
              <StatusBadge status={employee.employment_status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.job_title || '—'} · {employee.departments?.name ?? 'No department'}</p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              {employee.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{employee.email}</span>}
              {employee.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{employee.phone}</span>}
              {employee.branches?.name && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{employee.branches.name}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          {canDocumentsView && <TabsTrigger value="documents">Documents</TabsTrigger>}
          {canAttendance && <TabsTrigger value="attendance">Attendance</TabsTrigger>}
          {canLeave && <TabsTrigger value="leave">Leave</TabsTrigger>}
          {canHistoryView && <TabsTrigger value="career">Career History</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Employee #</p><p className="text-sm font-semibold">{employee.employee_number ?? '—'}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Hire Date</p><p className="text-sm font-semibold">{employee.hire_date ? formatDate(employee.hire_date) : '—'}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Employment Type</p><p className="text-sm font-semibold capitalize">{employee.employment_type?.replace(/_/g, ' ') ?? '—'}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Manager</p><p className="text-sm font-semibold">{employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : '—'}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Probation End</p><p className="text-sm font-semibold">{employee.probation_end_date ? formatDate(employee.probation_end_date) : '—'}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Branch</p><p className="text-sm font-semibold">{employee.branches?.name ?? '—'}</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-500">Date of Birth</p><p className="font-medium">{employee.date_of_birth ? formatDate(employee.date_of_birth) : '—'}</p></div>
              <div><p className="text-xs text-gray-500">Gender</p><p className="font-medium capitalize">{employee.gender ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">Nationality</p><p className="font-medium">{employee.nationality ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">National ID</p><p className="font-medium">{employee.national_id ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">Address</p><p className="font-medium">{[employee.address, employee.city, employee.state, employee.country].filter(Boolean).join(', ') || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Emergency Contact</p><p className="font-medium">{employee.emergency_contact_name ?? '—'} {employee.emergency_contact_phone ? `(${employee.emergency_contact_phone})` : ''}</p></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="mt-4">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-500">Department</p><p className="font-medium">{employee.departments?.name ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">Job Title</p><p className="font-medium">{employee.job_title ?? '—'}</p></div>
              <div><p className="text-xs text-gray-500">Employment Status</p><StatusBadge status={employee.employment_status} /></div>
              <div><p className="text-xs text-gray-500">Pay Frequency</p><p className="font-medium capitalize">{employee.pay_frequency ?? '—'}</p></div>
              {(isAdmin || hasPermission('hr.payroll.view')) && (
                <div><p className="text-xs text-gray-500">Salary</p><p className="font-medium">{employee.salary ? formatCurrency(employee.salary) : '—'}</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canDocumentsView && (
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2"><FileText className="h-4 w-4" />Documents</CardTitle>
                {canDocumentsManage && (
                  <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Document</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Document Type</Label>
                          <Select value={docType} onValueChange={setDocType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DOCUMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Title *</Label><Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Signed Employment Contract" /></div>
                        <div className="space-y-2"><Label>File URL</Label><Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Link to stored file" /></div>
                        <Button className="w-full" onClick={handleAddDocument} disabled={submittingDoc}>{submittingDoc ? 'Saving…' : 'Save Document'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <EmptyState icon={<Upload className="h-8 w-8" />} title="No documents yet" description="Personnel documents added for this employee will appear here." />
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-gray-500">{DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label ?? doc.document_type} · {formatDate(doc.created_at)}</p>
                        </div>
                        {doc.file_url && <Button size="sm" variant="outline" asChild><a href={doc.file_url} target="_blank" rel="noreferrer">View</a></Button>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canAttendance && (
          <TabsContent value="attendance" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Attendance (Last 30 Days)</CardTitle></CardHeader>
              <CardContent>
                {!employee.user_id ? (
                  <EmptyState title="No linked user account" description="This employee record isn't linked to a login account, so attendance can't be tracked yet." />
                ) : attendanceSummary ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg"><p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{attendanceSummary.present}</p><p className="text-xs text-gray-500">Present</p></div>
                    <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg"><p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{attendanceSummary.late}</p><p className="text-xs text-gray-500">Late</p></div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg"><p className="text-2xl font-bold text-red-700 dark:text-red-400">{attendanceSummary.absent}</p><p className="text-xs text-gray-500">Absent</p></div>
                  </div>
                ) : (
                  <EmptyState title="No attendance records" description="No attendance has been recorded for this employee in the last 30 days." />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canLeave && (
          <TabsContent value="leave" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Calendar className="h-4 w-4" />Leave History</CardTitle></CardHeader>
              <CardContent>
                {leaveRequests.length === 0 ? (
                  <EmptyState title="No leave requests" description="This employee hasn't submitted any leave requests yet." />
                ) : (
                  <div className="space-y-2">
                    {leaveRequests.map(lr => (
                      <div key={lr.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{lr.leave_types?.name ?? 'Leave'}</p>
                          <p className="text-xs text-gray-500">{formatDate(lr.start_date)} – {formatDate(lr.end_date)} · {lr.days_requested} day(s)</p>
                        </div>
                        <StatusBadge status={lr.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canHistoryView && (
          <TabsContent value="career" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Career History</CardTitle>
                {canHistoryManage && (
                  <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Record Event</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Record Employment Event</DialogTitle></DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Event Type</Label>
                          <Select value={eventType} onValueChange={setEventType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Effective Date *</Label><Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Reason / Notes</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this event being recorded?" /></div>
                        <p className="text-xs text-gray-500">This captures the employee's current job title, department, salary, and status as the "before" state automatically.</p>
                        <Button className="w-full" onClick={handleAddHistory} disabled={submittingHistory}>{submittingHistory ? 'Saving…' : 'Save Event'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <EmptyState icon={<Briefcase className="h-8 w-8" />} title="No history recorded" description="Promotions, transfers, confirmations, and other career events will appear here." />
                ) : (
                  <div className="space-y-3">
                    {history.map(h => {
                      const changes: string[] = [];
                      if (h.new_department?.name && h.new_department?.name !== h.previous_department?.name) changes.push(`${h.previous_department?.name ?? '—'} → ${h.new_department.name}`);
                      if (h.new_branch?.name && h.new_branch?.name !== h.previous_branch?.name) changes.push(`${h.previous_branch?.name ?? '—'} → ${h.new_branch.name}`);
                      if (h.new_job_title && h.new_job_title !== h.previous_job_title) changes.push(`${h.previous_job_title ?? '—'} → ${h.new_job_title}`);
                      if ((isAdmin || hasPermission('hr.payroll.view')) && h.new_salary != null && h.new_salary !== h.previous_salary) {
                        changes.push(`${h.previous_salary ? formatCurrency(h.previous_salary) : '—'} → ${formatCurrency(h.new_salary)}`);
                      }
                      if (h.new_status && h.new_status !== h.previous_status) changes.push(`${h.previous_status ?? '—'} → ${h.new_status}`);
                      return (
                        <div key={h.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="capitalize">{h.event_type.replace(/_/g, ' ')}</Badge>
                              <span className="text-xs text-gray-500">{formatDate(h.effective_date)}</span>
                              {h.recorded_by_employee && <span className="text-xs text-gray-400">by {h.recorded_by_employee.first_name} {h.recorded_by_employee.last_name}</span>}
                            </div>
                            {changes.length > 0 && <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{changes.join(' · ')}</p>}
                            {h.reason && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{h.reason}</p>}
                          </div>
                        </div>
                      );
                    })}
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
