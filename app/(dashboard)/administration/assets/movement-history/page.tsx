'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Download, MapPin, ArrowRight, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function AssetMovementHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'asset', header: 'Asset' },
    { key: 'assetNumber', header: 'Asset #' },
    { key: 'fromLocation', header: 'From' },
    { key: 'toLocation', header: 'To' },
    { key: 'movedBy', header: 'Moved By' },
    { key: 'reason', header: 'Reason' },
    { key: 'actions', header: 'Actions' },
  ];

  const mockData = [
    {
      id: '1',
      date: '2024-01-15',
      asset: 'Dell Laptop XPS 15',
      assetNumber: 'AST-0001',
      fromLocation: 'IT Office - Floor 2',
      toLocation: 'HR Office - Floor 3',
      movedBy: 'John Doe',
      reason: 'Employee transfer',
    },
    {
      id: '2',
      date: '2024-01-14',
      asset: 'Office Chair Ergonomic',
      assetNumber: 'AST-0045',
      fromLocation: 'Warehouse',
      toLocation: 'Main Office - Floor 1',
      movedBy: 'Jane Smith',
      reason: 'New hire setup',
    },
    {
      id: '3',
      date: '2024-01-13',
      asset: 'Projector Epson 4K',
      assetNumber: 'AST-0023',
      fromLocation: 'Conference Room A',
      toLocation: 'Conference Room B',
      movedBy: 'Bob Johnson',
      reason: 'Meeting relocation',
    },
    {
      id: '4',
      date: '2024-01-12',
      asset: 'Printer HP LaserJet',
      assetNumber: 'AST-0015',
      fromLocation: 'Finance Office',
      toLocation: 'IT Department',
      movedBy: 'Alice Williams',
      reason: 'Maintenance',
    },
  ];

  const formattedData = mockData.map((item) => ({
    ...item,
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-8">
          View
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Movement History"
        description="Track asset movements and transfers"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Assets', href: '/administration/assets' },
          { label: 'Movement History' },
        ]}
      >
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record Movement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Asset Movement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="asset">Asset</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ast0001">AST-0001 - Dell Laptop XPS 15</SelectItem>
                      <SelectItem value="ast0045">AST-0045 - Office Chair Ergonomic</SelectItem>
                      <SelectItem value="ast0023">AST-0023 - Projector Epson 4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromLocation">From Location</Label>
                    <Input id="fromLocation" placeholder="Current location" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toLocation">To Location</Label>
                    <Input id="toLocation" placeholder="New location" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="movedBy">Moved By</Label>
                    <Input id="movedBy" placeholder="Person name" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">Employee Transfer</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="new_hire">New Hire Setup</SelectItem>
                      <SelectItem value="relocation">Relocation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" placeholder="Additional details..." />
                </div>
                <Button className="w-full">Record Movement</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Movements</p>
                <p className="text-2xl font-bold">156</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <ArrowRight className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold">24</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Assets Moved</p>
                <p className="text-2xl font-bold">18</p>
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
                  placeholder="Search movements..."
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
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Assets</SelectItem>
                  <SelectItem value="ast0001">AST-0001</SelectItem>
                  <SelectItem value="ast0045">AST-0045</SelectItem>
                  <SelectItem value="ast0023">AST-0023</SelectItem>
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
