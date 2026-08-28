'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { KPICard } from '@/components/common/KPICard';
import { Clock, Search, LogIn, LogOut, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ClockInOutPage() {
  const { company, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState<string | null>(null);
  const [clockingOut, setClockingOut] = useState<string | null>(null);

  const columns = [
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'clockIn', header: 'Clock In' },
    { key: 'clockOut', header: 'Clock Out' },
    { key: 'workingHours', header: 'Working Hours' },
    { key: 'actions', header: 'Actions' },
  ];

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      const [empRes, deptRes, attRes] = await Promise.all([
        supabase
          .from('employees')
          .select('*, departments(name)')
          .eq('company_id', company.id)
          .eq('status', 'active'),
        supabase
          .from('departments')
          .select('*')
          .eq('company_id', company.id),
        supabase
          .from('attendance_records')
          .select('*, employees(first_name, last_name, departments(name))')
          .eq('company_id', company.id)
          .eq('attendance_date', selectedDate),
      ]);

      setEmployees(empRes.data || []);
      setDepartments(deptRes.data || []);
      setAttendanceData(attRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [company?.id, selectedDate]);

  const handleClockIn = async (employeeId: string) => {
    if (!company?.id || !user?.id) return;
    setClockingIn(employeeId);

    try {
      const now = new Date();
      const { error } = await supabase.from('attendance_records').insert({
        company_id: company.id,
        employee_id: employeeId,
        attendance_date: selectedDate,
        clock_in_time: now.toISOString(),
        status: 'present',
      });

      if (error) throw error;

      await logAuditEvent(company.id, user.id, {
        action: 'clock_in',
        module: 'attendance',
        entity_type: 'attendance_records',
        new_value: { employee_id: employeeId, date: selectedDate, time: now.toISOString() },
      });

      toast.success('Clocked in successfully');
      loadData();
    } catch (error) {
      console.error('Clock in error:', error);
      toast.error('Failed to clock in');
    } finally {
      setClockingIn(null);
    }
  };

  const handleClockOut = async (recordId: string) => {
    if (!company?.id || !user?.id) return;
    setClockingOut(recordId);

    try {
      const now = new Date();
      const { error } = await supabase
        .from('attendance_records')
        .update({
          clock_out_time: now.toISOString(),
          status: 'present',
        })
        .eq('id', recordId);

      if (error) throw error;

      await logAuditEvent(company.id, user.id, {
        action: 'clock_out',
        module: 'attendance',
        entity_type: 'attendance_records',
        entity_id: recordId,
        new_value: { time: now.toISOString() },
      });

      toast.success('Clocked out successfully');
      loadData();
    } catch (error) {
      console.error('Clock out error:', error);
      toast.error('Failed to clock out');
    } finally {
      setClockingOut(null);
    }
  };

  const calculateWorkingHours = (clockIn: string, clockOut: string | null) => {
    if (!clockIn) return '0';
    const inTime = new Date(clockIn);
    const outTime = clockOut ? new Date(clockOut) : new Date();
    const diffMs = outTime.getTime() - inTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    return format(new Date(timeStr), 'hh:mm a');
  };

  const getAttendanceForEmployee = (employeeId: string) => {
    return attendanceData.find(a => a.employee_id === employeeId);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchTerm || 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !selectedDepartment || emp.department_id === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const formattedData = filteredEmployees.map(emp => {
    const attendance = getAttendanceForEmployee(emp.id);
    const hasClockedIn = !!attendance?.clock_in_time;
    const hasClockedOut = !!attendance?.clock_out_time;

    return {
      id: emp.id,
      employee: `${emp.first_name} ${emp.last_name}`,
      department: emp.departments?.name || 'N/A',
      clockIn: formatTime(attendance?.clock_in_time || null),
      clockOut: formatTime(attendance?.clock_out_time || null),
      workingHours: hasClockedIn ? calculateWorkingHours(attendance?.clock_in_time, attendance?.clock_out_time) : '0',
      hasClockedIn,
      hasClockedOut,
      recordId: attendance?.id,
      actions: (
        <PermissionGuard permission="attendance.edit">
          <div className="flex gap-2">
            {!hasClockedIn && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8"
                onClick={() => handleClockIn(emp.id)}
                disabled={clockingIn === emp.id}
              >
                {clockingIn === emp.id ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <LogIn className="h-3 w-3 mr-1" />
                )}
                Clock In
              </Button>
            )}
            {hasClockedIn && !hasClockedOut && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8"
                onClick={() => attendance?.id && handleClockOut(attendance.id)}
                disabled={clockingOut === attendance?.id}
              >
                {clockingOut === attendance?.id ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <LogOut className="h-3 w-3 mr-1" />
                )}
                Clock Out
              </Button>
            )}
            {hasClockedIn && hasClockedOut && (
              <Badge variant="secondary" className="h-8 flex items-center">
                Complete
              </Badge>
            )}
          </div>
        </PermissionGuard>
      ),
    };
  });

  const clockedInCount = attendanceData.filter(a => a.clock_in_time && !a.clock_out_time).length;
  const notClockedInCount = employees.length - attendanceData.filter(a => a.clock_in_time).length;
  const completedRecords = attendanceData.filter(a => a.clock_in_time && a.clock_out_time);
  const avgHours = completedRecords.length > 0
    ? (completedRecords.reduce((sum, r) => sum + parseFloat(calculateWorkingHours(r.clock_in_time, r.clock_out_time)), 0) / completedRecords.length).toFixed(1)
    : '0';

  return (
    <PermissionGuard permission="attendance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view attendance</div>}>
      <div className="space-y-6">
        <PageHeader
          title="Clock In / Clock Out"
          description="Manage employee clock in and clock out"
          breadcrumbs={[
            { label: 'Administration', href: '/administration' },
            { label: 'Attendance', href: '/administration/attendance' },
            { label: 'Clock In/Out' },
          ]}
        >
          <PermissionGuard permission="attendance.export">
            <Button size="sm" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </PermissionGuard>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Clocked In Today"
            value={clockedInCount}
            icon={<Clock className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
          <KPICard
            title="Not Clocked In"
            value={notClockedInCount}
            icon={<LogIn className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            loading={loading}
          />
          <KPICard
            title="Average Hours Today"
            value={avgHours}
            icon={<Clock className="h-4 w-4 text-emerald-600" />}
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
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : formattedData.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No attendance records found</p>
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
