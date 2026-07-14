'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Calendar, CreditCard, TrendingUp, Award, BarChart3, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const headcountData = [
  { dept: 'Engineering', count: 24 },
  { dept: 'Sales', count: 18 },
  { dept: 'HR', count: 8 },
  { dept: 'Finance', count: 12 },
  { dept: 'Operations', count: 20 },
  { dept: 'Marketing', count: 10 },
];

const leaveData = [
  { month: 'Jul', requests: 12 },
  { month: 'Aug', requests: 18 },
  { month: 'Sep', requests: 9 },
  { month: 'Oct', requests: 14 },
  { month: 'Nov', requests: 11 },
  { month: 'Dec', requests: 22 },
];

export default function HROverviewPage() {
  const modules = [
    { title: 'Employees', description: 'Manage workforce records', icon: Users, href: '/hr/employees', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
    { title: 'Leave Management', description: 'Track leave requests', icon: Calendar, href: '/hr/leave', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
    { title: 'Attendance', description: 'Monitor attendance records', icon: UserCheck, href: '/hr/attendance', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
    { title: 'Payroll', description: 'Process employee payroll', icon: CreditCard, href: '/hr/payroll', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
    { title: 'Performance', description: 'Reviews and appraisals', icon: Award, href: '/hr/performance', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600' },
    { title: 'Training', description: 'Learning and development', icon: BookOpen, href: '/hr/training', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Human Resources" description="Manage your complete workforce lifecycle" breadcrumbs={[{ label: 'HR' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/hr/employees">View Employees</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Employees" value={92} change={3.2} changeLabel="this month" icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />
        <KPICard title="On Leave Today" value={7} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />
        <KPICard title="New This Month" value={4} change={33} changeLabel="vs last month" icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <KPICard title="Avg Tenure" value="2.8 yrs" icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" />
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
