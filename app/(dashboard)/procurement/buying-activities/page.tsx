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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Download, TrendingUp, Calendar, DollarSign, Package, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BuyingActivitiesPage() {
  const { company } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('all');

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('buying_activities')
      .select('*, employees(full_name), vendors(name)')
      .eq('company_id', company.id)
      .order('activity_date', { ascending: false });
    setActivities(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const filteredActivities = activities.filter(a => {
    if (periodFilter === 'all') return true;
    if (!a.activity_date) return false;
    const now = new Date();
    const activityDate = new Date(a.activity_date);
    if (isNaN(activityDate.getTime())) return false;
    const daysDiff = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
    if (periodFilter === '7') return daysDiff <= 7;
    if (periodFilter === '30') return daysDiff <= 30;
    if (periodFilter === '90') return daysDiff <= 90;
    return true;
  });

  const totalActivities = filteredActivities.length;
  const totalSpend = filteredActivities.reduce((a, a2) => a + (a2.amount ?? 0), 0);
  const poCount = filteredActivities.filter(a => a.activity_type === 'purchase_order').length;
  const grnCount = filteredActivities.filter(a => a.activity_type === 'goods_received').length;

  const columns: Column<any>[] = [
    { key: 'activity_date', header: 'Date', cell: (row) => <span className="text-sm">{formatDate(row.activity_date)}</span> },
    { key: 'activity_type', header: 'Activity Type', cell: (row) => <span className="text-xs capitalize">{row.activity_type?.replace(/_/g, ' ')}</span> },
    { key: 'reference_number', header: 'Reference', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.reference_number || '—'}</span> },
    { key: 'employees', header: 'Buyer', cell: (row) => <span className="text-sm">{row.employees?.full_name || '—'}</span> },
    { key: 'vendors', header: 'Vendor', cell: (row) => <span className="text-sm">{row.vendors?.name || '—'}</span> },
    { key: 'category', header: 'Category', cell: (row) => <span className="text-xs capitalize">{row.category?.replace(/_/g, ' ') || '—'}</span> },
    { key: 'amount', header: 'Amount', cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.amount || 0)}</span> },
    { key: 'description', header: 'Description', cell: (row) => <span className="text-sm text-gray-500 truncate max-w-[200px]">{row.description || '—'}</span> },
  ];

  return (
    <PermissionGuard permission="procurement.buying_activities.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view buying activities</div>}>
      <div className="space-y-6">
        <PageHeader title="Buying Activities" description="Track daily procurement activities and transactions" breadcrumbs={[{ label: 'Procurement' }, { label: 'Buying Activities' }]}>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Activities" value={totalActivities} icon={<ShoppingCart className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Spend" value={formatCurrency(totalSpend)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Purchase Orders" value={poCount} icon={<Package className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Goods Received" value={grnCount} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filteredActivities}
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
