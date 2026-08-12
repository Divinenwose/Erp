'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseRequestsReportsPage() {
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const reports = [
    {
      id: 'monthly',
      title: 'Monthly Summary',
      description: 'Monthly purchase request summary and trends',
      icon: Calendar,
      color: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600',
    },
    {
      id: 'department',
      title: 'Department Breakdown',
      description: 'Purchase requests by department',
      icon: FileText,
      color: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'category',
      title: 'Category Analysis',
      description: 'Spending analysis by category',
      icon: TrendingUp,
      color: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-600',
    },
    {
      id: 'approval',
      title: 'Approval Workflow',
      description: 'Approval time and efficiency metrics',
      icon: DollarSign,
      color: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600',
    },
  ];

  const selectedReport = reports.find(r => r.id === reportType);
  const ReportIcon = selectedReport?.icon ?? Calendar;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Request Reports"
        description="Generate and export purchase request reports"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Purchase Requests', href: '/administration/purchase-requests' },
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
            <ReportIcon className={`h-5 w-5 ${selectedReport?.iconColor ?? 'text-blue-600'}`} />
            {selectedReport?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-01">January 2024</SelectItem>
                <SelectItem value="2023-12">December 2023</SelectItem>
                <SelectItem value="2023-11">November 2023</SelectItem>
              </SelectContent>
            </Select>
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
