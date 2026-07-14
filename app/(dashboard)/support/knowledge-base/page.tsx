'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Tag, Eye, ThumbsUp, Plus, Search } from 'lucide-react';

const MOCK_ARTICLES = [
  { id: 1, title: 'Getting Started with the Dashboard', category: 'Onboarding', views: 1842, helpful: 96, updated: 'Dec 15, 2024', status: 'published' },
  { id: 2, title: 'How to Create and Send Invoices', category: 'Finance', views: 2340, helpful: 94, updated: 'Dec 10, 2024', status: 'published' },
  { id: 3, title: 'Managing Employee Payroll', category: 'HR', views: 1120, helpful: 91, updated: 'Dec 8, 2024', status: 'published' },
  { id: 4, title: 'Setting Up Multi-Warehouse Inventory', category: 'Inventory', views: 680, helpful: 89, updated: 'Dec 5, 2024', status: 'published' },
  { id: 5, title: 'Configuring User Roles and Permissions', category: 'Settings', views: 940, helpful: 92, updated: 'Dec 3, 2024', status: 'published' },
  { id: 6, title: 'Integrating Third-Party Accounting Tools', category: 'Integrations', views: 420, helpful: 88, updated: 'Nov 28, 2024', status: 'draft' },
];

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Self-service articles and guides for customers and staff"
        breadcrumbs={[{ label: 'Support' }, { label: 'Knowledge Base' }]}
      >
        <Button variant="outline" size="sm"><Search className="h-4 w-4 mr-2" />Search Articles</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Article</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Articles"
          value={84}
          change={7.7}
          changeLabel="this month"
          icon={<BookOpen className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Categories"
          value={12}
          icon={<Tag className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
        <KPICard
          title="Total Views"
          value="12,450"
          change={14.2}
          changeLabel="this month"
          icon={<Eye className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Helpful Rating"
          value="93%"
          change={1.1}
          changeLabel="vs last month"
          icon={<ThumbsUp className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Articles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Article</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Views</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Helpful %</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last Updated</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_ARTICLES.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.category}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{row.helpful}%</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.updated}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full knowledge base with rich text editor, versioning, and AI-suggested articles available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
