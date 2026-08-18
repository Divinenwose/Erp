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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function DriversListPage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [driverData, setDriverData] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formEmployee, setFormEmployee] = useState('');
  const [formLicenseNumber, setFormLicenseNumber] = useState('');
  const [formLicenseType, setFormLicenseType] = useState('');
  const [formLicenseExpiry, setFormLicenseExpiry] = useState('');
  const [formVehicle, setFormVehicle] = useState('');

  const columns = [
    { key: 'driver', header: 'Driver' },
    { key: 'licenseNumber', header: 'License Number' },
    { key: 'licenseType', header: 'License Type' },
    { key: 'licenseExpiry', header: 'License Expiry' },
    { key: 'assignedVehicle', header: 'Assigned Vehicle' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadDrivers();
    loadProfiles();
    loadVehicles();
  }, [company?.id, selectedStatus]);

  const loadDrivers = async () => {
    if (!company?.id) return;
    setLoading(true);

    // assigned_vehicle_id has no FK constraint on drivers, so PostgREST
    // can't embed vehicles(...) directly — matched client-side below.
    // employee_id is a real FK (profiles) and embeds normally.
    let query = supabase
      .from('drivers')
      .select('*, profiles(first_name, last_name)')
      .eq('company_id', company.id);

    if (selectedStatus) {
      query = query.eq('status', selectedStatus);
    }

    const { data } = await query.order('created_at', { ascending: false });
    setDriverData(data || []);
    setLoading(false);
  };

  const loadProfiles = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('profiles').select('id, first_name, last_name').eq('company_id', company.id);
    setProfiles(data || []);
  };

  const loadVehicles = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('vehicles').select('id, plate_number').eq('company_id', company.id);
    setVehicles(data || []);
  };

  const handleAddDriver = async () => {
    if (!company?.id) return;
    if (!formEmployee) {
      toast.error('Please select an employee');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('drivers').insert({
      company_id: company.id,
      employee_id: formEmployee,
      license_number: formLicenseNumber.trim() || null,
      license_type: formLicenseType || null,
      license_expiry: formLicenseExpiry || null,
      assigned_vehicle_id: formVehicle || null,
      status: 'active',
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'That license number is already registered' : 'Failed to add driver');
      return;
    }

    toast.success('Driver added');
    setFormEmployee(''); setFormLicenseNumber(''); setFormLicenseType(''); setFormLicenseExpiry(''); setFormVehicle('');
    setDialogOpen(false);
    loadDrivers();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      suspended: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return (
      <Badge className={variants[status] || variants.inactive}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const vehiclePlate = (vehicleId: string | null) => vehicles.find(v => v.id === vehicleId)?.plate_number || '-';

  const filtered = driverData.filter(d => {
    const name = d.profiles ? `${d.profiles.first_name} ${d.profiles.last_name}` : '';
    return !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || d.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formattedData = filtered.map((item) => ({
    ...item,
    driver: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : '-',
    licenseNumber: item.license_number || '-',
    licenseType: item.license_type || '-',
    licenseExpiry: item.license_expiry || '-',
    assignedVehicle: vehiclePlate(item.assigned_vehicle_id),
    status: getStatusBadge(item.status || 'inactive'),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers List"
        description="View and manage all company drivers"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Drivers', href: '/administration/drivers' },
          { label: 'List' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Driver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select value={formEmployee} onValueChange={setFormEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input id="licenseNumber" placeholder="DL-2024-XXX" value={formLicenseNumber} onChange={(e) => setFormLicenseNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseType">License Type</Label>
                  <Select value={formLicenseType} onValueChange={setFormLicenseType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Class A</SelectItem>
                      <SelectItem value="B">Class B</SelectItem>
                      <SelectItem value="C">Class C</SelectItem>
                      <SelectItem value="D">Class D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">License Expiry</Label>
                <Input id="expiryDate" type="date" value={formLicenseExpiry} onChange={(e) => setFormLicenseExpiry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle">Assigned Vehicle</Label>
                <Select value={formVehicle || 'none'} onValueChange={(v) => setFormVehicle(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleAddDriver} disabled={submitting}>
                {submitting ? 'Adding…' : 'Add Driver'}
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
                  placeholder="Search drivers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No drivers found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
