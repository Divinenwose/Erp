'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Car, UserCheck, Wrench, Package, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

export default function AdministrationOverviewPage() {
  const modules = [
    { title: 'Assets', description: 'Fixed asset management', icon: Briefcase, href: '/administration/assets', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', count: '124 assets' },
    { title: 'Fleet', description: 'Vehicle management', icon: Car, href: '/administration/fleet', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', count: '18 vehicles' },
    { title: 'Visitors', description: 'Visitor management', icon: UserCheck, href: '/administration/visitors', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', count: '5 today' },
    { title: 'Work Orders', description: 'Maintenance requests', icon: Wrench, href: '/administration/work-orders', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', count: '8 open' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Manage office facilities, assets, and operations" breadcrumbs={[{ label: 'Administration' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/administration/assets">Register Asset</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Assets" value={124} change={5.1} changeLabel="this quarter" icon={<Briefcase className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />
        <KPICard title="Fleet Vehicles" value={18} icon={<Car className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <KPICard title="Visitors Today" value={5} icon={<UserCheck className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />
        <KPICard title="Open Work Orders" value={8} icon={<Wrench className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2">{m.count}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
