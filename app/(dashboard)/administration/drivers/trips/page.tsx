'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Car, MapPin, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DriverTripsPage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formDriver, setFormDriver] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formStartLocation, setFormStartLocation] = useState('');
  const [formEndLocation, setFormEndLocation] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formFuel, setFormFuel] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'driver', header: 'Driver' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'startLocation', header: 'Start Location' },
    { key: 'endLocation', header: 'End Location' },
    { key: 'distance', header: 'Distance (km)' },
    { key: 'fuelConsumed', header: 'Fuel (L)' },
  ];

  useEffect(() => {
    loadTrips();
    loadDrivers();
    loadVehicles();
  }, [company?.id, selectedMonth, selectedDriver, selectedVehicle]);

  const loadTrips = async () => {
    if (!company?.id) return;
    setLoading(true);

    // vehicle_id has no FK constraint on driver_trips, matched client-side.
    // driver_id -> drivers -> employee_id -> profiles are all real FKs.
    let query = supabase
      .from('driver_trips')
      .select('*, drivers(profiles(first_name, last_name))')
      .eq('company_id', company.id)
      .gte('trip_date', `${selectedMonth}-01`)
      .lte('trip_date', `${selectedMonth}-31`);

    if (selectedDriver) query = query.eq('driver_id', selectedDriver);
    if (selectedVehicle) query = query.eq('vehicle_id', selectedVehicle);

    const { data } = await query.order('trip_date', { ascending: false });
    setTrips(data || []);
    setLoading(false);
  };

  const loadDrivers = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('drivers').select('id, profiles(first_name, last_name)').eq('company_id', company.id);
    setDrivers(data || []);
  };

  const loadVehicles = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('vehicles').select('id, plate_number').eq('company_id', company.id);
    setVehicles(data || []);
  };

  const handleLogTrip = async () => {
    if (!company?.id) return;
    if (!formDriver || !formDate) {
      toast.error('Driver and date are required');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('driver_trips').insert({
      company_id: company.id,
      driver_id: formDriver,
      vehicle_id: formVehicle || null,
      trip_date: formDate,
      start_location: formStartLocation.trim() || null,
      end_location: formEndLocation.trim() || null,
      distance_km: formDistance ? parseFloat(formDistance) : null,
      fuel_consumed: formFuel ? parseFloat(formFuel) : null,
      purpose: formPurpose.trim() || null,
      remarks: formRemarks.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to log trip');
      return;
    }

    toast.success('Trip logged');
    setFormDriver(''); setFormVehicle(''); setFormStartLocation(''); setFormEndLocation('');
    setFormDistance(''); setFormFuel(''); setFormPurpose(''); setFormRemarks('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogOpen(false);
    loadTrips();
  };

  const vehiclePlate = (vehicleId: string | null) => vehicles.find(v => v.id === vehicleId)?.plate_number || '-';
  const driverName = (d: any) => d.profiles ? `${d.profiles.first_name} ${d.profiles.last_name}` : '-';

  const filtered = trips.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return t.start_location?.toLowerCase().includes(term) || t.end_location?.toLowerCase().includes(term) || t.purpose?.toLowerCase().includes(term);
  });

  const totalTrips = trips.length;
  const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
  const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

  const formattedData = filtered.map((item) => ({
    ...item,
    date: item.trip_date ? format(new Date(item.trip_date), 'MMM dd, yyyy') : '-',
    driver: item.drivers ? driverName(item.drivers) : '-',
    vehicle: vehiclePlate(item.vehicle_id),
    startLocation: item.start_location || '-',
    endLocation: item.end_location || '-',
    distance: item.distance_km ?? '-',
    fuelConsumed: item.fuel_consumed ?? '-',
  }));

  return (
    <PermissionGuard permission="drivers.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view driver trips</div>}>
      <div className="space-y-6">
      <PageHeader
        title="Driver Trips"
        description="Track driver trips and mileage"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Drivers', href: '/administration/drivers' },
          { label: 'Trips' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Trip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driver">Driver *</Label>
                  <Select value={formDriver} onValueChange={setFormDriver}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{driverName(d)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle</Label>
                  <Select value={formVehicle || 'none'} onValueChange={(v) => setFormVehicle(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unspecified</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startLocation">Start Location</Label>
                  <Input id="startLocation" placeholder="Starting point" value={formStartLocation} onChange={(e) => setFormStartLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endLocation">End Location</Label>
                  <Input id="endLocation" placeholder="Destination" value={formEndLocation} onChange={(e) => setFormEndLocation(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input id="distance" type="number" step="0.1" placeholder="0.0" value={formDistance} onChange={(e) => setFormDistance(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel">Fuel Consumed (L)</Label>
                  <Input id="fuel" type="number" step="0.1" placeholder="0.0" value={formFuel} onChange={(e) => setFormFuel(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Input id="purpose" placeholder="Trip purpose" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" placeholder="Additional notes..." value={formRemarks} onChange={(e) => setFormRemarks(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleLogTrip} disabled={submitting}>
                {submitting ? 'Saving…' : 'Log Trip'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Trips</p>
                <p className="text-2xl font-bold">{loading ? '—' : totalTrips}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <MapPin className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Distance</p>
                <p className="text-2xl font-bold">{loading ? '—' : `${totalDistance.toLocaleString()} km`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Distance/Trip</p>
                <p className="text-2xl font-bold">{loading ? '—' : `${avgDistance.toFixed(1)} km`}</p>
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
                  placeholder="Search trips..."
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
              <Select value={selectedDriver || 'all'} onValueChange={(v) => setSelectedDriver(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{driverName(d)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No trips logged"
          />
        </CardContent>
      </Card>
      </div>
    </PermissionGuard>
  );
}
