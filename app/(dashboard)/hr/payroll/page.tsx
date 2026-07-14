'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle2, Clock, Calendar, Download, Play } from 'lucide-react';

const MOCK_PAYROLL = [
  { id: 1, name: 'Alice Johnson', role: 'Senior Engineer', department: 'Engineering', gross: '$8,200', deductions: '$1,230', net: '$6,970', status: 'processed' },
  { id: 2, name: 'Bob Martinez', role: 'Sales Executive', department: 'Sales', gross: '$5,800', deductions: '$870', net: '$4,930', status: 'processed' },
  { id: 3, name: 'Carol Lee', role: 'Finance Analyst', department: 'Finance', gross: '$6,400', deductions: '$960', net: '$5,440', status: 'pending' },
  { id: 4, name: 'David Kim', role: 'HR Manager', department: 'HR', gross: '$7,100', deductions: '$1,065', net: '$6,035', status: 'processed' },
  { id: 5, name: 'Eva Williams', role: 'Marketing Lead', department: 'Marketing', gross: '$6,900', deductions: '$1,035', net: '$5,865', status: 'pending' },
];

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Manage employee payroll and compensation"
        breadcrumbs={[{ label: 'HR' }, { label: 'Payroll' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Play className="h-4 w-4 mr-2" />Run Payroll</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Payroll"
          value="$284,500"
          change={3.1}
          changeLabel="vs last month"
          icon={<CreditCard className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Processed"
          value={92}
          change={1.2}
          changeLabel="this cycle"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Pending"
          value={3}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Next Pay Run"
          value="Dec 31"
          icon={<Calendar className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Current Pay Period</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Department</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Gross</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Net Pay</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_PAYROLL.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{row.role}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.department}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.gross}</td>
                    <td className="px-4 py-3 text-right text-red-500">{row.deductions}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{row.net}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full payroll processing with tax calculations and direct deposits available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
