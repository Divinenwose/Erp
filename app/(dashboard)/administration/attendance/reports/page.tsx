'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Calendar, BarChart3, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AttendanceReportsPage() {
  const { company } = useAuth();
  const [reportType, setReportType] = useState('daily');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[] | null>(null);

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
  const ReportIcon = selectedReport?.icon ?? Calendar;

  useEffect(() => {
    if (company?.id) {
      loadDepartments();
    }
  }, [company?.id]);

  const loadDepartments = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', company.id);
    setDepartments(data || []);
  };

  const generateReport = async () => {
    if (!company?.id) return;
    setLoading(true);
    setReportData(null);

    try {
      let query = supabase
        .from('attendance_records')
        .select('*, employees(first_name, last_name, departments(name))')
        .eq('company_id', company.id);

      if (reportType === 'daily') {
        query = query.eq('attendance_date', selectedMonth);
      } else {
        const monthStart = new Date(selectedMonth + '-01').toISOString().split('T')[0];
        const monthEnd = new Date(selectedMonth + '-01').toISOString().split('T')[0];
        query = query.gte('attendance_date', monthStart).lte('attendance_date', monthEnd);
      }

      if (selectedDepartment) {
        query = query.eq('department_id', selectedDepartment);
      }

      const { data, error } = await query.order('attendance_date', { ascending: false });

      if (error) throw error;
      setReportData(data || []);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data to export');
      return;
    }
    toast.success('Excel export initiated');
    // TODO: Implement actual Excel export
  };

  const handlePrint = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data to print');
      return;
    }
    window.print();
  };

  return (
    <PermissionGuard permission="attendance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view reports</div>}>
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
          <PermissionGuard permission="attendance.export">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </PermissionGuard>
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
              <ReportIcon className={`h-5 w-5 ${selectedReport?.iconColor ?? 'text-blue-600'}`} />
              {selectedReport?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <Select value={selectedDepartment || 'all'} onValueChange={(v) => setSelectedDepartment(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type={reportType === 'daily' ? 'date' : 'month'}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
              <Button onClick={generateReport} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Generate Report
              </Button>
              <PermissionGuard permission="attendance.export">
                <Button variant="outline" onClick={handleExportExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="attendance.export">
                <Button variant="outline" onClick={handlePrint}>
                  <FileText className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </PermissionGuard>
            </div>

            {loading ? (
              <div className="border rounded-lg p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">Generating report...</p>
              </div>
            ) : reportData === null ? (
              <div className="border rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>Report preview will be displayed here</p>
                <p className="text-sm mt-2">Select report type and filters to generate report</p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>No data found for the selected criteria</p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Showing {reportData.length} records
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Employee</th>
                        <th className="text-left p-2">Department</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Clock In</th>
                        <th className="text-left p-2">Clock Out</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((record) => (
                        <tr key={record.id} className="border-b">
                          <td className="p-2">{record.employees?.first_name} {record.employees?.last_name}</td>
                          <td className="p-2">{record.employees?.departments?.name || '-'}</td>
                          <td className="p-2">{format(new Date(record.attendance_date), 'MMM dd, yyyy')}</td>
                          <td className="p-2">{record.clock_in_time ? format(new Date(record.clock_in_time), 'hh:mm a') : '-'}</td>
                          <td className="p-2">{record.clock_out_time ? format(new Date(record.clock_out_time), 'hh:mm a') : '-'}</td>
                          <td className="p-2">{record.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
