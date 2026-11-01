'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { subDays, subMonths } from 'date-fns';
import { Activity, AlertTriangle, BookOpenCheck, CheckCircle, ClipboardCheck, FileWarning, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { internalControlModules, scoreRisk } from '@/lib/internal-control';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DashboardRecord {
  id: string;
  record_type: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  department_id: string | null;
  event_date: string | null;
  created_at: string;
  likelihood: number | null;
  impact: number | null;
  residual_likelihood: number | null;
  residual_impact: number | null;
  control_effectiveness: string | null;
  workflow_stage: string;
  approval_status: string | null;
  is_confidential: boolean;
}

interface Department {
  id: string;
  name: string;
}

const isOpen = (status: string) => !['closed', 'archived', 'resolved', 'completed'].includes(status);

export default function InternalControlDashboard() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canView = isAdmin || hasPermission('internal_control.dashboard.view');
  const canViewFraud = isAdmin || hasPermission('internal_control.fraud.view');
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('90');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      if (!company?.id || !canView) {
        setRecords([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const [recordResult, departmentResult] = await Promise.all([
        supabase
          .from('internal_control_records')
          .select('id, record_type, title, status, priority, due_date, department_id, event_date, created_at, likelihood, impact, residual_likelihood, residual_impact, control_effectiveness, workflow_stage, approval_status, is_confidential')
          .eq('company_id', company.id)
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
        supabase.from('departments').select('id, name').eq('company_id', company.id).eq('is_active', true).order('name'),
      ]);
      if (recordResult.error) {
        console.error('Failed to load Internal Control dashboard:', recordResult.error);
        toast.error('Unable to load Internal Control dashboard metrics');
        setRecords([]);
      } else {
        setRecords((recordResult.data ?? []) as DashboardRecord[]);
      }
      if (departmentResult.error) {
        console.error('Failed to load dashboard departments:', departmentResult.error);
        toast.error('Unable to load department filter');
      } else {
        setDepartments(departmentResult.data ?? []);
      }
      setLoading(false);
    };
    void load();
  }, [canView, company?.id]);

  const visibleRecords = useMemo(() => {
    const rangeStart = dateRange === 'all'
      ? null
      : (dateRange === '30' ? subDays(new Date(), 30) : dateRange === '365' ? subDays(new Date(), 365) : subDays(new Date(), 90))
        .toISOString().slice(0, 10);
    return records.filter(record =>
      (departmentFilter === 'all' || record.department_id === departmentFilter)
      && (!rangeStart || (record.event_date ?? record.created_at.slice(0, 10)) >= rangeStart)
    );
  }, [records, dateRange, departmentFilter]);

  const metrics = useMemo(() => {
    const byType = (type: string) => visibleRecords.filter(record => record.record_type === type);
    const risks = byType('risk');
    const audits = byType('audit');
    const findings = byType('finding');
    const compliance = byType('compliance_check');
    const incidents = byType('incident');
    const fraudCases = canViewFraud ? byType('fraud_case') : [];
    const controls = byType('control_test');
    const training = byType('training');
    const policies = byType('policy');
    const today = new Date().toISOString().slice(0, 10);
    const overdue = visibleRecords.filter(record => record.due_date && record.due_date < today && isOpen(record.status));
    const completedTraining = training.filter(record => ['completed', 'closed'].includes(record.status)).length;
    const completedControls = controls.filter(record => record.control_effectiveness === 'effective').length;
    return {
      highRisks: risks.filter(record => {
        const score = scoreRisk(record.likelihood, record.impact);
        return isOpen(record.status) && (score?.rating === 'High' || score?.rating === 'Critical');
      }).length,
      mitigation: risks.length ? Math.round((risks.filter(record => !isOpen(record.status)).length / risks.length) * 100) : 0,
      auditsPlanned: audits.filter(record => ['planned', 'pending'].includes(record.status)).length,
      auditsActive: audits.filter(record => ['in_progress', 'under_review'].includes(record.status)).length,
      auditsCompleted: audits.filter(record => ['completed', 'closed'].includes(record.status)).length,
      approvals: visibleRecords.filter(record => record.approval_status === 'pending').length,
      findings: findings.filter(record => isOpen(record.status)).length,
      overdue: overdue.length,
      complianceOutstanding: compliance.filter(record => isOpen(record.status)).length,
      complianceViolations: compliance.filter(record => ['non_compliant', 'substantiated'].includes(record.status)).length,
      incidents: incidents.filter(record => isOpen(record.status)).length,
      fraudSuspected: fraudCases.filter(record => ['open', 'pending', 'under_review'].includes(record.status)).length,
      fraudInvestigating: fraudCases.filter(record => record.status === 'in_progress').length,
      fraudSubstantiated: fraudCases.filter(record => record.status === 'substantiated').length,
      controlEffectiveness: controls.length ? Math.round((completedControls / controls.length) * 100) : 0,
      trainingCompletion: training.length ? Math.round((completedTraining / training.length) * 100) : 0,
      followups: findings.filter(record => record.workflow_stage === 'follow_up_verification' && record.due_date && record.due_date < today).length,
      monthly: visibleRecords.filter(record => record.created_at >= subMonths(new Date(), 1).toISOString()).length,
      monthlyAuditCompliance: visibleRecords.filter(record =>
        ['audit', 'compliance_check'].includes(record.record_type)
        && record.created_at >= subMonths(new Date(), 1).toISOString()
      ).length,
      policyReviews: policies.filter(record => isOpen(record.status)).length,
    };
  }, [visibleRecords, canViewFraud]);

  if (!canView) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">You do not have permission to view the Internal Control dashboard.</p>;
  }

  const links = internalControlModules.filter(module =>
    isAdmin || hasPermission(`${module.permission}.view`)
  );
  const riskModule = internalControlModules.find(module => module.recordType === 'risk');
  const auditModule = internalControlModules.find(module => module.recordType === 'audit');
  const findingModule = internalControlModules.find(module => module.recordType === 'finding');
  const complianceModule = internalControlModules.find(module => module.recordType === 'compliance_check');
  const incidentModule = internalControlModules.find(module => module.recordType === 'incident');
  const fraudModule = internalControlModules.find(module => module.recordType === 'fraud_case');
  const controlsModule = internalControlModules.find(module => module.recordType === 'control_test');
  const trainingModule = internalControlModules.find(module => module.recordType === 'training');
  const requestsModule = internalControlModules.find(module => module.recordType === 'request');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Control Dashboard"
        description="Live risk, audit, compliance, remediation, and control monitoring based on records you are authorized to review."
        breadcrumbs={[{ label: 'Internal Control' }, { label: 'Dashboard' }]}
      />
      <div className="flex flex-wrap gap-3">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
            <SelectItem value="all">All dates</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="High / Critical Open Risks" value={metrics.highRisks} icon={<AlertTriangle className="h-5 w-5 text-red-600" />} href={riskModule?.href} loading={loading} />
        <MetricCard title="Risk Mitigation Progress" value={`${metrics.mitigation}%`} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} href={riskModule?.href} loading={loading} />
        <MetricCard title="Planned / Active / Completed Audits" value={`${metrics.auditsPlanned} / ${metrics.auditsActive} / ${metrics.auditsCompleted}`} icon={<ClipboardCheck className="h-5 w-5 text-blue-600" />} href={auditModule?.href} loading={loading} />
        <MetricCard title="Pending Authorizations" value={metrics.approvals} icon={<BookOpenCheck className="h-5 w-5 text-violet-600" />} href={requestsModule?.href} loading={loading} />
        <MetricCard title="Open Findings" value={metrics.findings} icon={<FileWarning className="h-5 w-5 text-amber-600" />} href={findingModule?.href} loading={loading} />
        <MetricCard title="Overdue Actions" value={metrics.overdue} icon={<Activity className="h-5 w-5 text-red-600" />} href={findingModule?.href} loading={loading} />
        <MetricCard title="Outstanding Compliance Checks" value={metrics.complianceOutstanding} icon={<CheckCircle className="h-5 w-5 text-cyan-600" />} href={complianceModule?.href} loading={loading} />
        <MetricCard title="Compliance Violations" value={metrics.complianceViolations} icon={<ShieldAlert className="h-5 w-5 text-orange-600" />} href={complianceModule?.href} loading={loading} />
        <MetricCard title="Open Incidents" value={metrics.incidents} icon={<AlertTriangle className="h-5 w-5 text-rose-600" />} href={incidentModule?.href} loading={loading} />
        <MetricCard title="Effective Controls" value={`${metrics.controlEffectiveness}%`} icon={<CheckCircle className="h-5 w-5 text-emerald-600" />} href={controlsModule?.href} loading={loading} />
        <MetricCard title="Training Completion" value={`${metrics.trainingCompletion}%`} icon={<BookOpenCheck className="h-5 w-5 text-indigo-600" />} href={trainingModule?.href} loading={loading} />
        <MetricCard title="Monthly Control Activity" value={metrics.monthly} icon={<Activity className="h-5 w-5 text-blue-600" />} loading={loading} />
        <MetricCard title="Policy Reviews Outstanding" value={metrics.policyReviews} icon={<FileWarning className="h-5 w-5 text-amber-600" />} href={internalControlModules.find(module => module.recordType === 'policy')?.href} loading={loading} />
        <MetricCard title="Overdue Follow-up Actions" value={metrics.followups} icon={<Activity className="h-5 w-5 text-red-600" />} href={findingModule?.href} loading={loading} />
        <MetricCard title="Monthly Audit & Compliance Activity" value={metrics.monthlyAuditCompliance} icon={<ClipboardCheck className="h-5 w-5 text-cyan-600" />} href={auditModule?.href} loading={loading} />
      </div>

      {canViewFraud && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-amber-600" />Confidential investigation overview</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <p>Suspected / under review: <strong>{metrics.fraudSuspected}</strong></p>
            <p>Investigating: <strong>{metrics.fraudInvestigating}</strong></p>
            <p>Substantiated: <strong>{metrics.fraudSubstantiated}</strong></p>
            {fraudModule && <Link className="text-blue-600 hover:underline" href={fraudModule.href}>Open restricted cases</Link>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Internal Control workspaces</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(module => (
            <Link key={module.recordType} href={module.href} className="rounded-lg border p-4 transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
              <p className="font-medium">{module.title}</p>
              <p className="mt-1 text-sm text-gray-500">{module.description}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-gray-500">Risk ratings use the product of likelihood (1–5) and impact (1–5): 1–4 low, 5–9 moderate, 10–16 high, and 17–25 critical. Counts respect company isolation and database row-level permissions; restricted investigations are omitted unless authorized.</p>
    </div>
  );
}

function MetricCard({ title, value, icon, href, loading }: { title: string; value: string | number; icon: React.ReactNode; href?: string; loading: boolean }) {
  const content = (
    <Card className="h-full transition-colors hover:border-blue-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>{icon}
      </CardHeader>
      <CardContent><p className="text-2xl font-bold">{loading ? '—' : value}</p></CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
