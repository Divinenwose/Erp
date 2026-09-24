'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Plus, Edit, Trash2, TrendingUp, PieChart } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const budgetSchema = z.object({
  fiscal_year: z.string().min(1, 'Fiscal year is required'),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'annual']),
  category: z.enum(['campaigns', 'advertising', 'events', 'content', 'pr', 'research', 'brand', 'other']),
  allocated_amount: z.string().min(1, 'Allocated amount is required'),
  notes: z.string().optional(),
});
type BudgetForm = z.infer<typeof budgetSchema>;

export default function MarketingBudgetsPage() {
  const { company, user: currentUser } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBudget, setEditBudget] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ totalAllocated: 0, totalSpent: 0, remaining: 0, activeBudgets: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { quarter: 'annual', category: 'campaigns' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('marketing_budgets')
      .select('*')
      .eq('company_id', company.id)
      .order('fiscal_year', { ascending: false });

    if (error) {
      console.error('Error loading budgets:', error);
      toast.error('Failed to load budgets');
    }
    setBudgets(data ?? []);

    // Calculate stats
    const totalAllocated = data?.reduce((sum, b) => sum + (b.allocated_amount || 0), 0) || 0;
    const totalSpent = data?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0;
    const remaining = totalAllocated - totalSpent;
    const activeBudgets = data?.filter(b => b.status === 'active').length || 0;
    setStats({ totalAllocated, totalSpent, remaining, activeBudgets });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (budget: any) => {
    setEditBudget(budget);
    reset({
      fiscal_year: budget.fiscal_year.toString(),
      quarter: budget.quarter,
      category: budget.category,
      allocated_amount: budget.allocated_amount.toString(),
      notes: budget.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: BudgetForm) => {
    if (!company?.id) return;

    if (editBudget) {
      const { error } = await supabase
        .from('marketing_budgets')
        .update({
          fiscal_year: parseInt(data.fiscal_year),
          quarter: data.quarter,
          category: data.category,
          allocated_amount: parseFloat(data.allocated_amount),
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editBudget.id);

      if (error) {
        toast.error('Failed to update budget');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_budget_updated',
        module: 'marketing',
        record_id: editBudget.id,
        new_values: { fiscal_year: data.fiscal_year, category: data.category },
      });

      toast.success('Budget updated');
    } else {
      const { error } = await supabase.from('marketing_budgets').insert({
        company_id: company.id,
        fiscal_year: parseInt(data.fiscal_year),
        quarter: data.quarter,
        category: data.category,
        allocated_amount: parseFloat(data.allocated_amount),
        spent_amount: 0,
        notes: data.notes,
        status: 'active',
        created_by: currentUser?.id,
      });

      if (error) {
        toast.error('Failed to create budget');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_budget_created',
        module: 'marketing',
        new_values: { fiscal_year: data.fiscal_year, category: data.category },
      });

      toast.success('Budget created');
    }

    reset();
    setEditBudget(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('marketing_budgets')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete budget');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_budget_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Budget deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('marketing_budgets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_budget_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { 
      key: 'quarter',
      header: 'Quarter', 
      cell: (row) => <Badge variant="outline">{row.quarter}</Badge>
    },
    { 
      key: 'category',
      header: 'Category', 
      cell: (row) => <Badge variant="secondary">{row.category}</Badge>
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'allocated_amount',
      header: 'Allocated', 
      cell: (row) => `$${row.allocated_amount?.toLocaleString() || 0}`
    },
    { 
      key: 'spent_amount',
      header: 'Spent', 
      cell: (row) => `$${row.spent_amount?.toLocaleString() || 0}`
    },
    { 
      key: 'remaining',
      header: 'Remaining', 
      cell: (row) => {
        const remaining = (row.allocated_amount || 0) - (row.spent_amount || 0);
        const percentage = row.allocated_amount > 0 ? (remaining / row.allocated_amount) * 100 : 0;
        return (
          <div>
            <span className={remaining < 0 ? 'text-red-600' : 'text-emerald-600'}>
              ${remaining.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="budgets" action="edit">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              {row.status === 'active' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'closed')}>
                  <PieChart className="h-4 w-4 mr-2" /> Close Budget
                </DropdownMenuItem>
              )}
              {row.status === 'closed' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                  <TrendingUp className="h-4 w-4 mr-2" /> Reopen Budget
                </DropdownMenuItem>
              )}
              <Can resource="budgets" action="delete">
                <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Budgets" description="Manage marketing budgets and allocations" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Budgets' }]}>
        <Can resource="budgets" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditBudget(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editBudget ? 'Edit Budget' : 'New Budget'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fiscal Year *</Label>
                    <Input {...register('fiscal_year')} placeholder="2024" />
                    {errors.fiscal_year && <p className="text-red-500 text-sm mt-1">{errors.fiscal_year.message}</p>}
                  </div>
                  <div>
                    <Label>Quarter *</Label>
                    <Controller
                      name="quarter"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select quarter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="annual">Annual</SelectItem>
                            <SelectItem value="Q1">Q1</SelectItem>
                            <SelectItem value="Q2">Q2</SelectItem>
                            <SelectItem value="Q3">Q3</SelectItem>
                            <SelectItem value="Q4">Q4</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>Category *</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="campaigns">Campaigns</SelectItem>
                          <SelectItem value="advertising">Advertising</SelectItem>
                          <SelectItem value="events">Events</SelectItem>
                          <SelectItem value="content">Content</SelectItem>
                          <SelectItem value="pr">PR</SelectItem>
                          <SelectItem value="research">Research</SelectItem>
                          <SelectItem value="brand">Brand</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Allocated Amount ($) *</Label>
                  <Input type="number" {...register('allocated_amount')} placeholder="0.00" />
                  {errors.allocated_amount && <p className="text-red-500 text-sm mt-1">{errors.allocated_amount.message}</p>}
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editBudget ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Allocated" value={`$${stats.totalAllocated.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Spent" value={`$${stats.totalSpent.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Remaining" value={`$${stats.remaining.toLocaleString()}`} icon={<PieChart className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Active Budgets" value={stats.activeBudgets} icon={<DollarSign className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={budgets}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Budget"
        description="Are you sure you want to delete this budget? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
