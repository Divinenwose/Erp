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
import { PieChart, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const budgetSchema = z.object({
  department_id: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  budgeted_amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  fiscal_year: z.string().min(4, 'Required'),
  start_date: z.string().min(1, 'Required'),
  end_date: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});
type BudgetForm = z.infer<typeof budgetSchema>;

export default function BudgetsPage() {
  const { company, user } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BudgetForm>({ resolver: zodResolver(budgetSchema) });

  const load = async () => {
    if (!company?.id) return;
    const [budgetsData, departmentsData] = await Promise.all([
      supabase.from('budgets').select('*, departments(name)').eq('company_id', company.id).order('fiscal_year', { ascending: false }),
      supabase.from('departments').select('*').eq('company_id', company.id).eq('status', 'active'),
    ]);
    setBudgets(budgetsData.data ?? []);
    setDepartments(departmentsData.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: BudgetForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('budgets').insert({
      company_id: company.id,
      department_id: data.department_id,
      category: data.category,
      budgeted_amount: data.budgeted_amount,
      actual_amount: 0,
      variance: 0,
      fiscal_year: data.fiscal_year,
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes,
      status: 'draft',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create budget'); return; }
    await logAuditEvent('budgets', null, 'created', null, { budgeted_amount: data.budgeted_amount, fiscal_year: data.fiscal_year }, company.id, user?.id);
    toast.success('Budget created');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveBudget = async (budget: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('budgets').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', budget.id);
    if (error) { toast.error('Failed to approve budget'); return; }
    await logAuditEvent('budgets', budget.id, 'approved', { status: 'approved' }, null, company.id, user?.id);
    toast.success('Budget approved');
    load();
  };

  const deleteBudget = async () => {
    if (!company?.id || !budgetToDelete) return;
    const { error } = await supabase.from('budgets').delete().eq('id', budgetToDelete.id);
    if (error) { toast.error('Failed to delete budget'); return; }
    await logAuditEvent('budgets', budgetToDelete.id, 'deleted', null, null, company.id, user?.id);
    toast.success('Budget deleted');
    setDeleteDialogOpen(false);
    setBudgetToDelete(null);
    load();
  };

  const viewBudget = (budget: any) => {
    setSelectedBudget(budget);
    setViewDialogOpen(true);
  };

  const getBudgetStatus = (budget: any) => {
    if (budget.status === 'draft') return 'pending';
    if (budget.status === 'approved') {
      const percentage = budget.budgeted_amount > 0 ? (budget.actual_amount / budget.budgeted_amount) * 100 : 0;
      if (percentage > 100) return 'over_budget';
      if (percentage > 90) return 'at_risk';
      return 'on_track';
    }
    return 'pending';
  };

  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = !search || b.category?.toLowerCase().includes(search.toLowerCase()) || b.departments?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<any>[] = [
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'departments', header: 'Department', cell: (row) => row.departments?.name || 'Unknown' },
    { key: 'category', header: 'Category' },
    { key: 'budgeted_amount', header: 'Budget', cell: (row) => <span className="font-medium">{formatCurrency(row.budgeted_amount)}</span> },
    { key: 'actual_amount', header: 'Spent', cell: (row) => <span>{formatCurrency(row.actual_amount)}</span> },
    { key: 'variance', header: 'Variance', cell: (row) => {
      const percentage = row.budgeted_amount > 0 ? ((row.actual_amount - row.budgeted_amount) / row.budgeted_amount) * 100 : 0;
      return <span className={percentage > 0 ? 'text-rose-600' : 'text-emerald-600'}>{percentage.toFixed(1)}%</span>;
    } },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={getBudgetStatus(row)} /> },
  ];

  const totalBudget = budgets.reduce((sum, b) => sum + (b.budgeted_amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.actual_amount || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetCount = budgets.filter(b => getBudgetStatus(b) === 'over_budget').length;

  return (
    <PermissionGuard permission="finance.budgets.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view budgets</div>}>
      <div className="space-y-6">
        <PageHeader title="Budgets" description="Budget planning and variance tracking" breadcrumbs={[{ label: 'Finance' }, { label: 'Budgets' }]} >
          <Can resource="budgets" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="budgets" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Create Budget</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Create Budget</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Department *</Label>
                      <Select onValueChange={(v) => register('department_id').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Category *</Label><Input className="mt-1" {...register('category')} placeholder="e.g., Software Licenses" /></div>
                    <div><Label>Fiscal Year *</Label><Input className="mt-1" {...register('fiscal_year')} placeholder="2024" /></div>
                    <div><Label>Budget Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('budgeted_amount')} /></div>
                    <div><Label>Start Date *</Label><Input className="mt-1" type="date" {...register('start_date')} /></div>
                    <div><Label>End Date *</Label><Input className="mt-1" type="date" {...register('end_date')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Budget</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Budget" value={formatCurrency(totalBudget)} icon={<PieChart className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Spent" value={formatCurrency(totalSpent)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Remaining" value={formatCurrency(totalRemaining)} icon={<Calendar className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Over Budget" value={overBudgetCount} icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search budgets..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredBudgets}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewBudget(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'draft' && (
                      <Can resource="budgets" action="approve">
                        <DropdownMenuItem onClick={() => approveBudget(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>
                      </Can>
                    )}
                    <Can resource="budgets" action="delete">
                      <DropdownMenuItem onClick={() => { setBudgetToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </Can>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Budget Details</DialogTitle></DialogHeader>
            {selectedBudget && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Department:</span> {selectedBudget.departments?.name}</div>
                  <div><span className="text-gray-500">Category:</span> {selectedBudget.category}</div>
                  <div><span className="text-gray-500">Fiscal Year:</span> {selectedBudget.fiscal_year}</div>
                  <div><span className="text-gray-500">Budget:</span> {formatCurrency(selectedBudget.budgeted_amount)}</div>
                  <div><span className="text-gray-500">Spent:</span> {formatCurrency(selectedBudget.actual_amount)}</div>
                  <div><span className="text-gray-500">Remaining:</span> {formatCurrency(selectedBudget.budgeted_amount - selectedBudget.actual_amount)}</div>
                  <div><span className="text-gray-500">Start Date:</span> {formatDate(selectedBudget.start_date)}</div>
                  <div><span className="text-gray-500">End Date:</span> {formatDate(selectedBudget.end_date)}</div>
                  <div className="col-span-2"><span className="text-gray-500">Status:</span> <StatusBadge status={getBudgetStatus(selectedBudget)} /></div>
                  {selectedBudget.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedBudget.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Budget"
          description="Are you sure you want to delete this budget? This action cannot be undone."
          onConfirm={deleteBudget}
        />
      </div>
    </PermissionGuard>
  );
}
