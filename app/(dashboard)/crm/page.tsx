'use client';

import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Users, ShoppingCart, Award, UserCheck, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const pipelineStages = [
  { stage: 'Prospecting', count: 18, value: 420000, color: '#3B82F6' },
  { stage: 'Qualified', count: 12, value: 310000, color: '#8B5CF6' },
  { stage: 'Proposal', count: 8, value: 240000, color: '#F59E0B' },
  { stage: 'Negotiation', count: 5, value: 185000, color: '#EF4444' },
  { stage: 'Won', count: 22, value: 680000, color: '#10B981' },
];

export default function CRMOverviewPage() {
  const { hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canLeads = isAdmin || hasPermission('crm.leads.view');
  const canPipeline = isAdmin || hasPermission('crm.pipeline.view');
  const canCustomers = isAdmin || hasPermission('crm.customers.view');

  const modules = [
    { title: 'Leads', description: 'Track potential customers', icon: Target, href: '/crm/leads', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'crm.leads.view' },
    { title: 'Pipeline', description: 'Manage opportunities', icon: TrendingUp, href: '/crm/pipeline', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'crm.pipeline.view' },
    { title: 'Customers', description: 'Customer accounts', icon: Users, href: '/crm/customers', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'crm.customers.view' },
    { title: 'Sales Orders', description: 'Order management', icon: ShoppingCart, href: '/crm/orders', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'crm.orders.view' },
    { title: 'Contacts', description: 'Contact directory', icon: UserCheck, href: '/crm/contacts', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600', permission: 'crm.contacts.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  const totalPipelineValue = pipelineStages.reduce((a, s) => a + s.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="CRM & Sales" description="Track leads, manage customers, and close deals" breadcrumbs={[{ label: 'CRM' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/crm/leads">Add Lead</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canPipeline && <KPICard title="Pipeline Value" value={formatCurrency(totalPipelineValue)} change={15.3} changeLabel="vs last month" icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />}
        {canLeads && <KPICard title="Active Leads" value={65} change={8.5} changeLabel="vs last month" icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />}
        {canCustomers && <KPICard title="Total Customers" value={48} change={4.3} changeLabel="vs last month" icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" />}
        {canPipeline && <KPICard title="Win Rate" value="38%" change={5.2} changeLabel="vs last month" icon={<Award className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
          </Link>
        ))}
      </div>

      {canPipeline && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="text-sm font-semibold">Sales Pipeline by Stage</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineStages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Value">
                  {pipelineStages.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="text-sm font-semibold">Pipeline Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineStages.map(s => (
                <div key={s.stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.stage}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">{s.count} deals</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(s.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>}
    </div>
  );
}
