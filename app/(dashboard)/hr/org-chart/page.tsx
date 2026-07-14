'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, Users, ChevronDown, Plus } from 'lucide-react';

const ORG_NODES = [
  {
    id: 1, name: 'Sarah Chen', title: 'CEO', department: 'Executive', level: 0,
    children: [
      {
        id: 2, name: 'Mark Johnson', title: 'CTO', department: 'Engineering', level: 1,
        children: [
          { id: 5, name: 'Alice Johnson', title: 'Sr. Engineer', department: 'Engineering', level: 2, children: [] },
          { id: 6, name: 'Tom Lee', title: 'DevOps Lead', department: 'Engineering', level: 2, children: [] },
        ],
      },
      {
        id: 3, name: 'Lisa Park', title: 'CFO', department: 'Finance', level: 1,
        children: [
          { id: 7, name: 'Carol Lee', title: 'Finance Analyst', department: 'Finance', level: 2, children: [] },
        ],
      },
      {
        id: 4, name: 'David Kim', title: 'VP Sales', department: 'Sales', level: 1,
        children: [
          { id: 8, name: 'Bob Martinez', title: 'Sales Executive', department: 'Sales', level: 2, children: [] },
          { id: 9, name: 'Eva Williams', title: 'Account Manager', department: 'Sales', level: 2, children: [] },
        ],
      },
    ],
  },
];

const LEVEL_COLORS: Record<number, string> = {
  0: 'bg-blue-600 text-white',
  1: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800',
  2: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
};

function OrgNode({ node }: { node: typeof ORG_NODES[0] }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-xl px-4 py-3 text-center min-w-[140px] shadow-sm ${LEVEL_COLORS[node.level] ?? LEVEL_COLORS[2]}`}>
        <p className="font-semibold text-sm">{node.name}</p>
        <p className="text-xs opacity-75 mt-0.5">{node.title}</p>
      </div>
      {node.children.length > 0 && (
        <>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
          <div className="flex items-start gap-8">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center relative">
                {i === 0 && node.children.length > 1 && (
                  <div className="absolute top-0 right-0 w-1/2 h-px bg-gray-300 dark:bg-gray-700" />
                )}
                {i === node.children.length - 1 && node.children.length > 1 && (
                  <div className="absolute top-0 left-0 w-1/2 h-px bg-gray-300 dark:bg-gray-700" />
                )}
                {node.children.length > 1 && i !== 0 && i !== node.children.length - 1 && (
                  <div className="absolute top-0 left-0 right-0 h-px bg-gray-300 dark:bg-gray-700" />
                )}
                <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
                <OrgNode node={child as typeof ORG_NODES[0]} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Chart"
        description="Visual representation of your company structure"
        breadcrumbs={[{ label: 'HR' }, { label: 'Org Chart' }]}
      >
        <Button variant="outline" size="sm"><ChevronDown className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Edit Structure</Button>
      </PageHeader>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-600" />
            Company Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto py-4">
            <div className="flex justify-center min-w-max">
              {ORG_NODES.map(node => (
                <OrgNode key={node.id} node={node} />
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Executive</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-200 dark:bg-violet-900/40 border border-violet-200 inline-block" /> VP / Director</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 inline-block" /> Individual Contributor</span>
            </div>
            <p className="text-xs text-gray-400">Full interactive org chart with drag-and-drop editing available in the complete module.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="py-8">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Interactive Org Chart Coming Soon"
            description="The full module will include search, zoom controls, department filters, headcount analytics, and reporting-line editing."
          />
        </CardContent>
      </Card>
    </div>
  );
}
