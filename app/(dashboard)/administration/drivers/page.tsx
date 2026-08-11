'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Car, IdCard, TrendingUp, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DriversDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Drivers Management" 
        description="Manage company drivers, licenses, and trips"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Drivers' }
        ]}
      >
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Drivers" 
          value={18} 
          change={2} 
          changeLabel="this month" 
          icon={<User className="h-4 w-4 text-blue-600" />} 
          iconBg="bg-blue-50 dark:bg-blue-950/50" 
        />
        <KPICard 
          title="Active Drivers" 
          value={16} 
          icon={<Car className="h-4 w-4 text-emerald-600" />} 
          iconBg="bg-emerald-50 dark:bg-emerald-950/50" 
        />
        <KPICard 
          title="Valid Licenses" 
          value={15} 
          icon={<IdCard className="h-4 w-4 text-purple-600" />} 
          iconBg="bg-purple-50 dark:bg-purple-950/50" 
        />
        <KPICard 
          title="Total Trips" 
          value={245} 
          change={12.5} 
          changeLabel="this month" 
          icon={<TrendingUp className="h-4 w-4 text-amber-600" />} 
          iconBg="bg-amber-50 dark:bg-amber-950/50" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/administration/drivers/list">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Drivers List</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">View and manage all drivers</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/drivers/trips">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Driver Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track driver trips and mileage</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/drivers/licenses">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">License Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage driver licenses and expiry</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
