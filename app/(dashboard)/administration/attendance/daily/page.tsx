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
import { Calendar, Search, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DailyAttendancePage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'clockIn', header: 'Clock In' },
    { key: 'clockOut', header: 'Clock Out' },
    { key: 'workingHours', header: 'Working Hours' },
    { key: 'status', header: 'Status' },
  ];

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      const [attRes, deptRes, branchRes] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('*, employees(first_name, last_name, departments(name), branches(name))')
          .eq('company_id', company.id)
          .eq('attendance_date', selectedDate)
          .order('clock_in_time', { ascending: true, nullsFirst: false }),
        supabase
          .from('departments')
          .select('*')
          .eq('company_id', company.id),
        supabase
          .from('branches')
          .select('*')
          .eq('company_id', company.id),
      ]);

      let filteredData = attRes.data || [];
      if (selectedDepartment) {
        filteredData = filteredData.filter(r => r.department_id === selectedDepartment);
      }
      if (selectedBranch) {
        filteredData = filteredData.filter(r => r.branch_id === selectedBranch);
      }

      setAttendanceData(filteredData);
      setDepartments(deptRes.data || []);
      setBranches(branchRes.data || []);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [company?.id, selectedDate, selectedDepartment, selectedBranch]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      late: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      half_day: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      leave: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return (
      <Badge className={variants[status] || variants.present}>
        {status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </Badge>
    );
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return format(new Date(time), 'hh:mm a');
  };

  const filteredData = attendanceData.filter(item => {
    const emp = item.employees;
    const matchesSearch = !searchTerm || 
      `${emp?.first_name} ${emp?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formattedData = filteredData.map((item) => ({
    id: item.id,
    employee: `${item.employees?.first_name || ''} ${item.employees?.last_name || ''}`,
    department: item.employees?.departments?.name || '-',
    clockIn: formatTime(item.clock_in_time),
    clockOut: formatTime(item.clock_out_time),
    workingHours: item.working_hours || '0',
    status: getStatusBadge(item.status),
  }));

  return (
    <PermissionGuard permission="attendance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view attendance</div>}>
      <div className="space-y-6">
        <PageHeader
          title="Daily Attendance"
          description="View and manage daily attendance records"
          breadcrumbs={[
            { label: 'Administration', href: '/administration' },
            { label: 'Attendance', href: '/administration/attendance' },
            { label: 'Daily' },
          ]}
        >
          <PermissionGuard permission="attendance.export">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
        </PageHeader>

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
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
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
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No attendance records found for this date</p>
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
