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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Upload, Download } from 'lucide-react';
import { format } from 'date-fns';

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

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'vehicle', header: 'Vehicle' },
    { key: 'driver', header: 'Driver' },
    { key: 'quantity', header: 'Quantity (L)' },
    { key: 'cost', header: 'Cost' },
    { key: 'odometer', header: 'Odometer' },
    { key: 'station', header: 'Station' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadFuelRecords();
    loadVehicles();
    loadDrivers();
  }, [company?.id, selectedMonth, selectedVehicle, selectedDriver]);

  const loadFuelRecords = async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from('fuel_records')
      .select('*, vehicles(plate_number), profiles(first_name, last_name)')
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

  const formattedData = fuelData.map((item) => ({
    ...item,
    date: item.fuel_date,
    vehicle: item.vehicles?.plate_number || '-',
    driver: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : '-',
    quantity: item.fuel_quantity,
    cost: `$${item.cost.toFixed(2)}`,
    odometer: item.odometer_reading || '-',
    station: item.fuel_station || '-',
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-8">
          View
        </Button>
        <Button size="sm" variant="outline" className="h-8">
          Edit
        </Button>
      </div>
    ),
  }));

  return (
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
        <div className="flex gap-2">
          <Dialog>
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
                    <Label htmlFor="vehicle">Vehicle</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ka1234">KA 1234</SelectItem>
                        <SelectItem value="kb5678">KB 5678</SelectItem>
                        <SelectItem value="kc9012">KC 9012</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver">Driver</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">John Doe</SelectItem>
                        <SelectItem value="2">Jane Smith</SelectItem>
                        <SelectItem value="3">Bob Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (Liters)</Label>
                    <Input id="quantity" type="number" step="0.1" placeholder="0.0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost</Label>
                    <Input id="cost" type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="odometer">Odometer Reading</Label>
                    <Input id="odometer" type="number" placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="station">Fuel Station</Label>
                  <Input id="station" placeholder="Station name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt">Receipt</Label>
                  <Button variant="outline" size="sm" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Receipt
                  </Button>
                </div>
                <Button className="w-full">Save Record</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
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
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Vehicles</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Drivers</SelectItem>
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
