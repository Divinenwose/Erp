'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, Edit2, Check, X } from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks, format as formatDF } from 'date-fns';
import { toast } from 'sonner';

// Each KPI: how to compute "achieved" for the current week from real
// tables, and the target's storage key in kpi_targets. Achieved values are
// always live-queried — targets are the only thing persisted/editable.
const KPI_DEFINITIONS = [
  { key: 'attendance_compliance', label: 'Attendance Compliance', unit: '%', defaultTarget: 95 },
  { key: 'maintenance_resolution', label: 'Maintenance Resolution', unit: '', defaultTarget: 20 },
  { key: 'purchase_request_turnaround', label: 'Purchase Requests Resolved', unit: '', defaultTarget: 10 },
];

export default function WPIReportPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canManage = isAdmin || hasPermission('admin_reports.manage');

  const [targets, setTargets] = useState<Record<string, number>>({});
  const [achieved, setAchieved] = useState<Record<string, number>>({});
  const [weeklyTrend, setWeeklyTrend] = useState<{ week: string; attendance: number }[]>([]);
  const [deptScorecard, setDeptScorecard] = useState<{ department: string; rate: number; present: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    if (!company?.id) return;
    loadAll();
  }, [company?.id]);

  const loadAll = async () => {
    if (!company?.id) return;
    setLoading(true);

    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const [targetsRes, attendanceRes, workOrdersRes, prRes] = await Promise.all([
      supabase.from('kpi_targets').select('*').eq('company_id', company.id),
      supabase.from('attendance_records').select('status, department_id, departments(name)').eq('company_id', company.id).gte('attendance_date', weekStartStr).lte('attendance_date', weekEndStr),
      supabase.from('work_orders').select('status, completed_date').eq('company_id', company.id).gte('completed_date', weekStartStr).lte('completed_date', weekEndStr),
      supabase.from('purchase_requests').select('status, updated_at').eq('company_id', company.id).gte('updated_at', weekStartStr),
    ]);

    const targetMap: Record<string, number> = {};
    (targetsRes.data ?? []).forEach(t => { targetMap[t.kpi_key] = Number(t.target_value); });
    // Fall back to sensible defaults for any target not yet set by a user.
    KPI_DEFINITIONS.forEach(d => { if (!(d.key in targetMap)) targetMap[d.key] = d.defaultTarget; });
    setTargets(targetMap);

    const attendanceRows = attendanceRes.data ?? [];
    const presentCount = attendanceRows.filter(r => r.status === 'present' || r.status === 'late').length;
    const attendanceCompliance = attendanceRows.length > 0 ? Math.round((presentCount / attendanceRows.length) * 100) : 0;

    const maintenanceResolved = (workOrdersRes.data ?? []).filter(w => w.status === 'completed').length;
    const purchaseResolved = (prRes.data ?? []).filter(p => ['approved', 'vendor_assigned', 'completed'].includes(p.status)).length;

    setAchieved({
      attendance_compliance: attendanceCompliance,
      maintenance_resolution: maintenanceResolved,
      purchase_request_turnaround: purchaseResolved,
    });

    // Department scorecard — attendance compliance broken down per
    // department, computed from the same rows fetched above.
    const byDept: Record<string, { name: string; present: number; total: number }> = {};
    attendanceRows.forEach((r: any) => {
      const deptId = r.department_id ?? 'unassigned';
      const deptName = r.departments?.name ?? 'Unassigned';
      if (!byDept[deptId]) byDept[deptId] = { name: deptName, present: 0, total: 0 };
      byDept[deptId].total += 1;
      if (r.status === 'present' || r.status === 'late') byDept[deptId].present += 1;
    });
    setDeptScorecard(
      Object.values(byDept)
        .map(d => ({ department: d.name, present: d.present, total: d.total, rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0 }))
        .sort((a, b) => b.rate - a.rate)
    );

    // Last 6 weeks' attendance compliance trend, for the "Weekly trend
    // analysis" section of the dashboard.
    const trend: { week: string; attendance: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const wStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const wEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const { data } = await supabase.from('attendance_records').select('status').eq('company_id', company.id)
        .gte('attendance_date', wStart.toISOString().slice(0, 10)).lte('attendance_date', wEnd.toISOString().slice(0, 10));
      const rows = data ?? [];
      const present = rows.filter(r => r.status === 'present' || r.status === 'late').length;
      trend.push({ week: formatDF(wStart, 'MMM d'), attendance: rows.length > 0 ? Math.round((present / rows.length) * 100) : 0 });
    }
    setWeeklyTrend(trend);

    setLoading(false);
  };

  const startEdit = (key: string) => { setEditingKey(key); setEditValue(String(targets[key] ?? '')); };

  const saveTarget = async (key: string) => {
    if (!company?.id) return;
    const value = parseFloat(editValue);
    if (isNaN(value)) { toast.error('Enter a valid number'); return; }

    const { data: employeeRecord } = currentUser?.id
      ? await supabase.from('employees').select('id').eq('user_id', currentUser.id).eq('company_id', company.id).maybeSingle()
      : { data: null };

    const { error } = await supabase.from('kpi_targets').upsert({
      company_id: company.id, kpi_key: key, target_value: value, updated_by: employeeRecord?.id ?? null, updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,kpi_key' });

    if (error) { toast.error('Failed to update target'); return; }
    toast.success('Target updated');
    setEditingKey(null);
    loadAll();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Performance Indicator (WPI) Report"
        description={`Week of ${formatDate(weekStart.toISOString())} – ${formatDate(weekEnd.toISOString())}`}
        breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'WPI' }]}
      />

      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Target className="h-4 w-4" />KPIs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b dark:border-gray-800">
              <tr>
                <th className="text-left p-3">KPI</th>
                <th className="text-right p-3">Target</th>
                <th className="text-right p-3">Achieved</th>
                <th className="text-right p-3">Achievement %</th>
                {canManage && <th className="text-right p-3">Edit</th>}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {KPI_DEFINITIONS.map(kpi => {
                const target = targets[kpi.key] ?? kpi.defaultTarget;
                const achievedVal = loading ? 0 : (achieved[kpi.key] ?? 0);
                const pct = target > 0 ? Math.round((achievedVal / target) * 100) : 0;
                return (
                  <tr key={kpi.key}>
                    <td className="p-3">{kpi.label}</td>
                    <td className="p-3 text-right">
                      {editingKey === kpi.key ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input className="w-20 h-7 text-right" value={editValue} onChange={e => setEditValue(e.target.value)} />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveTarget(kpi.key)}><Check className="h-3 w-3 text-emerald-600" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingKey(null)}><X className="h-3 w-3 text-red-600" /></Button>
                        </div>
                      ) : (
                        <span>{target}{kpi.unit}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">{achievedVal}{kpi.unit}</td>
                    <td className={`p-3 text-right font-semibold ${pct >= 100 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</td>
                    {canManage && (
                      <td className="p-3 text-right">
                        {editingKey !== kpi.key && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(kpi.key)}><Edit2 className="h-3 w-3 text-gray-400" /></Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base font-medium">KPI Achievement</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={KPI_DEFINITIONS.map(k => ({ name: k.label, target: targets[k.key] ?? k.defaultTarget, achieved: achieved[k.key] ?? 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="target" fill="#D1D5DB" radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="achieved" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Achieved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-medium">Weekly Trend — Attendance Compliance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip />
                <Bar dataKey="attendance" fill="#10B981" radius={[4, 4, 0, 0]} name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base font-medium">Department Scorecard — Attendance Compliance</CardTitle></CardHeader>
        <CardContent className="p-0">
          {deptScorecard.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No attendance data recorded this week yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b dark:border-gray-800">
                <tr><th className="text-left p-3">Department</th><th className="text-right p-3">Present</th><th className="text-right p-3">Total</th><th className="text-right p-3">Rate</th></tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {deptScorecard.map(d => (
                  <tr key={d.department}>
                    <td className="p-3">{d.department}</td>
                    <td className="p-3 text-right">{d.present}</td>
                    <td className="p-3 text-right">{d.total}</td>
                    <td className={`p-3 text-right font-semibold ${d.rate >= 95 ? 'text-emerald-600' : d.rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{d.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
