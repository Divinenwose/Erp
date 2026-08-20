'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

const empSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  department_id: z.string().optional(),
  employment_type: z.string().default('full_time'),
  employment_status: z.string().default('active'),
  hire_date: z.string().optional(),
  salary: z.coerce.number().optional(),
  gender: z.string().optional(),
});
type EmpForm = z.infer<typeof empSchema>;

export default function EmployeesPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canRequestActions = isSuperAdmin() || isCompanyAdmin() || hasPermission('hr.employee_requests.manage');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<EmpForm>({
    resolver: zodResolver(empSchema),
    defaultValues: { employment_type: 'full_time', employment_status: 'active' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [empRes, deptRes] = await Promise.all([
      supabase.from('employees').select('*, departments(name)').eq('company_id', company.id).order('first_name'),
      supabase.from('departments').select('id, name').eq('company_id', company.id),
    ]);
    setEmployees(empRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (emp: any) => {
    setEditEmployee(emp);
    reset({
      first_name: emp.first_name, last_name: emp.last_name,
      email: emp.email ?? '', phone: emp.phone ?? '',
      job_title: emp.job_title ?? '', department_id: emp.department_id ?? undefined,
      employment_type: emp.employment_type, employment_status: emp.employment_status,
      hire_date: emp.hire_date ?? '', salary: emp.salary ?? undefined, gender: emp.gender ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: EmpForm) => {
    if (!company?.id) return;
    if (editEmployee) {
      const { error } = await supabase.from('employees').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editEmployee.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Employee updated');
    } else {
      const num = `EMP-${String(employees.length + 1).padStart(4, '0')}`;
      const { error } = await supabase.from('employees').insert({ ...data, company_id: company.id, employee_number: num, salary_currency: company.currency ?? 'USD' });
      if (error) { toast.error('Failed to create employee'); return; }
      toast.success('Employee added');
    }
    reset(); setEditEmployee(null); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('employees').update({ employment_status: 'terminated' }).eq('id', deleteId);
    if (error) { toast.error('Failed to terminate employee'); } else { toast.success('Employee terminated'); load(); }
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
                <div><Label>Job Title</Label><Input className="mt-1" {...register('job_title')} /></div>
                <div>
                  <Label>Department</Label>
                  <Controller name="department_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
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
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Hire Date</Label><Input className="mt-1" type="date" {...register('hire_date')} /></div>
                <div><Label>Salary (Annual)</Label><Input className="mt-1" type="number" placeholder="85000" {...register('salary')} /></div>
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
