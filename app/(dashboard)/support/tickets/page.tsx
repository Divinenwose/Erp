'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle2, Timer, Plus, Download } from 'lucide-react';

const MOCK_TICKETS = [
  { id: 1, ticketNum: 'TKT-2024-0124', subject: 'Unable to export reports to CSV', customer: 'Acme Corp', priority: 'high', assignee: 'Sarah Lin', created: 'Dec 20, 2024', status: 'open' },
  { id: 2, ticketNum: 'TKT-2024-0123', subject: 'Payment gateway returns 500 error', customer: 'TechStart Inc', priority: 'high', assignee: 'James Wu', created: 'Dec 20, 2024', status: 'in_progress' },
  { id: 3, ticketNum: 'TKT-2024-0122', subject: 'How to add custom fields to invoices?', customer: 'Metro Services', priority: 'low', assignee: 'Sarah Lin', created: 'Dec 19, 2024', status: 'open' },
  { id: 4, ticketNum: 'TKT-2024-0121', subject: 'Dashboard not loading on mobile', customer: 'Global Retail', priority: 'medium', assignee: 'James Wu', created: 'Dec 19, 2024', status: 'in_progress' },
  { id: 5, ticketNum: 'TKT-2024-0120', subject: 'Request to add multi-currency support', customer: 'Sunrise Logistics', priority: 'medium', assignee: '—', created: 'Dec 18, 2024', status: 'open' },
  { id: 6, ticketNum: 'TKT-2024-0119', subject: 'User permissions not syncing correctly', customer: 'Acme Corp', priority: 'high', assignee: 'Sarah Lin', created: 'Dec 17, 2024', status: 'resolved' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
  low: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
};

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Tickets"
        description="View and manage all customer support requests"
        breadcrumbs={[{ label: 'Support' }, { label: 'Tickets' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Ticket</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Open"
          value={34}
          change={-8.1}
          changeLabel="vs last week"
          icon={<Ticket className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="In Progress"
          value={18}
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Resolved"
          value={248}
          change={5.4}
          changeLabel="this month"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Avg Resolution"
          value="6h"
          change={-10.0}
          changeLabel="vs last month"
          icon={<Timer className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Ticket Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ticket #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assignee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_TICKETS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{row.ticketNum}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[220px] truncate">{row.subject}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.customer}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLOR[row.priority] ?? ''}`}>
                        {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.assignee}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.created}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full helpdesk with SLA management, canned responses, and customer portal available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
