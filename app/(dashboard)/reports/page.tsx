'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileText, TrendingUp, DollarSign, Users, ShoppingCart, Download, ExternalLink } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

const monthlyRevenue = [
  { month: 'Jan', revenue: 285000, expenses: 210000 },
  { month: 'Feb', revenue: 310000, expenses: 225000 },
  { month: 'Mar', revenue: 295000, expenses: 215000 },
  { month: 'Apr', revenue: 340000, expenses: 240000 },
  { month: 'May', revenue: 370000, expenses: 255000 },
  { month: 'Jun', revenue: 355000, expenses: 248000 },
  { month: 'Jul', revenue: 390000, expenses: 265000 },
  { month: 'Aug', revenue: 415000, expenses: 275000 },
  { month: 'Sep', revenue: 400000, expenses: 268000 },
  { month: 'Oct', revenue: 445000, expenses: 290000 },
  { month: 'Nov', revenue: 425000, expenses: 278000 },
  { month: 'Dec', revenue: 480000, expenses: 305000 },
];

const salesByProduct = [
  { product: 'Product A', sales: 125000 },
  { product: 'Product B', sales: 98000 },
  { product: 'Product C', sales: 75000 },
  { product: 'Product D', sales: 60000 },
  { product: 'Product E', sales: 45000 },
];

const reportCards = [
  { title: 'Financial Summary', description: 'P&L, balance sheet, cash flow', icon: DollarSign, color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
  { title: 'HR Analytics', description: 'Headcount, turnover, payroll', icon: Users, color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
  { title: 'Sales Performance', description: 'Revenue, pipeline, win rate', icon: TrendingUp, color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
  { title: 'Procurement Report', description: 'Spend analysis, vendor performance', icon: ShoppingCart, color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
  { title: 'Inventory Report', description: 'Stock levels, movement, valuation', icon: BarChart3, color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600' },
  { title: 'Project Status', description: 'Progress, budget, timelines', icon: FileText, color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Comprehensive business intelligence and reporting" breadcrumbs={[{ label: 'Reports' }]}>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export All</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Build Report</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Annual Revenue" value={formatCurrency(4510000)} change={14.2} changeLabel="vs last year" icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <KPICard title="Net Profit Margin" value="28.4%" change={2.1} changeLabel="vs last year" icon={<TrendingUp className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />
        <KPICard title="Revenue Growth" value="14.2%" change={3.8} changeLabel="vs last year" icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" />
        <KPICard title="Customer Satisfaction" value="4.7/5" change={0.2} changeLabel="vs last quarter" icon={<Users className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {reportCards.map(r => (
          <div key={r.title} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${r.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <r.icon className={`h-5 w-5 ${r.iconColor}`} />
              </div>
              <ExternalLink className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{r.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7 px-2"><Download className="h-3 w-3 mr-1" />PDF</Button>
              <Button size="sm" variant="outline" className="text-xs h-7 px-2">CSV</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue & Expenses (2024)</CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7"><Download className="h-3 w-3 mr-1" />Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="url(#colorRev)" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#F59E0B" strokeWidth={2} dot={false} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Sales by Product</CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-7"><Download className="h-3 w-3 mr-1" />Export</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={salesByProduct} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="product" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="#10B981" radius={[0, 4, 4, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
