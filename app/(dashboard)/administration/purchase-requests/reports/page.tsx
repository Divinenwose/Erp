'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseRequestsReportsPage() {
  const { company } = useAuth();
  const [reportType, setReportType] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, value: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const loadSummary = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('purchase_requests')
        .select('status, estimated_cost')
        .eq('company_id', company.id)
        .gte('created_at', `${selectedMonth}-01`)
        .lte('created_at', `${selectedMonth}-31`);
      const rows = data ?? [];
      setSummary({
        total: rows.length,
        pending: rows.filter(row => ['pending', 'submitted', 'under_review', 'md_approval', 'accounts_review'].includes(row.status)).length,
        approved: rows.filter(row => ['approved', 'vendor_assigned', 'completed'].includes(row.status)).length,
        value: rows.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0),
      });
      setLoading(false);
    };
    loadSummary();
  }, [company?.id, selectedMonth]);

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
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-[200px]" />
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
            {loading ? <p>Loading report data...</p> : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <div><p className="text-xs uppercase tracking-wide">Requests</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.total}</p></div>
                <div><p className="text-xs uppercase tracking-wide">Pending</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.pending}</p></div>
                <div><p className="text-xs uppercase tracking-wide">Approved</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.approved}</p></div>
                <div><p className="text-xs uppercase tracking-wide">Estimated Value</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">${summary.value.toLocaleString()}</p></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
