'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Building2, Clipboard, FileText, TrendingDown, CheckCircle2, Package, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProcurementOverviewPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    totalSpend: 0,
    activeVendors: 0,
    pendingPOs: 0,
    approvedRequests: 0,
    pendingGRNs: 0,
    pendingInvoices: 0,
  });
  const [spendData, setSpendData] = useState<any[]>([]);

  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canVendors = isAdmin || hasPermission('procurement.vendors.view');
  const canRequests = isAdmin || hasPermission('procurement.requests.view');
  const canOrders = isAdmin || hasPermission('procurement.orders.view');
  const canGRN = isAdmin || hasPermission('procurement.grn.view');
  const canInvoice = isAdmin || hasPermission('procurement.invoice_verification.view');

  const modules = [
    { title: 'Vendors', description: 'Supplier directory', icon: Building2, href: '/procurement/vendors', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'procurement.vendors.view' },
    { title: 'Purchase Requests', description: 'Internal requests', icon: Clipboard, href: '/procurement/requests', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'procurement.requests.view' },
    { title: 'Purchase Orders', description: 'Formal POs to vendors', icon: ShoppingCart, href: '/procurement/orders', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'procurement.orders.view' },
    { title: 'Goods Received Notes', description: 'Delivery verification', icon: Package, href: '/procurement/grn', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600', permission: 'procurement.grn.view' },
    { title: 'Invoice Verification', description: 'PO & GRN matching', icon: DollarSign, href: '/procurement/invoice-verification', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'procurement.invoice_verification.view' },
    { title: 'Replenishment', description: 'Stock requests', icon: FileText, href: '/procurement/replenishment', color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600', permission: 'procurement.replenishment.view' },
    { title: 'Supplier Performance', description: 'Vendor metrics', icon: TrendingDown, href: '/procurement/supplier-performance', color: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600', permission: 'procurement.supplier_performance.view' },
    { title: 'Buying Activities', description: 'Daily activities', icon: CheckCircle2, href: '/procurement/buying-activities', color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600', permission: 'procurement.buying_activities.view' },
    { title: 'Reports', description: 'Analytics & reports', icon: FileText, href: '/procurement/reports', color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600', permission: 'procurement.reports.view' },
  ];

  const loadKPIs = async () => {
    if (!company?.id) return;
    
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    
    const [vendorsRes, requestsRes, ordersRes, grnRes, invoiceRes] = await Promise.all([
      supabase.from('vendors').select('id').eq('company_id', company.id).eq('status', 'active'),
      supabase.from('purchase_requests').select('id').eq('company_id', company.id).eq('status', 'approved'),
      supabase.from('purchase_orders').select('id, total_amount, status, created_at').eq('company_id', company.id),
      supabase.from('goods_received_notes').select('id').eq('company_id', company.id).eq('status', 'pending_verification'),
      supabase.from('invoice_verifications').select('id').eq('company_id', company.id).eq('status', 'pending_verification'),
    ]);

    const orders = ordersRes.data ?? [];
    const totalSpend = orders
      .filter(o => o.created_at >= yearStart)
      .reduce((a, o) => a + (o.total_amount ?? 0), 0);
    const pendingPOs = orders.filter(o => o.status === 'pending').length;

    setKpiData({
      totalSpend,
      activeVendors: vendorsRes.data?.length ?? 0,
      pendingPOs,
      approvedRequests: requestsRes.data?.length ?? 0,
      pendingGRNs: grnRes.data?.length ?? 0,
      pendingInvoices: invoiceRes.data?.length ?? 0,
    });

    // Monthly spend data for the current year
    const monthlySpend = Array.from({ length: 12 }, (_, i) => {
      const monthStart = `${currentYear}-${String(i + 1).padStart(2, '0')}-01`;
      const monthEnd = `${currentYear}-${String(i + 1).padStart(2, '0')}-31`;
      const monthSpend = orders
        .filter(o => o.created_at >= monthStart && o.created_at <= monthEnd)
        .reduce((a, o) => a + (o.total_amount ?? 0), 0);
      return {
        month: new Date(currentYear, i).toLocaleString('default', { month: 'short' }),
        spend: monthSpend,
      };
    });

    setSpendData(monthlySpend);
    setLoading(false);
  };

  useEffect(() => { loadKPIs(); }, [company?.id]);

  return (
    <div className="space-y-6">
      <PageHeader title="Procurement" description="Streamline your purchasing and supplier management" breadcrumbs={[{ label: 'Procurement' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/procurement/requests">New Request</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canOrders && <KPICard title="Total Spend (YTD)" value={formatCurrency(kpiData.totalSpend)} icon={<TrendingDown className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />}
        {canVendors && <KPICard title="Active Vendors" value={kpiData.activeVendors} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />}
        {canOrders && <KPICard title="Pending POs" value={kpiData.pendingPOs} icon={<ShoppingCart className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />}
        {canRequests && <KPICard title="Approved Requests" value={kpiData.approvedRequests} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
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

      {canOrders && <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader><CardTitle className="text-sm font-semibold">Monthly Procurement Spend (Current Year)</CardTitle></CardHeader>
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
      </Card>}
    </div>
  );
}
