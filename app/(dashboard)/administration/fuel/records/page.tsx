'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function FuelRecordsPage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [fuelData, setFuelData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formVehicle, setFormVehicle] = useState('');
  const [formDriver, setFormDriver] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formQuantity, setFormQuantity] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formOdometer, setFormOdometer] = useState('');
  const [formStation, setFormStation] = useState('');

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'driver', header: 'Driver' },
    { key: 'quantity', header: 'Quantity (L)' },
    { key: 'cost', header: 'Cost' },
    { key: 'odometer', header: 'Odometer' },
    { key: 'station', header: 'Station' },
  ];

  useEffect(() => {
    loadFuelRecords();
    loadVehicles();
    loadDrivers();
  }, [company?.id, selectedMonth, selectedVehicle, selectedDriver]);

  const loadFuelRecords = async () => {
    if (!company?.id) return;
    setLoading(true);

    // vehicle_id has no FK constraint on fuel_records, so PostgREST can't
    // embed vehicles(...) directly — match against the separately-loaded
    // vehicles list instead. profiles(...) is a real FK (driver_id) and can
    // be embedded normally.
    let query = supabase
      .from('fuel_records')
      .select('*, profiles(first_name, last_name)')
      .eq('company_id', company.id)
      .gte('fuel_date', `${selectedMonth}-01`)
      .lte('fuel_date', `${selectedMonth}-31`);

    if (selectedVehicle) {
      query = query.eq('vehicle_id', selectedVehicle);
    }
    if (selectedDriver) {
      query = query.eq('driver_id', selectedDriver);
    }

    const { data } = await query.order('fuel_date', { ascending: false });
    setFuelData(data || []);
    setLoading(false);
  };

  const loadVehicles = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('company_id', company.id)
      .eq('status', 'active');
    setVehicles(data || []);
  };

  const loadDrivers = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('company_id', company.id);
    setDrivers(data || []);
  };

  const handleSaveRecord = async () => {
    if (!company?.id) return;
    if (!formVehicle || !formDate || !formQuantity || !formCost) {
      toast.error('Vehicle, date, quantity, and cost are required');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('fuel_records').insert({
      company_id: company.id,
      vehicle_id: formVehicle,
      driver_id: formDriver || null,
      fuel_date: formDate,
      fuel_quantity: parseFloat(formQuantity),
      cost: parseFloat(formCost),
      odometer_reading: formOdometer ? parseInt(formOdometer, 10) : null,
      fuel_station: formStation.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to save fuel record');
      return;
    }

    toast.success('Fuel record saved');
    setFormVehicle(''); setFormDriver(''); setFormQuantity(''); setFormCost(''); setFormOdometer(''); setFormStation('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogOpen(false);
    loadFuelRecords();
  };

  const vehiclePlate = (vehicleId: string) => vehicles.find(v => v.id === vehicleId)?.plate_number || '-';

  const formattedData = fuelData.map((item) => ({
    ...item,
    date: item.fuel_date ? format(new Date(item.fuel_date), 'MMM dd, yyyy') : '-',
    vehicle: vehiclePlate(item.vehicle_id),
    driver: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : '-',
    quantity: item.fuel_quantity,
    cost: `$${(item.cost || 0).toFixed(2)}`,
    odometer: item.odometer_reading || '-',
    station: item.fuel_station || '-',
  }));

  return (
    <PermissionGuard permission="fuel.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view fuel records</div>}>
      <div className="space-y-6">
      <PageHeader
        title="Fuel Records"
        description="Manage vehicle fuel consumption records"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Fuel', href: '/administration/fuel' },
          { label: 'Records' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fuel Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle *</Label>
                  <Select value={formVehicle} onValueChange={setFormVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver">Driver</Label>
                  <Select value={formDriver || 'none'} onValueChange={(v) => setFormDriver(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (Liters) *</Label>
                  <Input id="quantity" type="number" step="0.1" placeholder="0.0" value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost *</Label>
                  <Input id="cost" type="number" step="0.01" placeholder="0.00" value={formCost} onChange={(e) => setFormCost(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odometer">Odometer Reading</Label>
                  <Input id="odometer" type="number" placeholder="0" value={formOdometer} onChange={(e) => setFormOdometer(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="station">Fuel Station</Label>
                <Input id="station" placeholder="Station name" value={formStation} onChange={(e) => setFormStation(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleSaveRecord} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-auto"
              />
              <Select value={selectedVehicle || 'all'} onValueChange={(v) => setSelectedVehicle(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDriver || 'all'} onValueChange={(v) => setSelectedDriver(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No fuel records"
          />
        </CardContent>
      </Card>
      </div>
    </PermissionGuard>
  );
}
