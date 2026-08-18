'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Download, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function LatenessPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const columns = [
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'date', header: 'Date' },
    { key: 'scheduledTime', header: 'Scheduled Time' },
    { key: 'actualTime', header: 'Actual Time' },
    { key: 'lateMinutes', header: 'Late Minutes' },
    { key: 'reason', header: 'Reason' },
  ];

  const mockData = [
    {
      id: '1',
      employee: 'Jane Smith',
      department: 'Finance',
      date: '2024-01-15',
      scheduledTime: '08:00 AM',
      actualTime: '09:15 AM',
      lateMinutes: 75,
      reason: 'Traffic delay',
    },
    {
      id: '2',
      employee: 'John Doe',
      department: 'HR',
      date: '2024-01-14',
      scheduledTime: '08:00 AM',
      actualTime: '08:45 AM',
      lateMinutes: 45,
      reason: 'Car breakdown',
    },
    {
      id: '3',
      employee: 'Bob Johnson',
      department: 'IT',
      date: '2024-01-13',
      scheduledTime: '08:00 AM',
      actualTime: '08:30 AM',
      lateMinutes: 30,
      reason: 'Overslept',
    },
    {
      id: '4',
      employee: 'Alice Williams',
      department: 'Operations',
      date: '2024-01-12',
      scheduledTime: '08:00 AM',
      actualTime: '09:00 AM',
      lateMinutes: 60,
      reason: 'Medical appointment',
    },
  ];

  const getLatenessBadge = (minutes: number) => {
    if (minutes >= 60) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Severe</Badge>;
    } else if (minutes >= 30) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Moderate</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Minor</Badge>;
  };

  const formattedData = mockData.map((item) => ({
    ...item,
    lateMinutes: (
      <div className="flex items-center gap-2">
        <span className="font-medium">{item.lateMinutes} min</span>
        {getLatenessBadge(item.lateMinutes)}
      </div>
    ),
  }));

  return (
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
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Late This Month</p>
                <p className="text-2xl font-bold">24</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Late Minutes</p>
                <p className="text-2xl font-bold">32</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Repeat Offenders</p>
                <p className="text-2xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Improvement</p>
                <p className="text-2xl font-bold">-12%</p>
              </div>
            </div>
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
            searchable={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
