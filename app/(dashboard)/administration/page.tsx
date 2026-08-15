'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Car, UserCheck, Wrench, Package, Briefcase, Users, Clipboard, Fuel, Search, Calendar, Bell, TrendingUp, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, subMonths, isToday, isThisWeek } from 'date-fns';

export default function AdministrationOverviewPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const router = useRouter();
  const [totalAssets, setTotalAssets] = useState(0);
  const [fleetVehicles, setFleetVehicles] = useState(0);
  const [visitorsToday, setVisitorsToday] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [fuelCost, setFuelCost] = useState(0);
  const [fuelChange, setFuelChange] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [upcomingMeetings, setUpcomingMeetings] = useState(0);
  const [todayBirthdays, setTodayBirthdays] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');
  const currentMonth = format(new Date(), 'yyyy-MM');
  const previousMonth = format(subMonths(new Date(), 1), 'yyyy-MM');

  // Each quick-action card requires the RBAC permission for the page it links
  // to, reusing the same permission strings already defined in navigation.ts.
  const modules = [
    { title: 'Assets', description: 'Fixed asset management', icon: Briefcase, href: '/administration/assets', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', count: loading ? '...' : `${totalAssets} assets`, permission: 'assets.view' },
    { title: 'Fleet', description: 'Vehicle management', icon: Car, href: '/administration/fleet', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', count: loading ? '...' : `${fleetVehicles} vehicles`, permission: 'assets.vehicles.view' },
    { title: 'Attendance', description: 'Staff attendance tracking', icon: Users, href: '/administration/attendance', color: 'bg-purple-50 dark:bg-purple-950/30', iconColor: 'text-purple-600', count: loading ? '...' : `${presentToday}/${totalEmployees} present`, permission: 'attendance.view' },
    { title: 'Fuel', description: 'Fuel management', icon: Fuel, href: '/administration/fuel', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', count: loading ? '...' : `$${fuelCost.toFixed(0)} this month`, permission: 'fuel.view' },
    { title: 'Purchase Requests', description: 'Purchase request workflow', icon: Clipboard, href: '/administration/purchase-requests', color: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600', count: loading ? '...' : `${pendingRequests} pending`, permission: 'purchase_requests.view' },
    { title: 'Inspections', description: 'Office inspections', icon: Search, href: '/administration/inspections', color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600', count: 'View inspections', permission: 'inspections.view' },
    { title: 'Meetings', description: 'Meeting management', icon: Calendar, href: '/administration/meetings', color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600', count: loading ? '...' : `${upcomingMeetings} upcoming`, permission: 'reception.view' },
    { title: 'Birthdays', description: 'Birthday celebrations', icon: Bell, href: '/administration/birthdays', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600', count: loading ? '...' : `${todayBirthdays} today`, permission: 'attendance.view' },
    { title: 'Office Supplies', description: 'Inventory management', icon: Package, href: '/administration/office-supplies', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600', count: loading ? '...' : `${lowStockItems} low stock`, permission: 'supplies.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  useEffect(() => {
    loadStats();
  }, [company?.id]);

  const loadStats = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [assetsResult, vehiclesResult, employeesResult, attendanceResult, fuelResult, requestsResult, visitorsResult, meetingsResult, birthdaysResult, suppliesResult] = await Promise.all([
      supabase.from('assets').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', company.id),
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('attendance_date', today).eq('status', 'present'),
      supabase.from('fuel_records').select('cost').eq('company_id', company.id).gte('fuel_date', `${currentMonth}-01`).lte('fuel_date', `${currentMonth}-31`),
      supabase.from('purchase_requests').select('id', { count: 'exact', head: true }).eq('company_id', company.id).in('status', ['pending', 'admin_review', 'md_approval']),
      supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('check_in', today),
      supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('company_id', company.id).gte('date', today).lte('date', format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', company.id).not('date_of_birth', 'is', null),
      supabase.from('office_supplies_inventory').select('id', { count: 'exact', head: true }).eq('company_id', company.id).lt('quantity', 'min_stock_level'),
    ]);

    // Load audit logs separately to avoid breaking the dashboard if it fails
    let auditResult: { data: any[] } = { data: [] };
    try {
      const result = await supabase.from('audit_logs').select('action, module, created_at').eq('company_id', company.id).order('created_at', { ascending: false }).limit(5);
      auditResult = { data: result.data ?? [] };
    } catch (error) {
      console.warn('Failed to load audit logs:', error);
    }

    const fuelSum = (fuelResult.data || []).reduce((sum, item) => sum + (item.cost || 0), 0);
    
    // Calculate fuel change from previous month
    const previousFuelResult = await supabase.from('fuel_records').select('cost').eq('company_id', company.id).gte('fuel_date', `${previousMonth}-01`).lte('fuel_date', `${previousMonth}-31`);
    const previousFuelSum = (previousFuelResult.data || []).reduce((sum, item) => sum + (item.cost || 0), 0);
    const fuelChangePercent = previousFuelSum > 0 ? ((fuelSum - previousFuelSum) / previousFuelSum) * 100 : 0;

    // Calculate birthdays today
    const todayBirthdaysCount = (birthdaysResult.data || []).filter((emp: any) => {
      if (!emp.date_of_birth) return false;
      const birthDate = new Date(emp.date_of_birth);
      const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
      return isToday(thisYearBirthday);
    }).length;

    setTotalAssets(assetsResult.count || 0);
    setFleetVehicles(vehiclesResult.count || 0);
    setTotalEmployees(employeesResult.count || 0);
    setPresentToday(attendanceResult.count || 0);
    setFuelCost(fuelSum);
    setFuelChange(fuelChangePercent);
    setPendingRequests(requestsResult.count || 0);
    setVisitorsToday(visitorsResult.count || 0);
    setUpcomingMeetings(meetingsResult.count || 0);
    setTodayBirthdays(todayBirthdaysCount);
    setLowStockItems(suppliesResult.count || 0);
    setRecentActivities(auditResult.data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Administration" description="Manage office facilities, assets, and operations" breadcrumbs={[{ label: 'Administration' }]}>
        <Button size="sm" onClick={() => router.push('/administration/assets')} className="bg-blue-600 hover:bg-blue-700">Register Asset</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(isAdmin || hasPermission('assets.view')) && <KPICard title="Total Assets" value={loading ? 0 : totalAssets} icon={<Briefcase className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />}
        {(isAdmin || hasPermission('assets.vehicles.view')) && <KPICard title="Fleet Vehicles" value={loading ? 0 : fleetVehicles} icon={<Car className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
        {(isAdmin || hasPermission('attendance.view')) && <KPICard title="Present Today" value={loading ? 0 : presentToday} icon={<Users className="h-4 w-4 text-purple-600" />} iconBg="bg-purple-50 dark:bg-purple-950/50" loading={loading} />}
        {(isAdmin || hasPermission('purchase_requests.view')) && <KPICard title="Pending Requests" value={loading ? 0 : pendingRequests} icon={<Clipboard className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {modules.slice(0, 6).map(m => (
                <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md transition-all group">
                  <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <m.icon className={`h-5 w-5 ${m.iconColor}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2">{m.count}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white truncate">{activity.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.module} · {format(new Date(activity.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {modules.slice(6).map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-2">{m.count}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Alerts & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lowStockItems > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{lowStockItems} Low Stock Items</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Office supplies need restocking</p>
                </div>
              </div>
            )}
            {pendingRequests > 0 && (
              <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900">
                <Clipboard className="h-5 w-5 text-rose-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{pendingRequests} Pending Requests</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Purchase requests awaiting approval</p>
                </div>
              </div>
            )}
            {todayBirthdays > 0 && (
              <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-950/20 rounded-lg border border-pink-200 dark:border-pink-900">
                <Bell className="h-5 w-5 text-pink-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{todayBirthdays} Birthday Today</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Celebrate with your team</p>
                </div>
              </div>
            )}
            {lowStockItems === 0 && pendingRequests === 0 && todayBirthdays === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 col-span-3 text-center py-4">No alerts at this time</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
