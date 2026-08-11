'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fuel, Car, TrendingUp, TrendingDown, DollarSign, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { format, subMonths } from 'date-fns';

export default function FuelDashboardPage() {
  const { company } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [stats, setStats] = useState({
    totalFuelCost: 0,
    totalLiters: 0,
    activeVehicles: 0,
    avgCostPerLiter: 0,
    costChange: 0,
    litersChange: 0,
    efficiencyChange: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [company?.id, selectedPeriod]);

  const loadStats = async () => {
    if (!company?.id) return;
    setLoading(true);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const previousMonth = subMonths(new Date(), 1).toISOString().slice(0, 7);

    const [currentFuelResult, previousFuelResult, vehiclesResult, trendResult] = await Promise.all([
      supabase
        .from('fuel_records')
        .select('cost, fuel_quantity, fuel_date')
        .eq('company_id', company.id)
        .gte('fuel_date', `${currentMonth}-01`)
        .lte('fuel_date', `${currentMonth}-31`),
      supabase
        .from('fuel_records')
        .select('cost, fuel_quantity')
        .eq('company_id', company.id)
        .gte('fuel_date', `${previousMonth}-01`)
        .lte('fuel_date', `${previousMonth}-31`),
      supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'active'),
      supabase
        .from('fuel_records')
        .select('fuel_date, cost, fuel_quantity')
        .eq('company_id', company.id)
        .gte('fuel_date', `${subMonths(new Date(), 5).toISOString().slice(0, 7)}-01`)
        .order('fuel_date', { ascending: true }),
    ]);

    const currentFuelData = currentFuelResult.data || [];
    const previousFuelData = previousFuelResult.data || [];
    const trendData = trendResult.data || [];

    const totalCost = currentFuelData.reduce((sum, record) => sum + (record.cost || 0), 0);
    const totalLiters = currentFuelData.reduce((sum, record) => sum + (record.fuel_quantity || 0), 0);
    const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

    const previousCost = previousFuelData.reduce((sum, record) => sum + (record.cost || 0), 0);
    const previousLiters = previousFuelData.reduce((sum, record) => sum + (record.fuel_quantity || 0), 0);
    const previousAvgCost = previousLiters > 0 ? previousCost / previousLiters : 0;

    const costChange = previousCost > 0 ? ((totalCost - previousCost) / previousCost) * 100 : 0;
    const litersChange = previousLiters > 0 ? ((totalLiters - previousLiters) / previousLiters) * 100 : 0;
    const efficiencyChange = previousAvgCost > 0 ? ((avgCostPerLiter - previousAvgCost) / previousAvgCost) * 100 : 0;

    // Aggregate trend data by month
    const monthlyData = trendData.reduce((acc: any, record) => {
      const month = record.fuel_date.slice(0, 7);
      if (!acc[month]) {
        acc[month] = { month, cost: 0, liters: 0 };
      }
      acc[month].cost += record.cost || 0;
      acc[month].liters += record.fuel_quantity || 0;
      return acc;
    }, {});

    setMonthlyTrend(Object.values(monthlyData));
    setStats({
      totalFuelCost: totalCost,
      totalLiters,
      activeVehicles: vehiclesResult.count || 0,
      avgCostPerLiter,
      costChange,
      litersChange,
      efficiencyChange,
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuel Management"
        description="Track vehicle fuel consumption and costs"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Fuel' }
        ]}
      >
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Fuel Cost"
          value={stats.totalFuelCost}
          prefix="$"
          change={stats.costChange}
          changeLabel="vs last month"
          icon={<DollarSign className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
          loading={loading}
        />
        <KPICard
          title="Total Liters"
          value={stats.totalLiters}
          change={stats.litersChange}
          changeLabel="vs last month"
          icon={<Fuel className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
          loading={loading}
        />
        <KPICard
          title="Active Vehicles"
          value={stats.activeVehicles}
          icon={<Car className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
          loading={loading}
        />
        <KPICard
          title="Avg Cost/Liter"
          value={stats.avgCostPerLiter}
          prefix="$"
          change={stats.efficiencyChange}
          changeLabel="vs last month"
          icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
          iconBg="bg-purple-50 dark:bg-purple-950/50"
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Fuel Trend (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlyTrend.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-blue-500 dark:bg-blue-600 rounded-t" style={{ height: `${Math.min((data.cost / Math.max(...monthlyTrend.map(d => d.cost), 1)) * 100, 100)}%` }} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(data.month + '-01'), 'MMM')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fuel Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/administration/fuel/records">
              <Button className="w-full" variant="outline">
                <Fuel className="h-4 w-4 mr-2" />
                View Records
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Driver Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/administration/fuel/drivers">
              <Button className="w-full" variant="outline">
                <Car className="h-4 w-4 mr-2" />
                View Drivers
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vehicle History</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/administration/fuel/vehicles">
              <Button className="w-full" variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Vehicles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
