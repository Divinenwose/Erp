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
import { Package, Plus, Edit, Trash2, Clock, UserCheck, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const issuanceSchema = z.object({
  item_name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  quantity: z.string().min(1, 'Required'),
  unit: z.enum(['piece', 'box', 'pack', 'set', 'kg', 'liter', 'other']),
  issued_to: z.string().min(1, 'Required'),
  branch_id: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});
type IssuanceForm = z.infer<typeof issuanceSchema>;

export default function IssuancePage() {
  const { company, user: currentUser } = useAuth();
  const [issuances, setIssuances] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIssuance, setEditIssuance] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<IssuanceForm>({
    resolver: zodResolver(issuanceSchema),
    defaultValues: { unit: 'piece' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [issRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('office_supplies_issuance')
        .select('*, branches(name), issued_to_profile(first_name, last_name), issued_by_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('issued_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setIssuances(issRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (issuance: any) => {
    setEditIssuance(issuance);
    reset({
      item_name: issuance.item_name,
      category: issuance.category ?? '',
      quantity: issuance.quantity?.toString() ?? '1',
      unit: issuance.unit,
      issued_to: issuance.issued_to,
      branch_id: issuance.branch_id ?? undefined,
      purpose: issuance.purpose ?? '',
      notes: issuance.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: IssuanceForm) => {
    if (!company?.id) return;

    const payload = {
      item_name: data.item_name,
      category: data.category,
      quantity: parseInt(data.quantity),
      unit: data.unit,
      issued_to: data.issued_to,
      branch_id: data.branch_id,
      purpose: data.purpose,
      notes: data.notes,
    };

    if (editIssuance) {
      const { error } = await supabase
        .from('office_supplies_issuance')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editIssuance.id);

      if (error) {
        toast.error('Failed to update issuance');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_issuance_updated',
        module: 'office_supplies',
        record_id: editIssuance.id,
        new_values: { item_name: data.item_name },
      });

      toast.success('Issuance updated');
    } else {
      const { error } = await supabase.from('office_supplies_issuance').insert({
        company_id: company.id,
        ...payload,
        issued_date: new Date().toISOString(),
        issued_by: currentUser?.id,
        status: 'issued',
      });

      if (error) {
        toast.error('Failed to create issuance');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_issuance_created',
        module: 'office_supplies',
        new_values: { item_name: data.item_name },
      });

      toast.success('Issuance created');
    }

    reset();
    setEditIssuance(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('office_supplies_issuance').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete issuance');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_issuance_deleted',
        module: 'office_supplies',
        record_id: deleteId,
      });
      toast.success('Issuance deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleReturn = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('office_supplies_issuance')
      .update({ 
        status: 'returned',
        returned_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as returned');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'office_supplies_issuance_returned',
        module: 'office_supplies',
        record_id: id,
      });
      toast.success('Marked as returned');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Issued To', 'Issued By', 'Issued Date', 'Returned Date', 'Status', 'Purpose', 'Branch'];
    const rows = issuances.map(i => [
      i.item_name,
      i.category || '',
      i.quantity,
      i.unit,
      i.issued_to_profile ? `${i.issued_to_profile.first_name} ${i.issued_to_profile.last_name}` : '',
      i.issued_by_profile ? `${i.issued_by_profile.first_name} ${i.issued_by_profile.last_name}` : '',
      i.issued_date,
      i.returned_date || '',
      i.status,
      i.purpose || '',
      i.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'office_supplies_issuance.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'item_name',
      header: 'Item',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.item_name}</p>
            {row.category && <p className="text-xs text-gray-400">{row.category}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      cell: (row) => <span className="text-sm font-medium">{row.quantity} {row.unit}</span>,
    },
    {
      key: 'issued_to',
      header: 'Issued To',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <UserCheck className="h-3 w-3" />
          <span>{row.issued_to_profile ? `${row.issued_to_profile.first_name} ${row.issued_to_profile.last_name}` : '—'}</span>
        </div>
      ),
    },
    {
      key: 'purpose',
      header: 'Purpose',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.purpose || '—'}</span>,
    },
    {
      key: 'issued_date',
      header: 'Issued',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.issued_date).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      key: 'returned_date',
      header: 'Returned',
      sortable: true,
      cell: (row) => row.returned_date ? (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.returned_date).toLocaleDateString()}</span>
        </div>
      ) : <span className="text-sm text-gray-400">—</span>,
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
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Building2 className="h-3 w-3" />
          <span>{row.branches?.name || '—'}</span>
        </div>
      ),
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
            {row.status === 'issued' && (
              <DropdownMenuItem onClick={() => handleReturn(row.id)}>
                <Package className="h-4 w-4 mr-2" />Mark Returned
              </DropdownMenuItem>
            )}
            <Can resource="office_supplies.issuance" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const issued = issuances.filter(i => i.status === 'issued').length;
  const returned = issuances.filter(i => i.status === 'returned').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office Supplies Issuance"
        description="Track office supplies issued to employees"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Office Supplies' }, { label: 'Issuance' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="office_supplies.issuance" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditIssuance(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Issue Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editIssuance ? 'Edit Issuance' : 'Issue Office Supply'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Item Name *</Label>
                      <Input className="mt-1" {...register('item_name')} />
                      {errors.item_name && <p className="text-xs text-red-500 mt-1">{errors.item_name.message}</p>}
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input className="mt-1" {...register('category')} placeholder="e.g., Stationery" />
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Input className="mt-1" type="number" {...register('quantity')} />
                      {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>}
                    </div>
                    <div>
                      <Label>Unit *</Label>
                      <Controller name="unit" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piece">Piece</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="pack">Pack</SelectItem>
                            <SelectItem value="set">Set</SelectItem>
                            <SelectItem value="kg">Kilogram</SelectItem>
                            <SelectItem value="liter">Liter</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Issued To *</Label>
                      <Controller name="issued_to" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
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
                    <div className="col-span-2">
                      <Label>Purpose</Label>
                      <Textarea className="mt-1" rows={2} {...register('purpose')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditIssuance(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editIssuance ? 'Update' : 'Issue'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Issuances" value={issuances.length} icon={<Package className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Issued" value={issued} icon={<Package className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Returned" value={returned} icon={<Package className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
      </div>

      <DataTable
        data={issuances}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search issuances..."
        searchKeys={['item_name', 'category', 'purpose']}
        pageSize={15}
        emptyTitle="No issuances"
        emptyDescription="Issue office supplies to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Issuance?"
        description="This will permanently delete the issuance record."
        confirmLabel="Delete"
      />
    </div>
  );
}
