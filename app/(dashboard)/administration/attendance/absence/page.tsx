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
import { Search, Download, AlertTriangle, Calendar, UserX, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export default function AbsencePage() {
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
    { key: 'type', header: 'Absence Type' },
    { key: 'duration', header: 'Duration' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status' },
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
          .in('status', ['absent', 'leave', 'half_day'])
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
      console.error('Error loading absence data:', error);
      toast.error('Failed to load absence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [company?.id, selectedMonth]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      unexcused: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      leave: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      half_day: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const getAbsenceType = (status: string, notes: string | null) => {
    if (status === 'leave') {
      if (notes?.toLowerCase().includes('sick')) return 'Sick Leave';
      if (notes?.toLowerCase().includes('vacation') || notes?.toLowerCase().includes('annual')) return 'Annual Leave';
      return 'Personal Leave';
    }
    if (status === 'absent') return 'Unexcused';
    if (status === 'half_day') return 'Half Day';
    return status;
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
    type: getAbsenceType(record.status, record.notes),
    duration: '1 day', // Could be calculated from multiple records
    reason: record.notes || '-',
    status: getStatusBadge(record.status),
  }));

  // Calculate KPIs
  const totalAbsences = attendanceData.length;
  const unexcusedAbsences = attendanceData.filter(r => r.status === 'absent').length;
  const sickLeaveDays = attendanceData.filter(r => 
    r.status === 'leave' && r.notes?.toLowerCase().includes('sick')
  ).length;
  const annualLeaveDays = attendanceData.filter(r => 
    r.status === 'leave' && (r.notes?.toLowerCase().includes('vacation') || r.notes?.toLowerCase().includes('annual'))
  ).length;

  return (
    <PermissionGuard permission="attendance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view absences</div>}>
      <div className="space-y-6">
        <PageHeader
          title="Absence Register"
          description="Monitor employee absences and leave records"
          breadcrumbs={[
            { label: 'Administration', href: '/administration' },
            { label: 'Attendance', href: '/administration/attendance' },
            { label: 'Absence' },
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
            title="Total Absences This Month"
            value={totalAbsences}
            icon={<UserX className="h-4 w-4 text-red-600" />}
            iconBg="bg-red-50 dark:bg-red-950/50"
            loading={loading}
          />
          <KPICard
            title="Unexcused Absences"
            value={unexcusedAbsences}
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            loading={loading}
          />
          <KPICard
            title="Sick Leave Days"
            value={sickLeaveDays}
            icon={<Calendar className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
          <KPICard
            title="Annual Leave Days"
            value={annualLeaveDays}
            icon={<UserX className="h-4 w-4 text-emerald-600" />}
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
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No absence records found for this period</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={formattedData}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
