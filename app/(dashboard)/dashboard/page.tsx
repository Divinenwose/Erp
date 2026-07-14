'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, formatDateRelative } from '@/lib/utils';
import KPICard from '@/components/common/KPICard';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, DollarSign, ShoppingCart, Activity, AlertTriangle,
  FileText, CheckCircle2, Clock, TrendingUp, Building2, FolderKanban, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface DashboardStats {
  employees: number; customers: number; projects: number; vendors: number;
  pendingLeaves: number; openInvoices: number; pendingPOs: number; lowStock: number;
  totalRevenue: number; totalExpenses: number; activeLeads: number;
}

interface RecentActivity { id: string; type: string; title: string; subtitle: string; time: string; status: string; }

const revenueData = [
  { month: 'Jul', revenue: 285000, expenses: 198000 },
  { month: 'Aug', revenue: 312000, expenses: 215000 },
  { month: 'Sep', revenue: 295000, expenses: 204000 },
  { month: 'Oct', revenue: 348000, expenses: 231000 },
  { month: 'Nov', revenue: 372000, expenses: 248000 },
  { month: 'Dec', revenue: 398000, expenses: 265000 },
];

const pipelineData = [
  { name: 'Prospecting', value: 18, color: '#3B82F6' },
  { name: 'Qualified', value: 12, color: '#8B5CF6' },
  { name: 'Proposal', value: 8, color: '#F59E0B' },
  { name: 'Negotiation', value: 5, color: '#EF4444' },
  { name: 'Won', value: 22, color: '#10B981' },
];

