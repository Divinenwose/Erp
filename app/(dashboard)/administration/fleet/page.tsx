'use client';

import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, CheckCircle2, Navigation, Wrench, Plus, Download } from 'lucide-react';

const MOCK_FLEET = [
  { id: 1, vehicle: 'Ford Transit – VAN-001', type: 'Van', driver: 'Carlos Rivera', mileage: '42,840 mi', fuel: '87%', lastService: 'Nov 15, 2024', status: 'available' },
  { id: 2, vehicle: 'Chevy Silverado – TRK-002', type: 'Truck', driver: 'James Wilson', mileage: '68,200 mi', fuel: '45%', lastService: 'Oct 28, 2024', status: 'in_use' },
  { id: 3, vehicle: 'Toyota Camry – CAR-003', type: 'Sedan', driver: 'Maria Lopez', mileage: '28,100 mi', fuel: '62%', lastService: 'Dec 1, 2024', status: 'available' },
  { id: 4, vehicle: 'Ford F-150 – TRK-004', type: 'Truck', driver: '—', mileage: '95,400 mi', fuel: '—', lastService: 'Dec 12, 2024', status: 'maintenance' },
  { id: 5, vehicle: 'Honda CR-V – SUV-005', type: 'SUV', driver: 'Lisa Park', mileage: '31,600 mi', fuel: '73%', lastService: 'Nov 20, 2024', status: 'available' },
];

export default function FleetPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        description="Track and manage company vehicles"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Fleet' }]}
      >
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Vehicles"
          value={18}
          icon={<Truck className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Available"
          value={12}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="In Use"
          value={4}
          icon={<Navigation className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="In Maintenance"
          value={2}
          icon={<Wrench className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Vehicle Registry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Vehicle</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assigned Driver</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Mileage</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Fuel</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last Service</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {MOCK_FLEET.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.vehicle}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.type}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.driver}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.mileage}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.fuel}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{row.lastService}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t dark:border-gray-800 text-center">
            <p className="text-xs text-gray-400">Full fleet management with GPS tracking, maintenance scheduling, and fuel cost analytics available in the complete module.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
