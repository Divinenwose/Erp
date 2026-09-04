'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/common/StatusBadge';
import { ClipboardCheck, Download, AlertTriangle } from 'lucide-react';

export default function InspectionsReportPage() {
  const { company } = useAuth();
  const [inspections, setInspections] = useState<any[]>([]);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (company?.id) loadData(); }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    const inspRes = await supabase.from('office_inspections').select('*, branches(name), profiles:inspected_by(first_name, last_name)').eq('company_id', company.id).order('inspection_date', { ascending: false }).limit(200);
    setInspections(inspRes.data ?? []);

    const inspectionIds = (inspRes.data ?? []).map(i => i.id);
    if (inspectionIds.length > 0) {
      const { count } = await supabase.from('inspection_issues').select('id', { count: 'exact', head: true }).eq('status', 'open').in('inspection_id', inspectionIds);
      setOpenIssues(count ?? 0);
    } else {
      setOpenIssues(0);
    }

    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Branch', 'Inspector', 'Status', 'Score', 'Findings'];
    const rows = inspections.map(r => [r.inspection_date, r.inspection_type, r.branches?.name || '', r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '', r.status, r.overall_score ?? '', r.findings || '']);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inspections-report.csv';
    a.click();
  };

  const completed = inspections.filter(i => i.status === 'completed').length;
  const avgScore = inspections.filter(i => i.overall_score != null).length > 0
    ? Math.round(inspections.filter(i => i.overall_score != null).reduce((s, i) => s + i.overall_score, 0) / inspections.filter(i => i.overall_score != null).length)
    : 0;

  const columns: Column[] = [
    { key: 'date', header: 'Date', cell: (r: any) => formatDate(r.inspection_date) },
    { key: 'type', header: 'Type', cell: (r: any) => <span className="capitalize">{r.inspection_type}</span> },
    { key: 'branch', header: 'Branch', cell: (r: any) => r.branches?.name ?? '-' },
    { key: 'inspector', header: 'Inspector', cell: (r: any) => r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '-' },
    { key: 'score', header: 'Score', cell: (r: any) => r.overall_score != null ? `${r.overall_score}%` : '-' },
    { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Inspection Reports" description="Office inspection findings and compliance" breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'Inspections' }]}>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Inspections" value={inspections.length} icon={<ClipboardCheck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Completed" value={completed} icon={<ClipboardCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Avg Score" value={`${avgScore}%`} icon={<ClipboardCheck className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Open Issues" value={openIssues} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <Card><CardContent className="p-0"><DataTable columns={columns} data={inspections} loading={loading} emptyTitle="No inspections recorded" /></CardContent></Card>
    </div>
  );
}
