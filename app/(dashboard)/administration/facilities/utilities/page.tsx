'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { Can } from '@/components/rbac/PermissionGuard';
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
import { Zap, Plus, Edit, Trash2, Plug } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const utilitySchema = z.object({
  utility_type: z.enum(['electricity', 'water', 'gas', 'internet', 'other']),
  provider_name: z.string().optional(),
  account_number: z.string().optional(),
  billing_cycle: z.string().optional(),
  amount: z.string().optional(),
  due_date: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type UtilityForm = z.infer<typeof utilitySchema>;

export default function UtilitiesPage() {
  const { company, user: currentUser } = useAuth();
  const [utilities, setUtilities] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUtility, setEditUtility] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<UtilityForm>({
    resolver: zodResolver(utilitySchema),
    defaultValues: { utility_type: 'electricity' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [utilRes, branchRes] = await Promise.all([
      supabase
        .from('utilities')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setUtilities(utilRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (util: any) => {
    setEditUtility(util);
    reset({
      utility_type: util.utility_type,
      provider_name: util.provider_name ?? '',
      account_number: util.account_number ?? '',
      billing_cycle: util.billing_cycle ?? '',
      amount: util.amount?.toString() ?? '',
      due_date: util.due_date ?? '',
      branch_id: util.branch_id ?? undefined,
      notes: util.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: UtilityForm) => {
    if (!company?.id) return;

    const payload = {
      utility_type: data.utility_type,
      provider_name: data.provider_name,
      account_number: data.account_number,
      billing_cycle: data.billing_cycle,
      amount: data.amount ? parseFloat(data.amount) : null,
      due_date: data.due_date || null,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editUtility) {
      const { error } = await supabase
        .from('utilities')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editUtility.id);

      if (error) {
        toast.error('Failed to update utility');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'utility_updated',
        module: 'facilities',
        record_id: editUtility.id,
        new_values: { provider_name: data.provider_name },
      });

      toast.success('Utility updated');
    } else {
      const { error } = await supabase.from('utilities').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create utility');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'utility_created',
        module: 'facilities',
        new_values: { provider_name: data.provider_name },
      });

      toast.success('Utility created');
    }

    reset();
    setEditUtility(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('utilities').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete utility');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'utility_deleted',
        module: 'facilities',
        record_id: deleteId,
      });
      toast.success('Utility deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const exportCSV = () => {
    const headers = ['Type', 'Provider', 'Account Number', 'Billing Cycle', 'Amount', 'Due Date', 'Status', 'Branch'];
    const rows = utilities.map(u => [
      u.utility_type,
      u.provider_name || '',
      u.account_number || '',
      u.billing_cycle || '',
      u.amount || '',
      u.due_date || '',
      u.status,
      u.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utilities.csv';
    a.click();
  };

  const typeIcons: Record<string, any> = {
    electricity: Zap,
    water: Plug,
    gas: Zap,
    internet: Zap,
    other: Plug,
  };

  const columns: Column<any>[] = [
    {
      key: 'utility_type',
      header: 'Type',
      sortable: true,
      cell: (row) => {
        const Icon = typeIcons[row.utility_type] || Plug;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-400" />
            <span className="text-sm capitalize">{row.utility_type}</span>
          </div>
        );
      },
    },
    {
      key: 'provider_name',
      header: 'Provider',
      sortable: true,
      cell: (row) => <span className="text-sm font-medium">{row.provider_name || '—'}</span>,
    },
    {
      key: 'account_number',
      header: 'Account #',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.account_number || '—'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      cell: (row) => <span className="text-sm">{row.amount ? `$${row.amount.toFixed(2)}` : '—'}</span>,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.due_date || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'branch',
      header: 'Branch',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.branches?.name || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      headerClassName: 'w-10',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}>
              <Edit className="h-4 w-4 mr-2" />Edit
            </DropdownMenuItem>
            <Can resource="facilities.utilities" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = utilities.filter(u => u.status === 'active').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilities"
        description="Manage utility providers and billing"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Facilities' }, { label: 'Utilities' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="facilities.utilities" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditUtility(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Utility
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editUtility ? 'Edit Utility' : 'Add Utility'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type *</Label>
                      <Controller name="utility_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="electricity">Electricity</SelectItem>
                            <SelectItem value="water">Water</SelectItem>
                            <SelectItem value="gas">Gas</SelectItem>
                            <SelectItem value="internet">Internet</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Branch</Label>
                      <Controller name="branch_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Provider Name</Label>
                      <Input className="mt-1" {...register('provider_name')} />
                    </div>
                    <div>
                      <Label>Account Number</Label>
                      <Input className="mt-1" {...register('account_number')} />
                    </div>
                    <div>
                      <Label>Billing Cycle</Label>
                      <Input className="mt-1" {...register('billing_cycle')} placeholder="e.g., Monthly" />
                    </div>
                    <div>
                      <Label>Amount</Label>
                      <Input className="mt-1" type="number" step="0.01" {...register('amount')} />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <Input className="mt-1" type="date" {...register('due_date')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditUtility(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editUtility ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Utilities" value={utilities.length} icon={<Zap className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<Plug className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={utilities}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search utilities..."
        searchKeys={['provider_name', 'account_number']}
        pageSize={15}
        emptyTitle="No utilities"
        emptyDescription="Add utility providers to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Utility?"
        description="This will permanently delete this utility record."
        confirmLabel="Delete"
      />
    </div>
  );
}
