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
import { FileText, Plus, Edit, Trash2, Calendar, User, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const policySchema = z.object({
  title: z.string().min(1, 'Required'),
  category: z.string().optional(),
  description: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  version: z.string().optional(),
  approved_by: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type PolicyForm = z.infer<typeof policySchema>;

export default function CompanyPoliciesPage() {
  const { company, user: currentUser } = useAuth();
  const [policies, setPolicies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPolicy, setEditPolicy] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [polRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('company_policies')
        .select('*, branches(name), approved_by_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('effective_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setPolicies(polRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (policy: any) => {
    setEditPolicy(policy);
    reset({
      title: policy.title,
      category: policy.category ?? '',
      description: policy.description ?? '',
      effective_date: policy.effective_date ?? '',
      expiry_date: policy.expiry_date ?? '',
      version: policy.version ?? '',
      approved_by: policy.approved_by ?? undefined,
      branch_id: policy.branch_id ?? undefined,
      notes: policy.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: PolicyForm) => {
    if (!company?.id) return;

    const payload = {
      title: data.title,
      category: data.category,
      description: data.description,
      effective_date: data.effective_date || null,
      expiry_date: data.expiry_date || null,
      version: data.version,
      approved_by: data.approved_by,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editPolicy) {
      const { error } = await supabase
        .from('company_policies')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editPolicy.id);

      if (error) {
        toast.error('Failed to update policy');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'company_policy_updated',
        module: 'documents',
        record_id: editPolicy.id,
        new_values: { title: data.title },
      });

      toast.success('Policy updated');
    } else {
      const { error } = await supabase.from('company_policies').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create policy');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'company_policy_created',
        module: 'documents',
        new_values: { title: data.title },
      });

      toast.success('Policy created');
    }

    reset();
    setEditPolicy(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('company_policies').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete policy');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'company_policy_deleted',
        module: 'documents',
        record_id: deleteId,
      });
      toast.success('Policy deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('company_policies')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'company_policy_status_updated',
        module: 'documents',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Title', 'Category', 'Description', 'Effective Date', 'Expiry Date', 'Version', 'Approved By', 'Status', 'Branch'];
    const rows = policies.map(p => [
      p.title,
      p.category || '',
      p.description || '',
      p.effective_date || '',
      p.expiry_date || '',
      p.version || '',
      p.approved_by_profile ? `${p.approved_by_profile.first_name} ${p.approved_by_profile.last_name}` : '',
      p.status,
      p.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company_policies.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.title}</p>
            {row.version && <p className="text-xs text-gray-400">v{row.version}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.category || '—'}</span>,
    },
    {
      key: 'effective_date',
      header: 'Effective',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{row.effective_date || '—'}</span>
        </div>
      ),
    },
    {
      key: 'expiry_date',
      header: 'Expiry',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{row.expiry_date || '—'}</span>
        </div>
      ),
    },
    {
      key: 'approved_by',
      header: 'Approved By',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <User className="h-3 w-3" />
          <span>{row.approved_by_profile ? `${row.approved_by_profile.first_name} ${row.approved_by_profile.last_name}` : '—'}</span>
        </div>
      ),
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
            {row.status === 'active' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'archived')}>
                <FileText className="h-4 w-4 mr-2" />Archive
              </DropdownMenuItem>
            )}
            {row.status === 'archived' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'active')}>
                <FileText className="h-4 w-4 mr-2" />Activate
              </DropdownMenuItem>
            )}
            <Can resource="documents.company_policies" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = policies.filter(p => p.status === 'active').length;
  const archived = policies.filter(p => p.status === 'archived').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Policies"
        description="Manage company policies and procedures"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Documents' }, { label: 'Company Policies' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="documents.company_policies" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditPolicy(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Policy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editPolicy ? 'Edit Policy' : 'Add Company Policy'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Title *</Label>
                      <Input className="mt-1" {...register('title')} />
                      {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input className="mt-1" {...register('category')} placeholder="e.g., HR, IT, Finance" />
                    </div>
                    <div>
                      <Label>Version</Label>
                      <Input className="mt-1" {...register('version')} placeholder="e.g., 1.0" />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea className="mt-1" rows={2} {...register('description')} />
                    </div>
                    <div>
                      <Label>Effective Date</Label>
                      <Input className="mt-1" type="date" {...register('effective_date')} />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <Input className="mt-1" type="date" {...register('expiry_date')} />
                    </div>
                    <div>
                      <Label>Approved By</Label>
                      <Controller name="approved_by" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select approver" /></SelectTrigger>
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
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditPolicy(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editPolicy ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Policies" value={policies.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<FileText className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Archived" value={archived} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
      </div>

      <DataTable
        data={policies}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search policies..."
        searchKeys={['title', 'category', 'description']}
        pageSize={15}
        emptyTitle="No policies"
        emptyDescription="Add company policies to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Policy?"
        description="This will permanently delete the policy."
        confirmLabel="Delete"
      />
    </div>
  );
}
