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
import { Palette, Plus, Edit, Trash2, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const brandGuidelineSchema = z.object({
  guideline_name: z.string().min(1, 'Guideline name is required'),
  category: z.enum(['voice', 'visual', 'messaging', 'positioning', 'media_tone', 'crisis_communication', 'other']),
  content: z.string().min(1, 'Content is required'),
  version: z.string().optional(),
  effective_date: z.string().optional(),
});
type BrandGuidelineForm = z.infer<typeof brandGuidelineSchema>;

export default function MediaBrandPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.brand.create');
  const canEdit = isAdmin || hasPermission('media.brand.edit');
  const canDelete = isAdmin || hasPermission('media.brand.delete');

  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGuideline, setEditGuideline] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, draft: 0, archived: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<BrandGuidelineForm>({
    resolver: zodResolver(brandGuidelineSchema),
    defaultValues: { category: 'voice' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('media_brand_guidelines')
      .select('*, created_by_profile:profiles!media_brand_guidelines_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading guidelines:', error);
      toast.error('Failed to load guidelines');
    }
    setGuidelines(data ?? []);

    const active = data?.filter(g => g.status === 'active').length || 0;
    const draft = data?.filter(g => g.status === 'draft').length || 0;
    const archived = data?.filter(g => g.status === 'archived').length || 0;
    setStats({ active, draft, archived });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditGuideline(item);
    reset({
      guideline_name: item.guideline_name,
      category: item.category,
      content: item.content,
      version: item.version ?? '',
      effective_date: item.effective_date ? item.effective_date.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: BrandGuidelineForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editGuideline) {
      const { error } = await supabase
        .from('media_brand_guidelines')
        .update({
          guideline_name: data.guideline_name,
          category: data.category,
          content: data.content,
          version: data.version,
          effective_date: data.effective_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editGuideline.id);

      if (error) {
        toast.error('Failed to update guideline');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_brand_guidelines',
        record_id: editGuideline.id,
        new_value: { guideline_name: data.guideline_name },
      });

      toast.success('Guideline updated');
    } else {
      const { error } = await supabase.from('media_brand_guidelines').insert({
        company_id: company.id,
        guideline_name: data.guideline_name,
        category: data.category,
        content: data.content,
        version: data.version,
        effective_date: data.effective_date || null,
        created_by: currentUser.id,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create guideline');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_brand_guidelines',
        new_value: { guideline_name: data.guideline_name },
      });

      toast.success('Guideline created');
    }

    reset();
    setEditGuideline(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_brand_guidelines')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete guideline');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_brand_guidelines',
        record_id: deleteId,
      });
      toast.success('Guideline deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const columns: Column[] = [
    { key: 'guideline_name', header: 'Guideline Name' },
    { 
      key: 'category',
      header: 'Category', 
      cell: (row) => row.category?.replace('_', ' ') || '-'
    },
    { 
      key: 'version',
      header: 'Version', 
      cell: (row) => row.version || '-'
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'effective_date',
      header: 'Effective Date', 
      cell: (row) => row.effective_date ? format(new Date(row.effective_date), 'MMM dd, yyyy') : '-'
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
      <PageHeader title="Brand & Messaging" description="Manage brand guidelines and messaging" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Brand' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditGuideline(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Guideline
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editGuideline ? 'Edit Guideline' : 'New Guideline'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Guideline Name *</Label>
                  <Input {...register('guideline_name')} placeholder="Guideline name" />
                  {errors.guideline_name && <p className="text-red-500 text-sm mt-1">{errors.guideline_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="voice">Voice</SelectItem>
                            <SelectItem value="visual">Visual</SelectItem>
                            <SelectItem value="messaging">Messaging</SelectItem>
                            <SelectItem value="positioning">Positioning</SelectItem>
                            <SelectItem value="media_tone">Media Tone</SelectItem>
                            <SelectItem value="crisis_communication">Crisis Communication</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Version</Label>
                    <Input {...register('version')} placeholder="1.0" />
                  </div>
                </div>
                <div>
                  <Label>Effective Date</Label>
                  <Input type="date" {...register('effective_date')} />
                </div>
                <div>
                  <Label>Content *</Label>
                  <Textarea {...register('content')} placeholder="Guideline content" rows={8} />
                  {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editGuideline ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Active" value={stats.active} icon={<Palette className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Draft" value={stats.draft} icon={<Palette className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-950/50" loading={loading} />
        <KPICard title="Archived" value={stats.archived} icon={<Archive className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={guidelines}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Guideline"
        description="Are you sure you want to delete this guideline?"
        loading={deleting}
      />
    </div>
  );
}
