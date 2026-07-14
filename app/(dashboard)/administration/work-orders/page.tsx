'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, AlertCircle, Wrench, CheckCircle2, Plus, Download } from 'lucide-react';

const MOCK_WORK_ORDERS = [
  { id: 1, woNum: 'WO-2024-0028', title: 'HVAC system maintenance – Building A', type: 'Preventive', assignee: 'Mike Torres', priority: 'medium', due: 'Dec 22, 2024', status: 'open' },
  { id: 2, woNum: 'WO-2024-0027', title: 'Electrical panel inspection', type: 'Inspection', assignee: 'Steve Gray', priority: 'high', due: 'Dec 21, 2024', status: 'in_progress' },
  { id: 3, woNum: 'WO-2024-0026', title: 'Replace loading dock door seal', type: 'Corrective', assignee: 'Mike Torres', priority: 'high', due: 'Dec 20, 2024', status: 'in_progress' },
  { id: 4, woNum: 'WO-2024-0025', title: 'Office plumbing repair – 3rd floor', type: 'Corrective', assignee: 'Steve Gray', priority: 'medium', due: 'Dec 18, 2024', status: 'completed' },
  { id: 5, woNum: 'WO-2024-0024', title: 'Fire suppression system check', type: 'Inspection', assignee: 'Dana Reed', priority: 'high', due: 'Dec 15, 2024', status: 'completed' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
  low: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
};

export default function WorkOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description="Manage facility maintenance and repair work orders"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Work Orders' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Work Order</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Work Orders"
          value={28}
          icon={<ClipboardList className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Open"
          value={8}
          icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="In Progress"
          value={12}
          icon={<Wrench className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Completed"
          value={8}
          change={14.3}
          changeLabel="this month"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Work Order List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">WO #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assignee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Due</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_WORK_ORDERS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row.woNum}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.title}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.type}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.assignee}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLOR[row.priority] ?? ''}`}>
                        {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.due}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full CMMS with preventive maintenance schedules, asset tracking, and cost reporting available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
