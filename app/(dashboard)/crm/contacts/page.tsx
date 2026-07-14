'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Building2, TrendingUp, Plus, Download } from 'lucide-react';

const MOCK_CONTACTS = [
  { id: 1, name: 'John Smith', title: 'CTO', company: 'Acme Corporation', email: 'j.smith@acme.com', phone: '+1 555-0101', status: 'active' },
  { id: 2, name: 'Emily Larson', title: 'VP Product', company: 'TechStart Inc', email: 'e.larson@techstart.io', phone: '+1 555-0102', status: 'active' },
  { id: 3, name: 'Robert Chen', title: 'Procurement Manager', company: 'Global Retail Ltd', email: 'r.chen@globalretail.com', phone: '+1 555-0103', status: 'active' },
  { id: 4, name: 'Sarah Park', title: 'COO', company: 'Metro Services', email: 's.park@metroservices.com', phone: '+1 555-0104', status: 'active' },
  { id: 5, name: 'Mike Davis', title: 'Operations Lead', company: 'Sunrise Logistics', email: 'm.davis@sunriselog.com', phone: '+1 555-0105', status: 'new' },
];

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Manage your business contacts and relationships"
        breadcrumbs={[{ label: 'CRM' }, { label: 'Contacts' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Contacts"
          value={284}
          change={4.2}
          changeLabel="this month"
          icon={<Users className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Active"
          value={248}
          icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Companies"
          value={48}
          icon={<Building2 className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50 dark:bg-violet-950/50"
        />
        <KPICard
          title="New This Month"
          value={12}
          change={9.1}
          changeLabel="vs last month"
          icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Contact Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_CONTACTS.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.title}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.company}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.email}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.phone}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full contact management with activity history, email integration, and smart segments available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
