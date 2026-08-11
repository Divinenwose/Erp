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
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Camera } from 'lucide-react';
import { format } from 'date-fns';

export default function MeetingRoomInspectionPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'branch', label: 'Branch' },
    { key: 'room', label: 'Meeting Room' },
    { key: 'inspector', label: 'Inspector' },
    { key: 'score', label: 'Score' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ];

  const mockData = [
    {
      id: '1',
      date: '2024-01-15',
      branch: 'Main Office',
      room: 'Conference Room A',
      inspector: 'John Doe',
      score: 90,
      status: 'completed',
    },
    {
      id: '2',
      date: '2024-01-14',
      branch: 'Main Office',
      room: 'Board Room',
      inspector: 'Jane Smith',
      score: 85,
      status: 'completed',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return <Badge className={variants[status] || variants.pending}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">{score}%</Badge>;
    if (score >= 60) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{score}%</Badge>;
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{score}%</Badge>;
  };

  const formattedData = mockData.map((item) => ({
    ...item,
    score: getScoreBadge(item.score),
    status: getStatusBadge(item.status),
    actions: <Button size="sm" variant="outline" className="h-8">View</Button>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meeting Room Inspection"
        description="Inspect meeting room readiness and cleanliness"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Inspections', href: '/administration/inspections' },
          { label: 'Meeting Rooms' },
        ]}
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Inspection</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Meeting Room Inspection</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Branch</Label><Select><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger><SelectContent><SelectItem value="main">Main Office</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} /></div>
              </div>
              <div className="space-y-2"><Label>Meeting Room</Label><Select><SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger><SelectContent><SelectItem value="a">Conference Room A</SelectItem><SelectItem value="b">Board Room</SelectItem><SelectItem value="c">Training Room</SelectItem></SelectContent></Select></div>
              <div className="space-y-3">
                <h3 className="font-semibold">Checklist</h3>
                {['Room is clean and organized', 'Tables and chairs are arranged', 'Whiteboard is clean', 'Projector/AV equipment is functional', 'Air conditioning is working', 'Lighting is adequate', 'No leftover food or drinks', 'Door locks are functional'].map((item, i) => (
                  <div key={i} className="flex items-center space-x-2"><Checkbox id={`c-${i}`} /><Label htmlFor={`c-${i}`} className="text-sm">{item}</Label></div>
                ))}
              </div>
              <div className="space-y-2"><Label>Findings</Label><Textarea placeholder="Note any issues..." /></div>
              <Button className="w-full">Start Inspection</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent><SelectItem value="">All Branches</SelectItem><SelectItem value="main">Main Office</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DataTable columns={columns} data={formattedData} searchable={false} />
        </CardContent>
      </Card>
    </div>
  );
}
