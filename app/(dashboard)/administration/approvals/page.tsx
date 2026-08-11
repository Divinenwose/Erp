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
import { CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function ApprovalsPage() {
  const { company, user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [myApprovals, setMyApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');

  const columns = [
    { key: 'requestType', header: 'Request Type' },
    { key: 'requestNumber', header: 'Request #' },
    { key: 'requester', header: 'Requester' },
    { key: 'stage', header: 'Current Stage' },
    { key: 'submittedDate', header: 'Submitted' },
    { key: 'amount', header: 'Amount' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadApprovals();
  }, [company?.id, user?.id, filterStatus]);

  const loadApprovals = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [pendingResult, myResult] = await Promise.all([
      supabase
        .from('request_approvals')
        .select('*, purchase_requests(*, profiles(first_name, last_name)), approval_stages(*)')
        .eq('company_id', company.id)
        .eq('status', 'pending'),
      supabase
        .from('request_approvals')
        .select('*, purchase_requests(*, profiles(first_name, last_name)), approval_stages(*)')
        .eq('company_id', company.id)
        .eq('approver_id', user?.id),
    ]);

    setPendingApprovals(pendingResult.data || []);
    setMyApprovals(myResult.data || []);
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;

    const { error } = await supabase
      .from('request_approvals')
      .update({
        status: 'approved',
        comments,
        approved_at: new Date().toISOString(),
      })
      .eq('id', selectedApproval.id);

    if (error) {
      toast.error('Failed to approve request');
      return;
    }

    // Update the request status if this was the final stage
    if (selectedApproval.approval_stages?.is_final) {
      await supabase
        .from('purchase_requests')
        .update({ status: 'approved' })
        .eq('id', selectedApproval.request_id);
    }

    setComments('');
    setIsApproveDialogOpen(false);
    setSelectedApproval(null);
    loadApprovals();
  };

  const handleReject = async () => {
    if (!selectedApproval) return;

    const { error } = await supabase
      .from('request_approvals')
      .update({
        status: 'rejected',
        comments,
        approved_at: new Date().toISOString(),
      })
      .eq('id', selectedApproval.id);

    if (error) {
      toast.error('Failed to reject request');
      return;
    }

    // Reject the entire request
    await supabase
      .from('purchase_requests')
      .update({ 
        status: 'rejected',
        rejection_reason: comments,
      })
      .eq('id', selectedApproval.request_id);

    setComments('');
    setIsRejectDialogOpen(false);
    setSelectedApproval(null);
    loadApprovals();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      skipped: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      purchase_request: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      asset_request: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      maintenance_request: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      leave_request: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      expense_request: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    };
    return (
      <Badge className={colors[type] || colors.purchase_request}>
        {type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </Badge>
    );
  };

  const formattedData = myApprovals.map((approval) => ({
    ...approval,
    requestType: getRequestTypeBadge(approval.request_type),
    requestNumber: approval.purchase_requests?.request_number || '-',
    requester: approval.purchase_requests?.profiles 
      ? `${approval.purchase_requests.profiles.first_name} ${approval.purchase_requests.profiles.last_name}`
      : '-',
    stage: approval.approval_stages?.stage_name || '-',
    submittedDate: approval.created_at ? format(new Date(approval.created_at), 'MMM dd, yyyy') : '-',
    amount: approval.purchase_requests?.estimated_cost 
      ? `$${approval.purchase_requests.estimated_cost.toFixed(2)}` 
      : '-',
    status: getStatusBadge(approval.status),
    actions: (
      <div className="flex gap-2">
        {approval.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
              onClick={() => {
                setSelectedApproval(approval);
                setIsApproveDialogOpen(true);
              }}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
              onClick={() => {
                setSelectedApproval(approval);
                setIsRejectDialogOpen(true);
              }}
            >
              <XCircle className="h-3 w-3 mr-1" />
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
        title="My Approvals"
        description="Review and approve pending requests"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Approvals' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Pending My Approval</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {myApprovals.filter((a) => a.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Approved This Week</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {myApprovals.filter((a) => a.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Rejected This Week</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {myApprovals.filter((a) => a.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input placeholder="Search approvals..." />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable columns={columns} data={formattedData} />
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              Approve Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedApproval && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm font-medium">Request: {selectedApproval.purchase_requests?.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Amount: ${selectedApproval.purchase_requests?.estimated_cost?.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Stage: {selectedApproval.approval_stages?.stage_name}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any notes for this approval..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Reject Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedApproval && (
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm font-medium">Request: {selectedApproval.purchase_requests?.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Amount: ${selectedApproval.purchase_requests?.estimated_cost?.toFixed(2)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea
                id="rejectReason"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleReject}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
