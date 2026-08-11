'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';
import Link from 'next/link';

export default function InspectionsDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Office Inspections" 
        description="Manage office cleanliness, safety, and compliance inspections"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Inspections' }
        ]}
      >
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Inspection
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Inspections" 
          value={48} 
          change={12.5} 
          changeLabel="this month" 
          icon={<ClipboardCheck className="h-4 w-4 text-blue-600" />} 
          iconBg="bg-blue-50 dark:bg-blue-950/50" 
        />
        <KPICard 
          title="Pending Issues" 
          value={8} 
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} 
          iconBg="bg-amber-50 dark:bg-amber-950/50" 
        />
        <KPICard 
          title="Completed" 
          value={35} 
          icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} 
          iconBg="bg-emerald-50 dark:bg-emerald-950/50" 
        />
        <KPICard 
          title="In Progress" 
          value={5} 
          icon={<Clock className="h-4 w-4 text-purple-600" />} 
          iconBg="bg-purple-50 dark:bg-purple-950/50" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/administration/inspections/cleanliness">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Office Cleanliness</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">General office cleanliness inspections</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/inspections/restroom">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Restroom Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Restroom hygiene and maintenance checks</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/inspections/workspace">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Workspace Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Desk and workspace organization checks</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/inspections/reception">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Reception Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Front desk and reception area checks</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/inspections/meeting-rooms">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Meeting Room Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Meeting room readiness and cleanliness</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/inspections/issues">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Inspection Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track and resolve inspection issues</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
