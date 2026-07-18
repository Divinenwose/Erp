'use client';

import { useState, useEffect } from 'react';
import { supabase, Branch } from '@/lib/supabase';
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
import { MapPin, Plus, Edit, Trash2, Phone, Globe, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const branchSchema = z.object({
  name: z.string().min(1, 'Required').min(2, 'Name must be at least 2 characters'),
  type: z.enum(['office', 'warehouse', 'hq', 'store']),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
});
type BranchForm = z.infer<typeof branchSchema>;

const typeLabels: Record<string, string> = {
  office: 'Office',
  warehouse: 'Warehouse',
  hq: 'Headquarters',
  store: 'Retail Store',
};

export default function BranchesPage() {
  const { company, user: currentUser } = useAuth();
  const [branches, setBranches] = useState<(Branch & { employee_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: { type: 'office' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [branchRes, empRes] = await Promise.all([
      supabase.from('branches').select('*').eq('company_id', company.id).order('name'),
      supabase.from('employees').select('branch_id').eq('company_id', company.id),
    ]);

    const branchesWithCounts = (branchRes.data ?? []).map((branch: Branch) => ({
      ...branch,
      employee_count: empRes.data?.filter((e: any) => e.branch_id === branch.id).length || 0,
    }));

    setBranches(branchesWithCounts);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (branch: Branch) => {
    setEditBranch(branch);
    reset({
      name: branch.name,
      type: branch.type,
      address: branch.address ?? '',
      city: branch.city ?? '',
      country: branch.country ?? '',
      phone: branch.phone ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: BranchForm) => {
    if (!company?.id) return;

    if (editBranch) {
      const { error } = await supabase
        .from('branches')
        .update({
          name: data.name,
          type: data.type,
          address: data.address,
          city: data.city,
          country: data.country,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editBranch.id);

      if (error) {
        toast.error('Failed to update branch');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'branch_updated',
        module: 'branches',
        record_id: editBranch.id,
        new_values: { name: data.name },
      });

      toast.success('Branch updated');
    } else {
      const { error } = await supabase.from('branches').insert({
        company_id: company.id,
        name: data.name,
        type: data.type,
        address: data.address,
        city: data.city,
        country: data.country,
        phone: data.phone,
      });

      if (error) {
        toast.error('Failed to create branch');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'branch_created',
        module: 'branches',
        new_values: { name: data.name },
      });

      toast.success('Branch created');
    }

    reset();
    setEditBranch(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('branches').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete branch');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'branch_deleted',
        module: 'branches',
        record_id: deleteId,
      });
      toast.success('Branch deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const columns: Column<(Branch & { employee_count?: number })>[] = [
    {
      key: 'name',
      header: 'Branch',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.city && <p className="text-xs text-gray-400">{row.city}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge variant="secondary" className="text-xs capitalize">
          {typeLabels[row.type] || row.type}
        </Badge>
      ),
    },
    {
      key: 'address',
      header: 'Location',
      cell: (row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <MapPin className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{row.address || '—'}</span>
          </div>
          {row.country && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-500 mt-0.5">
              <Globe className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{row.country}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Phone className="h-3 w-3" />
          <span>{row.phone || '—'}</span>
        </div>
      ),
    },
    {
      key: 'employee_count',
      header: 'Employees',
      sortable: true,
      cell: (row) => <span className="text-sm">{row.employee_count ?? 0}</span>,
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
            <Can resource="branches" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Manage company offices, branches, and warehouses"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Branches' }]}
      >
        <Can resource="branches" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditBranch(null); reset(); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editBranch ? 'Edit Branch' : 'Create Branch'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Branch Name *</Label>
                    <Input className="mt-1" {...register('name')} />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <Controller name="type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="hq">Headquarters</SelectItem>
                          <SelectItem value="store">Retail Store</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input className="mt-1" {...register('phone')} />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input className="mt-1" {...register('address')} placeholder="Street address" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input className="mt-1" {...register('city')} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input className="mt-1" {...register('country')} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditBranch(null); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editBranch ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Branches" value={branches.length} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Employees" value={branches.reduce((a, b) => a + (b.employee_count || 0), 0)} icon={<MapPin className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={branches}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search branches..."
        searchKeys={['name', 'address', 'city', 'country', 'phone']}
        pageSize={15}
        emptyTitle="No branches yet"
        emptyDescription="Add branches to manage your locations"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Branch?"
        description="This will permanently delete the branch. Any employees assigned to this branch will need to be reassigned."
        confirmLabel="Delete"
      />
    </div>
  );
}
