'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, CheckCircle2, Navigation, Wrench, Plus, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FleetPage() {
  const { company, user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vehicleName, setVehicleName] = useState('');
  const [vehicleType, setVehicleType] = useState('van');
  const [plateNumber, setPlateNumber] = useState('');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [mileage, setMileage] = useState('');
  const [status, setStatus] = useState('available');

  const loadVehicles = async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('fleet_vehicles')
        .select('*, employees(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVehicles(); }, [company?.id]);

  const handleAddVehicle = async () => {
    if (!company?.id || !user?.id) return;
    if (!vehicleName.trim() || !plateNumber.trim()) {
      toast.error('Vehicle name and plate number are required');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('fleet_vehicles').insert({
        company_id: company.id,
        vehicle_name: vehicleName.trim(),
        vehicle_type: vehicleType,
        plate_number: plateNumber.trim(),
        assigned_driver_id: assignedDriver || null,
        mileage: mileage ? parseInt(mileage) : 0,
        status,
      });

      if (error) throw error;

      await logAuditEvent(company.id, user.id, {
        action: 'vehicle_added',
        module: 'fleet',
        entity_type: 'fleet_vehicles',
        new_value: { vehicle_name: vehicleName.trim(), plate_number: plateNumber.trim() },
      });

      toast.success('Vehicle added successfully');
      setVehicleName('');
      setPlateNumber('');
      setAssignedDriver('');
      setMileage('');
      setStatus('available');
      setDialogOpen(false);
      loadVehicles();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Failed to add vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const updateVehicleStatus = async (id: string, newStatus: string) => {
    if (!company?.id || !user?.id) return;

    try {
      const { error } = await supabase
        .from('fleet_vehicles')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent(company.id, user.id, {
        action: 'vehicle_status_updated',
        module: 'fleet',
        entity_type: 'fleet_vehicles',
        entity_id: id,
        new_value: { status: newStatus },
      });

      toast.success('Status updated');
      loadVehicles();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const totalCount = vehicles.length;
  const availableCount = vehicles.filter(v => v.status === 'available').length;
  const inUseCount = vehicles.filter(v => v.status === 'in_use').length;
  const maintenanceCount = vehicles.filter(v => v.status === 'maintenance').length;

  return (
    <PermissionGuard permission="fleet.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view fleet</div>}>
      <div className="space-y-6">
        <PageHeader
          title="Fleet Management"
          description="Track and manage company vehicles"
          breadcrumbs={[{ label: 'Administration' }, { label: 'Fleet' }]}
        >
          <PermissionGuard permission="fleet.export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </PermissionGuard>
          <PermissionGuard permission="fleet.create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleName">Vehicle Name *</Label>
                    <Input id="vehicleName" placeholder="e.g., Ford Transit" value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Type</Label>
                      <Select value={vehicleType} onValueChange={setVehicleType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="sedan">Sedan</SelectItem>
                          <SelectItem value="suv">SUV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plateNumber">Plate Number *</Label>
                      <Input id="plateNumber" placeholder="ABC-123" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Mileage</Label>
                      <Input id="mileage" type="number" placeholder="0" value={mileage} onChange={(e) => setMileage(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="in_use">In Use</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedDriver">Assigned Driver</Label>
                    <Input id="assignedDriver" placeholder="Employee ID or leave blank" value={assignedDriver} onChange={(e) => setAssignedDriver(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddVehicle} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add Vehicle
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </PermissionGuard>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Vehicles"
            value={totalCount}
            icon={<Truck className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
          <KPICard
            title="Available"
            value={availableCount}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/50"
            loading={loading}
          />
          <KPICard
            title="In Use"
            value={inUseCount}
            icon={<Navigation className="h-4 w-4 text-blue-600" />}
            iconBg="bg-blue-50 dark:bg-blue-950/50"
            loading={loading}
          />
          <KPICard
            title="In Maintenance"
            value={maintenanceCount}
            icon={<Wrench className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            loading={loading}
          />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Vehicle Registry</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">Loading vehicles...</p>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="p-8 text-center">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">No vehicles found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Vehicle</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assigned Driver</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Mileage</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {vehicles.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.vehicle_name} ({row.plate_number})</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{row.vehicle_type}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.employees ? `${row.employees.first_name} ${row.employees.last_name}` : 'Unassigned'}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.mileage?.toLocaleString() || '0'} mi</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                        <td className="px-4 py-3">
                          <PermissionGuard permission="fleet.edit">
                            <Select value={row.status} onValueChange={(v) => updateVehicleStatus(row.id, v)}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="in_use">In Use</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                              </SelectContent>
                            </Select>
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
