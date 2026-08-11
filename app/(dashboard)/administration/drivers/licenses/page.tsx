'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Download, IdCard, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DriverLicensesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

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

  const mockData = [
    {
      id: '1',
      driver: 'John Doe',
      licenseNumber: 'DL-2024-001',
      licenseType: 'Class B',
      issueDate: '2024-01-15',
      expiryDate: '2025-06-15',
      daysRemaining: 162,
      status: 'valid',
    },
    {
      id: '2',
      driver: 'Jane Smith',
      licenseNumber: 'DL-2024-002',
      licenseType: 'Class C',
      issueDate: '2023-12-20',
      expiryDate: '2024-12-20',
      daysRemaining: 139,
      status: 'valid',
    },
    {
      id: '3',
      driver: 'Bob Johnson',
      licenseNumber: 'DL-2024-003',
      licenseType: 'Class B',
      issueDate: '2023-01-10',
      expiryDate: '2024-01-10',
      daysRemaining: -207,
      status: 'expired',
    },
    {
      id: '4',
      driver: 'Alice Williams',
      licenseNumber: 'DL-2024-004',
      licenseType: 'Class C',
      issueDate: '2024-03-25',
      expiryDate: '2025-03-25',
      daysRemaining: 234,
      status: 'valid',
    },
    {
      id: '5',
      driver: 'Mike Davis',
      licenseNumber: 'DL-2024-005',
      licenseType: 'Class A',
      issueDate: '2023-08-01',
      expiryDate: '2024-08-01',
      daysRemaining: -28,
      status: 'expired',
    },
  ];

  const getStatusBadge = (status: string, daysRemaining: number) => {
    if (daysRemaining < 0) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Expired</Badge>;
    }
    if (daysRemaining <= 30) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Expiring Soon</Badge>;
    }
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Valid</Badge>;
  };

  const formattedData = mockData.map((item) => ({
    ...item,
    daysRemaining: item.daysRemaining < 0 ? `Expired ${Math.abs(item.daysRemaining)} days ago` : `${item.daysRemaining} days`,
    status: getStatusBadge(item.status, item.daysRemaining),
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-8">
          View
        </Button>
        {item.daysRemaining < 0 && (
          <Button size="sm" variant="outline" className="h-8">
            Renew
          </Button>
        )}
      </div>
    ),
  }));

  return (
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
        <Button size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Valid Licenses</p>
                <p className="text-2xl font-bold">15</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon (30 days)</p>
                <p className="text-2xl font-bold">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <IdCard className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expired Licenses</p>
                <p className="text-2xl font-bold">3</p>
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
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
