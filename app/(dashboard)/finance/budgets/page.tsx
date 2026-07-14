'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, TrendingDown, DollarSign, BarChart3, Plus, Download } from 'lucide-react';

const MOCK_BUDGETS = [
  { id: 1, department: 'Engineering', allocated: '$480,000', spent: '$382,400', remaining: '$97,600', utilization: 80, status: 'on_track' },
  { id: 2, department: 'Sales & Marketing', allocated: '$620,000', spent: '$498,000', remaining: '$122,000', utilization: 80, status: 'on_track' },
  { id: 3, department: 'Finance & Admin', allocated: '$280,000', spent: '$224,000', remaining: '$56,000', utilization: 80, status: 'on_track' },
  { id: 4, department: 'Human Resources', allocated: '$180,000', spent: '$162,000', remaining: '$18,000', utilization: 90, status: 'at_risk' },
  { id: 5, department: 'IT & Infrastructure', allocated: '$240,000', spent: '$235,000', remaining: '$5,000', utilization: 98, status: 'over_budget' },
];

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Monitor departmental budgets and spending"
        breadcrumbs={[{ label: 'Finance' }, { label: 'Budgets' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Budget</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Budget"
          value="$2.4M"
          icon={<PieChart className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Total Spent"
          value="$1.8M"
          change={4.2}
          changeLabel="this period"
          icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
        />
        <KPICard
          title="Remaining"
          value="$600K"
          icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Utilization"
          value="75%"
          change={-2.1}
          changeLabel="vs last period"
          icon={<BarChart3 className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Department Budgets – FY 2024</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Department</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Allocated</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Spent</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Remaining</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 min-w-[120px]">Utilization</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_BUDGETS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.department}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.allocated}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.spent}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{row.remaining}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 max-w-[80px]">
                          <div
                            className={`h-1.5 rounded-full ${row.utilization >= 95 ? 'bg-rose-500' : row.utilization >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${row.utilization}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{row.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full budget planning with forecasting, variance analysis, and approval workflows available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
