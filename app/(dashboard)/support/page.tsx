'use client';

import Link from 'next/link';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, CheckCircle2, Clock, Star, Ticket, BookOpen, ArrowRight } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Support"
        description="Manage support tickets and knowledge resources"
        breadcrumbs={[{ label: 'Support' }]}
      >
        <Link href="/support/tickets">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Ticket className="h-4 w-4 mr-2" />View Tickets</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Open Tickets"
          value={34}
          change={-8.1}
          changeLabel="vs last week"
          icon={<Headphones className="h-4 w-4 text-blue-600" />}
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
          title="Avg Response"
          value="4h"
          change={-12.5}
          changeLabel="vs last month"
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="CSAT Score"
          value="4.5 / 5"
          change={2.3}
          changeLabel="vs last month"
          icon={<Star className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="dark:bg-gray-900 dark:border-gray-800 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Ticket className="h-4 w-4 text-blue-600" />
              Support Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Track, prioritize, and resolve customer support requests. Manage SLAs, escalations, and agent workloads from a single queue.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400">34</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Open</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">18</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">248</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
              </div>
            </div>
            <Link href="/support/tickets">
              <Button variant="outline" size="sm" className="w-full">
                Go to Tickets <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-600" />
              Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Create and manage self-service articles to reduce ticket volume. Organize content into categories for easy discovery.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-violet-50 dark:bg-violet-950/30">
                <p className="text-xl font-bold text-violet-700 dark:text-violet-400">84</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Articles</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">12</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Categories</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">93%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Helpful</p>
              </div>
            </div>
            <Link href="/support/knowledge-base">
              <Button variant="outline" size="sm" className="w-full">
                Go to Knowledge Base <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
