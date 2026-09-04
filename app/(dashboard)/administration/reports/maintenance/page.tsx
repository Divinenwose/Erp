'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/common/StatusBadge';
import { Wrench, Download, DollarSign } from 'lucide-react';

export default function MaintenanceReportPage() {
  const { company } = useAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (company?.id) loadData(); }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase.from('work_orders').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(200);
    setWorkOrders(data ?? []);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Title', 'Status', 'Requested', 'Completed', 'Estimated Cost', 'Actual Cost'];
    const rows = workOrders.map(r => [r.title, r.status, r.created_at?.slice(0, 10) || '', r.completed_date || '', r.estimated_cost ?? '', r.actual_cost ?? '']);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'maintenance-report.csv';
    a.click();
  };

  const completed = workOrders.filter(w => w.status === 'completed').length;
  const pending = workOrders.filter(w => w.status !== 'completed').length;
  const totalCost = workOrders.reduce((sum, w) => sum + (w.actual_cost || 0), 0);

  const columns: Column[] = [
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'requested', header: 'Requested', cell: (r: any) => r.created_at ? formatDate(r.created_at) : '-' },
    { key: 'completed', header: 'Completed', cell: (r: any) => r.completed_date ? formatDate(r.completed_date) : '-' },
    { key: 'cost', header: 'Actual Cost', cell: (r: any) => r.actual_cost ? formatCurrency(r.actual_cost) : '-' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance Report" description="Facility maintenance costs and performance" breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'Maintenance' }]}>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Completed" value={completed} icon={<Wrench className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Pending" value={pending} icon={<Wrench className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Cost" value={formatCurrency(totalCost)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <Card><CardContent className="p-0"><DataTable columns={columns} data={workOrders} loading={loading} emptyTitle="No work orders" /></CardContent></Card>
    </div>
  );
}
