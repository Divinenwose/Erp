'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import KPICard from '@/components/common/KPICard';
import { Search, Download, AlertTriangle, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export default function LatenessPage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'date', header: 'Date' },
    { key: 'scheduledTime', header: 'Scheduled Time' },
    { key: 'actualTime', header: 'Actual Time' },
    { key: 'lateMinutes', header: 'Late Minutes' },
    { key: 'reason', header: 'Reason' },
  ];

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      const monthStart = startOfMonth(new Date(selectedMonth));
      const monthEnd = endOfMonth(new Date(selectedMonth));

      const [attRes, deptRes, branchRes] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('*, employees(first_name, last_name, departments(name), branches(name))')
          .eq('company_id', company.id)
          .gt('late_minutes', 0)
          .gte('attendance_date', monthStart.toISOString().split('T')[0])
          .lte('attendance_date', monthEnd.toISOString().split('T')[0])
          .order('attendance_date', { ascending: false }),
        supabase
          .from('departments')
          .select('*')
          .eq('company_id', company.id),
        supabase
          .from('branches')
          .select('*')
          .eq('company_id', company.id),
      ]);

      setAttendanceData(attRes.data || []);
      setDepartments(deptRes.data || []);
      setBranches(branchRes.data || []);
    } catch (error) {
      console.error('Error loading lateness data:', error);
      toast.error('Failed to load lateness data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [company?.id, selectedMonth]);

  const getLatenessBadge = (minutes: number) => {
    if (minutes >= 60) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Severe</Badge>;
    } else if (minutes >= 30) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Moderate</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Minor</Badge>;
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    return format(new Date(timeStr), 'hh:mm a');
  };

  const filteredData = attendanceData.filter(record => {
    const emp = record.employees;
    const matchesSearch = !searchTerm || 
      `${emp?.first_name} ${emp?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !selectedDepartment || record.department_id === selectedDepartment;
    const matchesBranch = !selectedBranch || record.branch_id === selectedBranch;
    return matchesSearch && matchesDepartment && matchesBranch;
  });

  const formattedData = filteredData.map((record) => ({
    id: record.id,
    employee: `${record.employees?.first_name} ${record.employees?.last_name}`,
    department: record.employees?.departments?.name || 'N/A',
    date: format(new Date(record.attendance_date), 'MMM dd, yyyy'),
    scheduledTime: '08:00 AM', // Default start time - could be configured per company
    actualTime: formatTime(record.clock_in_time),
    lateMinutes: (
      <div className="flex items-center gap-2">
        <span className="font-medium">{record.late_minutes} min</span>
        {getLatenessBadge(record.late_minutes)}
      </div>
    ),
    reason: record.notes || '-',
  }));

  // Calculate KPIs
  const totalLateThisMonth = attendanceData.length;
  const avgLateMinutes = totalLateThisMonth > 0
    ? Math.round(attendanceData.reduce((sum, r) => sum + (r.late_minutes || 0), 0) / totalLateThisMonth)
    : 0;
  
  // Count repeat offenders (employees with 3+ late arrivals this month)
  const lateByEmployee = attendanceData.reduce<Record<string, number>>((acc, r) => {
    const empId = r.employee_id;
    acc[empId] = (acc[empId] || 0) + 1;
    return acc;
  }, {});
  const repeatOffenders = Object.values(lateByEmployee).filter((count: number) => count >= 3).length;
  
  // Calculate improvement (compare with previous month - simplified for now)
  const improvement = -12; // This would be calculated from historical data

  return (
    <PermissionGuard permission="attendance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view lateness</div>}>
      <div className="space-y-6">
        <PageHeader
          title="Lateness Register"
          description="Track employee late arrivals and patterns"
          breadcrumbs={[
            { label: 'Administration', href: '/administration' },
            { label: 'Attendance', href: '/administration/attendance' },
            { label: 'Lateness' },
          ]}
        >
          <PermissionGuard permission="attendance.export">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Late This Month"
            value={totalLateThisMonth}
            icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            iconBg="bg-red-50 dark:bg-red-950/50"
            loading={loading}
          />
          <KPICard
            title="Avg Late Minutes"
            value={avgLateMinutes}
            icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            loading={loading}
          />
          <KPICard
            title="Repeat Offenders"
            value={repeatOffenders}
            icon={<Calendar className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
          <KPICard
            title="Improvement"
            value={`${improvement}%`}
            icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/50"
            loading={loading}
          />
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-auto"
                />
                <Select value={selectedDepartment || 'all'} onValueChange={(v) => setSelectedDepartment(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedBranch || 'all'} onValueChange={(v) => setSelectedBranch(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : formattedData.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No lateness records found for this period</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={formattedData}
                searchable={false}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
