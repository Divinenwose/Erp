'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle2, Clock, Calendar } from 'lucide-react';

export default function PayrollPage() {
  const { company } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const load = async () => {
      setLoading(true);
      const [itemsRes, runsRes] = await Promise.all([
        supabase.from('payroll_items').select('*, employees(first_name, last_name, job_title, departments(name))').eq('company_id', company.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('payroll_runs').select('*').eq('company_id', company.id).order('period_end', { ascending: false }).limit(12),
      ]);
      setItems(itemsRes.data ?? []);
      setRuns(runsRes.data ?? []);
      setLoading(false);
    };
    load();
  }, [company?.id]);

  const totalNet = items.reduce((sum, item) => sum + Number(item.net_salary ?? 0), 0);
  const processed = items.filter(item => item.status === 'processed' || item.status === 'paid').length;
  const pending = items.filter(item => item.status === 'pending').length;
  const latestRun = runs[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" description="Review payroll runs and employee pay items" breadcrumbs={[{ label: 'HR' }, { label: 'Payroll' }]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Net Payroll" value={`$${totalNet.toLocaleString()}`} icon={<CreditCard className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Processed Items" value={processed} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Pending Items" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Payroll Runs" value={runs.length} icon={<Calendar className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Payroll Items</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {items.length === 0 && !loading ? <p className="p-8 text-center text-sm text-gray-500">No payroll items have been created yet.</p> : <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 dark:bg-gray-800/50"><th className="text-left px-4 py-3">Employee</th><th className="text-left px-4 py-3">Department</th><th className="text-right px-4 py-3">Gross</th><th className="text-right px-4 py-3">Deductions</th><th className="text-right px-4 py-3">Net</th><th className="text-left px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{items.map(item => <tr key={item.id}><td className="px-4 py-3">{item.employees ? `${item.employees.first_name} ${item.employees.last_name}` : '—'}</td><td className="px-4 py-3">{item.employees?.departments?.name ?? '—'}</td><td className="px-4 py-3 text-right">${Number(item.gross_salary ?? 0).toLocaleString()}</td><td className="px-4 py-3 text-right">${Number(item.deductions ?? 0).toLocaleString()}</td><td className="px-4 py-3 text-right font-semibold">${Number(item.net_salary ?? 0).toLocaleString()}</td><td className="px-4 py-3"><StatusBadge status={item.status ?? 'pending'} /></td></tr>)}</tbody></table>}
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="text-base">Latest Payroll Run</CardTitle></CardHeader><CardContent>{latestRun ? <p className="text-sm text-gray-600 dark:text-gray-400">{latestRun.period_start} to {latestRun.period_end} · <StatusBadge status={latestRun.status} /></p> : <p className="text-sm text-gray-500">No payroll runs have been created yet.</p>}</CardContent></Card>
    </div>
  );
}
