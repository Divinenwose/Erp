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
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/common/StatusBadge';
import { ShoppingCart, Download, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchasesReportPage() {
  const { company } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (company?.id) loadData(); }, [company?.id, selectedMonth]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    // purchase_requests has no FK to profiles or vendors — only to
    // employees via requested_by/approved_by.
    const { data } = await supabase
      .from('purchase_requests')
      .select('*, employees:requested_by(first_name, last_name), departments(name)')
      .eq('company_id', company.id)
      .gte('created_at', `${selectedMonth}-01`)
      .lte('created_at', `${selectedMonth}-31`)
      .order('created_at', { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Request #', 'Title', 'Requester', 'Department', 'Estimated Cost', 'Actual Cost', 'Status'];
    const rows = requests.map(r => [r.request_number || '', r.title, r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : '', r.departments?.name || '', r.estimated_cost ?? '', r.actual_cost ?? '', r.status]);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `purchases-report-${selectedMonth}.csv`;
    a.click();
  };

  const totalSpend = requests.reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0);
  const resolved = requests.filter(r => ['approved', 'vendor_assigned', 'completed'].includes(r.status)).length;
  const pending = requests.filter(r => r.status === 'pending').length;

  const columns: Column[] = [
    { key: 'request_number', header: 'Request #' },
    { key: 'title', header: 'Title' },
    { key: 'requester', header: 'Requester', cell: (r: any) => r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : '-' },
    { key: 'department', header: 'Department', cell: (r: any) => r.departments?.name ?? '-' },
    { key: 'amount', header: 'Amount', cell: (r: any) => formatCurrency(r.actual_cost || r.estimated_cost || 0) },
    { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Reports" description="Purchase requests and spending analysis" breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'Purchases' }]}>
        <div className="flex gap-2">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-auto" />
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Spend" value={formatCurrency(totalSpend)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Requests" value={requests.length} icon={<ShoppingCart className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Resolved" value={resolved} icon={<ShoppingCart className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Pending" value={pending} icon={<ShoppingCart className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <Card><CardContent className="p-0"><DataTable columns={columns} data={requests} loading={loading} emptyTitle="No purchase requests this month" /></CardContent></Card>
    </div>
  );
}
