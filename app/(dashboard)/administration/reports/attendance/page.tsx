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
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/common/StatusBadge';
import { Users, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function AttendanceReportPage() {
  const { company } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (company?.id) loadData(); }, [company?.id, selectedMonth]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('attendance_records')
      .select('*, profiles(first_name, last_name), departments(name), branches(name)')
      .eq('company_id', company.id)
      .gte('attendance_date', `${selectedMonth}-01`)
      .lte('attendance_date', `${selectedMonth}-31`)
      .order('attendance_date', { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'Department', 'Branch', 'Status', 'Clock In', 'Clock Out'];
    const rows = records.map(r => [r.attendance_date, r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '', r.departments?.name || '', r.branches?.name || '', r.status, r.clock_in_time || '', r.clock_out_time || '']);
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-report-${selectedMonth}.csv`;
    a.click();
  };

  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const rate = records.length > 0 ? Math.round(((present + late) / records.length) * 100) : 0;

  const columns: Column[] = [
    { key: 'date', header: 'Date', cell: (r: any) => formatDate(r.attendance_date) },
    { key: 'employee', header: 'Employee', cell: (r: any) => r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '-' },
    { key: 'department', header: 'Department', cell: (r: any) => r.departments?.name ?? '-' },
    { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'clock_in_time', header: 'Clock In' },
    { key: 'clock_out_time', header: 'Clock Out' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Report" description="Staff attendance, lateness, and absence" breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'Attendance' }]}>
        <div className="flex gap-2">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-auto" />
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Compliance Rate" value={`${rate}%`} icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Present" value={present} icon={<Users className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Late" value={late} icon={<Users className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Absent" value={absent} icon={<Users className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <Card><CardContent className="p-0"><DataTable columns={columns} data={records} loading={loading} emptyTitle="No attendance records" /></CardContent></Card>
    </div>
  );
}
