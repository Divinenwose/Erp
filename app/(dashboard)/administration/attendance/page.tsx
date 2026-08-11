'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, UserCheck, AlertTriangle, BadgeCheck, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function AttendanceDashboardPage() {
  const { company } = useAuth();
  const [stats, setStats] = useState({
    presentToday: 0,
    lateArrivals: 0,
    absentToday: 0,
    idCompliance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [company?.id]);

  const loadStats = async () => {
    if (!company?.id) return;
    const today = new Date().toISOString().split('T')[0];

    const [presentResult, lateResult, absentResult, employeesResult] = await Promise.all([
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('attendance_date', today).in('status', ['present', 'late', 'half_day']),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('attendance_date', today).eq('status', 'late'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('attendance_date', today).eq('status', 'absent'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
    ]);

    const idCardsResult = await supabase
      .from('id_card_compliance')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .in('status', ['active']);

    const presentCount = presentResult.count || 0;
    const lateCount = lateResult.count || 0;
    const absentCount = absentResult.count || 0;
    const totalEmployees = employeesResult.count || 0;
    const activeIdCards = idCardsResult.count || 0;

    setStats({
      presentToday: presentCount,
      lateArrivals: lateCount,
      absentToday: absentCount,
      idCompliance: totalEmployees ? Math.round((activeIdCards / totalEmployees) * 100) : 0,
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Staff Attendance" 
        description="Monitor employee attendance, clock in/out, and compliance"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Attendance' }
        ]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Present Today" 
          value={stats.presentToday} 
          icon={<UserCheck className="h-4 w-4 text-emerald-600" />} 
          iconBg="bg-emerald-50 dark:bg-emerald-950/50" 
          loading={loading}
        />
        <KPICard 
          title="Late Arrivals" 
          value={stats.lateArrivals} 
          icon={<Clock className="h-4 w-4 text-amber-600" />} 
          iconBg="bg-amber-50 dark:bg-amber-950/50" 
          loading={loading}
        />
        <KPICard 
          title="Absent Today" 
          value={stats.absentToday} 
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />} 
          iconBg="bg-red-50 dark:bg-red-950/50" 
          loading={loading}
        />
        <KPICard 
          title="ID Compliance" 
          value={stats.idCompliance} 
          suffix="%" 
          icon={<BadgeCheck className="h-4 w-4 text-blue-600" />} 
          iconBg="bg-blue-50 dark:bg-blue-950/50" 
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/administration/attendance/daily">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Daily Attendance</CardTitle>
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">View and manage daily attendance records</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/attendance/clock-in-out">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Clock In/Out</CardTitle>
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Employee clock in and clock out management</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/attendance/lateness">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lateness Register</CardTitle>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Track late arrivals and patterns</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/attendance/absence">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Absence Register</CardTitle>
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monitor employee absences</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/attendance/id-compliance">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">ID Card Compliance</CardTitle>
                <BadgeCheck className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage employee ID cards</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/attendance/reports">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Attendance Reports</CardTitle>
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generate attendance reports</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
