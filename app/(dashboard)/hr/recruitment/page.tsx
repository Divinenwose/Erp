'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Calendar, UserCheck, Plus, Download } from 'lucide-react';

const MOCK_POSITIONS = [
  { id: 1, title: 'Senior Software Engineer', department: 'Engineering', applications: 34, interviews: 6, posted: 'Dec 1', status: 'active' },
  { id: 2, title: 'Sales Account Manager', department: 'Sales', applications: 22, interviews: 4, posted: 'Dec 5', status: 'active' },
  { id: 3, title: 'UX Designer', department: 'Product', applications: 18, interviews: 3, posted: 'Dec 8', status: 'active' },
  { id: 4, title: 'Finance Analyst', department: 'Finance', applications: 28, interviews: 5, posted: 'Nov 28', status: 'active' },
  { id: 5, title: 'DevOps Engineer', department: 'Engineering', applications: 22, interviews: 0, posted: 'Dec 10', status: 'draft' },
];

export default function RecruitmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Manage open positions and job applications"
        breadcrumbs={[{ label: 'HR' }, { label: 'Recruitment' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Position</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Open Positions"
          value={8}
          icon={<Briefcase className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Applications"
          value={124}
          change={12.4}
          changeLabel="this month"
          icon={<Users className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
        <KPICard
          title="Interviews Scheduled"
          value={18}
          icon={<Calendar className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Hired This Month"
          value={4}
          change={33.3}
          changeLabel="vs last month"
          icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Open Positions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Department</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Applications</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Interviews</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Posted</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_POSITIONS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.department}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.applications}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.interviews}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.posted}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full ATS with pipeline management and interview scheduling available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
