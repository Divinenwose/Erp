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
import { Fuel, Download, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function FuelReportPage() {
  const { company } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (company?.id) loadData(); }, [company?.id, selectedMonth]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    // fuel_records.vehicle_id has no foreign key relationship defined in the
    // schema, so it isn't embeddable here — only driver_id (-> profiles) is.
    const { data } = await supabase
      .from('fuel_records')
      .select('*, profiles:driver_id(first_name, last_name), branches(name)')
      .eq('company_id', company.id)
      .gte('fuel_date', `${selectedMonth}-01`)
      .lte('fuel_date', `${selectedMonth}-31`)
      .order('fuel_date', { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Driver', 'Branch', 'Quantity', 'Cost', 'Fuel Type', 'Station', 'Odometer'];
    const rows = records.map(r => [r.fuel_date, r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '', r.branches?.name || '', r.fuel_quantity ?? '', r.cost ?? '', r.fuel_type || '', r.fuel_station || '', r.odometer_reading ?? '']);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fuel-report-${selectedMonth}.csv`;
    a.click();
  };

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalQuantity = records.reduce((sum, r) => sum + (r.fuel_quantity || 0), 0);

  const columns: Column[] = [
    { key: 'date', header: 'Date', cell: (r: any) => formatDate(r.fuel_date) },
    { key: 'driver', header: 'Driver', cell: (r: any) => r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '-' },
    { key: 'quantity', header: 'Quantity', cell: (r: any) => r.fuel_quantity ?? '-' },
    { key: 'cost', header: 'Cost', cell: (r: any) => r.cost ? formatCurrency(r.cost) : '-' },
    { key: 'station', header: 'Station', cell: (r: any) => r.fuel_station ?? '-' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Fuel Report" description="Vehicle fuel consumption and cost analysis" breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'Fuel' }]}>
        <div className="flex gap-2">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-auto" />
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Total Cost" value={formatCurrency(totalCost)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Quantity" value={totalQuantity.toFixed(1)} icon={<Fuel className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Fill-ups" value={records.length} icon={<Fuel className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <Card><CardContent className="p-0"><DataTable columns={columns} data={records} loading={loading} emptyTitle="No fuel records this month" /></CardContent></Card>
    </div>
  );
}
