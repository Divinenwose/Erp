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
import { Building2, Plus, Edit, Trash2, Star, Mail, Phone, Globe, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.enum(['agency', 'freelancer', 'media', 'printing', 'event', 'software', 'other']),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  services_offered: z.string().optional(),
  notes: z.string().optional(),
});
type VendorForm = z.infer<typeof vendorSchema>;

export default function MarketingVendorsPage() {
  const { company, user: currentUser } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, agencies: 0, freelancers: 0, avgRating: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { vendor_type: 'agency' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('marketing_vendors')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading vendors:', error);
      toast.error('Failed to load vendors');
    }
    setVendors(data ?? []);

    // Calculate stats
    const active = data?.filter(v => v.status === 'active').length || 0;
    const agencies = data?.filter(v => v.vendor_type === 'agency').length || 0;
    const freelancers = data?.filter(v => v.vendor_type === 'freelancer').length || 0;
    const avgRating = data?.reduce((sum, v) => sum + (v.rating || 0), 0) / (data?.length || 1) || 0;
    setStats({ active, agencies, freelancers, avgRating });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (vendor: any) => {
    setEditVendor(vendor);
    reset({
      vendor_name: vendor.vendor_name,
      vendor_type: vendor.vendor_type,
      contact_person: vendor.contact_person ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      website: vendor.website ?? '',
      services_offered: vendor.services_offered?.join(', ') ?? '',
      notes: vendor.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: VendorForm) => {
    if (!company?.id) return;

    const servicesOffered = data.services_offered ? data.services_offered.split(',').map(s => s.trim()).filter(s => s) : [];

    if (editVendor) {
      const { error } = await supabase
        .from('marketing_vendors')
        .update({
          vendor_name: data.vendor_name,
          vendor_type: data.vendor_type,
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
          address: data.address,
          website: data.website,
          services_offered: servicesOffered,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editVendor.id);

      if (error) {
        toast.error('Failed to update vendor');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_vendor_updated',
        module: 'marketing',
        record_id: editVendor.id,
        new_values: { vendor_name: data.vendor_name },
      });

      toast.success('Vendor updated');
    } else {
      const { error } = await supabase.from('marketing_vendors').insert({
        company_id: company.id,
        vendor_name: data.vendor_name,
        vendor_type: data.vendor_type,
        contact_person: data.contact_person,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        services_offered: servicesOffered,
        notes: data.notes,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create vendor');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_vendor_created',
        module: 'marketing',
        new_values: { vendor_name: data.vendor_name },
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

    const { error } = await supabase
      .from('marketing_vendors')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete vendor');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_vendor_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Vendor deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('marketing_vendors')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_vendor_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'vendor_name', header: 'Vendor Name' },
    { 
      key: 'vendor_type',
      header: 'Type', 
      cell: (row) => <Badge variant="outline">{row.vendor_type}</Badge>
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'contact_person',
      header: 'Contact', 
      cell: (row) => row.contact_person || '-'
    },
    { 
      key: 'email',
      header: 'Email', 
      cell: (row) => row.email ? (
        <a href={`mailto:${row.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
          <Mail className="h-3 w-3" /> {row.email}
        </a>
      ) : '-'
    },
    { 
      key: 'phone',
      header: 'Phone', 
      cell: (row) => row.phone || '-'
    },
    { 
      key: 'rating',
      header: 'Rating', 
      cell: (row) => row.rating ? (
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="ml-1">{row.rating}</span>
        </div>
      ) : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can do="marketing.vendors.edit">
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
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'inactive')}>
                  <X className="h-4 w-4 mr-2" /> Deactivate
                </DropdownMenuItem>
              )}
              {row.status === 'inactive' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                  <Star className="h-4 w-4 mr-2" /> Activate
                </DropdownMenuItem>
              )}
              <Can do="marketing.vendors.delete">
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
      <PageHeader title="Marketing Vendors" description="Manage marketing vendors and service providers" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Vendors' }]}>
        <Can do="marketing.vendors.create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditVendor(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editVendor ? 'Edit Vendor' : 'New Vendor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Vendor Name *</Label>
                  <Input {...register('vendor_name')} placeholder="Enter vendor name" />
                  {errors.vendor_name && <p className="text-red-500 text-sm mt-1">{errors.vendor_name.message}</p>}
                </div>
                <div>
                  <Label>Vendor Type *</Label>
                  <Controller
                    name="vendor_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agency">Agency</SelectItem>
                          <SelectItem value="freelancer">Freelancer</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="printing">Printing</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    <Input {...register('contact_person')} placeholder="Name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" {...register('email')} placeholder="email@example.com" />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input {...register('phone')} placeholder="+1 234 567 890" />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input {...register('website')} placeholder="https://..." />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea {...register('address')} placeholder="Full address" rows={2} />
                </div>
                <div>
                  <Label>Services Offered (comma-separated)</Label>
                  <Input {...register('services_offered')} placeholder="Social media, SEO, Content, etc." />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editVendor ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Vendors" value={stats.active} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Agencies" value={stats.agencies} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Freelancers" value={stats.freelancers} icon={<Star className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Avg Rating" value={stats.avgRating.toFixed(1)} icon={<Star className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
