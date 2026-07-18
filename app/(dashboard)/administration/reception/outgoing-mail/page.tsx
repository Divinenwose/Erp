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
import { Mail, Plus, Edit, Trash2, Clock, Building2, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const outgoingMailSchema = z.object({
  recipient_name: z.string().min(1, 'Required'),
  recipient_address: z.string().optional(),
  subject: z.string().min(1, 'Required'),
  mail_type: z.enum(['letter', 'package', 'document', 'invoice', 'other']),
  sender_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type OutgoingMailForm = z.infer<typeof outgoingMailSchema>;

export default function OutgoingMailPage() {
  const { company, user: currentUser } = useAuth();
  const [mails, setMails] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMail, setEditMail] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<OutgoingMailForm>({
    resolver: zodResolver(outgoingMailSchema),
    defaultValues: { mail_type: 'letter', priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [mailRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('outgoing_mail')
        .select('*, branches(name), sender_profile(first_name, last_name), sent_by_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('sent_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setMails(mailRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (mail: any) => {
    setEditMail(mail);
    reset({
      recipient_name: mail.recipient_name,
      recipient_address: mail.recipient_address ?? '',
      subject: mail.subject,
      mail_type: mail.mail_type,
      sender_id: mail.sender_id ?? undefined,
      priority: mail.priority,
      branch_id: mail.branch_id ?? undefined,
      notes: mail.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: OutgoingMailForm) => {
    if (!company?.id) return;

    const payload = {
      recipient_name: data.recipient_name,
      recipient_address: data.recipient_address,
      subject: data.subject,
      mail_type: data.mail_type,
      sender_id: data.sender_id,
      priority: data.priority,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editMail) {
      const { error } = await supabase
        .from('outgoing_mail')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editMail.id);

      if (error) {
        toast.error('Failed to update mail record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'outgoing_mail_updated',
        module: 'reception',
        record_id: editMail.id,
        new_values: { subject: data.subject },
      });

      toast.success('Mail record updated');
    } else {
      const { error } = await supabase.from('outgoing_mail').insert({
        company_id: company.id,
        ...payload,
        sent_date: new Date().toISOString(),
        sent_by: currentUser?.id,
        status: 'sent',
      });

      if (error) {
        toast.error('Failed to create mail record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'outgoing_mail_created',
        module: 'reception',
        new_values: { subject: data.subject },
      });

      toast.success('Mail record created');
    }

    reset();
    setEditMail(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('outgoing_mail').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete mail record');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'outgoing_mail_deleted',
        module: 'reception',
        record_id: deleteId,
      });
      toast.success('Mail record deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const exportCSV = () => {
    const headers = ['Recipient Name', 'Recipient Address', 'Subject', 'Type', 'Priority', 'Sender', 'Sent Date', 'Status', 'Branch'];
    const rows = mails.map(m => [
      m.recipient_name,
      m.recipient_address || '',
      m.subject,
      m.mail_type,
      m.priority,
      m.sender_profile ? `${m.sender_profile.first_name} ${m.sender_profile.last_name}` : '',
      m.sent_date,
      m.status,
      m.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outgoing_mail.csv';
    a.click();
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const typeColors: Record<string, string> = {
    letter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    package: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    document: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    invoice: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const columns: Column<any>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.subject}</p>
            <p className="text-xs text-gray-400">{row.recipient_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mail_type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={typeColors[row.mail_type] || typeColors.other} variant="secondary" className="capitalize">
          {row.mail_type}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      cell: (row) => (
        <Badge className={priorityColors[row.priority] || priorityColors.medium} variant="secondary">
          {row.priority}
        </Badge>
      ),
    },
    {
      key: 'sender',
      header: 'Sender',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.sender_profile ? `${row.sender_profile.first_name} ${row.sender_profile.last_name}` : '—'}</span>,
    },
    {
      key: 'sent_date',
      header: 'Sent',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.sent_date).toLocaleDateString()}</span>
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
            <Can resource="reception.outgoing_mail" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const sent = mails.filter(m => m.status === 'sent').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outgoing Mail"
        description="Track outgoing mail and packages"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Reception' }, { label: 'Outgoing Mail' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="reception.outgoing_mail" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditMail(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Mail
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editMail ? 'Edit Mail' : 'Add Outgoing Mail'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Subject *</Label>
                      <Input className="mt-1" {...register('subject')} />
                      {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
                    </div>
                    <div>
                      <Label>Recipient Name *</Label>
                      <Input className="mt-1" {...register('recipient_name')} />
                      {errors.recipient_name && <p className="text-xs text-red-500 mt-1">{errors.recipient_name.message}</p>}
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Controller name="mail_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="letter">Letter</SelectItem>
                            <SelectItem value="package">Package</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                            <SelectItem value="invoice">Invoice</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <Label>Recipient Address</Label>
                      <Input className="mt-1" {...register('recipient_address')} />
                    </div>
                    <div>
                      <Label>Priority *</Label>
                      <Controller name="priority" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Sender</Label>
                      <Controller name="sender_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select sender" /></SelectTrigger>
                          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
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
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditMail(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editMail ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Mail" value={mails.length} icon={<Mail className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Sent" value={sent} icon={<Send className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={mails}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search mail..."
        searchKeys={['subject', 'recipient_name', 'recipient_address']}
        pageSize={15}
        emptyTitle="No outgoing mail"
        emptyDescription="Add outgoing mail records to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Mail Record?"
        description="This will permanently delete the mail record."
        confirmLabel="Delete"
      />
    </div>
  );
}
