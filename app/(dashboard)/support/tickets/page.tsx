'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Clock, CheckCircle2, Timer, Plus, Download } from 'lucide-react';

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
          value={0}
          icon={<Ticket className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="In Progress"
          value={0}
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Resolved"
          value={0}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Avg Resolution"
          value="0h"
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
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">No support tickets recorded.</td></tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Support tickets will appear here when recorded.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
