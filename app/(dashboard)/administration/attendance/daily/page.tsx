'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function DailyAttendancePage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'clockIn', header: 'Clock In' },
    { key: 'clockOut', header: 'Clock Out' },
    { key: 'workingHours', header: 'Working Hours' },
    { key: 'status', header: 'Status' },
  ];

  useEffect(() => {
    loadAttendance();
  }, [company?.id, selectedDate, selectedDepartment, selectedBranch]);

  const loadAttendance = async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from('attendance_records')
      .select('*, profiles(first_name, last_name), departments(name), branches(name)')
      .eq('company_id', company.id)
      .eq('attendance_date', selectedDate);

    if (selectedDepartment) {
      query = query.eq('department_id', selectedDepartment);
    }
    if (selectedBranch) {
      query = query.eq('branch_id', selectedBranch);
    }

    const { data } = await query.order('clock_in_time', { ascending: true });
    setAttendanceData(data || []);
    setLoading(false);
  };

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
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formattedData = attendanceData.map((item) => ({
    ...item,
    employee: `${item.profiles?.first_name || ''} ${item.profiles?.last_name || ''}`,
    department: item.departments?.name || '-',
    clockIn: formatTime(item.clock_in_time),
    clockOut: formatTime(item.clock_out_time),
    workingHours: item.working_hours || '0',
    status: getStatusBadge(item.status),
  }));

  return (
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
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
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedBranch || 'all'} onValueChange={(v) => setSelectedBranch(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="main">Main Office</SelectItem>
                  <SelectItem value="branch1">Branch 1</SelectItem>
                  <SelectItem value="branch2">Branch 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
