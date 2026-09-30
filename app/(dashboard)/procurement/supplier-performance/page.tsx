'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Download, Star, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SupplierPerformancePage() {
  const { company } = useAuth();
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('supplier_performance')
      .select('*, vendors(name, category)')
      .eq('company_id', company.id)
      .order('overall_score', { ascending: false });
    setPerformanceData(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const avgRating = performanceData.length > 0 
    ? (performanceData.reduce((a, p) => a + (p.quality_score ?? 0), 0) / performanceData.length).toFixed(1)
    : '0';
  const avgDelivery = performanceData.length > 0
    ? (performanceData.reduce((a, p) => a + (p.delivery_score ?? 0), 0) / performanceData.length).toFixed(1)
    : '0';
  const onTimeRate = performanceData.length > 0
    ? ((performanceData.reduce((a, p) => a + (p.on_time_delivery_rate ?? 0), 0) / performanceData.length) * 100).toFixed(0)
    : '0';
  const totalSpend = performanceData.reduce((a, p) => a + (p.total_spend ?? 0), 0);

  const columns: Column<any>[] = [
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="font-medium">{row.vendors?.name || '—'}</span> },
    { key: 'category', header: 'Category', cell: (row) => <span className="text-xs capitalize">{row.vendors?.category?.replace(/_/g, ' ') || 'Other'}</span> },
    { key: 'overall_score', header: 'Overall Score', cell: (row) => (
      <div className="flex items-center gap-2">
        <span className="font-semibold">{row.overall_score?.toFixed(1) || '0'}</span>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(row.overall_score || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />)}
        </div>
      </div>
    )},
    { key: 'quality_score', header: 'Quality', cell: (row) => <span className="text-sm">{row.quality_score?.toFixed(1) || '0'}</span> },
    { key: 'delivery_score', header: 'Delivery', cell: (row) => <span className="text-sm">{row.delivery_score?.toFixed(1) || '0'}</span> },
    { key: 'price_score', header: 'Price', cell: (row) => <span className="text-sm">{row.price_score?.toFixed(1) || '0'}</span> },
    { key: 'on_time_delivery_rate', header: 'On-Time Rate', cell: (row) => <span className="text-sm">{((row.on_time_delivery_rate ?? 0) * 100).toFixed(0)}%</span> },
    { key: 'total_orders', header: 'Orders', cell: (row) => <span className="text-sm">{row.total_orders ?? 0}</span> },
    { key: 'total_spend', header: 'Total Spend', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total_spend || 0)}</span> },
    { key: 'last_evaluation', header: 'Last Eval', cell: (row) => <span className="text-xs text-gray-500">{row.last_evaluation_date ? formatDate(row.last_evaluation_date) : '—'}</span> },
  ];

  performanceData.forEach(p => {
    if (p.overall_score >= 4) p.tier = 'Excellent';
    else if (p.overall_score >= 3) p.tier = 'Good';
    else if (p.overall_score >= 2) p.tier = 'Average';
    else p.tier = 'Poor';
  });

  return (
    <PermissionGuard permission="procurement.supplier_performance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view supplier performance</div>}>
      <div className="space-y-6">
        <PageHeader title="Supplier Performance" description="Track and analyze vendor performance metrics" breadcrumbs={[{ label: 'Procurement' }, { label: 'Supplier Performance' }]}>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Avg Overall Rating" value={avgRating} icon={<Star className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Avg Delivery Score" value={avgDelivery} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="On-Time Delivery Rate" value={`${onTimeRate}%`} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Spend" value={formatCurrency(totalSpend)} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={performanceData}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
