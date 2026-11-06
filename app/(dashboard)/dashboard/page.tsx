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
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, DollarSign, ShoppingCart,
  FileText, CheckCircle2, Clock, Building2, FolderKanban, Target,
  Activity, ArrowUpRight, RefreshCw
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

interface RecentActivity { id: string; type: string; title: string; subtitle: string; time: string; status: string; href?: string; }
interface DepartmentUpdate { id: string; module: string; action: string; time: string; href: string; actor: string; }
interface DepartmentPulse { department: string; records: number; href: string; }
interface AttentionItem { label: string; count: number | null; href: string; detail: string; }

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
  const canMedia = isAdmin || hasPermission('media.view');
  const canManufacturing = isAdmin || hasPermission('manufacturing.view');
  const canQuality = isAdmin || hasPermission('quality.dashboard.view');
  const canInternalControl = isAdmin || hasPermission('internal_control.dashboard.view');

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
  const [departmentUpdates, setDepartmentUpdates] = useState<DepartmentUpdate[]>([]);
  const [departmentPulse, setDepartmentPulse] = useState<DepartmentPulse[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [financeDataError, setFinanceDataError] = useState(false);
  const [budgetDataError, setBudgetDataError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Skip the company-wide data load entirely for users being redirected to
    // their department's own page — avoids firing queries whose results will
    // never be shown.
    if (!company?.id || departmentLandingPath) return;
    const id = company.id;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yearStart = `${now.getFullYear()}-01-01`;
    const loadAll = async () => {
      const [
        empRes, custRes, projRes, vendRes,
        leaveRes, invoiceRes, prRes,
        revenueRes, expenseRes, leadRes,
        recentEmpRes, deptRes, invoiceCountRes, expenseCountRes, inventoryRes,
        assetsRes, workOrdersRes, marketingRes, itRes, operationsRes,
        logisticsRoutesRes, deliveriesRes, logisticsIncidentsRes, logisticsRequestsRes,
        mediaCampaignsRes, mediaRequestsRes, productionRunsRes, qualityInspectionsRes,
        qualityRecordsRes, internalControlRes, auditLogsRes,
        overdueInvoicesRes, overdueTasksRes, pendingAccessRes, openITTicketsRes, openQualityRecordsRes,
      ] = await Promise.all([
        canHR ? supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('employment_status', 'active') : Promise.resolve({ count: 0 } as any),
        canCRM ? supabase.from('customers').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'active') : Promise.resolve({ count: 0 } as any),
        canProjects ? supabase.from('projects').select('id', { count: 'exact', head: true }).eq('company_id', id).in('status', ['in_progress', 'planning']) : Promise.resolve({ count: 0 } as any),
        canProcurement ? supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'active') : Promise.resolve({ count: 0 } as any),
        canLeave ? supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending') : Promise.resolve({ count: 0 } as any),
        canFinance ? supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', id).in('status', ['sent', 'pending', 'partial', 'overdue']) : Promise.resolve({ count: 0 } as any),
        canPurchaseRequests ? supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending') : Promise.resolve({ count: 0 } as any),
        canFinance ? supabase.from('invoices').select('paid_amount, issue_date, status').eq('company_id', id).eq('invoice_type', 'sales').in('status', ['partial', 'paid', 'overdue']).gt('paid_amount', 0).gte('issue_date', yearStart) : Promise.resolve({ data: [] } as any),
        canFinance ? supabase.from('expenses').select('amount, expense_date, category, status, employees(department_id)').eq('company_id', id).in('status', ['approved', 'reimbursed']).gte('expense_date', yearStart) : Promise.resolve({ data: [] } as any),
        canPipeline || canLeads ? supabase.from('leads').select('status').eq('company_id', id) : Promise.resolve({ data: [] } as any),
        canHR ? supabase.from('employees').select('id, first_name, last_name, job_title, hire_date, avatar_url').eq('company_id', id).eq('employment_status', 'active').order('hire_date', { ascending: false }).limit(4) : Promise.resolve({ data: [] } as any),
        isAdmin ? supabase.from('budgets').select('id, department_id, category, budgeted_amount, fiscal_year, start_date, end_date, status, departments(name)').eq('company_id', id).eq('status', 'approved').lte('start_date', today).gte('end_date', today).order('start_date', { ascending: false }) : Promise.resolve({ data: [] } as any),
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
        canMedia ? supabase.from('media_campaigns').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canMedia ? supabase.from('media_requests').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canManufacturing ? supabase.from('production_runs').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canQuality ? supabase.from('quality_inspections').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canQuality ? supabase.from('quality_records').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        canInternalControl ? supabase.from('internal_control_records').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: 0 } as any),
        isAdmin ? supabase.from('audit_logs').select('id, module, action, created_at, user_id').eq('company_id', id).order('created_at', { ascending: false }).limit(12) : Promise.resolve({ data: [], error: null } as any),
        canFinance ? supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('invoice_type', 'sales').in('status', ['pending', 'partial', 'overdue']).lt('due_date', today) : Promise.resolve({ count: 0, error: null } as any),
        canProjects ? supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('company_id', id).lt('due_date', today).in('status', ['todo', 'in_progress', 'blocked', 'in_review']) : Promise.resolve({ count: 0, error: null } as any),
        isAdmin ? supabase.from('employee_access_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending') : Promise.resolve({ count: 0, error: null } as any),
        canIT ? supabase.from('it_tickets').select('id', { count: 'exact', head: true }).eq('company_id', id).not('status', 'in', '(resolved,closed)') : Promise.resolve({ count: 0, error: null } as any),
        canQuality ? supabase.from('quality_records').select('id', { count: 'exact', head: true }).eq('company_id', id).in('status', ['open', 'pending', 'under_review', 'in_progress', 'awaiting_verification', 'failed', 'non_compliant', 'reopened']) : Promise.resolve({ count: 0, error: null } as any),
      ]);

      const departmentQueryErrors = [
        { department: 'Inventory', error: inventoryRes.error },
        { department: 'Finance revenue and expenses', error: revenueRes.error ?? expenseRes.error },
        { department: 'Administration', error: assetsRes.error ?? workOrdersRes.error },
        { department: 'Marketing', error: marketingRes.error },
        { department: 'IT', error: itRes.error },
        { department: 'Operations', error: operationsRes.error },
        { department: 'Logistics', error: logisticsRoutesRes.error ?? deliveriesRes.error ?? logisticsIncidentsRes.error ?? logisticsRequestsRes.error },
        { department: 'Media', error: mediaCampaignsRes.error ?? mediaRequestsRes.error },
        { department: 'Manufacturing', error: productionRunsRes.error },
        { department: 'Quality', error: qualityInspectionsRes.error ?? qualityRecordsRes.error },
        { department: 'Legal & Internal Control', error: internalControlRes.error },
        { department: 'Finance budgets', error: deptRes.error },
        { department: 'Overdue invoices', error: overdueInvoicesRes.error },
        { department: 'Overdue tasks', error: overdueTasksRes.error },
        { department: 'Access requests', error: pendingAccessRes.error },
        { department: 'IT tickets', error: openITTicketsRes.error },
        { department: 'Quality records', error: openQualityRecordsRes.error },
      ].filter(result => result.error);
      if (departmentQueryErrors.length > 0) {
        toast.error(`Could not load dashboard data for: ${departmentQueryErrors.map(result => result.department).join(', ')}.`);
      }

      const invoices = revenueRes.data ?? [];
      const expenses = expenseRes.data ?? [];
      setFinanceDataError(Boolean(revenueRes.error || expenseRes.error));
      setBudgetDataError(Boolean(deptRes.error));
      const totalRevenue = invoices
        .reduce((sum: number, invoice: any) => sum + Number(invoice.paid_amount ?? 0), 0);
      const openInvoices = invoiceRes.count ?? 0;
      const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return {
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        };
      });
      setRevenueData(months.map(month => ({
        month: month.label,
        revenue: invoices
          .filter((invoice: any) => invoice.issue_date?.slice(0, 7) === month.key)
          .reduce((sum: number, invoice: any) => sum + Number(invoice.paid_amount ?? 0), 0),
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
      const currentBudgets = deptRes.data ?? [];
      setDeptSpend(currentBudgets.map((budget: any) => {
        const budgetStart = budget.start_date ?? `${budget.fiscal_year}-01-01`;
        const budgetEnd = budget.end_date ?? `${budget.fiscal_year}-12-31`;
        const budgetCategory = String(budget.category ?? '').trim().toLowerCase();
        const actualSpent = expenses.reduce((sum: number, expense: any) => {
          const expenseDepartmentId = expense.employees?.department_id;
          const expenseCategory = String(expense.category ?? '').trim().toLowerCase();
          const sameCategory = budgetCategory === expenseCategory;
          if (
            expenseDepartmentId === budget.department_id
            && expense.expense_date >= budgetStart
            && expense.expense_date <= budgetEnd
            && sameCategory
          ) return sum + Number(expense.amount ?? 0);
          return sum;
        }, 0);
        return {
          dept: `${(budget as any).departments?.name ?? 'Department'} · ${budget.category}`,
          budget: Number(budget.budgeted_amount ?? 0),
          spent: actualSpent,
        };
      }));
      setAttentionItems([
        ...(canFinance ? [{ label: 'Overdue receivables', count: overdueInvoicesRes.error ? null : overdueInvoicesRes.count ?? 0, href: '/finance/receivables', detail: 'Customer invoices past due' }] : []),
        ...(canProjects ? [{ label: 'Overdue tasks', count: overdueTasksRes.error ? null : overdueTasksRes.count ?? 0, href: '/projects/tasks', detail: 'Open tasks past their due date' }] : []),
        ...(isAdmin ? [{ label: 'Access requests', count: pendingAccessRes.error ? null : pendingAccessRes.count ?? 0, href: '/settings/access-requests', detail: 'Awaiting Super Admin review' }] : []),
        ...(canIT ? [{ label: 'Open IT tickets', count: openITTicketsRes.error ? null : openITTicketsRes.count ?? 0, href: '/it', detail: 'Unresolved service tickets' }] : []),
        ...(canQuality ? [{ label: 'Open quality issues', count: openQualityRecordsRes.error ? null : openQualityRecordsRes.count ?? 0, href: '/quality', detail: 'Records requiring follow-up' }] : []),
      ]);
      const departmentRoutes: Record<string, string> = {
        Administration: '/administration',
        'Human Resources': '/hr',
        'Finance & Accounts': '/finance',
        Marketing: '/marketing',
        Procurement: '/procurement',
        IT: '/it',
        Operations: '/operations',
        Logistics: '/logistics',
        'Sales & CRM': '/crm',
        Media: '/media',
        'Manufacturing & Warehouse': '/manufacturing',
        'Legal & Internal Control': '/internal-control',
        'Quality Control & Quality Assurance': '/quality',
        Inventory: '/inventory',
        Projects: '/projects',
      };
      setDepartmentPulse([
        ...(canAdministration ? [{ department: 'Administration', records: (assetsRes.count ?? 0) + (workOrdersRes.count ?? 0), href: departmentRoutes.Administration }] : []),
        ...(canHR ? [{ department: 'Human Resources', records: empRes.count ?? 0, href: departmentRoutes['Human Resources'] }] : []),
        ...(canFinance ? [{ department: 'Finance & Accounts', records: (invoiceCountRes.count ?? 0) + (expenseCountRes.count ?? 0), href: departmentRoutes['Finance & Accounts'] }] : []),
        ...(canMarketing ? [{ department: 'Marketing', records: marketingRes.count ?? 0, href: departmentRoutes.Marketing }] : []),
        ...(canProcurement || canPurchaseRequests ? [{ department: 'Procurement', records: (vendRes.count ?? 0) + (prRes.count ?? 0), href: departmentRoutes.Procurement }] : []),
        ...(canIT ? [{ department: 'IT', records: itRes.count ?? 0, href: departmentRoutes.IT }] : []),
        ...(canOperations ? [{ department: 'Operations', records: operationsRes.count ?? 0, href: departmentRoutes.Operations }] : []),
        ...(canLogistics ? [{ department: 'Logistics', records: (logisticsRoutesRes.count ?? 0) + (deliveriesRes.count ?? 0) + (logisticsIncidentsRes.count ?? 0) + (logisticsRequestsRes.count ?? 0), href: departmentRoutes.Logistics }] : []),
        ...(canCRM || canLeads ? [{ department: 'Sales & CRM', records: (custRes.count ?? 0) + (leadRes.data ?? []).length, href: departmentRoutes['Sales & CRM'] }] : []),
        ...(canMedia ? [{ department: 'Media', records: (mediaCampaignsRes.count ?? 0) + (mediaRequestsRes.count ?? 0), href: departmentRoutes.Media }] : []),
        ...(canManufacturing || canInventory ? [{ department: 'Manufacturing & Warehouse', records: (productionRunsRes.count ?? 0) + (inventoryRes.count ?? 0), href: departmentRoutes['Manufacturing & Warehouse'] }] : []),
        ...(canInternalControl ? [{ department: 'Legal & Internal Control', records: internalControlRes.count ?? 0, href: departmentRoutes['Legal & Internal Control'] }] : []),
        ...(canQuality ? [{ department: 'Quality Control & Quality Assurance', records: (qualityRecordsRes.count ?? 0) + (qualityInspectionsRes.count ?? 0), href: departmentRoutes['Quality Control & Quality Assurance'] }] : []),
        ...(canInventory ? [{ department: 'Inventory', records: inventoryRes.count ?? 0, href: departmentRoutes.Inventory }] : []),
        ...(canProjects ? [{ department: 'Projects', records: projRes.count ?? 0, href: departmentRoutes.Projects }] : []),
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
          subtitle: 'HR · Leave Management', time: l.created_at, status: l.status, href: '/hr/leave',
        })),
        ...(projectsData.data ?? []).map((p: any) => ({
          id: p.id, type: 'project',
          title: `Project: ${p.name}`,
          subtitle: 'Project Management', time: p.updated_at, status: p.status, href: '/projects',
        })),
        ...(prsData.data ?? []).map((r: any) => ({
          id: r.id, type: 'pr',
          title: r.title,
          subtitle: 'Procurement · Purchase Request', time: r.created_at, status: r.status, href: '/procurement/requests',
        })),
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

      setActivities(feed);
      if (isAdmin && !auditLogsRes.error) {
        const actorIds = Array.from(new Set((auditLogsRes.data ?? []).map((log: any) => log.user_id).filter(Boolean)));
        const { data: actorProfiles, error: actorProfilesError } = actorIds.length > 0
          ? await supabase.from('profiles').select('id, first_name, last_name').in('id', actorIds)
          : { data: [], error: null };
        if (actorProfilesError) console.error('[DASHBOARD] Could not resolve audit update actors:', actorProfilesError);
        const actorNames = new Map((actorProfiles ?? []).map(actor => [
          actor.id,
          `${actor.first_name ?? ''} ${actor.last_name ?? ''}`.trim(),
        ]));
        const moduleLinks: Record<string, string> = {
          hr: '/hr',
          hr_leave: '/hr/leave',
          hr_employee_requests: '/hr/employee-requests',
          finance: '/finance',
          invoices: '/finance/invoices',
          crm: '/crm',
          marketing: '/marketing',
          procurement: '/procurement',
          purchase_requests: '/procurement/requests',
          projects: '/projects',
          operations: '/operations',
          logistics: '/logistics',
          it: '/it',
          media: '/media',
          manufacturing: '/manufacturing',
          quality: '/quality',
          internal_control: '/internal-control',
          assets: '/administration/assets',
          departments: '/settings/departments',
          users: '/settings/users',
          roles: '/settings/roles',
        };
        setDepartmentUpdates((auditLogsRes.data ?? []).map((log: any) => ({
          id: log.id,
          module: String(log.module ?? 'system').replace(/[_-]+/g, ' '),
          action: String(log.action ?? 'updated').replace(/[_-]+/g, ' '),
          time: log.created_at,
          href: moduleLinks[log.module] ?? '/administration/audit-logs',
          actor: actorNames.get(log.user_id) || 'System',
        })));
      } else {
        setDepartmentUpdates([]);
      }
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
      'media_campaigns', 'media_requests', 'production_runs', 'quality_inspections',
      'quality_records', 'internal_control_records', 'audit_logs',
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
  }, [company?.id, departmentLandingPath, canHR, canLeave, canFinance, canCRM, canLeads, canPipeline, canProjects, canProcurement, canPurchaseRequests, canInventory, canAdministration, canMarketing, canIT, canOperations, canLogistics, canMedia, canManufacturing, canQuality, canInternalControl, isAdmin]);

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
        {canFinance && <KPICard title="Total Revenue (YTD)" value={financeDataError ? 'Unavailable' : formatCurrency(stats.totalRevenue, company?.currency)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
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

      {attentionItems.length > 0 && (
        <section className="space-y-3" aria-labelledby="attention-heading">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="attention-heading" className="text-sm font-semibold text-gray-900 dark:text-white">Needs attention</h2>
              <p className="text-xs text-gray-500">Live counts of overdue work and pending reviews</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {attentionItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-xl border border-gray-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-amber-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {loading ? '—' : item.count == null ? '—' : item.count.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-gray-500">{item.detail}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Company-wide Department Pulse</CardTitle>
              <CardDescription className="mt-1">Current record volumes across departments. Select a department to open its workspace.</CardDescription>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {departmentPulse.length} workspaces
            </span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 10 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
              </div>
            ) : departmentPulse.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No department data is available yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {departmentPulse.map(item => (
                  <Link
                    key={item.department}
                    href={item.href}
                    className="group rounded-xl border border-gray-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        <Activity className="h-4 w-4" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-gray-300 transition group-hover:text-blue-600" />
                    </div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">{item.records.toLocaleString()}</p>
                    <p className="mt-1 min-h-8 text-xs leading-4 text-gray-500 dark:text-gray-400">{item.department}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {canFinance && <Card className="lg:col-span-2 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue vs Expenses (Last 6 Months)</CardTitle>
            <CardDescription>
              Paid invoice amounts by issue date and approved or reimbursed expenses by expense date · {company?.currency ?? 'USD'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {financeDataError ? (
              <p className="py-12 text-center text-sm text-red-600">Financial chart data could not be loaded. Refresh to try again.</p>
            ) : (
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
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v, company?.currency)} />
                <Tooltip formatter={(v: number) => formatCurrency(v, company?.currency)} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#colRev)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#F59E0B" fill="url(#colExp)" strokeWidth={2} name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            )}
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
            <CardDescription>Approved or reimbursed expenses matched by the employee&apos;s current department, category, and budget period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetDataError ? (
              <p className="py-5 text-center text-sm text-red-600">Budget utilization could not be loaded. Refresh to try again.</p>
            ) : deptSpend.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-sm text-gray-500">No approved budgets are active today.</p>
                <Button variant="link" size="sm" asChild className="mt-1">
                  <Link href="/finance/budgets">Review budgets</Link>
                </Button>
              </div>
            ) : deptSpend.map(d => {
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
                    <span>Spent {formatCurrency(d.spent, company?.currency)}</span>
                    <span>Budget {formatCurrency(d.budget, company?.currency)}</span>
                  </div>
                </div>
              );
            })}
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
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.total_amount, company?.currency)}</p>
                    <StatusBadge status={inv.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>}

        {/* Cross-department audit updates for admins; authorized request feed for department users */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">{isAdmin ? 'Latest Department Updates' : 'Recent Activity'}</CardTitle>
                {isAdmin && <CardDescription className="mt-1">Latest recorded changes from across the company</CardDescription>}
              </div>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-blue-600">
                  <Link href="/administration/audit-logs">Audit log</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}</div>
            ) : isAdmin ? departmentUpdates.length === 0 ? (
              <div className="px-4 pb-4 pt-2 text-xs text-gray-400">No department updates have been recorded yet.</div>
            ) : (
              departmentUpdates.map(update => (
                <Link key={update.id} href={update.href} className="flex items-start gap-3 border-b border-gray-100 px-4 py-3 transition hover:bg-gray-50 last:border-0 dark:border-gray-800 dark:hover:bg-gray-800/50">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold capitalize text-gray-900 dark:text-white">{update.action}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="truncate capitalize">{update.module}</span>
                      <span>·</span>
                      <span className="truncate">{update.actor}</span>
                      <span>·</span>
                      <span className="shrink-0">{formatDateRelative(update.time)}</span>
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
                </Link>
              ))
            ) : activities.length === 0 ? (
              <div className="px-4 pb-4 pt-2 text-xs text-gray-400">No activity yet.</div>
            ) : (
              activities.map(a => (
                <Link key={a.id} href={a.href ?? '/dashboard'} className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.type === 'leave' ? 'bg-blue-100 dark:bg-blue-900/30' : a.type === 'project' ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {a.type === 'leave' ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> : a.type === 'project' ? <FolderKanban className="h-3.5 w-3.5 text-violet-600" /> : <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-gray-900 dark:text-white">{a.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="truncate text-xs text-gray-400">{a.subtitle}</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span className="whitespace-nowrap text-xs text-gray-400">{formatDateRelative(a.time)}</span>
                    </span>
                  </span>
                  <StatusBadge status={a.status} size="sm" />
                </Link>
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
