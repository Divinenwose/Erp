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
import { Shield, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const copyrightSchema = z.object({
  license_type: z.enum(['owned', 'licensed', 'royalty_free', 'creative_commons', 'public_domain', 'custom']),
  licensor: z.string().optional(),
  license_date: z.string().optional(),
  expiry_date: z.string().optional(),
  usage_rights: z.string().optional(),
  restrictions: z.string().optional(),
  cost: z.string().optional(),
  compliance_notes: z.string().optional(),
});
type CopyrightForm = z.infer<typeof copyrightSchema>;

export default function MediaCopyrightPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.copyright.create');
  const canEdit = isAdmin || hasPermission('media.copyright.edit');
  const canDelete = isAdmin || hasPermission('media.copyright.delete');

  const [licenses, setLicenses] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLicense, setEditLicense] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, expired: 0, expiringSoon: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CopyrightForm>({
    resolver: zodResolver(copyrightSchema),
    defaultValues: { license_type: 'owned' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [licensesRes, assetsRes, contentRes] = await Promise.all([
      supabase
        .from('copyright_licenses')
        .select('*, media_assets(asset_name), media_content(title)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('media_assets').select('id, asset_name').eq('company_id', company.id).eq('status', 'active'),
      supabase.from('media_content').select('id, title').eq('company_id', company.id).eq('status', 'published'),
    ]);

    if (licensesRes.error) {
      console.error('Error loading licenses:', licensesRes.error);
      toast.error('Failed to load licenses');
    }
    setLicenses(licensesRes.data ?? []);
    setAssets(assetsRes.data ?? []);
    setContent(contentRes.data ?? []);

    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const active = licensesRes.data?.filter(l => l.status === 'active').length || 0;
    const expired = licensesRes.data?.filter(l => l.status === 'expired').length || 0;
    const expiringSoon = licensesRes.data?.filter(l => 
      l.status === 'active' && l.expiry_date && new Date(l.expiry_date) <= thirtyDays
    ).length || 0;
    setStats({ active, expired, expiringSoon });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditLicense(item);
    reset({
      license_type: item.license_type,
      licensor: item.licensor ?? '',
      license_date: item.license_date ? item.license_date.slice(0, 10) : '',
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      usage_rights: item.usage_rights?.join(', ') ?? '',
      restrictions: item.restrictions ?? '',
      cost: item.cost?.toString() ?? '',
      compliance_notes: item.compliance_notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CopyrightForm) => {
    if (!company?.id || !currentUser?.id) return;

    const usageRights = data.usage_rights ? data.usage_rights.split(',').map(r => r.trim()).filter(r => r) : [];
    const licenseNumber = `CL-${Date.now()}`;

    if (editLicense) {
      const { error } = await supabase
        .from('copyright_licenses')
        .update({
          license_type: data.license_type,
          licensor: data.licensor,
          license_date: data.license_date || null,
          expiry_date: data.expiry_date || null,
          usage_rights: usageRights,
          restrictions: data.restrictions,
          cost: data.cost ? parseFloat(data.cost) : null,
          compliance_notes: data.compliance_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editLicense.id);

      if (error) {
        toast.error('Failed to update license');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'copyright_licenses',
        record_id: editLicense.id,
      });

      toast.success('License updated');
    } else {
      const { error } = await supabase.from('copyright_licenses').insert({
        company_id: company.id,
        license_number: licenseNumber,
        license_type: data.license_type,
        licensor: data.licensor,
        license_date: data.license_date || null,
        expiry_date: data.expiry_date || null,
        usage_rights: usageRights,
        restrictions: data.restrictions,
        cost: data.cost ? parseFloat(data.cost) : null,
        compliance_notes: data.compliance_notes,
        created_by: currentUser.id,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create license');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'copyright_licenses',
        new_value: { license_number: licenseNumber },
      });

      toast.success('License created');
    }

    reset();
    setEditLicense(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('copyright_licenses')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete license');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'copyright_licenses',
        record_id: deleteId,
      });
      toast.success('License deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const columns: Column[] = [
    { key: 'license_number', header: 'Number' },
    { 
      key: 'license_type',
      header: 'Type', 
      cell: (row) => row.license_type?.replace('_', ' ') || '-'
    },
    { 
      key: 'licensor',
      header: 'Licensor', 
      cell: (row) => row.licensor || '-'
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'expiry_date',
      header: 'Expiry Date', 
      cell: (row) => row.expiry_date ? format(new Date(row.expiry_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'asset',
      header: 'Asset', 
      cell: (row) => row.media_assets?.asset_name || '-'
    },
    { 
      key: 'cost',
      header: 'Cost', 
      cell: (row) => row.cost ? `$${row.cost.toLocaleString()}` : '-'
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
      <PageHeader title="Copyright & Compliance" description="Manage copyright and licensing" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Copyright' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditLicense(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New License
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editLicense ? 'Edit License' : 'New License'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>License Type *</Label>
                    <Controller
                      name="license_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owned">Owned</SelectItem>
                            <SelectItem value="licensed">Licensed</SelectItem>
                            <SelectItem value="royalty_free">Royalty Free</SelectItem>
                            <SelectItem value="creative_commons">Creative Commons</SelectItem>
                            <SelectItem value="public_domain">Public Domain</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Cost</Label>
                    <Input {...register('cost')} type="number" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Licensor</Label>
                    <Input {...register('licensor')} placeholder="Copyright holder" />
                  </div>
                  <div>
                    <Label>License Date</Label>
                    <Input type="date" {...register('license_date')} />
                  </div>
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" {...register('expiry_date')} />
                </div>
                <div>
                  <Label>Usage Rights (comma-separated)</Label>
                  <Input {...register('usage_rights')} placeholder="commercial, editorial, ..." />
                </div>
                <div>
                  <Label>Restrictions</Label>
                  <Textarea {...register('restrictions')} placeholder="Any usage restrictions" rows={2} />
                </div>
                <div>
                  <Label>Compliance Notes</Label>
                  <Textarea {...register('compliance_notes')} placeholder="Compliance notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editLicense ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Active" value={stats.active} icon={<Shield className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Expired" value={stats.expired} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Expiring Soon" value={stats.expiringSoon} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={licenses}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete License"
        description="Are you sure you want to delete this license?"
        loading={deleting}
      />
    </div>
  );
}
