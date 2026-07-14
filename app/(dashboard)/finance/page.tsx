'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, TrendingUp, TrendingDown, CreditCard, PieChart, Database, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const cashFlowData = [
  { month: 'Jul', inflow: 420000, outflow: 310000 },
  { month: 'Aug', inflow: 450000, outflow: 330000 },
  { month: 'Sep', inflow: 380000, outflow: 295000 },
  { month: 'Oct', inflow: 510000, outflow: 365000 },
  { month: 'Nov', inflow: 490000, outflow: 350000 },
  { month: 'Dec', inflow: 560000, outflow: 390000 },
];

export default function FinanceOverviewPage() {
  const modules = [
    { title: 'General Ledger', description: 'Chart of accounts & journals', icon: Database, href: '/finance/ledger', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
    { title: 'Invoices', description: 'Billing and collections', icon: FileText, href: '/finance/invoices', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
    { title: 'Expenses', description: 'Expense management', icon: CreditCard, href: '/finance/expenses', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
    { title: 'Budgets', description: 'Budget planning & tracking', icon: PieChart, href: '/finance/budgets', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
    { title: 'Accounts Receivable', description: 'Customer payments', icon: TrendingUp, href: '/finance/receivables', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600' },
    { title: 'Accounts Payable', description: 'Vendor payments', icon: TrendingDown, href: '/finance/payables', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600' },
    { title: 'Reports', description: 'Financial statements', icon: BarChart3, href: '/finance/reports', color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Finance & Accounting" description="Complete financial management for your organization" breadcrumbs={[{ label: 'Finance' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/finance/invoices">Create Invoice</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(4800000)} change={12.4} changeLabel="vs last month" icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <KPICard title="Total Expenses" value={formatCurrency(3200000)} change={-4.2} changeLabel="vs last month" icon={<TrendingDown className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" />
        <KPICard title="Net Profit" value={formatCurrency(1600000)} change={8.7} changeLabel="vs last month" icon={<TrendingUp className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />
        <KPICard title="Outstanding AR" value={formatCurrency(285000)} icon={<CreditCard className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <CardHeader><CardTitle className="text-sm font-semibold">Cash Flow (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="inflow" stroke="#10B981" strokeWidth={2} dot={false} name="Cash In" />
              <Line type="monotone" dataKey="outflow" stroke="#EF4444" strokeWidth={2} dot={false} name="Cash Out" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
