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
import { Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function InspectionIssuesPage() {
  const { company, user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [issues, setIssues] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [issueDescription, setIssueDescription] = useState('');
  const [selectedInspection, setSelectedInspection] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const columns = [
    { key: 'issue', header: 'Issue' },
    { key: 'inspection', header: 'Inspection Type' },
    { key: 'priority', header: 'Priority' },
    { key: 'assignedTo', header: 'Assigned To' },
    { key: 'dueDate', header: 'Due Date' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadData();
  }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [issuesRes, inspectionsRes, usersRes] = await Promise.all([
      supabase
        .from('inspection_issues')
        .select('*, office_inspections(inspection_type), assignee:assigned_to(first_name, last_name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('office_inspections')
        .select('id, inspection_type, inspection_date')
        .eq('company_id', company.id)
        .order('inspection_date', { ascending: false })
        .limit(50),
      supabase.from('profiles').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    setIssues(issuesRes.data ?? []);
    setInspections(inspectionsRes.data ?? []);
    setUsers(usersRes.data ?? []);
    setLoading(false);
  };

  const handleReportIssue = async () => {
    if (!selectedInspection) {
      toast.error('Please select the related inspection');
      return;
    }
    if (!issueDescription.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('inspection_issues').insert({
      inspection_id: selectedInspection,
      issue_description: issueDescription.trim(),
      priority,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
      status: 'open',
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to report issue');
      return;
    }

    toast.success('Issue reported');
    setIssueDescription(''); setSelectedInspection(''); setPriority('medium'); setAssignedTo(''); setDueDate('');
    setDialogOpen(false);
    loadData();
  };

  const updateIssueStatus = async (issue: any, status: string) => {
    const { error } = await supabase
      .from('inspection_issues')
      .update({ status, resolved_date: status === 'resolved' ? format(new Date(), 'yyyy-MM-dd') : null })
      .eq('id', issue.id);

    if (error) {
      toast.error('Failed to update issue');
      return;
    }
    toast.success('Issue updated');
    loadData();
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    const p = priority || 'medium';
    return <Badge className={variants[p] || variants.medium}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    const s = status || 'open';
    return <Badge className={variants[s] || variants.open}>{s.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</Badge>;
  };

  const filtered = issues.filter(i => {
    const matchesSearch = !searchTerm || i.issue_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = !selectedPriority || i.priority === selectedPriority;
    const matchesStatus = !selectedStatus || i.status === selectedStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const openCount = issues.filter(i => i.status === 'open').length;
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  const overdueCount = issues.filter(i => i.due_date && i.due_date < format(new Date(), 'yyyy-MM-dd') && i.status !== 'resolved' && i.status !== 'closed').length;

  const formattedData = filtered.map((item) => ({
    ...item,
    issue: item.issue_description,
    inspection: item.office_inspections?.inspection_type
      ? item.office_inspections.inspection_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      : '-',
    priority: getPriorityBadge(item.priority),
    assignedTo: item.assignee ? `${item.assignee.first_name} ${item.assignee.last_name}` : 'Unassigned',
    dueDate: item.due_date ? format(new Date(item.due_date), 'MMM dd, yyyy') : '-',
    status: getStatusBadge(item.status),
    actions: (
      <div className="flex gap-2">
        {item.status === 'open' && (
          <Button size="sm" variant="outline" className="h-8" onClick={() => updateIssueStatus(item, 'in_progress')}>
            Start
          </Button>
        )}
        {item.status === 'in_progress' && (
          <Button size="sm" variant="outline" className="h-8" onClick={() => updateIssueStatus(item, 'resolved')}>
            Resolve
          </Button>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection Issues"
        description="Track and resolve issues found during inspections"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Inspections', href: '/administration/inspections' },
          { label: 'Issues' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report New Issue</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inspection">Related Inspection *</Label>
                <Select value={selectedInspection} onValueChange={setSelectedInspection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspection" />
                  </SelectTrigger>
                  <SelectContent>
                    {inspections.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.inspection_type.replace('_', ' ')} — {format(new Date(i.inspection_date), 'MMM dd, yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue">Issue Description *</Label>
                <Textarea id="issue" placeholder="Describe the issue..." value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select value={assignedTo || 'unassigned'} onValueChange={(v) => setAssignedTo(v === 'unassigned' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleReportIssue} disabled={submitting}>
                {submitting ? 'Saving…' : 'Create Issue'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Issues</p>
                <p className="text-2xl font-bold">{loading ? '—' : openCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold">{loading ? '—' : inProgressCount}</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                <p className="text-2xl font-bold">{loading ? '—' : resolvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold">{loading ? '—' : overdueCount}</p>
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
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedPriority || 'all'} onValueChange={(v) => setSelectedPriority(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No inspection issues"
          />
        </CardContent>
      </Card>
    </div>
  );
}
