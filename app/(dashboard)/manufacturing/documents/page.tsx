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
import { FileCheck, Plus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const documentSchema = z.object({
  document_name: z.string().min(1, 'Document name is required'),
  document_type: z.enum(['policy', 'procedure', 'checklist', 'manual', 'guideline', 'sop', 'other']),
  category: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});
type DocumentForm = z.infer<typeof documentSchema>;

export default function DocumentsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.documents.create');
  const canEdit = isAdmin || hasPermission('manufacturing.documents.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.documents.delete');

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDocument, setEditDocument] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, policies: 0, procedures: 0, checklists: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DocumentForm>({
    resolver: zodResolver(documentSchema),
    defaultValues: { document_type: 'policy', version: '1.0' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('manufacturing_documents')
      .select('*, created_profile:profiles!manufacturing_documents_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    }
    setDocuments(data ?? []);

    const total = data?.length || 0;
    const policies = data?.filter(d => d.document_type === 'policy').length || 0;
    const procedures = data?.filter(d => d.document_type === 'procedure').length || 0;
    const checklists = data?.filter(d => d.document_type === 'checklist').length || 0;
    setStats({ total, policies, procedures, checklists });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (d: any) => {
    setEditDocument(d);
    reset({
      document_name: d.document_name,
      document_type: d.document_type,
      category: d.category ?? '',
      version: d.version ?? '',
      description: d.description ?? '',
      notes: d.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: DocumentForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editDocument) {
      const { error } = await supabase
        .from('manufacturing_documents')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editDocument.id);

      if (error) {
        toast.error('Failed to update document');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'manufacturing_documents',
          record_id: editDocument.id,
        });
      }

      toast.success('Document updated');
    } else {
      const { error } = await supabase.from('manufacturing_documents').insert({
        company_id: company.id,
        ...data,
        status: 'active',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create document');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'manufacturing_documents',
        });
      }

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

    const { error } = await supabase.from('manufacturing_documents').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete document');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'manufacturing_documents',
        record_id: deleteId,
      });
      toast.success('Document deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const columns: Column[] = [
    { key: 'document_name', header: 'Document Name', sortable: true },
    { key: 'document_type', header: 'Type', sortable: true },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'version', header: 'Version', sortable: true },
    {
      key: 'status',
      header: 'Status',
      cell: (v) => <StatusBadge status={v} />,
    },
    { key: 'created_at', header: 'Created', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy') },
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
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Policies & Documents" description="Manufacturing policies and documents" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Documents' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditDocument(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editDocument ? 'Edit Document' : 'New Document'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Document Name *</Label>
                  <Input {...register('document_name')} placeholder="Document name" />
                  {errors.document_name && <p className="text-red-500 text-sm">{errors.document_name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select {...register('document_type')} defaultValue="policy">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="policy">Policy</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                        <SelectItem value="checklist">Checklist</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="guideline">Guideline</SelectItem>
                        <SelectItem value="sop">SOP</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.document_type && <p className="text-red-500 text-sm">{errors.document_type.message}</p>}
                  </div>
                  <div>
                    <Label>Version</Label>
                    <Input {...register('version')} placeholder="1.0" />
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Input {...register('category')} placeholder="Category" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Document description" rows={3} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Documents" value={stats.total} icon={<FileCheck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Policies" value={stats.policies} icon={<FileCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Procedures" value={stats.procedures} icon={<FileCheck className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Checklists" value={stats.checklists} icon={<FileCheck className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
