'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function AttendanceReportsPage() {
  const [reportType, setReportType] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const reports = [
    {
      id: 'daily',
      title: 'Daily Attendance Report',
      description: 'View daily attendance for a specific date',
      icon: Calendar,
      color: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600',
    },
    {
      id: 'weekly',
      title: 'Weekly Attendance Report',
      description: 'Weekly attendance summary and trends',
      icon: BarChart3,
      color: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'monthly',
      title: 'Monthly Attendance Report',
      description: 'Comprehensive monthly attendance analysis',
      icon: TrendingUp,
      color: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-600',
    },
    {
      id: 'employee',
      title: 'Employee Attendance History',
      description: 'Individual employee attendance records',
      icon: FileText,
      color: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600',
    },
  ];

  const selectedReport = reports.find(r => r.id === reportType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Reports"
        description="Generate and export attendance reports"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Attendance', href: '/administration/attendance' },
          { label: 'Reports' },
        ]}
      >
        <Button size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((report) => (
          <Card
            key={report.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              reportType === report.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setReportType(report.id)}
          >
            <CardHeader className="pb-3">
              <div className={`w-10 h-10 rounded-xl ${report.color} flex items-center justify-center`}>
                <report.icon className={`h-5 w-5 ${report.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-sm">{report.title}</CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <selectedReport.icon className={`h-5 w-5 ${selectedReport?.iconColor}`} />
            {selectedReport?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="it">IT</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type={reportType === 'daily' ? 'date' : 'month'}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          <div className="border rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>Report preview will be displayed here</p>
            <p className="text-sm mt-2">Select report type and filters to generate report</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
