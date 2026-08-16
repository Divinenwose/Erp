'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getAdministrationSections } from '@/lib/company-modules';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import EmptyState from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase, Car, Users, Fuel, Clipboard, Bell, Clock, AlertTriangle,
  CheckCircle2, LayoutGrid, Building2,
} from 'lucide-react';
import Link from 'next/link';
import { format, subMonths, isToday } from 'date-fns';

/**
 * Which Administration sections have a reliable, verified Supabase data
 * source for a headline KPI number. This is deliberately NOT a list of
 * Administration sections/routes (those come from getAdministrationSections(),
 * which reads config/navigation.ts) — it only says, for a handful of the
 * sections that helper discovers, how to compute the one number worth
 * showing on the card. A section with no entry here still renders as a
 * plain link card; it just has no KPI badge. Keyed by the section's nav
 * title, so renaming a section in config/navigation.ts simply drops its KPI
 * rather than breaking anything.
 */
const KPI_SECTIONS = new Set([
  'Assets', 'Fleet', 'Staff Attendance', 'Fuel Management', 'Drivers',
  'Purchase Requests', 'Meetings', 'Birthdays', 'Notifications', 'Approvals',
]);

interface SectionStats {
  assets?: number;
  fleet?: number;
  presentToday?: number;
  totalEmployees?: number;
  fuelCost?: number;
  drivers?: number;
  pendingRequests?: number;
  upcomingMeetings?: number;
  todayBirthdays?: number;
  unreadNotifications?: number;
  pendingApprovals?: number;
}

