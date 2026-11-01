'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { exportExcel } from '@/lib/excel-export';
import { qualityModules } from '@/lib/quality';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReportRecord {
  id: string;
  record_type: string;
  record_number: string;
  title: string;
  status: string;
  priority: string;
  severity: string | null;
  category: string | null;
  due_date: string | null;
  detected_at: string | null;
  created_at: string;
  owner_id: string | null;
}

interface InspectionReport {
  id: string;
  inspection_number: string;
  inspection_type: string;
  batch_number: string | null;
  status: string;
  result: string | null;
  defects_found: number | null;
  inspection_date: string;
  approval_status: string;
}

export default function QualityReports() {
  const { company, hasPermission, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin();
  const canView = isAdmin || hasPermission('quality.reports.view');
  const canExport = isAdmin || hasPermission('quality.reports.export');
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('90');

  const load = useCallback(async () => {
    if (!company?.id || !canView) {
      setLoading(false);
      setRecords([]);
      setInspections([]);
      return;
    }
    setLoading(true);
    const since = new Date(Date.now() - Number(dateRange) * 86_400_000).toISOString();
    const [recordResult, inspectionResult] = await Promise.all([
      supabase.from('quality_records').select('id, record_type, record_number, title, status, priority, severity, category, due_date, detected_at, created_at, owner_id')
        .eq('company_id', company.id).gte('created_at', since).neq('status', 'archived').order('created_at', { ascending: false }),
      supabase.from('quality_inspections').select('id, inspection_number, inspection_type, batch_number, status, result, defects_found, inspection_date, approval_status')
        .eq('company_id', company.id).gte('created_at', since).order('created_at', { ascending: false }),
    ]);
    if (recordResult.error) {
      console.error('Failed to load quality report records:', recordResult.error);
      toast.error('Unable to load quality report data');
      setRecords([]);
    } else setRecords((recordResult.data ?? []) as ReportRecord[]);
    if (inspectionResult.error) {
      console.error('Failed to load inspection report data:', inspectionResult.error);
      toast.error('Unable to load inspection report data');
      setInspections([]);
    } else setInspections((inspectionResult.data ?? []) as InspectionReport[]);
    setLoading(false);
  }, [canView, company?.id, dateRange]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => records.filter(record =>
    (typeFilter === 'all' || record.record_type === typeFilter)
    && (statusFilter === 'all' || record.status === statusFilter)
  ), [records, statusFilter, typeFilter]);

  const metricSummary = useMemo(() => {
    const completed = inspections.filter(row => ['passed', 'failed', 'conditional', 'completed'].includes(row.status));
    const passed = completed.filter(row => row.result === 'pass' || row.status === 'passed').length;
    const openCapa = records.filter(row => row.record_type === 'capa' && !['closed', 'archived', 'cancelled'].includes(row.status)).length;
    const overdue = records.filter(row => row.due_date && row.due_date < new Date().toISOString().slice(0, 10) && !['closed', 'archived', 'cancelled'].includes(row.status)).length;
    return {
      inspections: inspections.length,
      completed: completed.length,
      passRate: completed.length ? Math.round((passed / completed.length) * 100) : null,
      defects: records.filter(row => row.record_type === 'defect').length + inspections.reduce((total, row) => total + (row.defects_found ?? 0), 0),
      nonConformances: records.filter(row => row.record_type === 'non_conformance' && !['closed', 'archived', 'cancelled'].includes(row.status)).length,
      openCapa,
      overdue,
    };
  }, [inspections, records]);

  const exportReport = () => {
    if (!canExport) {
      toast.error('You do not have permission to export quality reports');
      return;
    }
    exportExcel(`quality-report-${new Date().toISOString().slice(0, 10)}`, [
      { name: 'Quality Records', rows: filtered.map(({ id, ...row }) => row) },
      { name: 'Inspections', rows: inspections.map(({ id, ...row }) => row) },
      { name: 'Summary', rows: [{ generated_at: new Date().toISOString(), date_range_days: Number(dateRange), inspection_count: metricSummary.inspections, completed_inspections: metricSummary.completed, inspection_pass_rate_percent: metricSummary.passRate ?? 'Not available', defect_count: metricSummary.defects, open_non_conformances: metricSummary.nonConformances, open_capa: metricSummary.openCapa, overdue_actions: metricSummary.overdue }] },
    ]);
  };

  const columns: Column<ReportRecord>[] = [
    { key: 'record_number', header: 'Reference', sortable: true },
    { key: 'record_type', header: 'Report area', sortable: true, cell: row => qualityModules.find(item => item.recordType === row.record_type)?.title ?? row.record_type },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'category', header: 'Category', sortable: true, cell: row => row.category || '—' },
    { key: 'severity', header: 'Severity', sortable: true, cell: row => row.severity ? <StatusBadge status={row.severity} /> : '—' },
    { key: 'status', header: 'Status', sortable: true, cell: row => <StatusBadge status={row.status} /> },
    { key: 'due_date', header: 'Due', sortable: true, cell: row => row.due_date || '—' },
    { key: 'created_at', header: 'Created', sortable: true, cell: row => new Date(row.created_at).toLocaleDateString() },
  ];

  if (!canView) return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view quality reports.</div>;
  return <div className="space-y-5">
    <PageHeader title="Reports & Analytics" description="Permission-scoped QC/QA records, inspection results, and date-filtered performance summaries." breadcrumbs={[{ label: 'Quality Control & Quality Assurance', href: '/quality' }, { label: 'Reports & Analytics' }]}>
      {canExport && <Button onClick={exportReport}><Download className="mr-2 h-4 w-4" />Export Excel</Button>}
    </PageHeader>
    <div className="flex flex-wrap gap-3">
      <Select value={dateRange} onValueChange={setDateRange}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="365">Last 12 months</SelectItem></SelectContent></Select>
      <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All record types</SelectItem>{qualityModules.map(item => <SelectItem key={item.recordType} value={item.recordType}>{item.title}</SelectItem>)}</SelectContent></Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{['open', 'pending', 'under_review', 'approved', 'in_progress', 'awaiting_verification', 'failed', 'closed'].map(item => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ['Inspections', metricSummary.inspections],
        ['Completed inspections', metricSummary.completed],
        ['Pass rate', metricSummary.passRate === null ? 'Not available' : `${metricSummary.passRate}%`],
        ['Recorded defects', metricSummary.defects],
        ['Open non-conformances', metricSummary.nonConformances],
        ['Open CAPA', metricSummary.openCapa],
        ['Overdue actions', metricSummary.overdue],
      ].map(([label, value]) => <div key={String(label)} className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{loading ? '…' : value}</p></div>)}
    </div>
    <DataTable columns={columns} data={filtered} loading={loading} searchable searchKeys={['record_number', 'title', 'record_type', 'category', 'status']} emptyTitle="No quality records in this report" emptyDescription="Records will appear here after QC/QA activities are recorded." />
  </div>;
}
