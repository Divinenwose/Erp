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
import { Video, Plus, Edit, Trash2, Archive, Image, FileText, Music } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const assetSchema = z.object({
  asset_name: z.string().min(1, 'Asset name is required'),
  asset_type: z.enum(['image', 'video', 'audio', 'document', 'graphic', 'logo', 'template', 'other']),
  category: z.enum(['photography', 'videography', 'graphics', 'documents', 'templates', 'brand_assets', 'other']).optional(),
  file_url: z.string().min(1, 'File URL is required'),
  thumbnail_url: z.string().optional(),
  file_size: z.string().optional(),
  file_format: z.string().optional(),
  dimensions: z.string().optional(),
  duration_seconds: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
  copyright_info: z.string().optional(),
  license_type: z.enum(['owned', 'licensed', 'royalty_free', 'creative_commons', 'public_domain', 'custom']).optional(),
  license_expiry: z.string().optional(),
  usage_restrictions: z.string().optional(),
});
type AssetForm = z.infer<typeof assetSchema>;

export default function MediaAssetsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.assets.create');
  const canEdit = isAdmin || hasPermission('media.assets.edit');
  const canDelete = isAdmin || hasPermission('media.assets.delete');
  const canArchive = isAdmin || hasPermission('media.assets.archive');

  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [stats, setStats] = useState({ total: 0, images: 0, videos: 0, audio: 0, documents: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<AssetForm>({
    resolver: zodResolver(assetSchema),
    defaultValues: { asset_type: 'image', category: 'photography' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('media_assets')
      .select('*, uploaded_by_profile:profiles!media_assets_uploaded_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load assets');
    }
    setAssets(data ?? []);

    const total = data?.length || 0;
    const images = data?.filter(a => a.asset_type === 'image').length || 0;
    const videos = data?.filter(a => a.asset_type === 'video').length || 0;
    const audio = data?.filter(a => a.asset_type === 'audio').length || 0;
    const documents = data?.filter(a => a.asset_type === 'document').length || 0;
    setStats({ total, images, videos, audio, documents });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditAsset(item);
    reset({
      asset_name: item.asset_name,
      asset_type: item.asset_type,
      category: item.category ?? '',
      file_url: item.file_url,
      thumbnail_url: item.thumbnail_url ?? '',
      file_size: item.file_size?.toString() ?? '',
      file_format: item.file_format ?? '',
      dimensions: item.dimensions ?? '',
      duration_seconds: item.duration_seconds?.toString() ?? '',
      description: item.description ?? '',
      tags: item.tags?.join(', ') ?? '',
      copyright_info: item.copyright_info ?? '',
      license_type: item.license_type ?? 'owned',
      license_expiry: item.license_expiry ? item.license_expiry.slice(0, 10) : '',
      usage_restrictions: item.usage_restrictions ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: AssetForm) => {
    if (!company?.id || !currentUser?.id) return;

    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const assetNumber = `MA-${Date.now()}`;

    if (editAsset) {
      const { error } = await supabase
        .from('media_assets')
        .update({
          asset_name: data.asset_name,
          asset_type: data.asset_type,
          category: data.category,
          file_url: data.file_url,
          thumbnail_url: data.thumbnail_url,
          file_size: data.file_size ? parseInt(data.file_size) : null,
          file_format: data.file_format,
          dimensions: data.dimensions,
          duration_seconds: data.duration_seconds ? parseInt(data.duration_seconds) : null,
          description: data.description,
          tags,
          copyright_info: data.copyright_info,
          license_type: data.license_type,
          license_expiry: data.license_expiry || null,
          usage_restrictions: data.usage_restrictions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editAsset.id);

      if (error) {
        toast.error('Failed to update asset');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_assets',
        record_id: editAsset.id,
        new_value: { asset_name: data.asset_name },
      });

      toast.success('Asset updated');
    } else {
      const { error } = await supabase.from('media_assets').insert({
        company_id: company.id,
        asset_number: assetNumber,
        asset_name: data.asset_name,
        asset_type: data.asset_type,
        category: data.category,
        file_url: data.file_url,
        thumbnail_url: data.thumbnail_url,
        file_size: data.file_size ? parseInt(data.file_size) : null,
        file_format: data.file_format,
        dimensions: data.dimensions,
        duration_seconds: data.duration_seconds ? parseInt(data.duration_seconds) : null,
        description: data.description,
        tags,
        copyright_info: data.copyright_info,
        license_type: data.license_type,
        license_expiry: data.license_expiry || null,
        usage_restrictions: data.usage_restrictions,
        uploaded_by: currentUser.id,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create asset');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_assets',
        new_value: { asset_name: data.asset_name, asset_number: assetNumber },
      });

      toast.success('Asset created');
    }

    reset();
    setEditAsset(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete asset');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_assets',
        record_id: deleteId,
      });
      toast.success('Asset deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const handleArchive = async () => {
    if (!archiveId || !company?.id || !currentUser?.id) return;
    setArchiving(true);

    const { error } = await supabase
      .from('media_assets')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', archiveId);

    if (error) {
      toast.error('Failed to archive asset');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'archived',
        module: 'media',
        entity_type: 'media_assets',
        record_id: archiveId,
      });
      toast.success('Asset archived');
    }

    setArchiveId(null);
    setArchiving(false);
    load();
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const columns: Column[] = [
    { key: 'asset_number', header: 'Number' },
    { key: 'asset_name', header: 'Asset Name' },
    { 
      key: 'asset_type',
      header: 'Type', 
      cell: (row) => <div className="flex items-center gap-2">{getAssetIcon(row.asset_type)} {row.asset_type}</div>
    },
    { 
      key: 'category',
      header: 'Category', 
      cell: (row) => row.category || '-'
    },
    { 
      key: 'file_format',
      header: 'Format', 
      cell: (row) => row.file_format || '-'
    },
    { 
      key: 'file_size',
      header: 'Size', 
      cell: (row) => row.file_size ? `${(row.file_size / 1024 / 1024).toFixed(2)} MB` : '-'
    },
    { 
      key: 'license_type',
      header: 'License', 
      cell: (row) => row.license_type?.replace('_', ' ') || '-'
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
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
            {row.status !== 'archived' && canArchive && (
              <DropdownMenuItem onClick={() => setArchiveId(row.id)}>
                <Archive className="h-4 w-4 mr-2" /> Archive
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
      <PageHeader title="Media Assets" description="Manage media library and file assets" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Assets' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditAsset(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editAsset ? 'Edit Asset' : 'New Asset'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Asset Name *</Label>
                  <Input {...register('asset_name')} placeholder="Asset name" />
                  {errors.asset_name && <p className="text-red-500 text-sm mt-1">{errors.asset_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="audio">Audio</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="graphic">Graphic</SelectItem>
                            <SelectItem value="logo">Logo</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="photography">Photography</SelectItem>
                            <SelectItem value="videography">Videography</SelectItem>
                            <SelectItem value="graphics">Graphics</SelectItem>
                            <SelectItem value="documents">Documents</SelectItem>
                            <SelectItem value="templates">Templates</SelectItem>
                            <SelectItem value="brand_assets">Brand Assets</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>File URL *</Label>
                  <Input {...register('file_url')} placeholder="https://..." />
                  {errors.file_url && <p className="text-red-500 text-sm mt-1">{errors.file_url.message}</p>}
                </div>
                <div>
                  <Label>Thumbnail URL</Label>
                  <Input {...register('thumbnail_url')} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>File Size (bytes)</Label>
                    <Input {...register('file_size')} type="number" placeholder="Size in bytes" />
                  </div>
                  <div>
                    <Label>File Format</Label>
                    <Input {...register('file_format')} placeholder="jpg, mp4, etc." />
                  </div>
                  <div>
                    <Label>Dimensions</Label>
                    <Input {...register('dimensions')} placeholder="1920x1080" />
                  </div>
                </div>
                <div>
                  <Label>Duration (seconds)</Label>
                  <Input {...register('duration_seconds')} type="number" placeholder="For video/audio" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Asset description" rows={2} />
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input {...register('tags')} placeholder="tag1, tag2, ..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Copyright Info</Label>
                    <Input {...register('copyright_info')} placeholder="Copyright holder" />
                  </div>
                  <div>
                    <Label>License Type</Label>
                    <Controller
                      name="license_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select license" />
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>License Expiry</Label>
                    <Input type="date" {...register('license_expiry')} />
                  </div>
                  <div>
                    <Label>Usage Restrictions</Label>
                    <Input {...register('usage_restrictions')} placeholder="Any restrictions" />
                  </div>
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
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Total Assets" value={stats.total} icon={<Video className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Images" value={stats.images} icon={<Image className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Videos" value={stats.videos} icon={<Video className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Audio" value={stats.audio} icon={<Music className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
        <KPICard title="Documents" value={stats.documents} icon={<FileText className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={assets}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This action cannot be undone."
        loading={deleting}
      />

      <ConfirmDialog
        open={archiveId !== null}
        onClose={() => setArchiveId(null)}
        onConfirm={handleArchive}
        title="Archive Asset"
        description="Are you sure you want to archive this asset?"
        loading={archiving}
      />
    </div>
  );
}