export default function AdministrationOverviewPage() {
  const { company, user, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();

  // Sections are discovered from the existing navigation configuration —
  // the same source Sidebar.tsx renders from — not a second hardcoded list.
  const allSections = useMemo(() => getAdministrationSections(company?.name), [company?.name]);

  // RBAC governs which sections are visible here exactly as it does in the
  // sidebar: Company Admin/Super Admin see everything, everyone else only
  // what their permissions actually grant.
  const accessibleSections = useMemo(
    () => allSections.filter(s => isAdmin || !s.permission || hasPermission(s.permission)),
    [allSections, isAdmin, hasPermission]
  );

  const canAttendance = isAdmin || hasPermission('attendance.view');
  const canFleet = isAdmin || hasPermission('assets.vehicles.view');
  const canAssets = isAdmin || hasPermission('assets.view');
  const canFuel = isAdmin || hasPermission('fuel.view');
  const canDrivers = isAdmin || hasPermission('drivers.view');
  const canPurchaseRequests = isAdmin || hasPermission('purchase_requests.view');
  const canMeetings = isAdmin || hasPermission('meetings.view');
  const canBirthdays = isAdmin || hasPermission('birthdays.view');
  const canNotifications = isAdmin || hasPermission('notifications.view');
  const canApprovals = isAdmin || hasPermission('approvals.view');
  const canAuditLogs = isAdmin || hasPermission('audit_logs.view');

  const [stats, setStats] = useState<SectionStats>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const id = company.id;
    const today = format(new Date(), 'yyyy-MM-dd');
    const currentMonth = format(new Date(), 'yyyy-MM');

    const loadStats = async () => {
      setLoading(true);

      // Only query data for sections the user is actually permitted to see —
      // an unauthorized section never fires its Supabase query at all.
      const [
        assetsRes, vehiclesRes, employeesRes, attendanceRes, fuelRes,
        driversRes, prRes, meetingsRes, birthdaysRes, notifRes, approvalsRes,
      ] = await Promise.all([
        canAssets ? supabase.from('assets').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: null } as any),
        canFleet ? supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'active') : Promise.resolve({ count: null } as any),
        canAttendance ? supabase.from('employees').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('employment_status', 'active') : Promise.resolve({ count: null } as any),
        canAttendance ? supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('attendance_date', today).in('status', ['present', 'late']) : Promise.resolve({ count: null } as any),
        canFuel ? supabase.from('fuel_records').select('cost').eq('company_id', id).gte('fuel_date', `${currentMonth}-01`).lte('fuel_date', `${currentMonth}-31`) : Promise.resolve({ data: null } as any),
        canDrivers ? supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('company_id', id) : Promise.resolve({ count: null } as any),
        canPurchaseRequests ? supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending') : Promise.resolve({ count: null } as any),
        canMeetings ? supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('company_id', id).gte('date', today).lte('date', format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')) : Promise.resolve({ count: null } as any),
        canBirthdays ? supabase.from('employees').select('date_of_birth').eq('company_id', id).not('date_of_birth', 'is', null) : Promise.resolve({ data: null } as any),
        canNotifications && user?.id ? supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('user_id', user.id).eq('is_read', false) : Promise.resolve({ count: null } as any),
        canApprovals ? supabase.from('request_approvals').select('id', { count: 'exact', head: true }).eq('company_id', id).eq('status', 'pending') : Promise.resolve({ count: null } as any),
      ]);

      const fuelCost = (fuelRes.data ?? []).reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
      const todayBirthdays = (birthdaysRes.data ?? []).filter((e: any) => e.date_of_birth && isToday(new Date(new Date().getFullYear(), new Date(e.date_of_birth).getMonth(), new Date(e.date_of_birth).getDate()))).length;

      setStats({
        assets: assetsRes.count ?? undefined,
        fleet: vehiclesRes.count ?? undefined,
        totalEmployees: employeesRes.count ?? undefined,
        presentToday: attendanceRes.count ?? undefined,
        fuelCost: canFuel ? fuelCost : undefined,
        drivers: driversRes.count ?? undefined,
        pendingRequests: prRes.count ?? undefined,
        upcomingMeetings: meetingsRes.count ?? undefined,
        todayBirthdays: canBirthdays ? todayBirthdays : undefined,
        unreadNotifications: notifRes.count ?? undefined,
        pendingApprovals: approvalsRes.count ?? undefined,
      });

      // Recent activity — loaded independently so a schema issue here can't
      // break the rest of the dashboard; requires its own permission.
      if (canAuditLogs) {
        try {
          const { data } = await supabase
            .from('audit_logs')
            .select('action, module, created_at')
            .eq('company_id', id)
            .order('created_at', { ascending: false })
            .limit(5);
          setRecentActivity(data ?? []);
        } catch {
          setRecentActivity([]);
        }
      }

      setLoading(false);
    };

    loadStats();
  }, [company?.id, user?.id, canAssets, canFleet, canAttendance, canFuel, canDrivers, canPurchaseRequests, canMeetings, canBirthdays, canNotifications, canApprovals, canAuditLogs]);

  // KPI badge text for a card, derived only from data the user is permitted
  // to see. Sections without a mapped KPI simply return null.
  const kpiFor = (title: string): string | null => {
    if (loading) return '...';
    switch (title) {
      case 'Assets': return canAssets && stats.assets != null ? `${stats.assets} assets` : null;
      case 'Fleet': return canFleet && stats.fleet != null ? `${stats.fleet} vehicles` : null;
      case 'Staff Attendance': return canAttendance && stats.presentToday != null ? `${stats.presentToday}/${stats.totalEmployees ?? '—'} present` : null;
      case 'Fuel Management': return canFuel && stats.fuelCost != null ? `$${stats.fuelCost.toFixed(0)} this month` : null;
      case 'Drivers': return canDrivers && stats.drivers != null ? `${stats.drivers} drivers` : null;
      case 'Purchase Requests': return canPurchaseRequests && stats.pendingRequests != null ? `${stats.pendingRequests} pending` : null;
      case 'Meetings': return canMeetings && stats.upcomingMeetings != null ? `${stats.upcomingMeetings} upcoming` : null;
      case 'Birthdays': return canBirthdays && stats.todayBirthdays != null ? `${stats.todayBirthdays} today` : null;
      case 'Notifications': return canNotifications && stats.unreadNotifications != null ? `${stats.unreadNotifications} unread` : null;
      case 'Approvals': return canApprovals && stats.pendingApprovals != null ? `${stats.pendingApprovals} pending` : null;
      default: return null;
    }
  };

  // Cross-module callouts — each entirely gated by the same permission as
  // its underlying section, and only rendered once a real (non-zero) value
  // has loaded. No callout is shown just because the viewer is in the
  // Administration department.
  const CALLOUT_STYLES: Record<string, { wrap: string; icon: string }> = {
    blue: { wrap: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900', icon: 'text-blue-600' },
    rose: { wrap: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900', icon: 'text-rose-600' },
    pink: { wrap: 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900', icon: 'text-pink-600' },
    amber: { wrap: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900', icon: 'text-amber-600' },
    indigo: { wrap: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900', icon: 'text-indigo-600' },
  };
  const callouts = [
    canApprovals && (stats.pendingApprovals ?? 0) > 0 && { icon: CheckCircle2, color: 'blue', label: `${stats.pendingApprovals} Pending Approvals`, sub: 'Awaiting your review', href: '/administration/approvals' },
    canPurchaseRequests && (stats.pendingRequests ?? 0) > 0 && { icon: Clipboard, color: 'rose', label: `${stats.pendingRequests} Pending Purchase Requests`, sub: 'Awaiting review', href: '/administration/purchase-requests' },
    canBirthdays && (stats.todayBirthdays ?? 0) > 0 && { icon: Bell, color: 'pink', label: `${stats.todayBirthdays} Birthday${stats.todayBirthdays === 1 ? '' : 's'} Today`, sub: 'Celebrate with your team', href: '/administration/birthdays' },
    canNotifications && (stats.unreadNotifications ?? 0) > 0 && { icon: Bell, color: 'amber', label: `${stats.unreadNotifications} Unread Notifications`, sub: 'Needs your attention', href: '/administration/notifications' },
    canMeetings && (stats.upcomingMeetings ?? 0) > 0 && { icon: Clock, color: 'indigo', label: `${stats.upcomingMeetings} Upcoming Meeting${stats.upcomingMeetings === 1 ? '' : 's'}`, sub: 'In the next 7 days', href: '/administration/meetings' },
  ].filter(Boolean) as { icon: any; color: string; label: string; sub: string; href: string }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Overview of your organization's administration operations"
        breadcrumbs={[{ label: 'Administration' }]}
      />

      {/* Headline KPIs — only for sections the viewer can see and that have real data */}
      {(canAssets || canFleet || canAttendance || canPurchaseRequests) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {canAssets && <KPICard title="Total Assets" value={loading ? 0 : (stats.assets ?? 0)} icon={<Briefcase className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />}
          {canFleet && <KPICard title="Fleet Vehicles" value={loading ? 0 : (stats.fleet ?? 0)} icon={<Car className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
          {canAttendance && <KPICard title="Present Today" value={loading ? 0 : (stats.presentToday ?? 0)} icon={<Users className="h-4 w-4 text-purple-600" />} iconBg="bg-purple-50 dark:bg-purple-950/50" loading={loading} />}
          {canPurchaseRequests && <KPICard title="Pending Requests" value={loading ? 0 : (stats.pendingRequests ?? 0)} icon={<Clipboard className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />}
        </div>
      )}

      {/* Module cards — dynamically discovered, permission-filtered */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Administration Modules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accessibleSections.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-10 w-10" />}
              title="No accessible sections"
              description="You don't currently have permission to view any Administration sections. Contact your administrator if you believe this is incorrect."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {accessibleSections.map(section => {
                const Icon = section.icon;
                const kpi = KPI_SECTIONS.has(section.title) ? kpiFor(section.title) : null;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      {Icon ? <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" /> : <LayoutGrid className="h-5 w-5 text-gray-600 dark:text-gray-300" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{section.title}</h3>
                    {kpi && <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2">{kpi}</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cross-module callouts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Needs Your Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading…</p>
            ) : callouts.length === 0 ? (
              <EmptyState title="Nothing pending" description="No outstanding approvals, requests, or reminders right now." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {callouts.map(c => {
                  const style = CALLOUT_STYLES[c.color] ?? CALLOUT_STYLES.blue;
                  return (
                    <Link key={c.href + c.label} href={c.href} className={`flex items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow ${style.wrap}`}>
                      <c.icon className={`h-5 w-5 shrink-0 ${style.icon}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.label}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{c.sub}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity, from the audit log — requires audit_logs.view */}
        {canAuditLogs && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white truncate">{(activity.action ?? '').replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.module} · {activity.created_at ? format(new Date(activity.created_at), 'HH:mm') : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
