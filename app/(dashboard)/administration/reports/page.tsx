'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, FileText, Calendar, Users, DollarSign, TrendingUp, Printer, Briefcase } from 'lucide-react';
import { format, subMonths } from 'date-fns';

export default function AdministrationReportsPage() {
  const { company } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [totalReports, setTotalReports] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [avgAttendanceRate, setAvgAttendanceRate] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [loading, setLoading] = useState(true);

  const reports = [
    {
      id: 'attendance',
      title: 'Attendance Reports',
      description: 'Staff attendance, lateness, and absence reports',
      icon: Users,
      color: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600',
      href: '/administration/reports/attendance',
    },
    {
      id: 'inspections',
      title: 'Inspection Reports',
      description: 'Office inspection findings and compliance reports',
      icon: FileText,
      color: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600',
      href: '/administration/reports/inspections',
    },
    {
      id: 'maintenance',
      title: 'Maintenance Reports',
      description: 'Facility maintenance costs and performance',
      icon: TrendingUp,
      color: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-600',
      href: '/administration/reports/maintenance',
    },
    {
      id: 'fuel',
      title: 'Fuel Reports',
      description: 'Vehicle fuel consumption and cost analysis',
      icon: DollarSign,
      color: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600',
      href: '/administration/reports/fuel',
    },
    {
      id: 'assets',
      title: 'Asset Reports',
      description: 'Company assets valuation and movement history',
      icon: BarChart3,
      color: 'bg-red-50 dark:bg-red-950/30',
      iconColor: 'text-red-600',
      href: '/administration/reports/assets',
    },
    {
      id: 'purchases',
      title: 'Purchase Reports',
      description: 'Purchase requests and spending analysis',
      icon: Calendar,
      color: 'bg-indigo-50 dark:bg-indigo-950/30',
      iconColor: 'text-indigo-600',
      href: '/administration/reports/purchases',
    },
  ];

  useEffect(() => {
    loadStats();
  }, [company?.id, selectedMonth]);

  const loadStats = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [employeesResult, assetsResult, spendResult, attendanceResult, approvalsResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
      supabase.from('assets').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
      supabase.from('purchase_requests').select('estimated_cost').eq('company_id', company.id).gte('created_at', `${selectedMonth}-01`).lte('created_at', `${selectedMonth}-31`),
      supabase.from('attendance_records').select('status').eq('company_id', company.id).gte('attendance_date', `${selectedMonth}-01`).lte('attendance_date', `${selectedMonth}-31`),
      supabase.from('request_approvals').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending'),
    ]);

    const spendSum = (spendResult.data || []).reduce((sum, item) => sum + (item.estimated_cost || 0), 0);
    const attendanceRecords = attendanceResult.data || [];
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const attendanceRate = attendanceRecords.length > 0 ? (presentCount / attendanceRecords.length) * 100 : 0;

    setActiveEmployees(employeesResult.count || 0);
    setTotalAssets(assetsResult.count || 0);
    setTotalSpend(spendSum);
    setAvgAttendanceRate(attendanceRate);
    setPendingApprovals(approvalsResult.count || 0);
    setTotalReports(reports.length);
    setLoading(false);
  };

  const exportAttendanceCSV = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('attendance_records')
      .select('*, profiles(first_name, last_name), departments(name), branches(name)')
      .eq('company_id', company.id)
      .gte('attendance_date', `${selectedMonth}-01`)
      .lte('attendance_date', `${selectedMonth}-31`);

    const headers = ['Date', 'Employee', 'Department', 'Branch', 'Status', 'Clock In', 'Clock Out', 'Working Hours'];
    const rows = (data || []).map(r => [
      r.attendance_date,
      r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '',
      r.departments?.name || '',
      r.branches?.name || '',
      r.status,
      r.clock_in_time || '',
      r.clock_out_time || '',
      r.working_hours || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedMonth}.csv`;
    a.click();
  };

  const exportAssetsCSV = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('assets')
      .select('*, departments(name), branches(name)')
      .eq('company_id', company.id);

    const headers = ['Asset Name', 'Category', 'Department', 'Branch', 'Status', 'Purchase Date', 'Cost', 'Condition'];
    const rows = (data || []).map(r => [
      r.name,
      r.category,
      r.departments?.name || '',
      r.branches?.name || '',
      r.status,
      r.purchase_date || '',
      r.cost || '',
      r.condition || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportSpendingCSV = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('purchase_requests')
      .select('*, profiles(first_name, last_name), departments(name)')
      .eq('company_id', company.id)
      .gte('created_at', `${selectedMonth}-01`)
      .lte('created_at', `${selectedMonth}-31`);

    const headers = ['Request #', 'Title', 'Requester', 'Department', 'Amount', 'Status', 'Requested Date'];
    const rows = (data || []).map(r => [
      r.request_number || '',
      r.title,
      r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '',
      r.departments?.name || '',
      r.estimated_cost || '',
      r.status,
      r.requested_date || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spending-report-${selectedMonth}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PermissionGuard permission="reports.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view reports</div>}>
        <PageHeader
          title="Administration Reports"
          description="Generate and view administrative reports"
          breadcrumbs={[
            { label: 'Administration', href: '/administration' },
            { label: 'Reports' },
          ]}
        >
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
            <PermissionGuard permission="reports.export">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </PermissionGuard>
          </div>
        </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Reports Generated"
          value={loading ? 0 : totalReports}
          icon={<FileText className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Active Employees"
          value={loading ? 0 : activeEmployees}
          icon={<Users className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Total Assets"
          value={loading ? 0 : totalAssets}
          icon={<BarChart3 className="h-4 w-4 text-purple-600" />}
          iconBg="bg-purple-50 dark:bg-purple-950/50"
        />
        <KPICard
          title="Total Spend"
          value={loading ? 0 : totalSpend}
          prefix="$"
          icon={<DollarSign className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Avg Attendance Rate"
          value={loading ? 0 : avgAttendanceRate.toFixed(1)}
          suffix="%"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Pending Approvals"
          value={loading ? 0 : pendingApprovals}
          icon={<Calendar className="h-4 w-4 text-red-600" />}
          iconBg="bg-red-50 dark:bg-red-950/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-all">
            <CardHeader>
              <div className={`w-10 h-10 rounded-xl ${report.color} flex items-center justify-center`}>
                <report.icon className={`h-5 w-5 ${report.iconColor}`} />
              </div>
              <CardTitle className="text-lg mt-3">{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">{report.description}</p>
              <Button size="sm" variant="outline" className="mt-4 w-full">
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Export</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={exportAttendanceCSV}>
              <FileText className="h-5 w-5" />
              <span className="text-sm">Attendance CSV</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={exportAssetsCSV}>
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm">Assets CSV</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={exportSpendingCSV}>
              <DollarSign className="h-5 w-5" />
              <span className="text-sm">Spending CSV</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={handlePrint}>
              <Printer className="h-5 w-5" />
              <span className="text-sm">Print Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      </PermissionGuard>
    </div>
  );
}
