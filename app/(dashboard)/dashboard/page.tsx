'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getDepartmentLandingPath } from '@/lib/department-access';
import { formatCurrency, formatDate, formatDateRelative } from '@/lib/utils';
import KPICard from '@/components/common/KPICard';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, DollarSign, ShoppingCart,
  FileText, CheckCircle2, Clock, Building2, FolderKanban, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { toast } from 'sonner';

interface DashboardStats {
  employees: number; customers: number; projects: number; vendors: number;
  pendingLeaves: number; openInvoices: number; pendingPOs: number;
  totalRevenue: number; activeLeads: number;
}

interface RecentActivity { id: string; type: string; title: string; subtitle: string; time: string; status: string; }

const chartColors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#06B6D4', '#F97316'];

export default function DashboardPage() {
  const { profile, company, departmentName, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const router = useRouter();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();

  // Company-wide, cross-department data below is only appropriate for
  // admins or for users whose department has no dedicated overview page.
  // Everyone else gets redirected to their department's own landing page
  // (reusing the existing pages — no new queries, no duplicated dashboards).
  const departmentLandingPath = isAdmin ? null : getDepartmentLandingPath(departmentName);

  useEffect(() => {
    if (departmentLandingPath) {
      router.replace(departmentLandingPath);
    }
  }, [departmentLandingPath, router]);

  // Section-level RBAC: only fetch/display data the current user is actually
  // permitted to see, reusing the same permission strings already defined in
  // config/navigation.ts for the corresponding pages.
  const canHR = isAdmin || hasPermission('hr.employees.view');
  const canLeave = isAdmin || hasPermission('hr.leave.view');
  const canFinance = isAdmin || hasPermission('finance.invoices.view');
  const canCRM = isAdmin || hasPermission('crm.customers.view');
  const canLeads = isAdmin || hasPermission('crm.leads.view');
  const canPipeline = isAdmin || hasPermission('crm.pipeline.view');
  const canProjects = isAdmin || hasPermission('projects.view');
  const canProcurement = isAdmin || hasPermission('procurement.vendors.view');
  const canPurchaseRequests = isAdmin || hasPermission('procurement.requests.view');
  const canInventory = isAdmin || hasPermission('inventory.products.view');
  const canAdministration = isAdmin || hasPermission('facilities.view');
  const canMarketing = isAdmin || hasPermission('marketing.reports.view');
  const canIT = isAdmin || hasPermission('it.reports.view');
  const canOperations = isAdmin || hasPermission('operations.reports.view');
  const canLogistics = isAdmin || hasPermission('logistics.view');

  const [stats, setStats] = useState<DashboardStats>({
    employees: 0, customers: 0, projects: 0, vendors: 0,
    pendingLeaves: 0, openInvoices: 0, pendingPOs: 0,
    totalRevenue: 0, activeLeads: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number; expenses: number }[]>([]);
  const [pipelineData, setPipelineData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [deptSpend, setDeptSpend] = useState<{ dept: string; budget: number; spent: number }[]>([]);
  const [departmentActivity, setDepartmentActivity] = useState<{ department: string; records: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip the company-wide data load entirely for users being redirected to
    // their department's own page — avoids firing queries whose results will
    // never be shown.
    if (!company?.id || departmentLandingPath) return;
    const id = company.id;

    const loadAll = async () => {
      const [
        empRes, custRes, projRes, vendRes,
        leaveRes, invoiceRes, prRes,
        revenueRes, expenseRes, leadRes,
        recentEmpRes, deptRes, invoiceCountRes, expenseCountRes, inventoryRes,
        assetsRes, workOrdersRes, marketingRes, itRes, operationsRes,
        logisticsRoutesRes, deliveriesRes, logisticsIncidentsRes, logisticsRequestsRes,
      ] = await Promise.all([
        canHR ? supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('employment_status', 'active') : Promise.resolve({ count: 0 } as any),
        canCRM ? supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'active') : Promise.resolve({ count: 0 } as any),
        canProjects ? supabase.from('projects').select('id', { count: 'exact', head: true }).eq('company_id', id).in('status', ['in_progress', 'planning']) : Promise.resolve({ count: 0 } as any),
        canProcurement ? supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'active') : Promise.resolve({ count: 0 } as any),
        canLeave ? supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending') : Promise.resolve({ count: 0 } as any),
        canFinance ? supabase.from('invoices').select('id, total_amount, status', { count: 'exact' }).eq('company_id', id).in('status', ['pending', 'overdue']) : Promise.resolve({ data: [] } as any),
        canPurchaseRequests ? supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending') : Promise.resolve({ count: 0 } as any),
        canFinance ? supabase.from('invoices').select('total_amount, issue_date').eq('company_id', id).eq('status', 'paid') : Promise.resolve({ data: [] } as any),
        canFinance ? supabase.from('expenses').select('amount, expense_date, employees(department_id)').eq('company_id', id).eq('status', 'approved') : Promise.resolve({ data: [] } as any),
        canPipeline || canLeads ? supabase.from('leads').select('status').eq('company_id', id) : Promise.resolve({ data: [] } as any),
        canHR ? supabase.from('employees').select('id, first_name, last_name, job_title, hire_date, avatar_url').eq('company_id', id).eq('employment_status', 'active').order('hire_date', { ascending: false }).limit(4) : Promise.resolve({ data: [] } as any),
        isAdmin ? supabase.from('departments').select('id, name, budget').eq('company_id', id).eq('is_active', true).order('name') : Promise.resolve({ data: [] } as any),
        canFinance ? supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canFinance ? supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canInventory ? supabase.from('products').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canAdministration ? supabase.from('assets').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canAdministration ? supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canMarketing ? supabase.from('marketing_campaigns').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canIT ? supabase.from('it_tickets').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canOperations ? supabase.from('operations_records').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canLogistics ? supabase.from('logistics_routes').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canLogistics ? supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canLogistics ? supabase.from('logistics_incidents').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canLogistics ? supabase.from('logistics_requests').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
      ]);

      const departmentQueryErrors = [
        { department: 'Inventory', error: inventoryRes.error },
        { department: 'Administration', error: assetsRes.error ?? workOrdersRes.error },
        { department: 'Marketing', error: marketingRes.error },
        { department: 'IT', error: itRes.error },
        { department: 'Operations', error: operationsRes.error },
        { department: 'Logistics', error: logisticsRoutesRes.error ?? deliveriesRes.error ?? logisticsIncidentsRes.error ?? logisticsRequestsRes.error },
      ].filter(result => result.error);
      if (departmentQueryErrors.length > 0) {
        toast.error(`Could not load dashboard data for: ${departmentQueryErrors.map(result => result.department).join(', ')}.`);
      }

      const invoices = revenueRes.data ?? [];
      const expenses = expenseRes.data ?? [];
      const yearStart = `${new Date().getFullYear()}-01-01`;
      const totalRevenue = invoices
        .filter((invoice: any) => invoice.issue_date >= yearStart)
        .reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount ?? 0), 0);
      const openInvoices = (invoiceRes.data ?? []).length;
      const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - (5 - index));
        return { key: date.toISOString().slice(0, 7), label: date.toLocaleDateString('en-US', { month: 'short' }) };
      });
      setRevenueData(months.map(month => ({
        month: month.label,
        revenue: invoices
          .filter((invoice: any) => invoice.issue_date?.slice(0, 7) === month.key)
          .reduce((sum: number, invoice: any) => sum + Number(invoice.total_amount ?? 0), 0),
        expenses: expenses
          .filter((expense: any) => expense.expense_date?.slice(0, 7) === month.key)
          .reduce((sum: number, expense: any) => sum + Number(expense.amount ?? 0), 0),
      })));
      const leadsByStatus: Record<string, number> = {};
      (leadRes.data ?? []).forEach((lead: any) => {
        const status = lead.status || 'Unspecified';
        leadsByStatus[status] = (leadsByStatus[status] ?? 0) + 1;
      });
      setPipelineData(Object.entries(leadsByStatus).map(([name, value], index) => ({
        name,
        value,
        color: chartColors[index % chartColors.length],
      })));
      const departmentExpenses = expenses.reduce((totals: Record<string, number>, expense: any) => {
        const departmentId = expense.employees?.department_id;
        if (departmentId) totals[departmentId] = (totals[departmentId] ?? 0) + Number(expense.amount ?? 0);
        return totals;
      }, {});
      setDeptSpend((deptRes.data ?? []).map((department: any) => ({
        dept: department.name,
        budget: Number(department.budget ?? 0),
        spent: departmentExpenses[department.id] ?? 0,
      })));
      setDepartmentActivity([
        ...(canHR ? [{ department: 'HR', records: empRes.count ?? 0 }] : []),
        ...(canFinance ? [{ department: 'Finance', records: (invoiceCountRes.count ?? 0) + (expenseCountRes.count ?? 0) }] : []),
        ...(canCRM || canLeads ? [{ department: 'Sales & CRM', records: (custRes.count ?? 0) + (leadRes.data ?? []).length }] : []),
        ...(canProjects ? [{ department: 'Projects', records: projRes.count ?? 0 }] : []),
        ...(canProcurement || canPurchaseRequests ? [{ department: 'Procurement', records: (vendRes.count ?? 0) + (prRes.count ?? 0) }] : []),
        ...(canInventory ? [{ department: 'Inventory', records: inventoryRes.count ?? 0 }] : []),
        ...(canAdministration ? [{ department: 'Administration', records: (assetsRes.count ?? 0) + (workOrdersRes.count ?? 0) }] : []),
        ...(canMarketing ? [{ department: 'Marketing', records: marketingRes.count ?? 0 }] : []),
        ...(canIT ? [{ department: 'IT', records: itRes.count ?? 0 }] : []),
        ...(canOperations ? [{ department: 'Operations', records: operationsRes.count ?? 0 }] : []),
        ...(canLogistics ? [{ department: 'Logistics', records: (logisticsRoutesRes.count ?? 0) + (deliveriesRes.count ?? 0) + (logisticsIncidentsRes.count ?? 0) + (logisticsRequestsRes.count ?? 0) }] : []),
      ]);

      setStats({
        employees: empRes.count ?? 0,
        customers: custRes.count ?? 0,
        projects: projRes.count ?? 0,
        vendors: vendRes.count ?? 0,
        pendingLeaves: leaveRes.count ?? 0,
        openInvoices,
        pendingPOs: prRes.count ?? 0,
        totalRevenue,
        activeLeads: (leadRes.data ?? []).filter((lead: any) => ['new', 'contacted', 'qualified'].includes(lead.status)).length,
      });

      setRecentEmployees(recentEmpRes.data ?? []);

      // Recent invoices
      if (canFinance) {
        const { data: invData } = await supabase.from('invoices')
          .select('*, customers(name)')
          .eq('company_id', id)
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentInvoices(invData ?? []);
      }

      // Build activity feed from multiple sources — each only queried/included
      // if the viewer is permitted to see that department's activity.
      const [leavesData, projectsData, prsData] = await Promise.all([
        canLeave ? supabase.from('leave_requests').select('id, status, created_at, employees(first_name, last_name)').eq('company_id', id).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] } as any),
        canProjects ? supabase.from('projects').select('id, name, status, updated_at').eq('company_id', id).order('updated_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] } as any),
        canPurchaseRequests ? supabase.from('purchase_requests').select('id, title, status, created_at').eq('company_id', id).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] } as any),
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

    void loadAll();
    const channel = supabase.channel(`company-dashboard-${id}`);
    [
      'employees', 'departments', 'attendance', 'attendance_records', 'leave_requests',
      'payroll_items', 'payroll_runs', 'invoices', 'expenses', 'budgets', 'customers',
      'leads', 'projects', 'vendors', 'purchase_requests', 'purchase_orders', 'products',
      'inventory_items', 'stock_movements', 'job_requisitions', 'vacancies', 'candidates',
      'training_courses', 'training_enrollments', 'performance_reviews', 'onboarding_tasks',
      'employee_requests', 'assets', 'work_orders', 'marketing_campaigns', 'campaign_metrics',
      'ad_performance', 'marketing_leads', 'marketing_events', 'marketing_content', 'press_releases', 'pr_coverage',
      'it_tickets', 'it_assets', 'it_licenses', 'it_records', 'operations_records', 'operations_requests',
      'logistics_routes', 'logistics_incidents', 'logistics_documents', 'logistics_communications',
      'logistics_requests', 'logistics_approval_history', 'deliveries', 'warehouses',
    ].forEach(table => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `company_id=eq.${id}`,
      }, () => { void loadAll(); });
    });
    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        toast.error('Live dashboard updates are unavailable. Refresh the page to load current data.');
      }
    });
    return () => { void supabase.removeChannel(channel); };
  }, [company?.id, departmentLandingPath, canHR, canLeave, canFinance, canCRM, canLeads, canPipeline, canProjects, canProcurement, canPurchaseRequests, canInventory, canAdministration, canMarketing, canIT, canOperations, canLogistics, isAdmin]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Being redirected to a department-specific landing page — render nothing
  // rather than flashing this company-wide view first.
  if (departmentLandingPath) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${profile?.first_name ?? 'there'}`}
        description={`${company?.name ?? 'Your workspace'} · ${formatDate(new Date())}`}
        breadcrumbs={[{ label: 'Dashboard' }]}
      >
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Live department data
        </div>
      </PageHeader>

      {/* Primary KPIs — each card only shown if the viewer has the underlying permission */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canFinance && <KPICard title="Total Revenue (YTD)" value={formatCurrency(stats.totalRevenue)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
        {canHR && <KPICard title="Active Employees" value={stats.employees} icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />}
        {canCRM && <KPICard title="Active Customers" value={stats.customers} icon={<Building2 className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />}
        {canProjects && <KPICard title="Active Projects" value={stats.projects} icon={<FolderKanban className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />}
      </div>

      {/* Alert counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending Leaves', count: stats.pendingLeaves, icon: Clock, color: 'amber', href: '/hr/leave', visible: canLeave },
          { label: 'Open Invoices', count: stats.openInvoices, icon: FileText, color: 'blue', href: '/finance/invoices', visible: canFinance },
          { label: 'Pending POs', count: stats.pendingPOs, icon: ShoppingCart, color: 'violet', href: '/procurement/requests', visible: canPurchaseRequests },
          { label: 'Active Leads', count: stats.activeLeads, icon: Target, color: 'emerald', href: '/crm/leads', visible: canLeads },
        ].filter(item => item.visible).map(item => (
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
        {canFinance && <Card className="lg:col-span-2 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue vs Expenses (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200} minHeight={200}>
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
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#colRev)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#F59E0B" fill="url(#colExp)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>}

        {canPipeline && <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Pipeline</CardTitle>
            <CardDescription>{pipelineData.reduce((sum, item) => sum + item.value, 0)} leads by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={120} minHeight={120}>
              <PieChart>
                <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
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
        </Card>}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dept spend — cross-department by nature, admin-only */}
        {isAdmin && <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Department Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deptSpend.map(d => {
              const pct = d.budget > 0 ? Math.round((d.spent / d.budget) * 100) : 0;
              return (
                <div key={d.dept}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{d.dept}</span>
                    <span className={`font-semibold ${pct > 85 ? 'text-red-600' : pct > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.budget > 0 ? `${pct}%` : 'No budget'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct > 85 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>{formatCurrency(d.spent)}</span>
                    <span>{formatCurrency(d.budget)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>}

        {isAdmin && <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Company-wide Department Records</CardTitle>
            <CardDescription>Live record counts across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240} minHeight={240}>
              <BarChart data={departmentActivity} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="records" name="Records" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>}

        {/* Recent invoices */}
        {canFinance && <Card className="dark:bg-gray-900 dark:border-gray-800">
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
        </Card>}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
