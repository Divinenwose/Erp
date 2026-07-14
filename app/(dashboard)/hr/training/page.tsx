'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Award, TrendingUp, Plus, Download } from 'lucide-react';

const MOCK_COURSES = [
  { id: 1, title: 'Leadership Essentials', category: 'Soft Skills', enrolled: 18, completed: 12, duration: '8h', status: 'active' },
  { id: 2, title: 'Data Analysis with Python', category: 'Technical', enrolled: 22, completed: 15, duration: '16h', status: 'active' },
  { id: 3, title: 'Compliance & Ethics 2024', category: 'Compliance', enrolled: 95, completed: 88, duration: '4h', status: 'active' },
  { id: 4, title: 'Project Management (PMP)', category: 'Management', enrolled: 14, completed: 9, duration: '24h', status: 'active' },
  { id: 5, title: 'Customer Service Excellence', category: 'Soft Skills', enrolled: 30, completed: 27, duration: '6h', status: 'active' },
];

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Training & Development"
        description="Manage employee learning and development programs"
        breadcrumbs={[{ label: 'HR' }, { label: 'Training' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Course</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Courses"
          value={14}
          icon={<BookOpen className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Enrolled"
          value={68}
          change={6.2}
          changeLabel="this month"
          icon={<Users className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
        <KPICard
          title="Completed"
          value={234}
          change={11.4}
          changeLabel="this quarter"
          icon={<Award className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Avg Completion"
          value="78%"
          change={3.1}
          changeLabel="vs last quarter"
          icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Active Courses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Course</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Enrolled</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Completed</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_COURSES.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.category}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.enrolled}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.completed}</td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{row.duration}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full LMS with video content, quizzes, and certificates available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
