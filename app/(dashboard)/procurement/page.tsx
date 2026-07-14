'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Building2, Clipboard, FileText, TrendingDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const spendData = [
  { month: 'Jul', spend: 82000 },
  { month: 'Aug', spend: 95000 },
  { month: 'Sep', spend: 74000 },
  { month: 'Oct', spend: 110000 },
  { month: 'Nov', spend: 98000 },
  { month: 'Dec', spend: 125000 },
];

export default function ProcurementOverviewPage() {
  const modules = [
    { title: 'Vendors', description: 'Supplier directory', icon: Building2, href: '/procurement/vendors', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
    { title: 'Purchase Requests', description: 'Internal requests', icon: Clipboard, href: '/procurement/requests', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
    { title: 'Purchase Orders', description: 'Formal POs to vendors', icon: ShoppingCart, href: '/procurement/orders', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
    { title: 'Contracts', description: 'Vendor agreements', icon: FileText, href: '/procurement/contracts', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Procurement" description="Streamline your purchasing and supplier management" breadcrumbs={[{ label: 'Procurement' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/procurement/requests">New Request</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Spend (YTD)" value={formatCurrency(584000)} change={8.2} changeLabel="vs last year" icon={<TrendingDown className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" />
        <KPICard title="Active Vendors" value={34} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />
        <KPICard title="Pending POs" value={8} icon={<ShoppingCart className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />
        <KPICard title="Approved Requests" value={23} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><CardTitle className="text-sm font-semibold">Monthly Procurement Spend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="spend" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
