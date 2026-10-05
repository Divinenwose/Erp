'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { exportExcel, ExcelSheet } from '@/lib/excel-export';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, Briefcase, Building2, Download, FolderKanban, Package, ShoppingCart, Users } from 'lucide-react';

const chartColors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#06B6D4'];

export default function ReportsPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canFinance = isAdmin || hasPermission('finance.reports.view');
  const canHR = isAdmin || hasPermission('hr.employees.view');
  const canCRM = isAdmin || hasPermission('crm.pipeline.view');
  const canProcurement = isAdmin || hasPermission('procurement.reports.view');
  const canInventory = isAdmin || hasPermission('inventory.products.view');
  const canProjects = isAdmin || hasPermission('projects.view');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);

  const loadReports = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const results = await Promise.all([
      canFinance ? supabase.from('invoices').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canFinance ? supabase.from('expenses').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canHR ? supabase.from('employees').select('id, employee_number, first_name, last_name, department_id, job_title, employment_type, employment_status, hire_date, manager_id, departments(name)').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canHR ? supabase.from('departments').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canCRM ? supabase.from('leads').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canProcurement ? supabase.from('purchase_requests').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canProjects ? supabase.from('projects').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canInventory ? supabase.from('products').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
      canInventory ? supabase.from('stock_movements').select('*').eq('company_id', company.id) : Promise.resolve({ data: [], error: null }),
    ]);
    const failedIndex = results.findIndex(result => result.error);
    if (failedIndex !== -1) {
      toast.error('Could not load all report data. Refresh and try again.');
      setLoading(false);
      return;
    }
    setInvoices(results[0].data ?? []);
    setExpenses(results[1].data ?? []);
    setEmployees(results[2].data ?? []);
    setDepartments(results[3].data ?? []);
    setLeads(results[4].data ?? []);
    setPurchaseRequests(results[5].data ?? []);
    setProjects(results[6].data ?? []);
    setProducts(results[7].data ?? []);
    setStockMovements(results[8].data ?? []);
    setLoading(false);
  }, [company?.id, canFinance, canHR, canCRM, canProcurement, canProjects, canInventory]);

  useEffect(() => {
    if (!company?.id) return;
    void loadReports();
    const channel = supabase.channel(`reports-overview-${company.id}`);
    [
      'invoices', 'expenses', 'employees', 'departments', 'leads',
      'purchase_requests', 'projects', 'products', 'stock_movements',
    ].forEach(table => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `company_id=eq.${company.id}`,
      }, () => { void loadReports(); });
    });
    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        toast.error('Live report updates are unavailable. Refresh the page to load current data.');
      }
    });
    return () => { void supabase.removeChannel(channel); };
  }, [company?.id, loadReports]);

  const monthlyRevenue = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (11 - index));
    const monthKey = date.toISOString().slice(0, 7);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      revenue: invoices
        .filter(invoice => invoice.status === 'paid' && invoice.issue_date?.slice(0, 7) === monthKey)
        .reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0),
      expenses: expenses
        .filter(expense => expense.status === 'approved' && expense.expense_date?.slice(0, 7) === monthKey)
        .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
    };
  }), [invoices, expenses]);
  const salesByStatus = useMemo(() => {
    const counts = leads.reduce<Record<string, number>>((total, lead) => {
      const status = lead.status || 'Unspecified';
      total[status] = (total[status] ?? 0) + 1;
      return total;
    }, {});
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: chartColors[index % chartColors.length],
    }));
  }, [leads]);

  const currentYear = new Date().getFullYear();
  const annualRevenue = invoices
    .filter(invoice => invoice.status === 'paid' && invoice.issue_date?.slice(0, 4) === String(currentYear))
    .reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0);
  const annualExpenses = expenses
    .filter(expense => expense.status === 'approved' && expense.expense_date?.slice(0, 4) === String(currentYear))
    .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const netMargin = annualRevenue > 0 ? ((annualRevenue - annualExpenses) / annualRevenue) * 100 : 0;
  const pendingRequests = purchaseRequests.filter(request => request.status === 'pending').length;

  const departmentHeadcount = departments.map(department => ({
    department: department.name,
    employees: employees.filter(employee => employee.department_id === department.id).length,
  })).filter(department => department.employees > 0);

  const sheets: ExcelSheet[] = [
    ...(canFinance ? [
      { name: 'Invoices', rows: invoices },
      { name: 'Expenses', rows: expenses },
    ] : []),
    ...(canHR ? [
      { name: 'Employees', rows: employees },
      { name: 'Departments', rows: departments },
    ] : []),
    ...(canCRM ? [{ name: 'Leads', rows: leads }] : []),
    ...(canProcurement ? [{ name: 'Purchase Requests', rows: purchaseRequests }] : []),
    ...(canProjects ? [{ name: 'Projects', rows: projects }] : []),
    ...(canInventory ? [
      { name: 'Products', rows: products },
      { name: 'Stock Movements', rows: stockMovements },
    ] : []),
  ];

  const reportCards = [
    { title: 'Financial Reports', description: 'Financial statements, revenue, and expense data', icon: Building2, href: '/finance/reports', visible: canFinance },
    { title: 'HR Operations', description: 'Workforce, lifecycle, and HR reports', icon: Users, href: '/hr/reports', visible: canHR },
    { title: 'Sales Performance', description: 'Lead pipeline and customer records', icon: Briefcase, href: '/crm', visible: canCRM },
    { title: 'Procurement Report', description: 'Purchase request, vendor, and order reports', icon: ShoppingCart, href: '/procurement/reports', visible: canProcurement },
    { title: 'Inventory Report', description: 'Product stock and movement records', icon: Package, href: '/inventory', visible: canInventory },
    { title: 'Project Status', description: 'Current project and delivery records', icon: FolderKanban, href: '/projects', visible: canProjects },
  ].filter(report => report.visible);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Live company reporting based on current department records" breadcrumbs={[{ label: 'Reports' }]}>
        <Button variant="outline" onClick={() => exportExcel('company-reports', sheets)} disabled={loading || !sheets.length}>
          <Download className="h-4 w-4 mr-2" />Export All Excel
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canFinance && <KPICard title="Annual Revenue" value={formatCurrency(annualRevenue)} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
        {canFinance && <KPICard title="Net Profit Margin" value={`${netMargin.toFixed(1)}%`} icon={<BarChart3 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />}
        {canHR && <KPICard title="Active Employees" value={employees.filter(employee => employee.employment_status === 'active').length} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />}
        {canProcurement && <KPICard title="Pending Purchase Requests" value={pendingRequests} icon={<ShoppingCart className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {reportCards.map(report => (
          <Link key={report.title} href={report.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <report.icon className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{report.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{report.description}</p>
            <span className="mt-3 inline-flex text-xs font-medium text-blue-600">Open department reports</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {canFinance && (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="text-sm font-semibold">Revenue & Expenses (Last 12 Months)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyRevenue}>
                  <defs><linearGradient id="reportsRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={value => formatCurrency(value)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#reportsRevenue)" strokeWidth={2} name="Paid Invoices" />
                  <Area type="monotone" dataKey="expenses" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.12} strokeWidth={2} name="Approved Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        {canCRM && (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="text-sm font-semibold">Leads by Current Status</CardTitle></CardHeader>
            <CardContent>
              {salesByStatus.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={salesByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={78} dataKey="value" nameKey="name">
                      {salesByStatus.map(item => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center text-sm text-gray-500">No lead records yet.</p>}
            </CardContent>
          </Card>
        )}
        {canHR && (
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="text-sm font-semibold">Headcount by Department</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={departmentHeadcount}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="employees" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
