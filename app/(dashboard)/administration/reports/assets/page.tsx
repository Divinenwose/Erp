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
import { Briefcase, Download, DollarSign } from 'lucide-react';

export default function AssetsReportPage() {
  const { company } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (company?.id) loadData(); }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase.from('assets').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(300);
    setAssets(data ?? []);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Asset Name', 'Type', 'Category', 'Status', 'Purchase Date', 'Purchase Price', 'Current Value'];
    const rows = assets.map(r => [r.name, r.asset_type || '', r.category || '', r.status || '', r.purchase_date || '', r.purchase_price ?? '', r.current_value ?? '']);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'assets-report.csv';
    a.click();
  };

  const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0);
  const activeCount = assets.filter(a => a.status === 'active' || !a.status).length;

  const columns: Column[] = [
    { key: 'name', header: 'Asset Name' },
    { key: 'type', header: 'Type', cell: (r: any) => r.asset_type ?? '-' },
    { key: 'category', header: 'Category', cell: (r: any) => r.category ?? '-' },
    { key: 'status', header: 'Status', cell: (r: any) => r.status ? <StatusBadge status={r.status} /> : '-' },
    { key: 'current_value', header: 'Current Value', cell: (r: any) => r.current_value ? formatCurrency(r.current_value) : '-' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Assets Report" description="Company asset inventory and valuation" breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'Assets' }]}>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Total Assets" value={assets.length} icon={<Briefcase className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={activeCount} icon={<Briefcase className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Value" value={formatCurrency(totalValue)} icon={<DollarSign className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <Card><CardContent className="p-0"><DataTable columns={columns} data={assets} loading={loading} emptyTitle="No assets recorded" /></CardContent></Card>
    </div>
  );
}
