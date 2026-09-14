'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Calendar, CreditCard, TrendingUp, Award, BarChart3, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HROverviewPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, onLeave: 0, newThisMonth: 0, avgTenure: 0 });
  const [headcountData, setHeadcountData] = useState<{ dept: string; count: number }[]>([]);
  const [leaveData, setLeaveData] = useState<{ month: string; requests: number }[]>([]);

  useEffect(() => {
    if (!company?.id) return;

    const loadOverview = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date();
      monthStart.setDate(1);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);

      const [employeesRes, departmentsRes, leaveRes] = await Promise.all([
        supabase.from('employees').select('id, department_id, hire_date').eq('company_id', company.id).eq('employment_status', 'active'),
        supabase.from('departments').select('id, name').eq('company_id', company.id),
        supabase.from('leave_requests').select('start_date, end_date, created_at').eq('company_id', company.id).gte('created_at', sixMonthsAgo.toISOString()),
      ]);

      const employees = employeesRes.data ?? [];
      const departments = departmentsRes.data ?? [];
      const leaveRequests = leaveRes.data ?? [];
      const departmentNames = Object.fromEntries(departments.map(department => [department.id, department.name]));
      const headcount = employees.reduce<Record<string, number>>((counts, employee) => {
        const name = departmentNames[employee.department_id] ?? 'Unassigned';
        counts[name] = (counts[name] ?? 0) + 1;
        return counts;
      }, {});
      const activeLeave = leaveRequests.filter(request => request.start_date <= today && request.end_date >= today).length;
      const newThisMonth = employees.filter(employee => employee.hire_date && employee.hire_date >= monthStart.toISOString().slice(0, 10)).length;
      const tenureYears = employees
        .filter(employee => employee.hire_date)
        .map(employee => (Date.now() - new Date(employee.hire_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const averageTenure = tenureYears.length ? tenureYears.reduce((sum, years) => sum + years, 0) / tenureYears.length : 0;
      const monthLabels = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - index), 1);
        return { key: date.toISOString().slice(0, 7), label: date.toLocaleDateString('en-US', { month: 'short' }) };
      });

      setStats({ total: employees.length, onLeave: activeLeave, newThisMonth, avgTenure: averageTenure });
      setHeadcountData(Object.entries(headcount).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count));
      setLeaveData(monthLabels.map(month => ({
        month: month.label,
        requests: leaveRequests.filter(request => request.created_at?.slice(0, 7) === month.key).length,
      })));
      setLoading(false);
    };

    loadOverview();
  }, [company?.id]);

  const modules = [
    { title: 'Employees', description: 'Manage workforce records', icon: Users, href: '/hr/employees', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'hr.employees.view' },
    { title: 'Leave Management', description: 'Track leave requests', icon: Calendar, href: '/hr/leave', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'hr.leave.view' },
    { title: 'Attendance', description: 'Monitor attendance records', icon: UserCheck, href: '/hr/attendance', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'hr.attendance.view' },
    { title: 'Payroll', description: 'Process employee payroll', icon: CreditCard, href: '/hr/payroll', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'hr.payroll.view' },
    { title: 'Performance', description: 'Reviews and appraisals', icon: Award, href: '/hr/performance', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600', permission: 'hr.performance.view' },
    { title: 'Training', description: 'Learning and development', icon: BookOpen, href: '/hr/training', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600', permission: 'hr.training.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  return (
    <div className="space-y-6">
      <PageHeader title="Human Resources" description="Manage your complete workforce lifecycle" breadcrumbs={[{ label: 'HR' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/hr/employees">View Employees</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Employees" value={stats.total} icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="On Leave Today" value={stats.onLeave} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="New This Month" value={stats.newThisMonth} icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Avg Tenure" value={`${stats.avgTenure.toFixed(1)} yrs`} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="text-sm font-semibold">Headcount by Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={headcountData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="dept" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="text-sm font-semibold">Leave Requests Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leaveData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="requests" fill="#10B981" radius={[4, 4, 0, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
