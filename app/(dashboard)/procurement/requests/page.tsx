'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Plus, Search, Clock, CheckCircle2, TrendingUp, FileText, MoreHorizontal, Edit, Trash2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const prSchema = z.object({
  title: z.string().min(1, 'Required'),
  department_id: z.string().min(1, 'Required'),
  priority: z.string().default('medium'),
  estimated_cost: z.coerce.number().min(0).default(0),
  required_date: z.string().optional(),
  justification: z.string().optional(),
});
type PRForm = z.infer<typeof prSchema>;

export default function PurchaseRequestsPage() {
  const { company, user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requestToDelete, setRequestToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PRForm>({ resolver: zodResolver(prSchema), defaultValues: { priority: 'medium' } });

  const load = async () => {
    if (!company?.id) return;
    const [requestsData, departmentsData] = await Promise.all([
      supabase.from('purchase_requests').select('*, departments(name), employees(first_name, last_name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setRequests(requestsData.data ?? []);
    setDepartments(departmentsData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: PRForm) => {
    if (!company?.id) return;
    
    const { data: maxPR } = await supabase
      .from('purchase_requests')
      .select('request_number')
      .eq('company_id', company.id)
      .order('request_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastNum = maxPR?.request_number ? parseInt(String(maxPR.request_number).split('-').pop() || '0') : 0;
    const requestNumber = `PR-${new Date().getFullYear()}-${String(lastNum + 1).padStart(4, '0')}`;
    
    const { error } = await supabase.from('purchase_requests').insert({
      company_id: company.id,
      request_number: requestNumber,
      title: data.title,
      department_id: data.department_id,
      priority: data.priority,
      estimated_cost: data.estimated_cost,
      required_date: data.required_date,
      justification: data.justification,
      status: 'draft',
      requested_by: user?.id,
    });
    
    if (error) { toast.error('Failed to create request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'procurement', entity_type: 'purchase_requests', new_value: { request_number: requestNumber, title: data.title, estimated_cost: data.estimated_cost } });
    }
    
    toast.success('Purchase request created');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveRequest = async (request: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('purchase_requests').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', request.id);
    if (error) { toast.error('Failed to approve request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'approved', module: 'procurement', entity_type: 'purchase_requests', entity_id: request.id, new_value: { status: 'approved' } });
    }
    
    toast.success('Request approved');
    load();
  };

  const rejectRequest = async (request: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('purchase_requests').update({ status: 'rejected' }).eq('id', request.id);
    if (error) { toast.error('Failed to reject request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'rejected', module: 'procurement', entity_type: 'purchase_requests', entity_id: request.id, new_value: { status: 'rejected' } });
    }
    
    toast.success('Request rejected');
    load();
  };

  const submitRequest = async (request: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('purchase_requests').update({ status: 'pending' }).eq('id', request.id);
    if (error) { toast.error('Failed to submit request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'submitted', module: 'procurement', entity_type: 'purchase_requests', entity_id: request.id, new_value: { status: 'pending' } });
    }
    
    toast.success('Request submitted for approval');
    load();
  };

  const deleteRequest = async () => {
    if (!company?.id || !requestToDelete) return;
    const { error } = await supabase.from('purchase_requests').delete().eq('id', requestToDelete.id);
    if (error) { toast.error('Failed to delete request'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'procurement', entity_type: 'purchase_requests', entity_id: requestToDelete.id });
    }
    
    toast.success('Request deleted');
    setDeleteDialogOpen(false);
    setRequestToDelete(null);
    load();
  };

  const viewRequest = (request: any) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const filteredRequests = requests.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.request_number?.toLowerCase().includes(search.toLowerCase()));

  const columns: Column<any>[] = [
    { key: 'request_number', header: 'Number', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.request_number}</span> },
    { key: 'title', header: 'Title' },
    { key: 'departments', header: 'Department', cell: (row) => row.departments?.name || 'General' },
    { key: 'estimated_cost', header: 'Estimated Cost', cell: (row) => <span className="font-medium">{formatCurrency(row.estimated_cost || 0)}</span> },
    { key: 'required_date', header: 'Required Date', cell: (row) => row.required_date ? formatDate(row.required_date) : '-' },
    { key: 'priority', header: 'Priority', cell: (row) => <span className={`text-xs px-2 py-1 rounded-full font-medium ${
      row.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
      row.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' :
      row.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
      'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
    }`}>{row.priority}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const totalValue = requests.reduce((a, r) => a + (r.estimated_cost ?? 0), 0);

  return (
    <PermissionGuard permission="procurement.requests.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view purchase requests</div>}>
      <div className="space-y-6">
        <PageHeader title="Purchase Requests" description="Create and manage internal purchase requests" breadcrumbs={[{ label: 'Procurement' }, { label: 'Purchase Requests' }]}>
          <Can resource="requests" action="export">
            <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="requests" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Request</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>New Purchase Request</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div><Label>Title *</Label><Input className="mt-1" placeholder="e.g. Office chairs x10" {...register('title')} />{errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}</div>
                  <div><Label>Department *</Label>
                    <Select onValueChange={(v) => register('department_id').onChange({ target: { value: v } })}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Priority</Label>
                      <Select defaultValue="medium" onValueChange={(v) => register('priority').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Estimated Cost</Label><Input className="mt-1" type="number" step="0.01" {...register('estimated_cost')} /></div>
                    <div><Label>Required Date</Label><Input className="mt-1" type="date" {...register('required_date')} /></div>
                  </div>
                  <div><Label>Justification</Label><Textarea className="mt-1" {...register('justification')} /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Submit Request</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Requests" value={requests.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending Approval" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Approved" value={approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Value" value={formatCurrency(totalValue)} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search requests..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredRequests}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Purchase Request Details</DialogTitle></DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Request Number:</span> {selectedRequest.request_number}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedRequest.status} /></div>
                  <div><span className="text-gray-500">Title:</span> {selectedRequest.title}</div>
                  <div><span className="text-gray-500">Department:</span> {selectedRequest.departments?.name}</div>
                  <div><span className="text-gray-500">Priority:</span> {selectedRequest.priority}</div>
                  <div><span className="text-gray-500">Estimated Cost:</span> {formatCurrency(selectedRequest.estimated_cost || 0)}</div>
                  <div><span className="text-gray-500">Required Date:</span> {selectedRequest.required_date ? formatDate(selectedRequest.required_date) : '-'}</div>
                  <div><span className="text-gray-500">Requested By:</span> {selectedRequest.employees?.first_name} {selectedRequest.employees?.last_name}</div>
                </div>
                {selectedRequest.justification && <div><span className="text-gray-500">Justification:</span> {selectedRequest.justification}</div>}
                {selectedRequest.status === 'draft' && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button size="sm" onClick={() => { setViewDialogOpen(false); submitRequest(selectedRequest); }}>Submit for Approval</Button>
                  </div>
                )}
                {selectedRequest.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Can resource="requests" action="approve">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); approveRequest(selectedRequest); }}>Approve</Button>
                    </Can>
                    <Can resource="requests" action="reject">
                      <Button size="sm" variant="destructive" onClick={() => { setViewDialogOpen(false); rejectRequest(selectedRequest); }}>Reject</Button>
                    </Can>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Purchase Request"
          description="Are you sure you want to delete this purchase request? This action cannot be undone."
          onConfirm={deleteRequest}
        />
      </div>
    </PermissionGuard>
  );
}
