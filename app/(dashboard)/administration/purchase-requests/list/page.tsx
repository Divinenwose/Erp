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
import { Search, Plus, Download, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PurchaseRequestsListPage() {
  const { company, user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [requestData, setRequestData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [actualCost, setActualCost] = useState('');

  const columns = [
    { key: 'requestNumber', header: 'Request #' },
    { key: 'requester', header: 'Requester' },
    { key: 'department', header: 'Department' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount' },
    { key: 'requestedDate', header: 'Requested Date' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadRequests();
    loadDepartments();
    loadVendors();
  }, [company?.id, selectedMonth, selectedStatus, selectedDepartment]);

  const loadRequests = async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from('purchase_requests')
      .select('*, profiles(first_name, last_name), departments(name), vendors(name)')
      .eq('company_id', company.id);

    if (selectedMonth) {
      query = query.gte('requested_date', `${selectedMonth}-01`).lte('requested_date', `${selectedMonth}-31`);
    }
    if (selectedStatus) {
      query = query.eq('status', selectedStatus);
    }
    if (selectedDepartment) {
      query = query.eq('department_id', selectedDepartment);
    }

    const { data } = await query.order('requested_date', { ascending: false });
    setRequestData(data || []);
    setLoading(false);
  };

  const loadDepartments = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('departments').select('*').eq('company_id', company.id);
    setDepartments(data || []);
  };

  const loadVendors = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('vendors').select('*').eq('company_id', company.id);
    setVendors(data || []);
  };

  const handleWorkflowAction = async () => {
    if (!company?.id || !selectedRequest) return;

    let newStatus = selectedRequest.status;
    let updateData: any = {};

    switch (actionType) {
      case 'approve_admin':
        newStatus = 'md_approval';
        updateData = { approved_by: currentUser?.id, approved_at: new Date().toISOString() };
        break;
      case 'approve_md':
        newStatus = 'accounts_review';
        updateData = { approved_by: currentUser?.id, approved_at: new Date().toISOString() };
        break;
      case 'approve_accounts':
        newStatus = 'vendor_assigned';
        updateData = { approved_by: currentUser?.id, approved_at: new Date().toISOString() };
        break;
      case 'assign_vendor':
        newStatus = 'completed';
        updateData = { 
          vendor_id: selectedVendor, 
          actual_cost: parseFloat(actualCost),
          completed_date: new Date().toISOString().split('T')[0],
          payment_status: 'pending'
        };
        break;
      case 'reject':
        newStatus = 'rejected';
        updateData = { rejection_reason: actionNotes };
        break;
      case 'cancel':
        newStatus = 'cancelled';
        break;
      default:
        return;
    }

    const { error } = await supabase
      .from('purchase_requests')
      .update({ ...updateData, status: newStatus })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to update request');
      return;
    }

    // Create approval record
    if (actionType.includes('approve')) {
      await supabase.from('request_approvals').insert({
        company_id: company.id,
        request_id: selectedRequest.id,
        request_type: 'purchase_request',
        approver_id: currentUser?.id,
        status: 'approved',
        comments: actionNotes,
        approved_at: new Date().toISOString(),
      });
    }

    setActionNotes('');
    setSelectedVendor('');
    setActualCost('');
    setSelectedRequest(null);
    setActionType('');
    setIsActionDialogOpen(false);
    loadRequests();
  };

  const openActionDialog = (request: any, action: string) => {
    setSelectedRequest(request);
    setActionType(action);
    setIsActionDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      admin_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      md_approval: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      accounts_review: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      vendor_assigned: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return (
      <Badge className={variants[status] || variants.pending}>
        {status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </Badge>
    );
  };

  const filteredData = requestData.filter((item) => {
    const matchesSearch = !searchTerm || 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.request_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formattedData = filteredData.map((item) => ({
    ...item,
    requestNumber: item.request_number || '-',
    requester: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : '-',
    department: item.departments?.name || '-',
    description: item.title || '-',
    amount: item.estimated_cost ? `$${item.estimated_cost.toFixed(2)}` : '-',
    requestedDate: item.requested_date ? format(new Date(item.requested_date), 'MMM dd, yyyy') : '-',
    status: getStatusBadge(item.status),
    actions: (
      <div className="flex gap-2">
        {item.status === 'pending' && (
          <Button size="sm" variant="outline" className="h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200" onClick={() => openActionDialog(item, 'approve_admin')}>
            Approve
          </Button>
        )}
        {item.status === 'md_approval' && (
          <Button size="sm" variant="outline" className="h-8 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" onClick={() => openActionDialog(item, 'approve_md')}>
            Approve
          </Button>
        )}
        {item.status === 'accounts_review' && (
          <Button size="sm" variant="outline" className="h-8 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200" onClick={() => openActionDialog(item, 'assign_vendor')}>
            Assign Vendor
          </Button>
        )}
        {(item.status === 'pending' || item.status === 'md_approval' || item.status === 'accounts_review') && (
          <Button size="sm" variant="outline" className="h-8 bg-red-50 hover:bg-red-100 text-red-700 border-red-200" onClick={() => openActionDialog(item, 'reject')}>
            Reject
          </Button>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Purchase Requests"
        description="View all purchase requests"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Purchase Requests', href: '/administration/purchase-requests' },
          { label: 'All Requests' },
        ]}
      >
        <div className="flex gap-2">
          <Dialog>
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
                  <Textarea id="description" placeholder="Describe what you need to purchase..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Estimated Amount *</Label>
                    <Input id="amount" type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="it">IT Equipment</SelectItem>
                        <SelectItem value="office">Office Supplies</SelectItem>
                        <SelectItem value="furniture">Furniture</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="justification">Justification</Label>
                  <Textarea id="justification" placeholder="Why is this purchase needed?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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

      {/* Workflow Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve_admin' && 'Approve Request (Admin Review)'}
              {actionType === 'approve_md' && 'Approve Request (MD Approval)'}
              {actionType === 'approve_accounts' && 'Approve Request (Accounts Review)'}
              {actionType === 'assign_vendor' && 'Assign Vendor & Complete Request'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'cancel' && 'Cancel Request'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === 'assign_vendor' && (
              <>
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Actual Cost</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={actualCost} onChange={(e) => setActualCost(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Add notes..." value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleWorkflowAction}>
                {actionType.includes('approve') && 'Approve'}
                {actionType === 'assign_vendor' && 'Complete'}
                {actionType === 'reject' && 'Reject'}
                {actionType === 'cancel' && 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
