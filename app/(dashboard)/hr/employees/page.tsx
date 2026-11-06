'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, Download, UserCheck, DollarSign, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { requestEmployeeAccess } from '@/app/actions/employee-access';
import { changeEmployeeEmploymentStatus } from '@/app/actions/employees';

const empSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  job_title: z.string().optional(),
  department_id: z.string().optional(),
  branch_id: z.string().optional(),
  manager_id: z.string().optional(),
  employment_type: z.string().default('full_time'),
  employment_status: z.string().default('active'),
  hire_date: z.string().optional(),
  salary: z.coerce.number().optional(),
  gender: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});
type EmpForm = z.infer<typeof empSchema>;

export default function EmployeesPage() {
  const { company, session, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canRequestActions = isSuperAdmin() || isCompanyAdmin() || hasPermission('hr.employee_requests.manage');
  const canRequestAccess = hasPermission('hr.access_requests.create');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [accessRequestEmployee, setAccessRequestEmployee] = useState<any | null>(null);
  const [accessRequestReason, setAccessRequestReason] = useState('');
  const [submittingAccessRequest, setSubmittingAccessRequest] = useState(false);
  const [importingEmployees, setImportingEmployees] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EmpForm>({
    resolver: zodResolver(empSchema),
    defaultValues: { employment_type: 'full_time', employment_status: 'active' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [empRes, deptRes, branchRes] = await Promise.all([
      supabase.from('employees').select('*, departments(name)').eq('company_id', company.id).order('first_name'),
      supabase.from('departments').select('id, name').eq('company_id', company.id),
      supabase.from('branches').select('id, name').eq('company_id', company.id).eq('is_active', true),
    ]);
    setEmployees(empRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (emp: any) => {
    setEditEmployee(emp);
    reset({
      first_name: emp.first_name, last_name: emp.last_name,
      email: emp.email ?? '', phone: emp.phone ?? '',
      date_of_birth: emp.date_of_birth ?? '', address: emp.address ?? '',
      job_title: emp.job_title ?? '', department_id: emp.department_id ?? undefined,
      branch_id: emp.branch_id ?? undefined, manager_id: emp.manager_id ?? undefined,
      employment_type: emp.employment_type, employment_status: emp.employment_status,
      hire_date: emp.hire_date ?? '', salary: emp.salary ?? undefined, gender: emp.gender ?? '',
      emergency_contact_name: emp.emergency_contact_name ?? '',
      emergency_contact_phone: emp.emergency_contact_phone ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EmpForm) => {
    if (!company?.id) return;
    if (editEmployee) {
      const { employment_status, ...profileData } = data;
      const { error } = await supabase.from('employees').update({ ...profileData, updated_at: new Date().toISOString() }).eq('id', editEmployee.id);
      if (error) { toast.error('Failed to update'); return; }
      if (employment_status !== editEmployee.employment_status) {
        if (!session?.access_token) {
          toast.error('Your session expired. Sign in again before changing employment status.');
          await load();
          return;
        }
        const statusResult = await changeEmployeeEmploymentStatus({
          access_token: session.access_token,
          employee_id: editEmployee.id,
          employment_status,
        });
        if (!statusResult.success) {
          toast.error(statusResult.error || 'Failed to update employment status');
          await load();
          return;
        }
      }
      toast.success('Employee updated');
    } else {
      const { error } = await supabase.from('employees').insert({ ...data, company_id: company.id, salary_currency: company.currency ?? 'USD' });
      if (error) { toast.error(error.message || 'Failed to create employee'); return; }
      toast.success('Employee added');
    }
    reset(); setEditEmployee(null); setDialogOpen(false); load();
  };

  const submitAccessRequest = async () => {
    if (!accessRequestEmployee || !session?.access_token) {
      toast.error('Your session expired. Sign in again before requesting access.');
      return;
    }
    setSubmittingAccessRequest(true);
    const result = await requestEmployeeAccess({
      access_token: session.access_token,
      employee_id: accessRequestEmployee.id,
      request_reason: accessRequestReason,
    });
    setSubmittingAccessRequest(false);
    if (!result.success) {
      toast.error(result.error || 'Unable to submit the access request');
      return;
    }
    toast.success('Access request submitted for Super Admin approval');
    setAccessRequestEmployee(null);
    setAccessRequestReason('');
    load();
  };

  const handleEmployeeImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !company?.id) return;
    setImportingEmployees(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error('The selected file has no worksheet');
      const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '', raw: true });
      if (!sourceRows.length) throw new Error('The selected worksheet has no employee rows');
      if (sourceRows.length > 500) throw new Error('Import a maximum of 500 employees at a time');

      const rows = sourceRows.map((sourceRow, index) => {
        const values = Object.fromEntries(Object.entries(sourceRow).map(([key, value]) => [
          key.trim().toLowerCase().replace(/[\s-]+/g, '_'),
          value,
        ]));
        const firstName = String(values.first_name ?? '').trim();
        const lastName = String(values.last_name ?? '').trim();
        if (!firstName || !lastName) throw new Error(`Row ${index + 2} requires first_name and last_name`);

        const departmentValue = String(values.department_id ?? values.department ?? '').trim();
        const department = departments.find(item =>
          item.id === departmentValue || item.name.toLowerCase() === departmentValue.toLowerCase()
        );
        if (departmentValue && !department) throw new Error(`Row ${index + 2} has an unknown department`);

        const salaryValue = values.salary;
        const salary = salaryValue === '' || salaryValue == null ? null : Number(salaryValue);
        if (salary !== null && !Number.isFinite(salary)) throw new Error(`Row ${index + 2} has an invalid salary`);
        const email = String(values.email ?? '').trim();
        if (email && !z.string().email().safeParse(email).success) throw new Error(`Row ${index + 2} has an invalid email`);

        return {
          company_id: company.id,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          phone: String(values.phone ?? '').trim() || null,
          job_title: String(values.job_title ?? '').trim() || null,
          department_id: department?.id ?? null,
          employment_type: String(values.employment_type ?? 'full_time').trim().toLowerCase().replace(/[\s-]+/g, '_'),
          employment_status: String(values.employment_status ?? 'active').trim().toLowerCase().replace(/[\s-]+/g, '_'),
          hire_date: values.hire_date instanceof Date
            ? values.hire_date.toISOString().slice(0, 10)
            : String(values.hire_date ?? '').trim() || null,
          date_of_birth: values.date_of_birth instanceof Date
            ? values.date_of_birth.toISOString().slice(0, 10)
            : String(values.date_of_birth ?? '').trim() || null,
          gender: String(values.gender ?? '').trim() || null,
          address: String(values.address ?? '').trim() || null,
          emergency_contact_name: String(values.emergency_contact_name ?? '').trim() || null,
          emergency_contact_phone: String(values.emergency_contact_phone ?? '').trim() || null,
          salary,
          salary_currency: company.currency ?? 'USD',
        };
      });

      const employeeTypes = new Set(['full_time', 'part_time', 'contract', 'intern']);
      const employmentStatuses = new Set(['active', 'inactive', 'suspended', 'resigned', 'terminated', 'on_leave']);
      const invalidType = rows.findIndex(row => !employeeTypes.has(row.employment_type));
      if (invalidType >= 0) throw new Error(`Row ${invalidType + 2} has an unsupported employment_type`);
      const invalidStatus = rows.findIndex(row => !employmentStatuses.has(row.employment_status));
      if (invalidStatus >= 0) throw new Error(`Row ${invalidStatus + 2} has an unsupported employment_status`);

      const emailSet = new Set<string>();
      for (const row of rows) {
        const normalizedEmail = row.email?.toLowerCase();
        if (!normalizedEmail) continue;
        if (emailSet.has(normalizedEmail)) throw new Error(`The file contains duplicate email ${row.email}`);
        emailSet.add(normalizedEmail);
      }

      const { error } = await supabase.from('employees').insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`${rows.length} employees imported`);
      await load();
    } catch (error) {
      console.error('[HR] Employee import failed:', error);
      toast.error(error instanceof Error ? error.message : 'Employee import failed');
    } finally {
      setImportingEmployees(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    if (!session?.access_token) {
      toast.error('Your session expired. Sign in again before terminating an employee.');
      setDeleting(false);
      setDeleteId(null);
      return;
    }
    const result = await changeEmployeeEmploymentStatus({
      access_token: session.access_token,
      employee_id: deleteId,
      employment_status: 'terminated',
    });
    if (!result.success) { toast.error(result.error || 'Failed to terminate employee'); } else { toast.success('Employee terminated'); load(); }
    setDeleteId(null); setDeleting(false);
  };

  const active = employees.filter(e => e.employment_status === 'active').length;
  const totalPayroll = employees.reduce((a, e) => a + (e.salary ?? 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Employee', sortable: true,
      cell: (row) => (
        <Link href={`/hr/employees/${row.id}`} className="flex items-center gap-3 hover:underline">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold">
              {getInitials(`${row.first_name} ${row.last_name}`)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.first_name} {row.last_name}</p>
            <p className="text-xs text-gray-400">{row.employee_number ?? '—'}</p>
          </div>
        </Link>
      ),
    },
    { key: 'job_title', header: 'Job Title', sortable: true, cell: (row) => <span className="text-sm">{row.job_title ?? '—'}</span> },
    { key: 'department', header: 'Department', cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.departments?.name ?? '—'}</span> },
    { key: 'hire_date', header: 'Hire Date', sortable: true, cell: (row) => <span className="text-sm text-gray-500">{row.hire_date ? formatDate(row.hire_date) : '—'}</span> },
    { key: 'employment_type', header: 'Type', cell: (row) => <span className="text-xs capitalize text-gray-600 dark:text-gray-400">{row.employment_type?.replace(/_/g, ' ')}</span> },
    { key: 'salary', header: 'Salary', sortable: true, cell: (row) => <span className="text-sm font-medium">{row.salary ? formatCurrency(row.salary) : '—'}</span> },
    { key: 'employment_status', header: 'Status', cell: (row) => <StatusBadge status={row.employment_status} /> },
    {
      key: 'actions', header: '', headerClassName: 'w-10',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/hr/employees/${row.id}`}><Eye className="h-4 w-4 mr-2" />View Profile</Link></DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
            {canRequestAccess && !row.user_id && row.employment_status === 'active' && (
              <DropdownMenuItem onClick={() => setAccessRequestEmployee(row)}>
                <UserCheck className="h-4 w-4 mr-2" />Request account access
              </DropdownMenuItem>
            )}
            {canRequestActions && (
              <>
                <DropdownMenuItem asChild><Link href={`/hr/employee-requests?employee=${row.id}&type=confirmation`}>Start Confirmation</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href={`/hr/employee-requests?employee=${row.id}&type=promotion`}>Submit Promotion</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href={`/hr/employee-requests?employee=${row.id}&type=transfer`}>Submit Transfer</Link></DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 mr-2" />Terminate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage your complete workforce" breadcrumbs={[{ label: 'HR' }, { label: 'Employees' }]}>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importingEmployees}
          onClick={() => document.getElementById('employee-import')?.click()}
        >
          {importingEmployees ? 'Importing...' : 'Import Employees'}
        </Button>
        <input
          id="employee-import"
          className="hidden"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleEmployeeImport}
        />
        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditEmployee(null); reset(); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editEmployee ? 'Edit Employee' : 'New Employee'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input className="mt-1" {...register('first_name')} />{errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}</div>
                <div><Label>Last Name *</Label><Input className="mt-1" {...register('last_name')} />{errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}</div>
                <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                <div><Label>Date of Birth</Label><Input className="mt-1" type="date" {...register('date_of_birth')} /></div>
                <div><Label>Address</Label><Input className="mt-1" {...register('address')} /></div>
                <div><Label>Job Title</Label><Input className="mt-1" {...register('job_title')} /></div>
                <div>
                  <Label>Department</Label>
                  <Controller name="department_id" control={control} render={({ field }) => (
                    <Select onValueChange={value => field.onChange(value === 'none' ? undefined : value)} value={field.value ?? 'none'}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Controller name="branch_id" control={control} render={({ field }) => (
                    <Select onValueChange={value => field.onChange(value === 'none' ? undefined : value)} value={field.value ?? 'none'}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {branches.map(branch => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Reporting Manager</Label>
                  <Controller name="manager_id" control={control} render={({ field }) => (
                    <Select onValueChange={value => field.onChange(value === 'none' ? undefined : value)} value={field.value ?? 'none'}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No manager</SelectItem>
                        {employees.filter(employee => employee.id !== editEmployee?.id).map(manager => (
                          <SelectItem key={manager.id} value={manager.id}>{manager.first_name} {manager.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Controller name="employment_type" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Controller name="employment_status" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="resigned">Resigned</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Hire Date</Label><Input className="mt-1" type="date" {...register('hire_date')} /></div>
                <div><Label>Salary (Annual)</Label><Input className="mt-1" type="number" placeholder="85000" {...register('salary')} /></div>
                <div><Label>Emergency Contact</Label><Input className="mt-1" {...register('emergency_contact_name')} /></div>
                <div><Label>Emergency Contact Phone</Label><Input className="mt-1" {...register('emergency_contact_phone')} /></div>
                <div>
                  <Label>Gender</Label>
                  <Controller name="gender" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditEmployee(null); reset(); }}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editEmployee ? 'Update Employee' : 'Add Employee'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Employees" value={employees.length} icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} change={3.2} changeLabel="this month" icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Full-Time" value={employees.filter(e => e.employment_type === 'full_time').length} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Payroll" value={formatCurrency(totalPayroll)} icon={<DollarSign className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        data={employees}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search employees..."
        searchKeys={['first_name', 'last_name', 'email', 'job_title', 'employee_number']}
        pageSize={15}
        emptyTitle="No employees yet"
        emptyDescription="Add your first employee to get started"
        emptyAction={<Button onClick={() => setDialogOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Employee</Button>}
        onExport={() => toast.info('Export functionality available in Professional plan')}
      />

      <Dialog
        open={!!accessRequestEmployee}
        onOpenChange={open => {
          if (!open && !submittingAccessRequest) {
            setAccessRequestEmployee(null);
            setAccessRequestReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Request account access</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">
            Request login access for {accessRequestEmployee?.first_name} {accessRequestEmployee?.last_name}.
            A Super Admin must approve the role and invitation.
          </p>
          <div className="space-y-2">
            <Label htmlFor="access-request-reason">Business justification</Label>
            <Textarea
              id="access-request-reason"
              value={accessRequestReason}
              onChange={event => setAccessRequestReason(event.target.value)}
              placeholder="Explain why this employee needs ERP access"
              maxLength={1000}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAccessRequestEmployee(null)} disabled={submittingAccessRequest}>Cancel</Button>
            <Button onClick={submitAccessRequest} disabled={submittingAccessRequest}>
              {submittingAccessRequest ? 'Submitting...' : 'Submit request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Terminate Employee?"
        description="This will mark the employee as terminated. Their historical records will be preserved. You can reactivate them later."
        confirmLabel="Terminate"
      />
    </div>
  );
}
