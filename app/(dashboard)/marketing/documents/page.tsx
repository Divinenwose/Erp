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
import { FileCheck, Plus, Edit, Trash2, Download, FileText, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const documentSchema = z.object({
  document_name: z.string().min(1, 'Document name is required'),
  document_type: z.enum(['guideline', 'template', 'tracker', 'report', 'contract', 'presentation', 'other']),
  description: z.string().optional(),
  document_url: z.string().optional(),
  category: z.string().optional(),
  version: z.string().optional(),
});
type DocumentForm = z.infer<typeof documentSchema>;

export default function MarketingDocumentsPage() {
  const { company, user: currentUser } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, templates: 0, trackers: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<DocumentForm>({
    resolver: zodResolver(documentSchema),
    defaultValues: { document_type: 'template' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('marketing_documents')
      .select('*, created_by_profile:profiles!marketing_documents_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    }
    setDocuments(data ?? []);

    // Calculate stats
    const total = data?.length || 0;
    const active = data?.filter(d => d.status === 'active').length || 0;
    const templates = data?.filter(d => d.document_type === 'template').length || 0;
    const trackers = data?.filter(d => d.document_type === 'tracker').length || 0;
    setStats({ total, active, templates, trackers });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (document: any) => {
    setEditDocument(document);
    reset({
      document_name: document.document_name,
      document_type: document.document_type,
      description: document.description ?? '',
      document_url: document.document_url ?? '',
      category: document.category ?? '',
      version: document.version ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: DocumentForm) => {
    if (!company?.id) return;

    if (editDocument) {
      const { error } = await supabase
        .from('marketing_documents')
        .update({
          document_name: data.document_name,
          document_type: data.document_type,
          description: data.description,
          document_url: data.document_url,
          category: data.category,
          version: data.version,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editDocument.id);

      if (error) {
        toast.error('Failed to update document');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_document_updated',
        module: 'marketing',
        record_id: editDocument.id,
        new_values: { document_name: data.document_name },
      });

      toast.success('Document updated');
    } else {
      const { error } = await supabase.from('marketing_documents').insert({
        company_id: company.id,
        document_name: data.document_name,
        document_type: data.document_type,
        description: data.description,
        document_url: data.document_url,
        category: data.category,
        version: data.version,
        created_by: currentUser?.id,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create document');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_document_created',
        module: 'marketing',
        new_values: { document_name: data.document_name },
      });

      toast.success('Document created');
    }

    reset();
    setEditDocument(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('marketing_documents')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete document');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_document_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Document deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('marketing_documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_document_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'document_name', header: 'Document Name' },
    { 
      key: 'document_type',
      header: 'Type', 
      cell: (row) => <Badge variant="outline">{row.document_type?.replace('_', ' ')}</Badge>
    },
    { 
      key: 'category',
      header: 'Category', 
      cell: (row) => row.category || '-'
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'version',
      header: 'Version', 
      cell: (row) => row.version || '-'
    },
    { 
      key: 'document_url',
      header: 'Document URL', 
      cell: (row) => row.document_url ? (
        <a href={row.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          View Document
        </a>
      ) : '-'
    },
    { 
      key: 'created_by',
      header: 'Created By', 
      cell: (row) => row.created_by_profile 
        ? `${row.created_by_profile.first_name} ${row.created_by_profile.last_name}` 
        : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="documents" action="edit">
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
              {row.document_url && (
                <DropdownMenuItem onClick={() => window.open(row.document_url, '_blank')}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </DropdownMenuItem>
              )}
              {row.status === 'active' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'archived')}>
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </DropdownMenuItem>
              )}
              {row.status === 'archived' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                  <FileCheck className="h-4 w-4 mr-2" /> Restore
                </DropdownMenuItem>
              )}
              <Can resource="documents" action="delete">
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
      <PageHeader title="Marketing Documents" description="Manage marketing documents and trackers" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Documents' }]}>
        <Can resource="documents" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditDocument(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editDocument ? 'Edit Document' : 'New Document'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Document Name *</Label>
                  <Input {...register('document_name')} placeholder="Document name" />
                  {errors.document_name && <p className="text-red-500 text-sm mt-1">{errors.document_name.message}</p>}
                </div>
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
                          <SelectItem value="guideline">Guideline</SelectItem>
                          <SelectItem value="template">Template</SelectItem>
                          <SelectItem value="tracker">Tracker</SelectItem>
                          <SelectItem value="report">Report</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="presentation">Presentation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input {...register('category')} placeholder="e.g., Campaigns, PR, etc." />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Document description" rows={2} />
                </div>
                <div>
                  <Label>Document URL</Label>
                  <Input {...register('document_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input {...register('version')} placeholder="1.0" />
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
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Documents" value={stats.total} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Documents" value={stats.active} icon={<FileCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Templates" value={stats.templates} icon={<FileText className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Trackers" value={stats.trackers} icon={<FileCheck className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
