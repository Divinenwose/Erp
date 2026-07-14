'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { FolderKanban, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProjectsOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Project Management" description="Plan, track, and deliver projects on time" breadcrumbs={[{ label: 'Projects' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/projects/list">All Projects</Link></Button>
      </PageHeader>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Projects" value={24} change={8.3} changeLabel="vs last month" icon={<FolderKanban className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />
        <KPICard title="In Progress" value={8} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />
        <KPICard title="Open Tasks" value={142} icon={<CheckSquare className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" />
        <KPICard title="On-Time Rate" value="87%" change={3.1} changeLabel="vs last month" icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/projects/list" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FolderKanban className="h-6 w-6 text-blue-600" />
          </div>
          <div><h3 className="font-semibold text-gray-900 dark:text-white">All Projects</h3><p className="text-xs text-gray-500 dark:text-gray-400">Grid and list views</p></div>
        </Link>
        <Link href="/projects/tasks" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-md transition-all group flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckSquare className="h-6 w-6 text-emerald-600" />
          </div>
          <div><h3 className="font-semibold text-gray-900 dark:text-white">Tasks</h3><p className="text-xs text-gray-500 dark:text-gray-400">All tasks across projects</p></div>
        </Link>
      </div>
    </div>
  );
}
