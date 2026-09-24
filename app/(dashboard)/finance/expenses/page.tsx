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
import { CreditCard, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, XCircle, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const expenseSchema = z.object({
  employee_id: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  expense_date: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  receipt_reference: z.string().optional(),
  notes: z.string().optional(),
});
type ExpenseForm = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const { company, user } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentAmount, setPaymentAmount] = useState(0);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema) });

  const load = async () => {
    if (!company?.id) return;
    const [expensesData, employeesData] = await Promise.all([
      supabase.from('expenses').select('*, employees(first_name, last_name)').eq('company_id', company.id).order('expense_date', { ascending: false }),
      supabase.from('employees').select('*').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setExpenses(expensesData.data ?? []);
    setEmployees(employeesData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: ExpenseForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('expenses').insert({
      company_id: company.id,
      employee_id: data.employee_id,
      category: data.category,
      amount: data.amount,
      expense_date: data.expense_date,
      description: data.description,
      receipt_reference: data.receipt_reference,
      notes: data.notes,
      status: 'pending',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create expense'); return; }
    await logAuditEvent('expenses', null, 'created', null, { amount: data.amount, category: data.category }, company.id, user?.id);
    toast.success('Expense submitted');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveExpense = async (expense: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('expenses').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', expense.id);
    if (error) { toast.error('Failed to approve expense'); return; }
    await logAuditEvent('expenses', expense.id, 'approved', { status: 'approved' }, null, company.id, user?.id);
    toast.success('Expense approved');
    load();
  };

  const rejectExpense = async (expense: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('expenses').update({ status: 'rejected' }).eq('id', expense.id);
    if (error) { toast.error('Failed to reject expense'); return; }
    await logAuditEvent('expenses', expense.id, 'rejected', { status: 'rejected' }, null, company.id, user?.id);
    toast.success('Expense rejected');
    load();
  };

  const processReimbursement = async () => {
    if (!company?.id || !selectedExpense) return;
    const { error } = await supabase.from('expenses').update({ status: 'reimbursed', reimbursed_amount: paymentAmount, reimbursed_at: new Date().toISOString() }).eq('id', selectedExpense.id);
    if (error) { toast.error('Failed to process reimbursement'); return; }
    await logAuditEvent('expenses', selectedExpense.id, 'reimbursed', { amount: paymentAmount }, null, company.id, user?.id);
    toast.success('Reimbursement processed');
    setPaymentDialogOpen(false);
    setPaymentAmount(0);
    setSelectedExpense(null);
    load();
  };

  const deleteExpense = async () => {
    if (!company?.id || !expenseToDelete) return;
    const { error } = await supabase.from('expenses').delete().eq('id', expenseToDelete.id);
    if (error) { toast.error('Failed to delete expense'); return; }
    await logAuditEvent('expenses', expenseToDelete.id, 'deleted', null, null, company.id, user?.id);
    toast.success('Expense deleted');
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
    load();
  };

  const viewExpense = (expense: any) => {
    setSelectedExpense(expense);
    setViewDialogOpen(true);
  };

  const openPaymentDialog = (expense: any) => {
    setSelectedExpense(expense);
    setPaymentAmount(expense.amount);
    setPaymentDialogOpen(true);
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.employees?.first_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
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

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);
  const approvedAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
  const reimbursedAmount = expenses.filter(e => e.status === 'reimbursed').reduce((sum, e) => sum + (e.reimbursed_amount || 0), 0);

  return (
    <PermissionGuard permission="finance.expenses.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view expenses</div>}>
      <div className="space-y-6">
        <PageHeader title="Expenses" description="Employee expense reports and reimbursements" breadcrumbs={[{ label: 'Finance' }, { label: 'Expenses' }]} >
          <Can resource="expenses" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="expenses" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Submit Expense</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Submit Expense</DialogTitle></DialogHeader>
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
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Submit Expense</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={<CreditCard className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending Approval" value={formatCurrency(pendingAmount)} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Approved This Month" value={formatCurrency(approvedAmount)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Reimbursed" value={formatCurrency(reimbursedAmount)} icon={<DollarSign className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search expenses..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="reimbursed">Reimbursed</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredExpenses}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewExpense(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'pending' && (
                      <>
                        <Can resource="expenses" action="approve">
                          <DropdownMenuItem onClick={() => approveExpense(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>
                        </Can>
                        <Can resource="expenses" action="reject">
                          <DropdownMenuItem onClick={() => rejectExpense(row)}><XCircle className="h-4 w-4 mr-2" />Reject</DropdownMenuItem>
                        </Can>
                      </>
                    )}
                    {row.status === 'approved' && (
                      <Can resource="expenses" action="pay">
                        <DropdownMenuItem onClick={() => openPaymentDialog(row)}><DollarSign className="h-4 w-4 mr-2" />Process Reimbursement</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status !== 'reimbursed' && (
                      <Can resource="expenses" action="delete">
                        <DropdownMenuItem onClick={() => { setExpenseToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
            <DialogHeader><DialogTitle>Expense Details</DialogTitle></DialogHeader>
            {selectedExpense && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Employee:</span> {selectedExpense.employees?.first_name} {selectedExpense.employees?.last_name}</div>
                  <div><span className="text-gray-500">Category:</span> {selectedExpense.category}</div>
                  <div><span className="text-gray-500">Date:</span> {formatDate(selectedExpense.expense_date)}</div>
                  <div><span className="text-gray-500">Amount:</span> {formatCurrency(selectedExpense.amount)}</div>
                  <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedExpense.description}</div>
                  <div className="col-span-2"><span className="text-gray-500">Status:</span> <StatusBadge status={selectedExpense.status} /></div>
                  {selectedExpense.receipt_reference && <div className="col-span-2"><span className="text-gray-500">Receipt:</span> {selectedExpense.receipt_reference}</div>}
                  {selectedExpense.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedExpense.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Process Reimbursement</DialogTitle></DialogHeader>
            {selectedExpense && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p><span className="text-gray-500">Employee:</span> {selectedExpense.employees?.first_name} {selectedExpense.employees?.last_name}</p>
                  <p><span className="text-gray-500">Amount:</span> {formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <Label>Reimbursement Amount</Label>
                  <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setPaymentDialogOpen(false); setPaymentAmount(0); setSelectedExpense(null); }}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={processReimbursement}>Process Reimbursement</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Expense"
          description="Are you sure you want to delete this expense? This action cannot be undone."
          onConfirm={deleteExpense}
        />
      </div>
    </PermissionGuard>
  );
}
