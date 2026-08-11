'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Car, TrendingUp, DollarSign, Fuel } from 'lucide-react';
import { format } from 'date-fns';

export default function FuelDriversPage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [driverData, setDriverData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { key: 'driver', header: 'Driver' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'totalLiters', header: 'Total Liters' },
    { key: 'totalCost', header: 'Total Cost' },
    { key: 'avgEfficiency', header: 'Avg Efficiency (km/L)' },
    { key: 'trips', header: 'Trips' },
  ];

  useEffect(() => {
    loadDriverData();
  }, [company?.id, selectedMonth]);

  const loadDriverData = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data: fuelRecords } = await supabase
      .from('fuel_records')
      .select('*, vehicles(plate_number), profiles(first_name, last_name)')
      .eq('company_id', company.id)
      .gte('fuel_date', `${selectedMonth}-01`)
      .lte('fuel_date', `${selectedMonth}-31`);

    const driverMap = new Map();
    (fuelRecords || []).forEach((record) => {
      const driverId = record.driver_id;
      if (!driverId) return;

      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          driver: `${record.profiles?.first_name || ''} ${record.profiles?.last_name || ''}`,
          vehicle: record.vehicles?.plate_number || '-',
          totalLiters: 0,
          totalCost: 0,
          trips: 0,
        });
      }

      const driver = driverMap.get(driverId);
      driver.totalLiters += record.fuel_quantity || 0;
      driver.totalCost += record.cost || 0;
      driver.trips += 1;
    });

    const driverData = Array.from(driverMap.values()).map((driver: any) => ({
      ...driver,
      avgEfficiency: driver.totalLiters > 0 ? (driver.trips * 100 / driver.totalLiters).toFixed(1) : '0',
    }));

    setDriverData(driverData);
    setLoading(false);
  };

  const formattedData = driverData.map((item) => ({
    ...item,
    totalCost: `$${item.totalCost.toFixed(2)}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver Fuel Usage"
        description="Track fuel consumption by driver"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Fuel', href: '/administration/fuel' },
          { label: 'Drivers' },
        ]}
      >
        <Button size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Drivers</p>
                <p className="text-2xl font-bold">18</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Efficiency</p>
                <p className="text-2xl font-bold">7.2 km/L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Car className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Distance</p>
                <p className="text-2xl font-bold">5,370 km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search drivers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
