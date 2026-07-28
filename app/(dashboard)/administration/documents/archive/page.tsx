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
import { Archive, Plus, Edit, Trash2, Calendar, FileText, Building2, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const archiveSchema = z.object({
  title: z.string().min(1, 'Required'),
  document_type: z.enum(['policy', 'letter', 'minutes', 'contract', 'invoice', 'other']),
  category: z.string().optional(),
  description: z.string().optional(),
  document_date: z.string().optional(),
  retention_date: z.string().optional(),
  location: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type ArchiveForm = z.infer<typeof archiveSchema>;

export default function ArchivePage() {
  const { company, user: currentUser } = useAuth();
  const [archives, setArchives] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editArchive, setEditArchive] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ArchiveForm>({
    resolver: zodResolver(archiveSchema),
    defaultValues: { document_type: 'other' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [arcRes, branchRes] = await Promise.all([
      supabase
        .from('document_archive')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('document_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setArchives(arcRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (archive: any) => {
    setEditArchive(archive);
    reset({
      title: archive.title,
      document_type: archive.document_type,
      category: archive.category ?? '',
      description: archive.description ?? '',
      document_date: archive.document_date ?? '',
      retention_date: archive.retention_date ?? '',
      location: archive.location ?? '',
      branch_id: archive.branch_id ?? undefined,
      notes: archive.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ArchiveForm) => {
    if (!company?.id) return;

    const payload = {
      title: data.title,
      document_type: data.document_type,
      category: data.category,
      description: data.description,
      document_date: data.document_date || null,
      retention_date: data.retention_date || null,
      location: data.location,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editArchive) {
      const { error } = await supabase
        .from('document_archive')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editArchive.id);

      if (error) {
        toast.error('Failed to update archive record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'document_archive_updated',
        module: 'documents',
        record_id: editArchive.id,
        new_values: { title: data.title },
      });

      toast.success('Archive record updated');
    } else {
      const { error } = await supabase.from('document_archive').insert({
        company_id: company.id,
        ...payload,
        status: 'archived',
      });

      if (error) {
        toast.error('Failed to create archive record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'document_archive_created',
        module: 'documents',
        new_values: { title: data.title },
      });

      toast.success('Archive record created');
    }

    reset();
    setEditArchive(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('document_archive').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete archive record');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'document_archive_deleted',
        module: 'documents',
        record_id: deleteId,
      });
      toast.success('Archive record deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleRestore = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('document_archive')
      .update({ status: 'restored', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to restore document');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'document_archive_restored',
        module: 'documents',
        record_id: id,
      });
      toast.success('Document restored');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Title', 'Document Type', 'Category', 'Document Date', 'Retention Date', 'Location', 'Status', 'Branch'];
    const rows = archives.map(a => [
      a.title,
      a.document_type,
      a.category || '',
      a.document_date || '',
      a.retention_date || '',
      a.location || '',
      a.status,
      a.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document_archive.csv';
    a.click();
  };

  const typeColors: Record<string, string> = {
    policy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    letter: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    minutes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    contract: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    invoice: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Archive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.title}</p>
            {row.category && <p className="text-xs text-gray-400">{row.category}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'document_type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={`${typeColors[row.document_type] || typeColors.other} capitalize`} variant="secondary">
          {row.document_type}
        </Badge>
      ),
    },
    {
      key: 'document_date',
      header: 'Document Date',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{row.document_date || '—'}</span>
        </div>
      ),
    },
    {
      key: 'retention_date',
      header: 'Retention',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{row.retention_date || '—'}</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.location || '—'}</span>,
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
          <Building2 className="h-3 w-3" />
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
            {row.status === 'archived' && (
              <DropdownMenuItem onClick={() => handleRestore(row.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />Restore
              </DropdownMenuItem>
            )}
            <Can resource="documents.archive" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const archived = archives.filter(a => a.status === 'archived').length;
  const restored = archives.filter(a => a.status === 'restored').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Archive"
        description="Manage archived documents and records"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Documents' }, { label: 'Archive' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
          <Can resource="documents.archive" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditArchive(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add to Archive
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editArchive ? 'Edit Archive' : 'Add to Archive'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Title *</Label>
                      <Input className="mt-1" {...register('title')} />
                      {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
                    </div>
                    <div>
                      <Label>Document Type *</Label>
                      <Controller name="document_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="policy">Policy</SelectItem>
                            <SelectItem value="letter">Letter</SelectItem>
                            <SelectItem value="minutes">Meeting Minutes</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="invoice">Invoice</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input className="mt-1" {...register('category')} />
                    </div>
                    <div>
                      <Label>Document Date</Label>
                      <Input className="mt-1" type="date" {...register('document_date')} />
                    </div>
                    <div>
                      <Label>Retention Date</Label>
                      <Input className="mt-1" type="date" {...register('retention_date')} />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input className="mt-1" {...register('location')} placeholder="e.g., Physical storage, Cloud" />
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
                      <Label>Description</Label>
                      <Textarea className="mt-1" rows={2} {...register('description')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditArchive(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editArchive ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Documents" value={archives.length} icon={<Archive className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Archived" value={archived} icon={<FileText className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Restored" value={restored} icon={<RefreshCw className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={archives}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search archive..."
        searchKeys={['title', 'category', 'description']}
        pageSize={15}
        emptyTitle="No archived documents"
        emptyDescription="Add documents to archive to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Archive Record?"
        description="This will permanently delete the archive record."
        confirmLabel="Delete"
      />
    </div>
  );
}
