'use client';

import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Settings, Bell, Globe, Shield, CreditCard, Users, Layers } from 'lucide-react';
import Link from 'next/link';

const settingsLinks = [
  { title: 'Company', description: 'Name, logo, address, and subscription', icon: Building2, href: '/settings/company', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
  { title: 'Users & Roles', description: 'Manage team access and permissions', icon: Users, href: '/settings/users', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
  { title: 'Departments', description: 'Organizational structure', icon: Layers, href: '/settings/departments', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
  { title: 'Branches', description: 'Locations and offices', icon: Globe, href: '/settings/branches', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
  { title: 'Notifications', description: 'Configure alert preferences', icon: Bell, href: '/settings/notifications', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600' },
  { title: 'Security', description: 'Authentication and access control', icon: Shield, href: '/settings/security', color: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-600' },
  { title: 'Billing', description: 'Subscription plans and payment', icon: CreditCard, href: '/settings/billing', color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600' },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Settings" description="Configure your workspace and preferences" breadcrumbs={[{ label: 'Settings' }]} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsLinks.map(s => (
          <Link key={s.href} href={s.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <s.icon className={`h-5 w-5 ${s.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{s.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