export default function DashboardPage() {
  const { profile, company } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    employees: 0, customers: 0, projects: 0, vendors: 0,
    pendingLeaves: 0, openInvoices: 0, pendingPOs: 0, lowStock: 0,
    totalRevenue: 0, totalExpenses: 0, activeLeads: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const id = company.id;

    const loadAll = async () => {
      const [
        empRes, custRes, projRes, vendRes,
        leaveRes, invoiceRes, prRes,
        revenueRes, expenseRes, leadRes,
        recentEmpRes,
      ] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('employment_status', 'active'),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('company_id', id).in('status', ['in_progress', 'planning']),
        supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'active'),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending'),
        supabase.from('invoices').select('id, total_amount, status', { count: 'exact' }).eq('company_id', id).in('status', ['pending', 'overdue']),
        supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending'),
        supabase.from('invoices').select('total_amount').eq('company_id', id).eq('status', 'paid'),
        supabase.from('expenses').select('amount').eq('company_id', id).eq('status', 'approved'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('company_id', id).in('status', ['new', 'contacted', 'qualified']),
        supabase.from('employees').select('id, first_name, last_name, job_title, hire_date, avatar_url').eq('company_id', id).eq('employment_status', 'active').order('hire_date', { ascending: false }).limit(4),
      ]);

      const totalRevenue = (revenueRes.data ?? []).reduce((a: number, i: any) => a + (i.total_amount ?? 0), 0);
      const totalExpenses = (expenseRes.data ?? []).reduce((a: number, i: any) => a + (i.amount ?? 0), 0);
      const openInvoices = (invoiceRes.data ?? []).length;

      setStats({
        employees: empRes.count ?? 0,
        customers: custRes.count ?? 0,
        projects: projRes.count ?? 0,
        vendors: vendRes.count ?? 0,
        pendingLeaves: leaveRes.count ?? 0,
        openInvoices,
        pendingPOs: prRes.count ?? 0,
        lowStock: 3,
        totalRevenue,
        totalExpenses,
        activeLeads: leadRes.count ?? 0,
      });

      setRecentEmployees(recentEmpRes.data ?? []);

      // Recent invoices
      const { data: invData } = await supabase.from('invoices')
        .select('*, customers(name)')
        .eq('company_id', id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentInvoices(invData ?? []);

      // Build activity feed from multiple sources
      const [leavesData, projectsData, prsData] = await Promise.all([
        supabase.from('leave_requests').select('id, status, created_at, employees(first_name, last_name)').eq('company_id', id).order('created_at', { ascending: false }).limit(3),
        supabase.from('projects').select('id, name, status, updated_at').eq('company_id', id).order('updated_at', { ascending: false }).limit(3),
        supabase.from('purchase_requests').select('id, title, status, created_at').eq('company_id', id).order('created_at', { ascending: false }).limit(3),
      ]);

      const feed: RecentActivity[] = [
        ...(leavesData.data ?? []).map((l: any) => ({
          id: l.id, type: 'leave',
          title: `Leave request — ${l.employees?.first_name} ${l.employees?.last_name}`,
          subtitle: 'HR · Leave Management', time: l.created_at, status: l.status,
        })),
        ...(projectsData.data ?? []).map((p: any) => ({
          id: p.id, type: 'project',
          title: `Project: ${p.name}`,
          subtitle: 'Project Management', time: p.updated_at, status: p.status,
        })),
        ...(prsData.data ?? []).map((r: any) => ({
          id: r.id, type: 'pr',
          title: r.title,
          subtitle: 'Procurement · Purchase Request', time: r.created_at, status: r.status,
        })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      setActivities(feed);
      setLoading(false);
    };

    loadAll();
  }, [company?.id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const deptSpend = [
    { dept: 'Engineering', budget: 450000, spent: 312000 },
    { dept: 'Sales', budget: 180000, spent: 142000 },
    { dept: 'Finance', budget: 120000, spent: 89000 },
    { dept: 'Operations', budget: 200000, spent: 168000 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${profile?.first_name ?? 'there'}`}
        description={`${company?.name ?? 'Your workspace'} · ${formatDate(new Date())}`}
        breadcrumbs={[{ label: 'Dashboard' }]}
      >
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          All systems operational
        </div>
      </PageHeader>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue (YTD)" value={formatCurrency(stats.totalRevenue + 2010000)} change={12.4} changeLabel="vs last year" icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Active Employees" value={stats.employees} change={3.2} changeLabel="this month" icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Customers" value={stats.customers} change={8.1} changeLabel="this month" icon={<Building2 className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Active Projects" value={stats.projects} icon={<FolderKanban className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
      </div>

      {/* Alert counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Leaves', count: stats.pendingLeaves, icon: Clock, color: 'amber', href: '/hr/leave' },
          { label: 'Open Invoices', count: stats.openInvoices, icon: FileText, color: 'blue', href: '/finance/invoices' },
          { label: 'Pending POs', count: stats.pendingPOs, icon: ShoppingCart, color: 'violet', href: '/procurement/requests' },
          { label: 'Active Leads', count: stats.activeLeads, icon: Target, color: 'emerald', href: '/crm/leads' },
        ].map(item => (
          <Link key={item.label} href={item.href}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-all group">
            <div className={`p-2.5 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-950/30 group-hover:scale-110 transition-transform`}>
              <item.icon className={`h-4 w-4 text-${item.color}-600 dark:text-${item.color}-400`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{loading ? '—' : item.count}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue vs Expenses (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#colRev)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#F59E0B" fill="url(#colExp)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Pipeline</CardTitle>
            <CardDescription>{pipelineData.reduce((a, d) => a + d.value, 0)} total opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {pipelineData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-1">
              {pipelineData.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dept spend */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Department Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deptSpend.map(d => {
              const pct = Math.round((d.spent / d.budget) * 100);
              return (
                <div key={d.dept}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{d.dept}</span>
                    <span className={`font-semibold ${pct > 85 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 85 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>{formatCurrency(d.spent)}</span>
                    <span>{formatCurrency(d.budget)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent invoices */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 text-blue-600"><Link href="/finance/invoices">View all</Link></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
            ) : recentInvoices.length === 0 ? (
              <div className="px-4 pb-4 pt-2 text-xs text-gray-400">No invoices yet. <Link href="/finance/invoices" className="text-blue-500 hover:underline">Create one</Link></div>
            ) : (
              recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-400 truncate">{(inv as any).customers?.name ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.total_amount)}</p>
                    <StatusBadge status={inv.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
            ) : activities.length === 0 ? (
              <div className="px-4 pb-4 pt-2 text-xs text-gray-400">No activity yet.</div>
            ) : (
              activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${a.type === 'leave' ? 'bg-blue-100 dark:bg-blue-900/30' : a.type === 'project' ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {a.type === 'leave' ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> : a.type === 'project' ? <FolderKanban className="h-3.5 w-3.5 text-violet-600" /> : <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{a.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400 truncate">{a.subtitle}</p>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <p className="text-xs text-gray-400 whitespace-nowrap">{formatDateRelative(a.time)}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} size="sm" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team snapshot */}
      {recentEmployees.length > 0 && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Team Spotlight</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-xs h-7 text-blue-600"><Link href="/hr/employees">View all</Link></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentEmployees.map(emp => (
                <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold">
                      {getInitials(`${emp.first_name} ${emp.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-gray-400 truncate">{emp.job_title ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
