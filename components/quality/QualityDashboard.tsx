'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, FileWarning, ShieldCheck } from 'lucide-react';
import { subDays } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { qualityModules } from '@/lib/quality';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QualityDashboardRecord {
  id: string;
  record_type: string;
  title: string;
  status: string;
  priority: string;
  severity: string | null;
  due_date: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

interface Inspection {
  id: string;
  status: string;
  result: string | null;
  defects_found: number | null;
  inspection_date: string;
  completed_at: string | null;
}

function isOpen(status: string) {
  return !['closed', 'archived', 'cancelled', 'resolved', 'passed', 'compliant'].includes(status);
}

export default function QualityDashboard() {
  const { company, hasPermission, isSuperAdmin } = useAuth();
  const canView = isSuperAdmin() || hasPermission('quality.dashboard.view');
  const [records, setRecords] = useState<QualityDashboardRecord[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('90');

  const load = useCallback(async () => {
    if (!company?.id || !canView) {
      setRecords([]);
      setInspections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const since = subDays(new Date(), Number(dateRange)).toISOString();
    const [recordResult, inspectionResult] = await Promise.all([
      supabase.from('quality_records').select('id, record_type, title, status, priority, severity, due_date, category, created_at, updated_at')
        .eq('company_id', company.id).gte('created_at', since).neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('quality_inspections').select('id, status, result, defects_found, inspection_date, completed_at')
        .eq('company_id', company.id).gte('created_at', since).order('created_at', { ascending: false }),
    ]);
    if (recordResult.error) {
      console.error('Failed to load QC/QA dashboard records:', recordResult.error);
      toast.error('Unable to load quality metrics');
      setRecords([]);
    } else setRecords((recordResult.data ?? []) as QualityDashboardRecord[]);
    if (inspectionResult.error) {
      console.error('Failed to load quality inspections:', inspectionResult.error);
      toast.error('Unable to load inspection metrics');
      setInspections([]);
    } else setInspections((inspectionResult.data ?? []) as Inspection[]);
    setLoading(false);
  }, [canView, company?.id, dateRange]);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => {
    const completedInspections = inspections.filter(item => ['passed', 'failed', 'conditional'].includes(item.status));
    const passedInspections = completedInspections.filter(item => item.result === 'pass' || item.status === 'passed').length;
    const failedInspections = completedInspections.filter(item => item.result === 'fail' || item.status === 'failed').length;
    const nonConformances = records.filter(record => record.record_type === 'non_conformance');
    const capas = records.filter(record => record.record_type === 'capa');
    const audits = records.filter(record => record.record_type === 'audit');
    const openRecords = records.filter(record => isOpen(record.status));
    const today = new Date().toISOString().slice(0, 10);
    const durations = completedInspections.flatMap(item => {
      if (!item.completed_at) return [];
      const duration = new Date(item.completed_at).getTime() - new Date(item.inspection_date).getTime();
      return duration >= 0 ? [duration / 3_600_000] : [];
    });
    const averageHours = durations.length ? durations.reduce((sum, hours) => sum + hours, 0) / durations.length : null;
    return {
      pendingInspections: inspections.filter(item => ['pending', 'in_progress'].includes(item.status)).length,
      completedInspections: completedInspections.length,
      passedInspections: inspections.filter(item => item.result === 'pass' || item.status === 'passed').length,
      failedInspections: inspections.filter(item => item.result === 'fail' || item.status === 'failed').length,
      passRate: completedInspections.length ? Math.round((passedInspections / completedInspections.length) * 100) : null,
      defects: records.filter(record => record.record_type === 'defect').length + inspections.reduce((sum, item) => sum + (item.defects_found ?? 0), 0),
      openNonConformances: nonConformances.filter(record => isOpen(record.status)).length,
      openCapa: capas.filter(record => isOpen(record.status)).length,
      overdueCapa: capas.filter(record => isOpen(record.status) && record.due_date && record.due_date < today).length,
      pendingAudits: audits.filter(record => ['draft', 'pending', 'scheduled', 'under_review'].includes(record.status)).length,
      completedAudits: audits.filter(record => ['closed', 'resolved'].includes(record.status)).length,
      complianceIssues: records.filter(record => record.record_type === 'compliance' && ['non_compliant', 'failed', 'open', 'under_review'].includes(record.status)).length,
      openIncidents: records.filter(record => record.record_type === 'incident' && isOpen(record.status)).length,
      highRisk: openRecords.filter(record => record.record_type === 'risk' && ['high', 'urgent'].includes(record.priority) || record.record_type === 'risk' && record.severity === 'critical').length,
      averageHours,
    };
  }, [inspections, records]);

  const recent = records.slice(0, 6);
  const maxActivity = Math.max(1, metrics.passedInspections, metrics.failedInspections, metrics.pendingInspections);
  const cards = [
    { label: 'Inspection requests', value: inspections.length, icon: ClipboardCheck, href: '/quality/inspections' },
    { label: 'Pending inspections', value: metrics.pendingInspections, icon: Clock3, href: '/quality/inspections' },
    { label: 'Inspections completed', value: metrics.completedInspections, icon: CheckCircle2, href: '/quality/inspections' },
    { label: 'Inspection pass rate', value: metrics.passRate === null ? '—' : `${metrics.passRate}%`, icon: ShieldCheck, href: '/quality/inspections' },
    { label: 'Defects recorded', value: metrics.defects, icon: AlertTriangle, href: '/quality/defects' },
    { label: 'Open non-conformances', value: metrics.openNonConformances, icon: FileWarning, href: '/quality/non-conformances' },
    { label: 'Open CAPA', value: metrics.openCapa, icon: Activity, href: '/quality/capa' },
    { label: 'Overdue CAPA', value: metrics.overdueCapa, icon: Clock3, href: '/quality/capa' },
    { label: 'Pending QA audits', value: metrics.pendingAudits, icon: ClipboardCheck, href: '/quality/audits' },
    { label: 'Completed QA audits', value: metrics.completedAudits, icon: CheckCircle2, href: '/quality/audits' },
    { label: 'Compliance issues', value: metrics.complianceIssues, icon: ShieldCheck, href: '/quality/compliance' },
    { label: 'Open quality incidents', value: metrics.openIncidents, icon: AlertTriangle, href: '/quality/incidents' },
    { label: 'High-risk quality issues', value: metrics.highRisk, icon: AlertTriangle, href: '/quality/risks' },
    { label: 'Average inspection time', value: metrics.averageHours === null ? '—' : `${metrics.averageHours.toFixed(1)} h`, icon: Clock3, href: '/quality/inspections' },
  ];

  if (!canView) return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view QC/QA metrics.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Control & Quality Assurance" description="Current quality performance from inspections and permission-scoped QC/QA records." breadcrumbs={[{ label: 'Quality Control & Quality Assurance' }]}>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="365">Last 12 months</SelectItem></SelectContent>
        </Select>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => <Link key={label} href={href} className="block">
          <Card className="h-full transition-shadow hover:shadow-md"><CardContent className="flex items-center justify-between p-4">
            <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{loading ? '…' : value}</p></div><Icon className="h-5 w-5 text-muted-foreground" />
          </CardContent></Card>
        </Link>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Inspection outcomes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Passed', count: metrics.passedInspections, color: 'bg-emerald-500' },
              { label: 'Failed', count: metrics.failedInspections, color: 'bg-red-500' },
              { label: 'Pending / in progress', count: metrics.pendingInspections, color: 'bg-amber-500' },
            ].map(item => <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{item.label}</span><span>{item.count}</span></div>
              <div className="h-2 overflow-hidden rounded bg-muted"><div className={`h-full ${item.color}`} style={{ width: `${(item.count / maxActivity) * 100}%` }} /></div>
            </div>)}
            {!loading && inspections.length === 0 && <p className="text-sm text-muted-foreground">No inspection data exists for this period.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quality module shortcuts</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {qualityModules.slice(0, 8).map(item => <Link key={item.key} href={item.href} className="rounded-md border p-3 text-sm hover:bg-muted">{item.title}</Link>)}
            <Link href="/quality/reports" className="rounded-md border p-3 text-sm font-medium hover:bg-muted">Reports & analytics</Link>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent quality activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recent.map(record => <div key={record.id} className="flex flex-col justify-between gap-1 border-b py-2 text-sm sm:flex-row">
            <span className="font-medium">{record.title}</span><span className="text-muted-foreground">{record.record_type.replace(/_/g, ' ')} · {record.status.replace(/_/g, ' ')} · {new Date(record.updated_at).toLocaleDateString()}</span>
          </div>)}
          {!loading && recent.length === 0 && <p className="py-4 text-sm text-muted-foreground">No quality records have been recorded during this date range.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
