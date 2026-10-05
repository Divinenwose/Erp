'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { exportExcel, ExcelSheet } from '@/lib/excel-export';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';

type ReportSection = {
  title: string;
  permission: string;
  table: string;
  select: string;
  sheet: string;
};

const reportSections: ReportSection[] = [
  { title: 'Employees', permission: 'hr.employees.view', table: 'employees', select: 'id, employee_number, first_name, last_name, email, phone, department_id, branch_id, job_title, employment_type, employment_status, hire_date, termination_date, manager_id, created_at, updated_at, departments(name), branches(name)', sheet: 'Employees' },
  { title: 'Departments', permission: 'hr.departments.view', table: 'departments', select: '*', sheet: 'Departments' },
  { title: 'Attendance', permission: 'hr.attendance.view', table: 'attendance', select: '*, employees(first_name, last_name, employee_number, departments(name))', sheet: 'Attendance' },
  { title: 'Leave requests', permission: 'hr.leave.view', table: 'leave_requests', select: '*, employees(first_name, last_name, employee_number, departments(name)), leave_types(name)', sheet: 'Leave Requests' },
  { title: 'Payroll items', permission: 'hr.payroll.view', table: 'payroll_items', select: '*, employees(first_name, last_name, employee_number, job_title, departments(name)), payroll_runs(period_start, period_end, pay_date, status)', sheet: 'Payroll Items' },
  { title: 'Payroll runs', permission: 'hr.payroll.view', table: 'payroll_runs', select: '*', sheet: 'Payroll Runs' },
  { title: 'Position requisitions', permission: 'hr.recruitment.view', table: 'job_requisitions', select: '*, departments(name)', sheet: 'Requisitions' },
  { title: 'Vacancies', permission: 'hr.recruitment.view', table: 'vacancies', select: '*, departments(name), branches(name)', sheet: 'Vacancies' },
  { title: 'Candidates', permission: 'hr.recruitment.view', table: 'candidates', select: '*, vacancies(position_title)', sheet: 'Candidates' },
  { title: 'Interviews', permission: 'hr.recruitment.view', table: 'interviews', select: '*, candidates(first_name, last_name), vacancies(position_title)', sheet: 'Interviews' },
  { title: 'Job offers', permission: 'hr.recruitment.view', table: 'job_offers', select: '*, candidates(first_name, last_name), vacancies(position_title)', sheet: 'Job Offers' },
  { title: 'Onboarding tasks', permission: 'hr.onboarding.view', table: 'onboarding_tasks', select: '*, employees:employee_id(first_name, last_name, employee_number), responsible:responsible_employee_id(first_name, last_name)', sheet: 'Onboarding' },
  { title: 'Performance reviews', permission: 'hr.performance.view', table: 'performance_reviews', select: '*, employees:employee_id(first_name, last_name, employee_number), reviewer:reviewer_id(first_name, last_name)', sheet: 'Performance' },
  { title: 'Training courses', permission: 'hr.training.view', table: 'training_courses', select: '*', sheet: 'Training Courses' },
  { title: 'Training enrollments', permission: 'hr.training.view', table: 'training_enrollments', select: '*, employees(first_name, last_name, employee_number), training_courses(title, category)', sheet: 'Training Enrollments' },
  { title: 'Employee lifecycle requests', permission: 'hr.employee_requests.view', table: 'employee_requests', select: '*, employees:employee_id(first_name, last_name, employee_number), current_department:current_department_id(name), new_department:new_department_id(name)', sheet: 'Employee Requests' },
];

export default function HRReportsPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const [reports, setReports] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);
  const canViewEmployees = isAdmin || hasPermission('hr.employees.view');
  const canViewDepartments = isAdmin || hasPermission('hr.departments.view');
  const canViewAttendance = isAdmin || hasPermission('hr.attendance.view');
  const canViewLeave = isAdmin || hasPermission('hr.leave.view');
  const canViewPayroll = isAdmin || hasPermission('hr.payroll.view');
  const canViewRecruitment = isAdmin || hasPermission('hr.recruitment.view');
  const canViewOnboarding = isAdmin || hasPermission('hr.onboarding.view');
  const canViewPerformance = isAdmin || hasPermission('hr.performance.view');
  const canViewTraining = isAdmin || hasPermission('hr.training.view');
  const canViewEmployeeRequests = isAdmin || hasPermission('hr.employee_requests.view');

  const visibleSections = useMemo(
    () => reportSections.filter(section => isAdmin || (
      (section.permission === 'hr.employees.view' && canViewEmployees) ||
      (section.permission === 'hr.departments.view' && canViewDepartments) ||
      (section.permission === 'hr.attendance.view' && canViewAttendance) ||
      (section.permission === 'hr.leave.view' && canViewLeave) ||
      (section.permission === 'hr.payroll.view' && canViewPayroll) ||
      (section.permission === 'hr.recruitment.view' && canViewRecruitment) ||
      (section.permission === 'hr.onboarding.view' && canViewOnboarding) ||
      (section.permission === 'hr.performance.view' && canViewPerformance) ||
      (section.permission === 'hr.training.view' && canViewTraining) ||
      (section.permission === 'hr.employee_requests.view' && canViewEmployeeRequests)
    )),
    [isAdmin, canViewEmployees, canViewDepartments, canViewAttendance, canViewLeave, canViewPayroll, canViewRecruitment, canViewOnboarding, canViewPerformance, canViewTraining, canViewEmployeeRequests],
  );

  const loadReports = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const results = await Promise.all(visibleSections.map(section =>
      supabase.from(section.table).select(section.select).eq('company_id', company.id),
    ));
    const failedIndex = results.findIndex(result => result.error);
    if (failedIndex !== -1) {
      toast.error(`Could not load the ${visibleSections[failedIndex].title.toLowerCase()} report`);
      setLoading(false);
      return;
    }

    setReports(Object.fromEntries(
      visibleSections.map((section, index) => [section.sheet, results[index].data ?? []]),
    ));
    setLoading(false);
  }, [company?.id, visibleSections]);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const sheets: ExcelSheet[] = visibleSections.map(section => ({
    name: section.sheet,
    rows: reports[section.sheet] ?? [],
  }));

  const exportReport = () => {
    if (!sheets.length) {
      toast.error('You do not have access to any HR report sections');
      return;
    }
    exportExcel('hr-operations-report', sheets);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Operations Report"
        description="A complete workbook of workforce, attendance, leave, payroll, recruitment, onboarding, performance, and training records you are authorized to view."
        breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Reports' }]}
      >
        <Button variant="outline" onClick={() => void loadReports()} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
        <Button onClick={exportReport} disabled={loading || !visibleSections.length}>
          <Download className="h-4 w-4 mr-2" />Export Excel
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />Report contents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visibleSections.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSections.map(section => (
                <div key={section.sheet} className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {loading ? 'Loading records…' : `${reports[section.sheet]?.length ?? 0} records`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No HR report sections are available for your account.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
