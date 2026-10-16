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
import { FileCheck, Plus, Edit, Trash2, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const documentSchema = z.object({
  document_name: z.string().min(1, 'Document name is required'),
  document_type: z.enum(['policy', 'brief', 'template', 'checklist', 'guideline', 'report', 'other']),
  category: z.enum(['brand', 'pr', 'social_media', 'advertising', 'crisis', 'internal', 'other']),
  description: z.string().optional(),
  document_url: z.string().optional(),
  version: z.string().optional(),
  effective_date: z.string().optional(),
  expiry_date: z.string().optional(),
  tags: z.string().optional(),
});
type DocumentForm = z.infer<typeof documentSchema>;

export default function MediaDocumentsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.documents.create');
  const canEdit = isAdmin || hasPermission('media.documents.edit');
  const canDelete = isAdmin || hasPermission('media.documents.delete');

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ policies: 0, templates: 0, checklists: 0, briefs: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<DocumentForm>({
    resolver: zodResolver(documentSchema),
    defaultValues: { document_type: 'policy', category: 'brand' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('media_documents')
      .select('*, created_by_profile:profiles!media_documents_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    }
    setDocuments(data ?? []);

    const policies = data?.filter(d => d.document_type === 'policy').length || 0;
    const templates = data?.filter(d => d.document_type === 'template').length || 0;
    const checklists = data?.filter(d => d.document_type === 'checklist').length || 0;
    const briefs = data?.filter(d => d.document_type === 'brief').length || 0;
    setStats({ policies, templates, checklists, briefs });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditDocument(item);
    reset({
      document_name: item.document_name,
      document_type: item.document_type,
      category: item.category,
      description: item.description ?? '',
      document_url: item.document_url ?? '',
      version: item.version ?? '',
      effective_date: item.effective_date ? item.effective_date.slice(0, 10) : '',
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      tags: item.tags?.join(', ') ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: DocumentForm) => {
    if (!company?.id || !currentUser?.id) return;

    const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const documentNumber = `MD-${Date.now()}`;

    if (editDocument) {
      const { error } = await supabase
        .from('media_documents')
        .update({
          document_name: data.document_name,
          document_type: data.document_type,
          category: data.category,
          description: data.description,
          document_url: data.document_url,
          version: data.version,
          effective_date: data.effective_date || null,
          expiry_date: data.expiry_date || null,
          tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editDocument.id);

      if (error) {
        toast.error('Failed to update document');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_documents',
        record_id: editDocument.id,
        new_value: { document_name: data.document_name },
      });

      toast.success('Document updated');
    } else {
      const { error } = await supabase.from('media_documents').insert({
        company_id: company.id,
        document_number: documentNumber,
        document_name: data.document_name,
        document_type: data.document_type,
        category: data.category,
        description: data.description,
        document_url: data.document_url,
        version: data.version,
        effective_date: data.effective_date || null,
        expiry_date: data.expiry_date || null,
        tags,
        created_by: currentUser.id,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create document');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_documents',
        new_value: { document_name: data.document_name, document_number: documentNumber },
      });

      toast.success('Document created');
    }

    reset();
    setEditDocument(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_documents')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete document');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_documents',
        record_id: deleteId,
      });
      toast.success('Document deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const columns: Column[] = [
    { key: 'document_number', header: 'Number' },
    { key: 'document_name', header: 'Document Name' },
    { 
      key: 'document_type',
      header: 'Type', 
      cell: (row) => row.document_type || '-'
    },
    { 
      key: 'category',
      header: 'Category', 
      cell: (row) => row.category || '-'
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
            {row.document_url && (
              <DropdownMenuItem onClick={() => window.open(row.document_url, '_blank')}>
                <Download className="h-4 w-4 mr-2" /> Download
              </DropdownMenuItem>
            )}
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
      <PageHeader title="Policies & Documents" description="Manage media policies, briefs, templates, and documents" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Documents' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditDocument(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editDocument ? 'Edit Document' : 'New Document'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Document Name *</Label>
                  <Input {...register('document_name')} placeholder="Document name" />
                  {errors.document_name && <p className="text-red-500 text-sm mt-1">{errors.document_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Document Type *</Label>
                    <Controller
                      name="document_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="policy">Policy</SelectItem>
                            <SelectItem value="brief">Brief</SelectItem>
                            <SelectItem value="template">Template</SelectItem>
                            <SelectItem value="checklist">Checklist</SelectItem>
                            <SelectItem value="guideline">Guideline</SelectItem>
                            <SelectItem value="report">Report</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
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
                            <SelectItem value="brand">Brand</SelectItem>
                            <SelectItem value="pr">PR</SelectItem>
                            <SelectItem value="social_media">Social Media</SelectItem>
                            <SelectItem value="advertising">Advertising</SelectItem>
                            <SelectItem value="crisis">Crisis</SelectItem>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Version</Label>
                    <Input {...register('version')} placeholder="1.0" />
                  </div>
                  <div>
                    <Label>Effective Date</Label>
                    <Input type="date" {...register('effective_date')} />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input type="date" {...register('expiry_date')} />
                  </div>
                </div>
                <div>
                  <Label>Document URL</Label>
                  <Input {...register('document_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Document description" rows={2} />
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input {...register('tags')} placeholder="tag1, tag2, ..." />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editDocument ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Policies" value={stats.policies} icon={<FileCheck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Templates" value={stats.templates} icon={<FileCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Checklists" value={stats.checklists} icon={<FileCheck className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Briefs" value={stats.briefs} icon={<FileCheck className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to delete this document?"
        loading={deleting}
      />
    </div>
  );
}
