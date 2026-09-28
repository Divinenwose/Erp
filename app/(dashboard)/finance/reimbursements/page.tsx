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
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const reimbursementSchema = z.object({
  employee_id: z.string().min(1, 'Required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  expense_date: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  receipt_reference: z.string().optional(),
  notes: z.string().optional(),
});
type ReimbursementForm = z.infer<typeof reimbursementSchema>;

export default function ReimbursementsPage() {
  const { company, user } = useAuth();
  const [reimbursements, setReimbursements] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reimbursementToDelete, setReimbursementToDelete] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentAmount, setPaymentAmount] = useState(0);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ReimbursementForm>({ resolver: zodResolver(reimbursementSchema) });

  const load = async () => {
    if (!company?.id) return;
    const [reimbursementsData, employeesData] = await Promise.all([
      supabase.from('reimbursements').select('*, employees(first_name, last_name)').eq('company_id', company.id).order('expense_date', { ascending: false }),
      supabase.from('employees').select('*').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setReimbursements(reimbursementsData.data ?? []);
    setEmployees(employeesData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: ReimbursementForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('reimbursements').insert({
      company_id: company.id,
      employee_id: data.employee_id,
      amount: data.amount,
      expense_date: data.expense_date,
      category: data.category,
      description: data.description,
      receipt_reference: data.receipt_reference,
      notes: data.notes,
      status: 'pending',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create reimbursement'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'created', module: 'reimbursements', entity_type: 'reimbursements', new_value: { amount: data.amount, category: data.category } });
    toast.success('Reimbursement submitted');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveReimbursement = async (reimbursement: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('reimbursements').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', reimbursement.id);
    if (error) { toast.error('Failed to approve reimbursement'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'approved', module: 'reimbursements', entity_type: 'reimbursements', entity_id: reimbursement.id, new_value: { status: 'approved' } });
    toast.success('Reimbursement approved');
    load();
  };

  const rejectReimbursement = async (reimbursement: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('reimbursements').update({ status: 'rejected' }).eq('id', reimbursement.id);
    if (error) { toast.error('Failed to reject reimbursement'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'rejected', module: 'reimbursements', entity_type: 'reimbursements', entity_id: reimbursement.id, new_value: { status: 'rejected' } });
    toast.success('Reimbursement rejected');
    load();
  };

  const processPayment = async () => {
    if (!company?.id || !selectedReimbursement) return;
    const { error } = await supabase.from('reimbursements').update({ status: 'paid', paid_amount: paymentAmount, paid_at: new Date().toISOString() }).eq('id', selectedReimbursement.id);
    if (error) { toast.error('Failed to process payment'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'paid', module: 'reimbursements', entity_type: 'reimbursements', entity_id: selectedReimbursement.id, new_value: { amount: paymentAmount } });
    toast.success('Payment processed');
    setPaymentDialogOpen(false);
    setPaymentAmount(0);
    setSelectedReimbursement(null);
    load();
  };

  const deleteReimbursement = async () => {
    if (!company?.id || !reimbursementToDelete) return;
    const { error } = await supabase.from('reimbursements').delete().eq('id', reimbursementToDelete.id);
    if (error) { toast.error('Failed to delete reimbursement'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deleted', module: 'reimbursements', entity_type: 'reimbursements', entity_id: reimbursementToDelete.id });
    toast.success('Reimbursement deleted');
    setDeleteDialogOpen(false);
    setReimbursementToDelete(null);
    load();
  };

  const viewReimbursement = (reimbursement: any) => {
    setSelectedReimbursement(reimbursement);
    setViewDialogOpen(true);
  };

  const openPaymentDialog = (reimbursement: any) => {
    setSelectedReimbursement(reimbursement);
    setPaymentAmount(reimbursement.amount);
    setPaymentDialogOpen(true);
  };

  const filteredReimbursements = reimbursements.filter(r => {
    const matchesSearch = !search || r.description?.toLowerCase().includes(search.toLowerCase()) || r.employees?.first_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<any>[] = [
    { key: 'expense_date', header: 'Date', cell: (row) => formatDate(row.expense_date) },
    { key: 'employees', header: 'Employee', cell: (row) => `${row.employees?.first_name} ${row.employees?.last_name}` || 'Unknown' },
    { key: 'category', header: 'Category' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount', cell: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalAmount = reimbursements.reduce((sum, r) => sum + (r.amount || 0), 0);
  const pendingAmount = reimbursements.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0);
  const paidAmount = reimbursements.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.paid_amount || 0), 0);

  return (
    <PermissionGuard permission="finance.reimbursements.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view reimbursements</div>}>
      <div className="space-y-6">
        <PageHeader title="Reimbursements" description="Employee expense reimbursements" breadcrumbs={[{ label: 'Finance' }, { label: 'Reimbursements' }]}>
          <Can resource="reimbursements" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="reimbursements" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Submit Reimbursement</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Submit Reimbursement</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Employee *</Label>
                      <Select onValueChange={(v) => register('employee_id').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>
                          {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Category *</Label><Input className="mt-1" {...register('category')} placeholder="e.g., Travel, Meals" /></div>
                    <div><Label>Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('amount')} /></div>
                    <div><Label>Date *</Label><Input className="mt-1" type="date" {...register('expense_date')} /></div>
                    <div><Label>Receipt Reference</Label><Input className="mt-1" {...register('receipt_reference')} placeholder="e.g., RCT-001" /></div>
                    <div className="col-span-2"><Label>Description *</Label><Input className="mt-1" {...register('description')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Submit Reimbursement</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Amount" value={formatCurrency(totalAmount)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending" value={formatCurrency(pendingAmount)} icon={<DollarSign className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Paid" value={formatCurrency(paidAmount)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Requests" value={reimbursements.length} icon={<DollarSign className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search reimbursements..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredReimbursements}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewReimbursement(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'pending' && (
                      <>
                        <Can resource="reimbursements" action="approve">
                          <DropdownMenuItem onClick={() => approveReimbursement(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>
                        </Can>
                        <Can resource="reimbursements" action="reject">
                          <DropdownMenuItem onClick={() => rejectReimbursement(row)}><XCircle className="h-4 w-4 mr-2" />Reject</DropdownMenuItem>
                        </Can>
                      </>
                    )}
                    {row.status === 'approved' && (
                      <Can resource="reimbursements" action="pay">
                        <DropdownMenuItem onClick={() => openPaymentDialog(row)}><DollarSign className="h-4 w-4 mr-2" />Process Payment</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status !== 'paid' && (
                      <Can resource="reimbursements" action="delete">
                        <DropdownMenuItem onClick={() => { setReimbursementToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </Can>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Reimbursement Details</DialogTitle></DialogHeader>
            {selectedReimbursement && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Employee:</span> {selectedReimbursement.employees?.first_name} {selectedReimbursement.employees?.last_name}</div>
                  <div><span className="text-gray-500">Category:</span> {selectedReimbursement.category}</div>
                  <div><span className="text-gray-500">Date:</span> {formatDate(selectedReimbursement.expense_date)}</div>
                  <div><span className="text-gray-500">Amount:</span> {formatCurrency(selectedReimbursement.amount)}</div>
                  <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedReimbursement.description}</div>
                  <div className="col-span-2"><span className="text-gray-500">Status:</span> <StatusBadge status={selectedReimbursement.status} /></div>
                  {selectedReimbursement.receipt_reference && <div className="col-span-2"><span className="text-gray-500">Receipt:</span> {selectedReimbursement.receipt_reference}</div>}
                  {selectedReimbursement.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedReimbursement.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Process Payment</DialogTitle></DialogHeader>
            {selectedReimbursement && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p><span className="text-gray-500">Employee:</span> {selectedReimbursement.employees?.first_name} {selectedReimbursement.employees?.last_name}</p>
                  <p><span className="text-gray-500">Amount:</span> {formatCurrency(selectedReimbursement.amount)}</p>
                </div>
                <div>
                  <Label>Payment Amount</Label>
                  <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setPaymentAmount(0); setSelectedReimbursement(null); }}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={processPayment}>Process Payment</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Reimbursement"
          description="Are you sure you want to delete this reimbursement? This action cannot be undone."
          onConfirm={deleteReimbursement}
        />
      </div>
    </PermissionGuard>
  );
}
