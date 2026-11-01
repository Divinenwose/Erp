'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { Download, FileBarChart, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { internalControlModules, InternalControlRecordType } from '@/lib/internal-control';
import DataTable, { Column } from '@/components/common/DataTable';
import ExcelExportButton from '@/components/common/ExcelExportButton';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReportRecord {
  id: string;
  record_type: InternalControlRecordType;
  title: string;
  status: string;
  priority: string;
  severity: string | null;
  inherent_score: number | null;
  inherent_rating: string | null;
  residual_score: number | null;
  residual_rating: string | null;
  control_effectiveness: string | null;
  due_date: string | null;
  event_date: string | null;
  created_at: string;
  department_id: string | null;
  workflow_stage: string;
}

export default function InternalControlReports() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canView = isSuperAdmin() || isCompanyAdmin() || hasPermission('internal_control.reports.view');
  const canExport = isSuperAdmin() || isCompanyAdmin() || hasPermission('internal_control.reports.export');
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('365');
  const [exportingPresentation, setExportingPresentation] = useState(false);

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
          .select('id, record_type, title, status, priority, severity, inherent_score, inherent_rating, residual_score, residual_rating, control_effectiveness, due_date, event_date, created_at, department_id, workflow_stage')
          .eq('company_id', company.id)
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
        supabase.from('departments').select('id, name').eq('company_id', company.id).eq('is_active', true).order('name'),
      ]);
      if (recordResult.error) {
        console.error('Failed to load Internal Control report data:', recordResult.error);
        toast.error('Unable to load report records');
        setRecords([]);
      } else {
        setRecords((recordResult.data ?? []) as ReportRecord[]);
      }
      if (departmentResult.error) {
        console.error('Failed to load report departments:', departmentResult.error);
        toast.error('Unable to load report department filter');
      } else {
        setDepartments(departmentResult.data ?? []);
      }
      setLoading(false);
    };
    void load();
  }, [canView, company?.id]);

  const reportRows = useMemo(() => {
    const rangeStart = dateFilter === 'all'
      ? null
      : (dateFilter === '30' ? subDays(new Date(), 30) : dateFilter === '90' ? subDays(new Date(), 90) : subDays(new Date(), 365))
        .toISOString().slice(0, 10);
    return records.filter(record =>
      (typeFilter === 'all' || record.record_type === typeFilter)
      && (departmentFilter === 'all' || record.department_id === departmentFilter)
      && (!rangeStart || (record.event_date ?? record.created_at.slice(0, 10)) >= rangeStart)
    );
  }, [records, typeFilter, departmentFilter, dateFilter]);

  const totals = useMemo(() => ({
    total: reportRows.length,
    open: reportRows.filter(record => !['closed', 'archived', 'resolved', 'completed'].includes(record.status)).length,
    overdue: reportRows.filter(record => record.due_date && record.due_date < new Date().toISOString().slice(0, 10)
      && !['closed', 'archived', 'resolved', 'completed'].includes(record.status)).length,
    highRisk: reportRows.filter(record => ['high', 'critical'].includes(record.inherent_rating ?? '')).length,
    effective: reportRows.filter(record => record.control_effectiveness === 'effective').length,
  }), [reportRows]);

  const columns: Column<ReportRecord>[] = [
    { key: 'title', header: 'Record', sortable: true, cell: row => <Link className="text-blue-600 hover:underline" href={internalControlModules.find(module => module.recordType === row.record_type)?.href ?? '/internal-control'}>{row.title}</Link> },
    { key: 'record_type', header: 'Report Area', sortable: true, cell: row => internalControlModules.find(module => module.recordType === row.record_type)?.title ?? row.record_type },
    { key: 'status', header: 'Status', sortable: true, cell: row => <StatusBadge status={row.status} /> },
    { key: 'priority', header: 'Priority', sortable: true },
    { key: 'severity', header: 'Severity', sortable: true, cell: row => row.severity ?? '-' },
    { key: 'risk_rating', header: 'Inherent / Residual Risk', cell: row => row.inherent_rating ? `${row.inherent_rating} / ${row.residual_rating ?? 'not assessed'}` : '-' },
    { key: 'control_effectiveness', header: 'Control Effectiveness', sortable: true, cell: row => row.control_effectiveness?.replace(/_/g, ' ') ?? '-' },
    { key: 'due_date', header: 'Due Date', sortable: true, cell: row => row.due_date ? format(new Date(`${row.due_date}T00:00:00`), 'MMM dd, yyyy') : '-' },
  ];

  if (!canView) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">You do not have permission to view Internal Control reports.</p>;
  }

  const exportRows = reportRows.map(record => ({
    title: record.title,
    report_area: internalControlModules.find(module => module.recordType === record.record_type)?.title ?? record.record_type,
    status: record.status,
    priority: record.priority,
    severity: record.severity ?? '',
    inherent_risk: record.inherent_rating ?? '',
    inherent_score: record.inherent_score ?? '',
    residual_risk: record.residual_rating ?? '',
    residual_score: record.residual_score ?? '',
    control_effectiveness: record.control_effectiveness ?? '',
    due_date: record.due_date ?? '',
    workflow_stage: record.workflow_stage,
  }));

  const exportAnnualReview = async () => {
    setExportingPresentation(true);
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const presentation = new PptxGenJS();
      presentation.layout = 'LAYOUT_WIDE';
      presentation.author = 'Targfit ERP Internal Control';
      presentation.subject = 'Internal Control management review';
      presentation.title = 'Internal Control Review';
      const header = (title: string) => {
        const slide = presentation.addSlide();
        slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: '1E3A8A' } });
        slide.addText(title, { x: 0.4, y: 0.16, w: 12, h: 0.45, fontSize: 22, bold: true, color: 'FFFFFF' });
        return slide;
      };
      const table = (rows: string[][]) => rows.map(row => row.map(text => ({ text })));
      const dateLabel = dateFilter === 'all' ? 'All available dates' : `Last ${dateFilter} days`;

      let slide = header('Internal Control Management Review');
      slide.addText(`${company?.name ?? 'Company'} · ${dateLabel} · Prepared ${format(new Date(), 'MMMM d, yyyy')}`, {
        x: 0.6, y: 1.1, w: 11.6, h: 0.5, fontSize: 14, color: '4B5563',
      });
      slide.addTable(table([
        ['Management indicator', 'Current value'],
        ['Records in scope', String(totals.total)],
        ['Open records', String(totals.open)],
        ['Overdue actions', String(totals.overdue)],
        ['High / critical risk records', String(totals.highRisk)],
        ['Effective controls tested', String(totals.effective)],
      ]), { x: 0.6, y: 1.8, w: 11.6, colW: [7.6, 4], fontSize: 16, rowH: 0.45 });

      const auditCount = reportRows.filter(record => record.record_type === 'audit').length;
      const complianceCount = reportRows.filter(record => record.record_type === 'compliance_check').length;
      const openFindings = reportRows.filter(record => record.record_type === 'finding' && !['closed', 'resolved', 'completed'].includes(record.status)).length;
      const riskBuckets = ['critical', 'high', 'moderate', 'low'].map(rating => [
        rating,
        String(reportRows.filter(record => record.record_type === 'risk' && record.inherent_rating === rating).length),
      ]);
      slide = header('Audit Coverage & Risk Exposure');
      slide.addTable(table([
        ['Measure', 'Records'],
        ['Audit engagements in scope', String(auditCount)],
        ['Compliance checks in scope', String(complianceCount)],
        ['Critical inherent risks', riskBuckets[0][1]],
        ['High inherent risks', riskBuckets[1][1]],
        ['Moderate inherent risks', riskBuckets[2][1]],
        ['Low inherent risks', riskBuckets[3][1]],
      ]), { x: 0.6, y: 1.25, w: 11.6, colW: [7.6, 4], fontSize: 15, rowH: 0.42 });

      slide = header('Controls, Findings & Remediation');
      slide.addTable(table([
        ['Measure', 'Records'],
        ['Open findings and actions', String(openFindings)],
        ['Overdue actions', String(totals.overdue)],
        ['Controls tested', String(reportRows.filter(record => record.record_type === 'control_test').length)],
        ['Controls rated effective', String(totals.effective)],
        ['Compliance violations', String(reportRows.filter(record => record.record_type === 'compliance_check' && ['non_compliant', 'substantiated'].includes(record.status)).length)],
        ['Training records completed', String(reportRows.filter(record => record.record_type === 'training' && ['completed', 'closed'].includes(record.status)).length)],
      ]), { x: 0.6, y: 1.25, w: 11.6, colW: [7.6, 4], fontSize: 15, rowH: 0.42 });
      await presentation.writeFile({ fileName: `Internal-Control-Review-${new Date().toISOString().slice(0, 10)}.pptx` });
      toast.success('Presentation exported');
    } catch (error) {
      console.error('Failed to export Internal Control presentation:', error);
      toast.error('Unable to export the presentation');
    } finally {
      setExportingPresentation(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Internal Control Reports" description="Filter, review, and export authorized audit, risk, compliance, remediation, incident, and control records." breadcrumbs={[{ label: 'Internal Control', href: '/internal-control' }, { label: 'Reports' }]}>
        {canExport && <ExcelExportButton filename="internal-control-report" sheetName="Control Report" rows={exportRows} disabled={loading || exportRows.length === 0} />}
        {canExport && (
          <Button variant="outline" onClick={() => void exportAnnualReview()} disabled={loading || exportingPresentation}>
            <Presentation className="mr-2 h-4 w-4" />{exportingPresentation ? 'Preparing…' : 'Export Review PPTX'}
          </Button>
        )}
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="All report areas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All report areas</SelectItem>
            {internalControlModules.map(module => <SelectItem key={module.recordType} value={module.recordType}>{module.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger><SelectValue placeholder="Date range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 12 months</SelectItem>
            <SelectItem value="all">All dates</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard title="Records" value={totals.total} loading={loading} />
        <SummaryCard title="Open" value={totals.open} loading={loading} />
        <SummaryCard title="Overdue" value={totals.overdue} loading={loading} />
        <SummaryCard title="High / Critical Risks" value={totals.highRisk} loading={loading} />
        <SummaryCard title="Effective Controls" value={totals.effective} loading={loading} />
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileBarChart className="h-4 w-4" />Annual / Monthly Review Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <p>These summaries are derived from Internal Control records available to your account. Use the date filter to prepare monthly or annual review packs. Confidential investigation details are excluded from exports; rows remain subject to record-level RBAC.</p>
          <p>Audit coverage: {reportRows.filter(record => record.record_type === 'audit').length} audit records · Risk exposure: {totals.highRisk} high/critical risk records · Open findings/actions: {reportRows.filter(record => record.record_type === 'finding' && !['closed', 'resolved', 'completed'].includes(record.status)).length} · Overdue actions: {totals.overdue} · Effective control tests: {totals.effective}</p>
        </CardContent>
      </Card>
      <DataTable
        columns={columns}
        data={reportRows}
        loading={loading}
        searchable
        searchKeys={['title', 'record_type', 'status', 'priority', 'severity']}
        emptyTitle="No report records"
        emptyDescription="No authorized Internal Control records match these filters."
        emptyIcon={<Download className="h-10 w-10 text-gray-300" />}
      />
      <Button variant="link" asChild className="px-0"><Link href="/internal-control">Return to dashboard</Link></Button>
    </div>
  );
}

function SummaryCard({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">{title}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{loading ? '—' : value}</CardContent></Card>;
}
