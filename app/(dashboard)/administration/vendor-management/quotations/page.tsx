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
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Download, FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function VendorQuotationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const columns = [
    { key: 'quotationNumber', header: 'Quotation #' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount' },
    { key: 'validUntil', header: 'Valid Until' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  const mockData = [
    {
      id: '1',
      quotationNumber: 'QT-2024-001',
      vendor: 'ABC Cleaning Services',
      description: 'Monthly cleaning contract - Main Office',
      amount: 2500.00,
      validUntil: '2024-02-15',
      status: 'pending',
    },
    {
      id: '2',
      quotationNumber: 'QT-2024-002',
      vendor: 'XYZ Maintenance',
      description: 'HVAC maintenance service',
      amount: 1500.00,
      validUntil: '2024-02-20',
      status: 'approved',
    },
    {
      id: '3',
      quotationNumber: 'QT-2024-003',
      vendor: 'Fast Internet Providers',
      description: 'Annual internet service contract',
      amount: 4800.00,
      validUntil: '2024-03-01',
      status: 'pending',
    },
    {
      id: '4',
      quotationNumber: 'QT-2024-004',
      vendor: 'Power Electric Co',
      description: 'Electrical installation for new branch',
      amount: 3500.00,
      validUntil: '2024-01-30',
      status: 'rejected',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return <Badge className={variants[status] || variants.pending}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const formattedData = mockData.map((item) => ({
    ...item,
    amount: `$${item.amount.toFixed(2)}`,
    status: getStatusBadge(item.status),
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-8">
          View
        </Button>
        {item.status === 'pending' && (
          <>
            <Button size="sm" variant="outline" className="h-8">
              Approve
            </Button>
            <Button size="sm" variant="outline" className="h-8">
              Reject
            </Button>
          </>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Quotations"
        description="Manage vendor quotations and pricing"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Vendor Management', href: '/administration/vendor-management' },
          { label: 'Quotations' },
        ]}
      >
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Quotation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Vendor Quotation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abc">ABC Cleaning Services</SelectItem>
                      <SelectItem value="xyz">XYZ Maintenance</SelectItem>
                      <SelectItem value="fast">Fast Internet Providers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quotationNumber">Quotation Number</Label>
                  <Input id="quotationNumber" placeholder="QT-2024-XXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Service description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input id="validUntil" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">Quotation File</Label>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload PDF
                  </Button>
                </div>
                <Button className="w-full">Save Quotation</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Quotations</p>
                <p className="text-2xl font-bold">24</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold">$12,300</p>
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
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Vendors</SelectItem>
                  <SelectItem value="abc">ABC Cleaning</SelectItem>
                  <SelectItem value="xyz">XYZ Maintenance</SelectItem>
                  <SelectItem value="fast">Fast Internet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
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
