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
import { Palette, Plus, Edit, Trash2, Image, FileText, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const brandAssetSchema = z.object({
  asset_name: z.string().min(1, 'Asset name is required'),
  asset_type: z.enum(['logo', 'color_palette', 'typography', 'guidelines', 'templates', 'images', 'videos', 'other']),
  description: z.string().optional(),
  asset_url: z.string().optional(),
  version: z.string().optional(),
  usage_guidelines: z.string().optional(),
});
type BrandAssetForm = z.infer<typeof brandAssetSchema>;

export default function BrandManagementPage() {
  const { company, user: currentUser } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, logos: 0, templates: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<BrandAssetForm>({
    resolver: zodResolver(brandAssetSchema),
    defaultValues: { asset_type: 'logo' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('brand_assets')
      .select('*, created_by_profile:profiles!brand_assets_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading brand assets:', error);
      toast.error('Failed to load brand assets');
    }
    setAssets(data ?? []);

    // Calculate stats
    const total = data?.length || 0;
    const active = data?.filter(a => a.status === 'active').length || 0;
    const logos = data?.filter(a => a.asset_type === 'logo').length || 0;
    const templates = data?.filter(a => a.asset_type === 'templates').length || 0;
    setStats({ total, active, logos, templates });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (asset: any) => {
    setEditAsset(asset);
    reset({
      asset_name: asset.asset_name,
      asset_type: asset.asset_type,
      description: asset.description ?? '',
      asset_url: asset.asset_url ?? '',
      version: asset.version ?? '',
      usage_guidelines: asset.usage_guidelines ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: BrandAssetForm) => {
    if (!company?.id) return;

    if (editAsset) {
      const { error } = await supabase
        .from('brand_assets')
        .update({
          asset_name: data.asset_name,
          asset_type: data.asset_type,
          description: data.description,
          asset_url: data.asset_url,
          version: data.version,
          usage_guidelines: data.usage_guidelines,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editAsset.id);

      if (error) {
        toast.error('Failed to update asset');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'brand_asset_updated',
        module: 'marketing',
        record_id: editAsset.id,
        new_values: { asset_name: data.asset_name },
      });

      toast.success('Asset updated');
    } else {
      const { error } = await supabase.from('brand_assets').insert({
        company_id: company.id,
        asset_name: data.asset_name,
        asset_type: data.asset_type,
        description: data.description,
        asset_url: data.asset_url,
        version: data.version,
        usage_guidelines: data.usage_guidelines,
        created_by: currentUser?.id,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create asset');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'brand_asset_created',
        module: 'marketing',
        new_values: { asset_name: data.asset_name },
      });

      toast.success('Asset created');
    }

    reset();
    setEditAsset(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('brand_assets')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete asset');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'brand_asset_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Asset deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('brand_assets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'brand_asset_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { header: 'Asset Name', accessor: 'asset_name' },
    { 
      header: 'Type', 
      accessor: (row) => <Badge variant="outline">{row.asset_type?.replace('_', ' ')}</Badge>
    },
    { 
      header: 'Status', 
      accessor: (row) => <StatusBadge status={row.status} />
    },
    { 
      header: 'Version', 
      accessor: (row) => row.version || '-'
    },
    { 
      header: 'Asset URL', 
      accessor: (row) => row.asset_url ? (
        <a href={row.asset_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          View Asset
        </a>
      ) : '-'
    },
    { 
      header: 'Created By', 
      accessor: (row) => row.created_by_profile 
        ? `${row.created_by_profile.first_name} ${row.created_by_profile.last_name}` 
        : '-'
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Can do="marketing.brand.edit">
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
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'archived')}>
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </DropdownMenuItem>
              )}
              {row.status === 'archived' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                  <Palette className="h-4 w-4 mr-2" /> Restore
                </DropdownMenuItem>
              )}
              <Can do="marketing.brand.delete">
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
      <PageHeader title="Brand Assets" description="Manage brand assets and guidelines" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Brand Assets' }]}>
        <Can do="marketing.brand.create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditAsset(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editAsset ? 'Edit Asset' : 'New Asset'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Asset Name *</Label>
                  <Input {...register('asset_name')} placeholder="Asset name" />
                  {errors.asset_name && <p className="text-red-500 text-sm mt-1">{errors.asset_name.message}</p>}
                </div>
                <div>
                  <Label>Asset Type *</Label>
                  <Controller
                    name="asset_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="logo">Logo</SelectItem>
                          <SelectItem value="color_palette">Color Palette</SelectItem>
                          <SelectItem value="typography">Typography</SelectItem>
                          <SelectItem value="guidelines">Guidelines</SelectItem>
                          <SelectItem value="templates">Templates</SelectItem>
                          <SelectItem value="images">Images</SelectItem>
                          <SelectItem value="videos">Videos</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Asset description" rows={2} />
                </div>
                <div>
                  <Label>Asset URL</Label>
                  <Input {...register('asset_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input {...register('version')} placeholder="1.0" />
                </div>
                <div>
                  <Label>Usage Guidelines</Label>
                  <Textarea {...register('usage_guidelines')} placeholder="Usage instructions" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editAsset ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Assets" value={stats.total} icon={<Palette className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Assets" value={stats.active} icon={<Image className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Logos" value={stats.logos} icon={<Image className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Templates" value={stats.templates} icon={<FileText className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={assets}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Asset"
        description="Are you sure you want to delete this brand asset? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
