'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Download, DollarSign, TrendingDown } from 'lucide-react';

export default function VendorsReportPage() {
  const { company } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (company?.id) loadData(); }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('vendor_performance')
      .select('*, vendors(name, vendor_type)')
      .eq('company_id', company.id)
      .order('rating', { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Vendor', 'Type', 'Rating', 'Total Orders', 'Completed', 'Late Deliveries', 'Total Spent'];
    const rows = records.map(r => [r.vendors?.name || '', r.vendors?.vendor_type || '', r.rating ?? '', r.total_orders ?? '', r.completed_orders ?? '', r.late_deliveries ?? '', r.total_spent ?? '']);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vendor-performance-report.csv';
    a.click();
  };

  const avgRating = records.length > 0 ? (records.reduce((s, r) => s + (r.rating || 0), 0) / records.length).toFixed(1) : '0';
  const totalSpend = records.reduce((s, r) => s + (r.total_spent || 0), 0);
  const totalLateDeliveries = records.reduce((s, r) => s + (r.late_deliveries || 0), 0);

  const columns: Column[] = [
    { key: 'vendor', header: 'Vendor', cell: (r: any) => r.vendors?.name ?? '-' },
    { key: 'type', header: 'Type', cell: (r: any) => <span className="capitalize">{r.vendors?.vendor_type ?? '-'}</span> },
    { key: 'rating', header: 'Rating', cell: (r: any) => `${r.rating ?? 0} / 5` },
    { key: 'orders', header: 'Orders', cell: (r: any) => `${r.completed_orders ?? 0}/${r.total_orders ?? 0}` },
    { key: 'late', header: 'Late Deliveries', cell: (r: any) => r.late_deliveries ?? 0 },
    { key: 'spend', header: 'Total Spent', cell: (r: any) => r.total_spent ? formatCurrency(r.total_spent) : '-' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Vendor Performance Report" description="Vendor ratings, reliability, and spend" breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'Vendors' }]}>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Avg Rating" value={`${avgRating} / 5`} icon={<Star className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Spend" value={formatCurrency(totalSpend)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Late Deliveries" value={totalLateDeliveries} icon={<TrendingDown className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <Card><CardContent className="p-0"><DataTable columns={columns} data={records} loading={loading} emptyTitle="No vendor performance data yet" emptyDescription="Ratings will appear here once vendors have been evaluated." /></CardContent></Card>
    </div>
  );
}
