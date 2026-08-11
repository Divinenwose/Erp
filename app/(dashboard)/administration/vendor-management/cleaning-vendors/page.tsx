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
import { Building2, Plus, Edit, Trash2, Phone, Mail, MapPin, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const vendorSchema = z.object({
  name: z.string().min(1, 'Required'),
  contact_person: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  service_type: z.string().optional(),
  contract_start: z.string().optional(),
  contract_end: z.string().optional(),
  monthly_cost: z.string().optional(),
  branch_id: z.string().optional(),
  rating: z.string().optional(),
  notes: z.string().optional(),
});
type VendorForm = z.infer<typeof vendorSchema>;

export default function CleaningVendorsPage() {
  const { company, user: currentUser } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [vendRes, branchRes] = await Promise.all([
      supabase
        .from('cleaning_vendors')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('name'),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setVendors(vendRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (vendor: any) => {
    setEditVendor(vendor);
    reset({
      name: vendor.name,
      contact_person: vendor.contact_person ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      service_type: vendor.service_type ?? '',
      contract_start: vendor.contract_start ?? '',
      contract_end: vendor.contract_end ?? '',
      monthly_cost: vendor.monthly_cost?.toString() ?? '',
      branch_id: vendor.branch_id ?? undefined,
      rating: vendor.rating?.toString() ?? '',
      notes: vendor.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: VendorForm) => {
    if (!company?.id) return;

    const payload = {
      name: data.name,
      contact_person: data.contact_person,
      email: data.email || null,
      phone: data.phone,
      address: data.address,
      service_type: data.service_type,
      contract_start: data.contract_start || null,
      contract_end: data.contract_end || null,
      monthly_cost: data.monthly_cost ? parseFloat(data.monthly_cost) : null,
      branch_id: data.branch_id,
      rating: data.rating ? parseInt(data.rating) : null,
      notes: data.notes,
    };

    if (editVendor) {
      const { error } = await supabase
        .from('cleaning_vendors')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editVendor.id);

      if (error) {
        toast.error('Failed to update vendor');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_vendor_updated',
        module: 'vendor_management',
        record_id: editVendor.id,
        new_values: { name: data.name },
      });

      toast.success('Vendor updated');
    } else {
      const { error } = await supabase.from('cleaning_vendors').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create vendor');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_vendor_created',
        module: 'vendor_management',
        new_values: { name: data.name },
      });

      toast.success('Vendor created');
    }

    reset();
    setEditVendor(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('cleaning_vendors').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete vendor');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_vendor_deleted',
        module: 'vendor_management',
        record_id: deleteId,
      });
      toast.success('Vendor deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('cleaning_vendors')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'cleaning_vendor_status_updated',
        module: 'vendor_management',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Service Type', 'Contract Start', 'Contract End', 'Monthly Cost', 'Status', 'Branch'];
    const rows = vendors.map(v => [
      v.name,
      v.contact_person || '',
      v.email || '',
      v.phone || '',
      v.address || '',
      v.service_type || '',
      v.contract_start || '',
      v.contract_end || '',
      v.monthly_cost || '',
      v.status,
      v.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaning_vendors.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Vendor',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.contact_person && <p className="text-xs text-gray-400">{row.contact_person}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
          {row.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{row.email}</span>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'service_type',
      header: 'Service Type',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.service_type || '—'}</span>,
    },
    {
      key: 'contract_end',
      header: 'Contract End',
      sortable: true,
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.contract_end || '—'}</span>,
    },
    {
      key: 'monthly_cost',
      header: 'Monthly Cost',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <DollarSign className="h-3 w-3" />
          <span>{row.monthly_cost ? row.monthly_cost.toFixed(2) : '—'}</span>
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
          <MapPin className="h-3 w-3" />
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
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'inactive')}>
                <Building2 className="h-4 w-4 mr-2" />Deactivate
              </DropdownMenuItem>
            )}
            {row.status === 'inactive' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'active')}>
                <Building2 className="h-4 w-4 mr-2" />Activate
              </DropdownMenuItem>
            )}
            <Can resource="vendor_management.cleaning" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = vendors.filter(v => v.status === 'active').length;
  const totalMonthlyCost = vendors.reduce((sum, v) => sum + (v.monthly_cost || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cleaning Vendors"
        description="Manage cleaning service vendors"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Vendor Management' }, { label: 'Cleaning Vendors' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="vendor_management.cleaning" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditVendor(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editVendor ? 'Edit Vendor' : 'Add Cleaning Vendor'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Company Name *</Label>
                      <Input className="mt-1" {...register('name')} />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label>Contact Person</Label>
                      <Input className="mt-1" {...register('contact_person')} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input className="mt-1" type="email" {...register('email')} />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input className="mt-1" {...register('phone')} />
                    </div>
                    <div>
                      <Label>Service Type</Label>
                      <Input className="mt-1" {...register('service_type')} placeholder="e.g., Daily cleaning" />
                    </div>
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Input className="mt-1" {...register('address')} />
                    </div>
                    <div>
                      <Label>Contract Start</Label>
                      <Input className="mt-1" type="date" {...register('contract_start')} />
                    </div>
                    <div>
                      <Label>Contract End</Label>
                      <Input className="mt-1" type="date" {...register('contract_end')} />
                    </div>
                    <div>
                      <Label>Monthly Cost</Label>
                      <Input className="mt-1" type="number" step="0.01" {...register('monthly_cost')} />
                    </div>
                    <div>
                      <Label>Rating (1-5)</Label>
                      <Controller name="rating" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select rating" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 - Excellent</SelectItem>
                            <SelectItem value="4">4 - Good</SelectItem>
                            <SelectItem value="3">3 - Average</SelectItem>
                            <SelectItem value="2">2 - Fair</SelectItem>
                            <SelectItem value="1">1 - Poor</SelectItem>
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
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditVendor(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editVendor ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Vendors" value={vendors.length} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Monthly Cost" value={`$${totalMonthlyCost.toFixed(2)}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        data={vendors}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search vendors..."
        searchKeys={['name', 'contact_person', 'email', 'phone']}
        pageSize={15}
        emptyTitle="No vendors"
        emptyDescription="Add cleaning vendors to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Vendor?"
        description="This will permanently delete the vendor."
        confirmLabel="Delete"
      />
    </div>
  );
}
