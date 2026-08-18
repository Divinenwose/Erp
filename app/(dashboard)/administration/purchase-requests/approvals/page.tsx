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
import { Search, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

export default function PurchaseRequestsApprovalsPage() {
  const { company, user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequests();
  }, [company?.id]);

  const loadRequests = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('purchase_requests')
      .select('*, employees:requested_by(first_name, last_name), departments(name)')
      .eq('company_id', company.id)
      .in('status', ['pending', 'md_approval', 'accounts_review'])
      .order('required_date', { ascending: true });
    setRequests(data ?? []);
    setLoading(false);
  };

  const handleReview = async (request: any, approve: boolean) => {
    if (!company?.id) return;

    let approverEmployeeId: string | null = null;
    if (approve && currentUser?.id) {
      const { data: employeeRecord } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('company_id', company.id)
        .maybeSingle();
      approverEmployeeId = employeeRecord?.id ?? null;
    }

    const nextStatus: Record<string, string> = {
      pending: 'md_approval',
      md_approval: 'accounts_review',
      accounts_review: 'vendor_assigned',
    };

    const { error } = await supabase
      .from('purchase_requests')
      .update(
        approve
          ? { status: nextStatus[request.status] ?? 'md_approval', approved_by: approverEmployeeId, approved_at: new Date().toISOString() }
          : { status: 'rejected', rejection_reason: comments[request.id] || null }
      )
      .eq('id', request.id);

    if (error) {
      toast.error(`Failed to ${approve ? 'approve' : 'reject'} request`);
      return;
    }

    toast.success(approve ? 'Request approved' : 'Request rejected');
    loadRequests();
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const p = priority || 'medium';
    return <Badge className={variants[p] || variants.medium}>{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
  };

  const filtered = requests.filter(r => {
    const matchesSearch = !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.request_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = !selectedPriority || r.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  const urgentCount = requests.filter(r => r.priority === 'urgent' || r.priority === 'high').length;
  const weekAgo = subDays(new Date(), 7).toISOString();
  const approvedThisWeek = requests.filter(r => r.approved_at && r.approved_at >= weekAgo).length;

  const columns = [
    { key: 'requestNumber', header: 'Request #' },
    { key: 'requester', header: 'Requester' },
    { key: 'department', header: 'Department' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount' },
    { key: 'urgency', header: 'Priority' },
    { key: 'requestedDate', header: 'Required By' },
    { key: 'actions', header: 'Actions' },
  ];

  const formattedData = filtered.map((item) => ({
    ...item,
    requestNumber: item.request_number || '-',
    requester: item.employees ? `${item.employees.first_name} ${item.employees.last_name}` : '-',
    department: item.departments?.name || '-',
    description: item.title || '-',
    amount: item.estimated_cost ? `$${item.estimated_cost.toFixed(2)}` : '-',
    urgency: getPriorityBadge(item.priority),
    requestedDate: item.required_date ? format(new Date(item.required_date), 'MMM dd, yyyy') : '-',
    actions: (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-8">
            Review
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Purchase Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Request Details</Label>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Request #:</strong> {item.request_number || '-'}</p>
                <p><strong>Requester:</strong> {item.employees ? `${item.employees.first_name} ${item.employees.last_name}` : '-'}</p>
                <p><strong>Department:</strong> {item.departments?.name || '-'}</p>
                <p><strong>Description:</strong> {item.title}</p>
                <p><strong>Amount:</strong> {item.estimated_cost ? `$${item.estimated_cost.toFixed(2)}` : '-'}</p>
                <p><strong>Justification:</strong> {item.justification || '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`comments-${item.id}`}>Comments (used if rejecting)</Label>
              <Textarea
                id={`comments-${item.id}`}
                placeholder="Add your comments..."
                value={comments[item.id] || ''}
                onChange={(e) => setComments(prev => ({ ...prev, [item.id]: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReview(item, true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleReview(item, false)}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and approve purchase requests"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Purchase Requests', href: '/administration/purchase-requests' },
          { label: 'Approvals' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Awaiting Review</p>
                <p className="text-2xl font-bold">{loading ? '—' : requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Urgent/High Priority</p>
                <p className="text-2xl font-bold">{loading ? '—' : urgentCount}</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved This Week</p>
                <p className="text-2xl font-bold">{loading ? '—' : approvedThisWeek}</p>
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
            <Select value={selectedPriority || 'all'} onValueChange={(v) => setSelectedPriority(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="Nothing awaiting review"
          />
        </CardContent>
      </Card>
    </div>
  );
}
