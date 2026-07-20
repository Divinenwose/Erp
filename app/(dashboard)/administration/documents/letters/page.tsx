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
import { FileText, Plus, Edit, Trash2, Calendar, User, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const letterSchema = z.object({
  title: z.string().min(1, 'Required'),
  recipient: z.string().optional(),
  sender: z.string().optional(),
  letter_type: z.enum(['official', 'informal', 'legal', 'other']),
  subject: z.string().optional(),
  letter_date: z.string().optional(),
  reference_number: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type LetterForm = z.infer<typeof letterSchema>;

export default function LettersPage() {
  const { company, user: currentUser } = useAuth();
  const [letters, setLetters] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLetter, setEditLetter] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<LetterForm>({
    resolver: zodResolver(letterSchema),
    defaultValues: { letter_type: 'official' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [letRes, branchRes] = await Promise.all([
      supabase
        .from('letters')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('letter_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setLetters(letRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (letter: any) => {
    setEditLetter(letter);
    reset({
      title: letter.title,
      recipient: letter.recipient ?? '',
      sender: letter.sender ?? '',
      letter_type: letter.letter_type,
      subject: letter.subject ?? '',
      letter_date: letter.letter_date ?? '',
      reference_number: letter.reference_number ?? '',
      branch_id: letter.branch_id ?? undefined,
      notes: letter.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: LetterForm) => {
    if (!company?.id) return;

    const payload = {
      title: data.title,
      recipient: data.recipient,
      sender: data.sender,
      letter_type: data.letter_type,
      subject: data.subject,
      letter_date: data.letter_date || null,
      reference_number: data.reference_number,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editLetter) {
      const { error } = await supabase
        .from('letters')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editLetter.id);

      if (error) {
        toast.error('Failed to update letter');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'letter_updated',
        module: 'documents',
        record_id: editLetter.id,
        new_values: { title: data.title },
      });

      toast.success('Letter updated');
    } else {
      const { error } = await supabase.from('letters').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create letter');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'letter_created',
        module: 'documents',
        new_values: { title: data.title },
      });

      toast.success('Letter created');
    }

    reset();
    setEditLetter(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('letters').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete letter');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'letter_deleted',
        module: 'documents',
        record_id: deleteId,
      });
      toast.success('Letter deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('letters')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'letter_status_updated',
        module: 'documents',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Title', 'Recipient', 'Sender', 'Type', 'Subject', 'Letter Date', 'Reference Number', 'Status', 'Branch'];
    const rows = letters.map(l => [
      l.title,
      l.recipient || '',
      l.sender || '',
      l.letter_type,
      l.subject || '',
      l.letter_date || '',
      l.reference_number || '',
      l.status,
      l.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'letters.csv';
    a.click();
  };

  const typeColors: Record<string, string> = {
    official: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    informal: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    legal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
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
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.title}</p>
            {row.reference_number && <p className="text-xs text-gray-400">Ref: {row.reference_number}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.recipient || '—'}</span>,
    },
    {
      key: 'letter_type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={typeColors[row.letter_type] || typeColors.other} variant="secondary" className="capitalize">
          {row.letter_type}
        </Badge>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{row.subject || '—'}</span>,
    },
    {
      key: 'letter_date',
      header: 'Date',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{row.letter_date || '—'}</span>
        </div>
      ),
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
            {row.status === 'active' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'archived')}>
                <FileText className="h-4 w-4 mr-2" />Archive
              </DropdownMenuItem>
            )}
            {row.status === 'archived' && (
              <DropdownMenuItem onClick={() => handleStatusUpdate(row.id, 'active')}>
                <FileText className="h-4 w-4 mr-2" />Activate
              </DropdownMenuItem>
            )}
            <Can resource="documents.letters" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = letters.filter(l => l.status === 'active').length;
  const archived = letters.filter(l => l.status === 'archived').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Letters"
        description="Manage official and informal letters"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Documents' }, { label: 'Letters' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="documents.letters" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditLetter(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Letter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editLetter ? 'Edit Letter' : 'Add Letter'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Title *</Label>
                      <Input className="mt-1" {...register('title')} />
                      {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
                    </div>
                    <div>
                      <Label>Recipient</Label>
                      <Input className="mt-1" {...register('recipient')} />
                    </div>
                    <div>
                      <Label>Sender</Label>
                      <Input className="mt-1" {...register('sender')} />
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Controller name="letter_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="official">Official</SelectItem>
                            <SelectItem value="informal">Informal</SelectItem>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Reference Number</Label>
                      <Input className="mt-1" {...register('reference_number')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Subject</Label>
                      <Input className="mt-1" {...register('subject')} />
                    </div>
                    <div>
                      <Label>Letter Date</Label>
                      <Input className="mt-1" type="date" {...register('letter_date')} />
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
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditLetter(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editLetter ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Letters" value={letters.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<FileText className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Archived" value={archived} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
      </div>

      <DataTable
        data={letters}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search letters..."
        searchKeys={['title', 'recipient', 'subject', 'reference_number']}
        pageSize={15}
        emptyTitle="No letters"
        emptyDescription="Add letters to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Letter?"
        description="This will permanently delete the letter."
        confirmLabel="Delete"
      />
    </div>
  );
}
