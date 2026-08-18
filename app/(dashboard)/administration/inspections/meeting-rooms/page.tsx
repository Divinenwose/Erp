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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const CHECKLIST_ITEMS = [
  'Room is clean and organized',
  'Tables and chairs are arranged',
  'Whiteboard is clean',
  'Projector/AV equipment is functional',
  'Air conditioning is working',
  'Lighting is adequate',
  'No leftover food or drinks',
  'Door locks are functional',
];

export default function MeetingRoomInspectionPage() {
  const { company, user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inspectionData, setInspectionData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formBranch, setFormBranch] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [findings, setFindings] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'branch', header: 'Branch' },
    { key: 'inspector', header: 'Inspector' },
    { key: 'score', header: 'Score' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadInspections();
    loadBranches();
  }, [company?.id, selectedDate, selectedBranch]);

  const loadInspections = async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from('office_inspections')
      .select('*, profiles(first_name, last_name), branches(name)')
      .eq('company_id', company.id)
      .eq('inspection_type', 'meeting_room');

    if (selectedBranch) {
      query = query.eq('branch_id', selectedBranch);
    }

    const { data } = await query.order('inspection_date', { ascending: false });
    setInspectionData(data || []);
    setLoading(false);
  };

  const loadBranches = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', company.id);
    setBranches(data || []);
  };

  const handleStartInspection = async () => {
    if (!company?.id || !currentUser?.id) return;
    if (!formBranch) {
      toast.error('Please select a branch');
      return;
    }

    setSubmitting(true);
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;
    const overallScore = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100);

    const { data: inspection, error } = await supabase
      .from('office_inspections')
      .insert({
        company_id: company.id,
        branch_id: formBranch,
        inspection_type: 'meeting_room',
        inspection_date: formDate,
        inspected_by: currentUser.id,
        status: 'completed',
        overall_score: overallScore,
        findings: findings.trim() || null,
      })
      .select()
      .single();

    if (error || !inspection) {
      toast.error('Failed to create inspection');
      setSubmitting(false);
      return;
    }

    const checklistRows = CHECKLIST_ITEMS.map((item, index) => ({
      inspection_id: inspection.id,
      item_name: item,
      status: checkedItems[index] ? 'pass' : 'fail',
    }));
    await supabase.from('inspection_checklist_items').insert(checklistRows);

    toast.success('Inspection recorded');
    setFormBranch(''); setFindings(''); setCheckedItems({});
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogOpen(false);
    setSubmitting(false);
    loadInspections();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <Badge className={variants[status] || variants.pending}>
        {status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </Badge>
    );
  };

  const formattedData = inspectionData.map((item) => ({
    ...item,
    date: item.inspection_date,
    branch: item.branches?.name || '-',
    inspector: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : '-',
    score: item.overall_score || '-',
    status: getStatusBadge(item.status),
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
        title="Meeting Room Inspection"
        description="Inspect meeting room readiness and cleanliness"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Inspections', href: '/administration/inspections' },
          { label: 'Meeting Rooms' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Meeting Room Inspection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Select value={formBranch} onValueChange={setFormBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Inspection Date</Label>
                  <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Checklist Items</h3>
                <div className="space-y-3">
                  {CHECKLIST_ITEMS.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`check-${index}`}
                        checked={!!checkedItems[index]}
                        onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, [index]: !!checked }))}
                      />
                      <Label htmlFor={`check-${index}`} className="text-sm">{item}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="findings">Findings</Label>
                <Textarea id="findings" placeholder="Note any issues or observations..." value={findings} onChange={(e) => setFindings(e.target.value)} />
              </div>

              <Button className="w-full" onClick={handleStartInspection} disabled={submitting}>
                {submitting ? 'Saving…' : 'Start Inspection'}
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
                  placeholder="Search inspections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Select value={selectedBranch || 'all'} onValueChange={(v) => setSelectedBranch(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
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
