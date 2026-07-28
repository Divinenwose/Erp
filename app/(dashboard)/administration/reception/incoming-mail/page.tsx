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
import { Inbox, Plus, Edit, Trash2, Mail, Clock, Building2, UserCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const incomingMailSchema = z.object({
  sender_name: z.string().min(1, 'Required'),
  sender_address: z.string().optional(),
  subject: z.string().min(1, 'Required'),
  mail_type: z.enum(['letter', 'package', 'document', 'invoice', 'other']),
  recipient_id: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type IncomingMailForm = z.infer<typeof incomingMailSchema>;

export default function IncomingMailPage() {
  const { company, user: currentUser } = useAuth();
  const [mails, setMails] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMail, setEditMail] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<IncomingMailForm>({
    resolver: zodResolver(incomingMailSchema),
    defaultValues: { mail_type: 'letter', priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [mailRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('incoming_mail')
        .select('*, branches(name), recipient_profile(first_name, last_name), received_by_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('received_date', { ascending: false }),
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
      sender_name: mail.sender_name,
      sender_address: mail.sender_address ?? '',
      subject: mail.subject,
      mail_type: mail.mail_type,
      recipient_id: mail.recipient_id ?? undefined,
      priority: mail.priority,
      branch_id: mail.branch_id ?? undefined,
      notes: mail.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: IncomingMailForm) => {
    if (!company?.id) return;

    const payload = {
      sender_name: data.sender_name,
      sender_address: data.sender_address,
      subject: data.subject,
      mail_type: data.mail_type,
      recipient_id: data.recipient_id,
      priority: data.priority,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editMail) {
      const { error } = await supabase
        .from('incoming_mail')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editMail.id);

      if (error) {
        toast.error('Failed to update mail record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'incoming_mail_updated',
        module: 'reception',
        record_id: editMail.id,
        new_values: { subject: data.subject },
      });

      toast.success('Mail record updated');
    } else {
      const { error } = await supabase.from('incoming_mail').insert({
        company_id: company.id,
        ...payload,
        received_date: new Date().toISOString(),
        received_by: currentUser?.id,
        status: 'received',
      });

      if (error) {
        toast.error('Failed to create mail record');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'incoming_mail_created',
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

    const { error } = await supabase.from('incoming_mail').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete mail record');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'incoming_mail_deleted',
        module: 'reception',
        record_id: deleteId,
      });
      toast.success('Mail record deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleDeliver = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('incoming_mail')
      .update({ 
        status: 'delivered',
        delivered_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark as delivered');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'incoming_mail_delivered',
        module: 'reception',
        record_id: id,
      });
      toast.success('Marked as delivered');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Sender Name', 'Sender Address', 'Subject', 'Type', 'Priority', 'Recipient', 'Received Date', 'Delivered Date', 'Status', 'Branch'];
    const rows = mails.map(m => [
      m.sender_name,
      m.sender_address || '',
      m.subject,
      m.mail_type,
      m.priority,
      m.recipient_profile ? `${m.recipient_profile.first_name} ${m.recipient_profile.last_name}` : '',
      m.received_date,
      m.delivered_date || '',
      m.status,
      m.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incoming_mail.csv';
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
            <p className="text-xs text-gray-400">{row.sender_name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mail_type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={`${typeColors[row.mail_type] || typeColors.other} capitalize`} variant="secondary">
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
      key: 'recipient',
      header: 'Recipient',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <UserCheck className="h-3 w-3" />
          <span>{row.recipient_profile ? `${row.recipient_profile.first_name} ${row.recipient_profile.last_name}` : '—'}</span>
        </div>
      ),
    },
    {
      key: 'received_date',
      header: 'Received',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.received_date).toLocaleDateString()}</span>
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
            {row.status === 'received' && (
              <DropdownMenuItem onClick={() => handleDeliver(row.id)}>
                <Inbox className="h-4 w-4 mr-2" />Mark Delivered
              </DropdownMenuItem>
            )}
            <Can resource="reception.incoming_mail" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const received = mails.filter(m => m.status === 'received').length;
  const delivered = mails.filter(m => m.status === 'delivered').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incoming Mail"
        description="Track incoming mail and packages"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Reception' }, { label: 'Incoming Mail' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="reception.incoming_mail" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditMail(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Mail
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editMail ? 'Edit Mail' : 'Add Incoming Mail'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Subject *</Label>
                      <Input className="mt-1" {...register('subject')} />
                      {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
                    </div>
                    <div>
                      <Label>Sender Name *</Label>
                      <Input className="mt-1" {...register('sender_name')} />
                      {errors.sender_name && <p className="text-xs text-red-500 mt-1">{errors.sender_name.message}</p>}
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
                      <Label>Sender Address</Label>
                      <Input className="mt-1" {...register('sender_address')} />
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
                      <Label>Recipient</Label>
                      <Controller name="recipient_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select recipient" /></SelectTrigger>
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
        <KPICard title="Total Mail" value={mails.length} icon={<Inbox className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Received" value={received} icon={<Mail className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Delivered" value={delivered} icon={<Inbox className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        data={mails}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search mail..."
        searchKeys={['subject', 'sender_name', 'sender_address']}
        pageSize={15}
        emptyTitle="No incoming mail"
        emptyDescription="Add incoming mail records to get started"
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
