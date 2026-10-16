'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
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
import { Building2, Plus, Edit, Trash2, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.enum(['media_outlet', 'agency', 'freelancer', 'influencer', 'production_company', 'printing', 'other']),
  contact_person: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  services_offered: z.string().optional(),
  relationship_type: z.enum(['preferred', 'contract', 'one_time', 'other']),
  rating: z.string().optional(),
  notes: z.string().optional(),
});
type VendorForm = z.infer<typeof vendorSchema>;

export default function MediaVendorsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.vendors.create');
  const canEdit = isAdmin || hasPermission('media.vendors.edit');
  const canDelete = isAdmin || hasPermission('media.vendors.delete');

  const [vendors, setVendors] = useState<any[]>([]);
  const [procurementVendors, setProcurementVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, inactive: 0, avgRating: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: { vendor_type: 'agency', relationship_type: 'preferred' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [mediaVendorsRes, procurementVendorsRes] = await Promise.all([
      supabase
        .from('media_vendor_relationships')
        .select('*, procurement_vendor:vendors(id, vendor_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, vendor_name').eq('company_id', company.id).eq('status', 'active'),
    ]);

    if (mediaVendorsRes.error) {
      console.error('Error loading vendors:', mediaVendorsRes.error);
      toast.error('Failed to load vendors');
    }
    setVendors(mediaVendorsRes.data ?? []);
    setProcurementVendors(procurementVendorsRes.data ?? []);

    const active = mediaVendorsRes.data?.filter(v => v.status === 'active').length || 0;
    const inactive = mediaVendorsRes.data?.filter(v => v.status === 'inactive').length || 0;
    const avgRating = mediaVendorsRes.data?.length 
      ? mediaVendorsRes.data.reduce((sum, v) => sum + (v.rating || 0), 0) / mediaVendorsRes.data.length 
      : 0;
    setStats({ active, inactive, avgRating });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditVendor(item);
    reset({
      vendor_name: item.vendor_name || item.procurement_vendor?.vendor_name || '',
      vendor_type: item.vendor_type,
      contact_person: item.contact_person ?? '',
      email: item.email ?? '',
      phone: item.phone ?? '',
      address: item.address ?? '',
      website: item.website ?? '',
      services_offered: item.services_offered?.join(', ') ?? '',
      relationship_type: item.relationship_type,
      rating: item.rating?.toString() ?? '',
      notes: item.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: VendorForm) => {
    if (!company?.id || !currentUser?.id) return;

    const servicesOffered = data.services_offered ? data.services_offered.split(',').map(s => s.trim()).filter(s => s) : [];

    if (editVendor) {
      const { error } = await supabase
        .from('media_vendor_relationships')
        .update({
          vendor_name: data.vendor_name,
          vendor_type: data.vendor_type,
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
          address: data.address,
          website: data.website,
          services_offered: servicesOffered,
          relationship_type: data.relationship_type,
          rating: data.rating ? parseFloat(data.rating) : null,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editVendor.id);

      if (error) {
        toast.error('Failed to update vendor');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_vendor_relationships',
        record_id: editVendor.id,
        new_value: { vendor_name: data.vendor_name },
      });

      toast.success('Vendor updated');
    } else {
      const { error } = await supabase.from('media_vendor_relationships').insert({
        company_id: company.id,
        vendor_name: data.vendor_name,
        vendor_type: data.vendor_type,
        contact_person: data.contact_person,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        services_offered: servicesOffered,
        relationship_type: data.relationship_type,
        rating: data.rating ? parseFloat(data.rating) : null,
        notes: data.notes,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create vendor');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_vendor_relationships',
        new_value: { vendor_name: data.vendor_name },
      });

      toast.success('Vendor created');
    }

    reset();
    setEditVendor(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_vendor_relationships')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete vendor');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_vendor_relationships',
        record_id: deleteId,
      });
      toast.success('Vendor deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const columns: Column[] = [
    { key: 'vendor_name', header: 'Vendor Name' },
    { 
      key: 'vendor_type',
      header: 'Type', 
      cell: (row) => row.vendor_type?.replace('_', ' ') || '-'
    },
    { 
      key: 'relationship_type',
      header: 'Relationship', 
      cell: (row) => row.relationship_type?.replace('_', ' ') || '-'
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
      key: 'rating',
      header: 'Rating', 
      cell: (row) => row.rating != null ? (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span>{row.rating.toFixed(1)}</span>
        </div>
      ) : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {canEdit && (
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors & Partners" description="Manage media vendors and partnerships" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Vendors' }]}>
        {canCreate && (
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
                  <Input {...register('vendor_name')} placeholder="Vendor name" />
                  {errors.vendor_name && <p className="text-red-500 text-sm mt-1">{errors.vendor_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                            <SelectItem value="media_outlet">Media Outlet</SelectItem>
                            <SelectItem value="agency">Agency</SelectItem>
                            <SelectItem value="freelancer">Freelancer</SelectItem>
                            <SelectItem value="influencer">Influencer</SelectItem>
                            <SelectItem value="production_company">Production Company</SelectItem>
                            <SelectItem value="printing">Printing</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Relationship Type *</Label>
                    <Controller
                      name="relationship_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="preferred">Preferred</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="one_time">One-Time</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    <Input {...register('contact_person')} placeholder="Contact name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input {...register('email')} type="email" placeholder="email@example.com" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input {...register('phone')} placeholder="+1 234 567 890" />
                  </div>
                  <div>
                    <Label>Rating</Label>
                    <Input {...register('rating')} type="number" min="1" max="5" step="0.1" placeholder="1-5" />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input {...register('address')} placeholder="Street address" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input {...register('website')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Services Offered (comma-separated)</Label>
                  <Input {...register('services_offered')} placeholder="service1, service2, ..." />
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
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Active" value={stats.active} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Inactive" value={stats.inactive} icon={<Building2 className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="Avg Rating" value={stats.avgRating.toFixed(1)} icon={<Star className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor?"
        loading={deleting}
      />
    </div>
  );
}
