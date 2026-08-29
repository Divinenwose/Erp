'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { logAuditEvent } from '@/lib/audit';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import KPICard from '@/components/common/KPICard';
import { Search, Download, IdCard, AlertTriangle, CheckCircle, Loader2, Plus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function DriverLicensesPage() {
  const { company, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedDriver, setSelectedDriver] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('class_c');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expiryDate, setExpiryDate] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);

  const columns = [
    { key: 'driver', header: 'Driver' },
    { key: 'licenseNumber', header: 'License Number' },
    { key: 'licenseType', header: 'License Type' },
    { key: 'issueDate', header: 'Issue Date' },
    { key: 'expiryDate', header: 'Expiry Date' },
    { key: 'daysRemaining', header: 'Days Remaining' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    try {
      const [licensesRes, driversRes] = await Promise.all([
        supabase
          .from('driver_licenses')
          .select('*, employees(first_name, last_name)')
          .eq('company_id', company.id)
          .order('expiry_date', { ascending: true }),
        supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('company_id', company.id),
      ]);

      setLicenses(licensesRes.data || []);
      setDrivers(driversRes.data || []);
    } catch (error) {
      console.error('Error loading licenses:', error);
      toast.error('Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [company?.id]);

  const handleAddLicense = async () => {
    if (!company?.id || !user?.id) return;
    if (!selectedDriver || !licenseNumber.trim() || !issueDate || !expiryDate) {
      toast.error('Driver, license number, and dates are required');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('driver_licenses').insert({
        company_id: company.id,
        employee_id: selectedDriver,
        license_number: licenseNumber.trim(),
        license_type: licenseType,
        issue_date: issueDate,
        expiry_date: expiryDate,
        status: 'valid',
      });

      if (error) throw error;

      await logAuditEvent(company.id, user.id, {
        action: 'driver_license_added',
        module: 'drivers',
        entity_type: 'driver_licenses',
        new_value: { license_number: licenseNumber.trim(), employee_id: selectedDriver },
      });

      toast.success('License added successfully');
      setSelectedDriver('');
      setLicenseNumber('');
      setLicenseType('class_c');
      setIssueDate(format(new Date(), 'yyyy-MM-dd'));
      setExpiryDate('');
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error adding license:', error);
      toast.error('Failed to add license');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenew = async (license: any) => {
    if (!company?.id || !user?.id) return;

    const newExpiry = format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    try {
      const { error } = await supabase
        .from('driver_licenses')
        .update({ expiry_date: newExpiry, status: 'valid' })
        .eq('id', license.id);

      if (error) throw error;

      await logAuditEvent(company.id, user.id, {
        action: 'driver_license_renewed',
        module: 'drivers',
        entity_type: 'driver_licenses',
        entity_id: license.id,
        new_value: { expiry_date: newExpiry, previous_expiry: license.expiry_date },
      });

      toast.success('License renewed successfully');
      loadData();
    } catch (error) {
      console.error('Error renewing license:', error);
      toast.error('Failed to renew license');
    }
  };

  const getStatusBadge = (expiryDate: string) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Expired</Badge>;
    }
    if (days <= 30) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Expiring Soon</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Valid</Badge>;
  };

  const filteredData = licenses.filter(license => {
    const driver = license.employees;
    const name = driver ? `${driver.first_name} ${driver.last_name}` : '';
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || license.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const days = differenceInDays(new Date(license.expiry_date), new Date());
    let status = 'valid';
    if (days < 0) status = 'expired';
    else if (days <= 30) status = 'expiring';
    const matchesStatus = !selectedStatus || status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const validCount = licenses.filter(l => differenceInDays(new Date(l.expiry_date), new Date()) >= 0).length;
  const expiringCount = licenses.filter(l => {
    const days = differenceInDays(new Date(l.expiry_date), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const expiredCount = licenses.filter(l => differenceInDays(new Date(l.expiry_date), new Date()) < 0).length;

  const formattedData = filteredData.map((item) => {
    const days = differenceInDays(new Date(item.expiry_date), new Date());
    return {
      id: item.id,
      driver: item.employees ? `${item.employees.first_name} ${item.employees.last_name}` : '-',
      licenseNumber: item.license_number || '-',
      licenseType: item.license_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '-',
      issueDate: item.issue_date ? format(new Date(item.issue_date), 'MMM dd, yyyy') : '-',
      expiryDate: item.expiry_date ? format(new Date(item.expiry_date), 'MMM dd, yyyy') : '-',
      daysRemaining: days < 0 ? `Expired ${Math.abs(days)} days ago` : `${days} days`,
      status: getStatusBadge(item.expiry_date),
      actions: (
        <div className="flex gap-2">
          <PermissionGuard permission="drivers.edit">
            {days < 0 && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => handleRenew(item)}>
                Renew
              </Button>
            )}
          </PermissionGuard>
        </div>
      ),
    };
  });

  return (
    <PermissionGuard permission="drivers.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view driver licenses</div>}>
      <div className="space-y-6">
        <PageHeader
          title="License Management"
          description="Manage driver licenses and expiry dates"
          breadcrumbs={[
            { label: 'Administration', href: '/administration' },
            { label: 'Drivers', href: '/administration/drivers' },
            { label: 'Licenses' },
          ]}
        >
          <PermissionGuard permission="drivers.export">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </PermissionGuard>
          <PermissionGuard permission="drivers.create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add License
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New License</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="driver">Driver *</Label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">License Number *</Label>
                      <Input id="licenseNumber" placeholder="DL-2024-XXX" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseType">License Type</Label>
                      <Select value={licenseType} onValueChange={setLicenseType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="class_a">Class A</SelectItem>
                          <SelectItem value="class_b">Class B</SelectItem>
                          <SelectItem value="class_c">Class C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueDate">Issue Date *</Label>
                      <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date *</Label>
                      <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleAddLicense} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add License
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </PermissionGuard>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Valid Licenses"
            value={validCount}
            icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
            iconBg="bg-emerald-50 dark:bg-emerald-950/50"
            loading={loading}
          />
          <KPICard
            title="Expiring Soon (30 days)"
            value={expiringCount}
            icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            loading={loading}
          />
          <KPICard
            title="Expired Licenses"
            value={expiredCount}
            icon={<IdCard className="h-4 w-4 text-red-600" />}
            iconBg="bg-red-50 dark:bg-red-950/50"
            loading={loading}
          />
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
              <Select value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : formattedData.length === 0 ? (
              <div className="text-center py-12">
                <IdCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No licenses found</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={formattedData}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
