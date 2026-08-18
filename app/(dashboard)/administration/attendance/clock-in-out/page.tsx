'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Search, LogIn, LogOut, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ClockInOutPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const columns = [
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'clockIn', header: 'Clock In' },
    { key: 'clockOut', header: 'Clock Out' },
    { key: 'workingHours', header: 'Working Hours' },
    { key: 'actions', header: 'Actions' },
  ];

  const mockData = [
    {
      id: '1',
      employee: 'John Doe',
      department: 'HR',
      clockIn: '08:45 AM',
      clockOut: '-',
      workingHours: '4.25',
      hasClockedIn: true,
      hasClockedOut: false,
    },
    {
      id: '2',
      employee: 'Jane Smith',
      department: 'Finance',
      clockIn: '09:15 AM',
      clockOut: '05:45 PM',
      workingHours: '8.5',
      hasClockedIn: true,
      hasClockedOut: true,
    },
    {
      id: '3',
      employee: 'Bob Johnson',
      department: 'IT',
      clockIn: '-',
      clockOut: '-',
      workingHours: '0',
      hasClockedIn: false,
      hasClockedOut: false,
    },
    {
      id: '4',
      employee: 'Alice Williams',
      department: 'Operations',
      clockIn: '08:30 AM',
      clockOut: '-',
      workingHours: '5.5',
      hasClockedIn: true,
      hasClockedOut: false,
    },
  ];

  const formattedData = mockData.map((item) => ({
    ...item,
    actions: (
      <div className="flex gap-2">
        {!item.hasClockedIn && (
          <Button size="sm" variant="outline" className="h-8">
            <LogIn className="h-3 w-3 mr-1" />
            Clock In
          </Button>
        )}
        {item.hasClockedIn && !item.hasClockedOut && (
          <Button size="sm" variant="outline" className="h-8">
            <LogOut className="h-3 w-3 mr-1" />
            Clock Out
          </Button>
        )}
        {item.hasClockedIn && item.hasClockedOut && (
          <Badge variant="secondary" className="h-8 flex items-center">
            Complete
          </Badge>
        )}
      </div>
    ),
  }));

  return (
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Clocked In Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-gray-500 mt-1">Employees currently at work</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Not Clocked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-gray-500 mt-1">Employees yet to clock in</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Hours Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7.2</div>
            <p className="text-xs text-gray-500 mt-1">Hours per employee</p>
          </CardContent>
        </Card>
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
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            searchable={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
