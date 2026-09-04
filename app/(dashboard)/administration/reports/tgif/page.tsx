'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Wrench, ShoppingCart, AlertTriangle, Lightbulb, ListChecks, Save, Download } from 'lucide-react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';

export default function TGIFReportPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canManage = isAdmin || hasPermission('admin_reports.manage');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [completedWorkOrders, setCompletedWorkOrders] = useState<any[]>([]);
  const [purchaseSummary, setPurchaseSummary] = useState({ count: 0, totalSpend: 0 });
  const [activitiesCompleted, setActivitiesCompleted] = useState({ workOrders: 0, purchaseRequests: 0, approvals: 0 });

  const [executiveSummary, setExecutiveSummary] = useState('');
  const [challenges, setChallenges] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [actionPlan, setActionPlan] = useState('');

  useEffect(() => {
    if (!company?.id) return;
    loadAll();
  }, [company?.id]);

  const loadAll = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [attendanceRes, workOrdersRes, prRes, approvalsRes, existingReportRes] = await Promise.all([
      supabase.from('attendance_records').select('status').eq('company_id', company.id).gte('attendance_date', weekStartStr).lte('attendance_date', weekEndStr),
      supabase.from('work_orders').select('title, status, completed_date, actual_cost').eq('company_id', company.id).gte('completed_date', weekStartStr).lte('completed_date', weekEndStr),
      supabase.from('purchase_requests').select('status, estimated_cost, actual_cost, updated_at').eq('company_id', company.id).gte('updated_at', weekStartStr),
      supabase.from('request_approvals').select('id, status').eq('company_id', company.id).gte('created_at', weekStartStr),
      supabase.from('tgif_reports').select('*').eq('company_id', company.id).eq('week_start_date', weekStartStr).maybeSingle(),
    ]);

    const attendanceRows = attendanceRes.data ?? [];
    setAttendance({
      present: attendanceRows.filter(r => r.status === 'present').length,
      absent: attendanceRows.filter(r => r.status === 'absent').length,
      late: attendanceRows.filter(r => r.status === 'late').length,
      total: attendanceRows.length,
    });

    const completed = (workOrdersRes.data ?? []).filter(w => w.status === 'completed');
    setCompletedWorkOrders(completed);

    const prRows = prRes.data ?? [];
    const resolvedPRs = prRows.filter(p => ['approved', 'vendor_assigned', 'completed'].includes(p.status));
    setPurchaseSummary({
      count: resolvedPRs.length,
      totalSpend: resolvedPRs.reduce((sum, p) => sum + (p.actual_cost || p.estimated_cost || 0), 0),
    });

    setActivitiesCompleted({
      workOrders: completed.length,
      purchaseRequests: resolvedPRs.length,
      approvals: (approvalsRes.data ?? []).filter(a => a.status === 'approved').length,
    });

    if (existingReportRes.data) {
      setExecutiveSummary(existingReportRes.data.executive_summary ?? '');
      setChallenges(existingReportRes.data.challenges_encountered ?? '');
      setRecommendations(existingReportRes.data.recommendations ?? '');
      setActionPlan(existingReportRes.data.action_plan_next_week ?? '');
    }

    setLoading(false);
  };

  const saveNarrative = async () => {
    if (!company?.id) return;
    setSaving(true);

    const { data: employeeRecord } = currentUser?.id
      ? await supabase.from('employees').select('id').eq('user_id', currentUser.id).eq('company_id', company.id).maybeSingle()
      : { data: null };

    const { error } = await supabase.from('tgif_reports').upsert({
      company_id: company.id,
      week_start_date: weekStartStr,
      executive_summary: executiveSummary.trim() || null,
      challenges_encountered: challenges.trim() || null,
      recommendations: recommendations.trim() || null,
      action_plan_next_week: actionPlan.trim() || null,
      created_by: employeeRecord?.id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,week_start_date' });

    setSaving(false);
    if (error) { toast.error('Failed to save report'); return; }
    toast.success('TGIF report saved');
  };

  const exportPPTX = async () => {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: 'A4', width: 10, height: 5.63 });
    pptx.layout = 'A4';

    // pptxgenjs's table cells must be TableCell objects, not plain strings.
    const row = (cells: string[]) => cells.map(text => ({ text }));

    const addTitleSlide = (title: string) => {
      const slide = pptx.addSlide();
      slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.9, fill: { color: '1E3A8A' } });
      slide.addText(title, { x: 0.4, y: 0.15, w: 9.2, h: 0.6, fontSize: 22, bold: true, color: 'FFFFFF' });
      return slide;
    };

    // Slide 1: Executive Summary
    let slide = addTitleSlide('Executive Summary');
    slide.addText(executiveSummary || 'No summary provided for this week.', { x: 0.5, y: 1.2, w: 9, h: 3.8, fontSize: 14, color: '1F2937' });

    // Slide 2: Administrative Activities Completed
    slide = addTitleSlide('Administrative Activities Completed');
    slide.addTable([
      [{ text: 'Metric', options: { bold: true } }, { text: 'Count', options: { bold: true } }],
      row(['Work Orders Completed', String(activitiesCompleted.workOrders)]),
      row(['Purchase Requests Resolved', String(activitiesCompleted.purchaseRequests)]),
      row(['Approvals Granted', String(activitiesCompleted.approvals)]),
    ], { x: 0.5, y: 1.3, w: 9, colW: [6, 3], fontSize: 14 });

    // Slide 3: Attendance Overview
    slide = addTitleSlide('Attendance Overview');
    slide.addTable([
      [{ text: 'Metric', options: { bold: true } }, { text: 'Value', options: { bold: true } }],
      row(['Compliance Rate', `${attendanceRate}%`]),
      row(['Present', String(attendance.present)]),
      row(['Late', String(attendance.late)]),
      row(['Absent', String(attendance.absent)]),
    ], { x: 0.5, y: 1.3, w: 9, colW: [6, 3], fontSize: 14 });

    // Slide 4: Purchases and Expenses
    slide = addTitleSlide('Purchases and Expenses');
    slide.addTable([
      [{ text: 'Metric', options: { bold: true } }, { text: 'Value', options: { bold: true } }],
      row(['Requests Resolved This Week', String(purchaseSummary.count)]),
      row(['Total Spend', formatCurrency(purchaseSummary.totalSpend)]),
    ], { x: 0.5, y: 1.3, w: 9, colW: [6, 3], fontSize: 14 });

    // Slide 5: Completed Maintenance Activities
    slide = addTitleSlide('Completed Maintenance Activities');
    if (completedWorkOrders.length === 0) {
      slide.addText('No maintenance work orders completed this week.', { x: 0.5, y: 1.3, w: 9, fontSize: 14, color: '6B7280' });
    } else {
      slide.addTable(
        [[{ text: 'Work Order', options: { bold: true } }, { text: 'Completed', options: { bold: true } }, { text: 'Cost', options: { bold: true } }],
          ...completedWorkOrders.map(w => row([w.title, formatDate(w.completed_date), w.actual_cost ? formatCurrency(w.actual_cost) : '-']))],
        { x: 0.5, y: 1.3, w: 9, colW: [5, 2.5, 1.5], fontSize: 12 }
      );
    }

    // Slide 6: Challenges Encountered
    slide = addTitleSlide('Challenges Encountered');
    slide.addText(challenges || 'No challenges recorded for this week.', { x: 0.5, y: 1.2, w: 9, h: 3.8, fontSize: 14, color: '1F2937' });

    // Slide 7: Recommendations
    slide = addTitleSlide('Recommendations');
    slide.addText(recommendations || 'No recommendations recorded for this week.', { x: 0.5, y: 1.2, w: 9, h: 3.8, fontSize: 14, color: '1F2937' });

    // Slide 8: Action Plan for Next Week
    slide = addTitleSlide('Action Plan for Next Week');
    slide.addText(actionPlan || 'No action plan recorded for next week.', { x: 0.5, y: 1.2, w: 9, h: 3.8, fontSize: 14, color: '1F2937' });

    await pptx.writeFile({ fileName: `TGIF-Report-${weekStartStr}.pptx` });
  };

  const attendanceRate = attendance.total > 0 ? Math.round(((attendance.present + attendance.late) / attendance.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="TGIF Management Report"
        description={`Week of ${formatDate(weekStart.toISOString())} – ${formatDate(weekEnd.toISOString())}`}
        breadcrumbs={[{ label: 'Administration', href: '/administration' }, { label: 'Reports', href: '/administration/reports' }, { label: 'TGIF' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportPPTX}><Download className="h-4 w-4 mr-2" />Download PowerPoint</Button>
          {canManage && <Button size="sm" onClick={saveNarrative} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving…' : 'Save Report'}</Button>}
        </div>
      </PageHeader>

      {/* Slide 1: Executive Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><FileText className="h-4 w-4" />Slide 1 — Executive Summary</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={executiveSummary} onChange={e => setExecutiveSummary(e.target.value)} disabled={!canManage} placeholder="Summarize the week's overall administrative performance..." className="min-h-[100px]" />
        </CardContent>
      </Card>

      {/* Slide 2: Administrative Activities Completed */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><ListChecks className="h-4 w-4" />Slide 2 — Administrative Activities Completed</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg"><p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{loading ? '—' : activitiesCompleted.workOrders}</p><p className="text-xs text-gray-500">Work Orders Completed</p></div>
          <div className="text-center p-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg"><p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{loading ? '—' : activitiesCompleted.purchaseRequests}</p><p className="text-xs text-gray-500">Purchase Requests Resolved</p></div>
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg"><p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{loading ? '—' : activitiesCompleted.approvals}</p><p className="text-xs text-gray-500">Approvals Granted</p></div>
        </CardContent>
      </Card>

      {/* Slide 3: Attendance Overview */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Users className="h-4 w-4" />Slide 3 — Attendance Overview</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"><p className="text-2xl font-bold">{loading ? '—' : `${attendanceRate}%`}</p><p className="text-xs text-gray-500">Compliance Rate</p></div>
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg"><p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{loading ? '—' : attendance.present}</p><p className="text-xs text-gray-500">Present</p></div>
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg"><p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{loading ? '—' : attendance.late}</p><p className="text-xs text-gray-500">Late</p></div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg"><p className="text-2xl font-bold text-red-700 dark:text-red-400">{loading ? '—' : attendance.absent}</p><p className="text-xs text-gray-500">Absent</p></div>
        </CardContent>
      </Card>

      {/* Slide 4: Purchases and Expenses */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Slide 4 — Purchases and Expenses</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg"><p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{loading ? '—' : purchaseSummary.count}</p><p className="text-xs text-gray-500">Requests Resolved This Week</p></div>
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg"><p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{loading ? '—' : formatCurrency(purchaseSummary.totalSpend)}</p><p className="text-xs text-gray-500">Total Spend</p></div>
        </CardContent>
      </Card>

      {/* Slide 5: Completed Maintenance Activities */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Wrench className="h-4 w-4" />Slide 5 — Completed Maintenance Activities</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : completedWorkOrders.length === 0 ? (
            <p className="text-sm text-gray-400">No maintenance work orders completed this week.</p>
          ) : (
            <div className="space-y-2">
              {completedWorkOrders.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 border border-gray-200 dark:border-gray-800 rounded-lg text-sm">
                  <span>{w.title}</span>
                  <div className="flex items-center gap-2">
                    {w.actual_cost > 0 && <span className="text-xs text-gray-500">{formatCurrency(w.actual_cost)}</span>}
                    <Badge variant="outline">Completed {formatDate(w.completed_date)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slide 6: Challenges Encountered */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Slide 6 — Challenges Encountered</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={challenges} onChange={e => setChallenges(e.target.value)} disabled={!canManage} placeholder="Note any obstacles, delays, or issues encountered this week..." className="min-h-[80px]" />
        </CardContent>
      </Card>

      {/* Slide 7: Recommendations */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4" />Slide 7 — Recommendations</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} disabled={!canManage} placeholder="Recommend actions or improvements..." className="min-h-[80px]" />
        </CardContent>
      </Card>

      {/* Slide 8: Action Plan for Next Week */}
      <Card>
        <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><ListChecks className="h-4 w-4" />Slide 8 — Action Plan for Next Week</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={actionPlan} onChange={e => setActionPlan(e.target.value)} disabled={!canManage} placeholder="Outline priorities and planned actions for next week..." className="min-h-[80px]" />
        </CardContent>
      </Card>
    </div>
  );
}
