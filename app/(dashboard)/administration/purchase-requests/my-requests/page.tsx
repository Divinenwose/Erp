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
import { Search, Plus, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MyPurchaseRequestsPage() {
  const { company, user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState('medium');
  const [requiredDate, setRequiredDate] = useState('');

  const columns = [
    { key: 'requestNumber', header: 'Request #' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount' },
    { key: 'requestedDate', header: 'Required By' },
    { key: 'status', header: 'Status' },
  ];

  useEffect(() => {
    loadEmployeeAndRequests();
  }, [company?.id, currentUser?.id]);

  const loadEmployeeAndRequests = async () => {
    if (!company?.id || !currentUser?.id) return;
    setLoading(true);

    const { data: employeeRecord } = await supabase
      .from('employees')
      .select('id, department_id')
      .eq('user_id', currentUser.id)
      .eq('company_id', company.id)
      .maybeSingle();

    setEmployeeId(employeeRecord?.id ?? null);
    setDepartmentId(employeeRecord?.department_id ?? null);

    if (employeeRecord?.id) {
      const { data } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('company_id', company.id)
        .eq('requested_by', employeeRecord.id)
        .order('created_at', { ascending: false });
      setRequests(data ?? []);
    } else {
      setRequests([]);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!company?.id || !employeeId) {
      toast.error('Could not find your employee record');
      return;
    }
    if (!title.trim() || !amount) {
      toast.error('Description and estimated amount are required');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('purchase_requests').insert({
      company_id: company.id,
      title: title.trim(),
      estimated_cost: parseFloat(amount),
      justification: justification.trim() || null,
      priority,
      required_date: requiredDate || null,
      department_id: departmentId,
      requested_by: employeeId,
      status: 'pending',
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to submit request');
      return;
    }

    toast.success('Purchase request submitted');
    setTitle(''); setAmount(''); setJustification(''); setPriority('medium'); setRequiredDate('');
    setDialogOpen(false);
    loadEmployeeAndRequests();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      md_approval: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      accounts_review: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      vendor_assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    };
    const s = status || 'draft';
    return <Badge className={variants[s] || variants.draft}>{s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</Badge>;
  };

  const filtered = requests.filter(r => {
    const matchesSearch = !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.request_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || r.status === selectedStatus;
    const matchesMonth = !selectedMonth || (r.created_at && r.created_at.startsWith(selectedMonth));
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const formattedData = filtered.map((item) => ({
    ...item,
    requestNumber: item.request_number || '-',
    description: item.title || '-',
    amount: item.estimated_cost ? `$${item.estimated_cost.toFixed(2)}` : '-',
    requestedDate: item.required_date ? format(new Date(item.required_date), 'MMM dd, yyyy') : '-',
    status: getStatusBadge(item.status),
  }));

  const totalCount = requests.length;
  const pendingCount = requests.filter(r => ['pending', 'md_approval', 'accounts_review'].includes(r.status)).length;
  const approvedCount = requests.filter(r => ['vendor_assigned', 'completed'].includes(r.status)).length;
  const totalSpent = requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.actual_cost || r.estimated_cost || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Purchase Requests"
        description="View and submit your purchase requests"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Purchase Requests', href: '/administration/purchase-requests' },
          { label: 'My Requests' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Purchase Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" placeholder="Describe what you need to purchase..." value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Estimated Amount *</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requiredDate">Required By</Label>
                  <Input id="requiredDate" type="date" value={requiredDate} onChange={(e) => setRequiredDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="justification">Justification</Label>
                <Textarea id="justification" placeholder="Why is this purchase needed?" value={justification} onChange={(e) => setJustification(e.target.value)} />
              </div>
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
              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                <p className="text-2xl font-bold">{loading ? '—' : totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold">{loading ? '—' : pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold">{loading ? '—' : approvedCount}</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
                <p className="text-2xl font-bold">{loading ? '—' : `$${totalSpent.toLocaleString()}`}</p>
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
                  placeholder="Search requests..."
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
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="md_approval">MD Approval</SelectItem>
                  <SelectItem value="accounts_review">Accounts Review</SelectItem>
                  <SelectItem value="vendor_assigned">Vendor Assigned</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No purchase requests yet"
            emptyDescription="Requests you submit will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
