'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, CheckCircle2, TrendingUp, Users, Plus, Download } from 'lucide-react';

const MOCK_REVIEWS = [
  { id: 1, name: 'Alice Johnson', role: 'Senior Engineer', reviewer: 'Mark Chen', score: '4.8 / 5', period: 'Q4 2024', status: 'completed' },
  { id: 2, name: 'Bob Martinez', role: 'Sales Executive', reviewer: 'Sarah Lin', score: '4.2 / 5', period: 'Q4 2024', status: 'completed' },
  { id: 3, name: 'Carol Lee', role: 'Finance Analyst', reviewer: 'Tom Brown', score: '—', period: 'Q4 2024', status: 'in_progress' },
  { id: 4, name: 'David Kim', role: 'HR Manager', reviewer: 'Jane Doe', score: '—', period: 'Q4 2024', status: 'pending' },
  { id: 5, name: 'Eva Williams', role: 'Marketing Lead', reviewer: 'Mark Chen', score: '4.5 / 5', period: 'Q4 2024', status: 'completed' },
];

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Reviews"
        description="Track employee performance evaluations and goals"
        breadcrumbs={[{ label: 'HR' }, { label: 'Performance' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Start Review Cycle</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Reviews Due"
          value={12}
          icon={<Award className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Completed"
          value={45}
          change={8.7}
          changeLabel="this quarter"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Avg Score"
          value="4.2 / 5"
          change={4.2}
          changeLabel="vs last quarter"
          icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Promotions"
          value={3}
          icon={<Users className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Q4 2024 Review Cycle</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Reviewer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Period</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Score</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_REVIEWS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{row.role}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.reviewer}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.period}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">{row.score}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full 360° review system with goal tracking and development plans available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
