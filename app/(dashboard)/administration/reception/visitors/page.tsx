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
import { UserCheck, Plus, Edit, Trash2, Clock, Phone, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const visitorSchema = z.object({
  name: z.string().min(1, 'Required'),
  company: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  purpose: z.string().optional(),
  host_id: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type VisitorForm = z.infer<typeof visitorSchema>;

export default function VisitorsPage() {
  const { company, user: currentUser } = useAuth();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editVisitor, setEditVisitor] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<VisitorForm>({
    resolver: zodResolver(visitorSchema),
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [visRes, branchRes, userRes] = await Promise.all([
      supabase
        .from('visitors')
        .select('*, branches(name), host_profile(first_name, last_name)')
        .eq('company_id', company.id)
        .order('check_in', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('*').eq('company_id', company.id),
    ]);

    setVisitors(visRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setUsers(userRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (visitor: any) => {
    setEditVisitor(visitor);
    reset({
      name: visitor.name,
      company: visitor.company ?? '',
      email: visitor.email ?? '',
      phone: visitor.phone ?? '',
      purpose: visitor.purpose ?? '',
      host_id: visitor.host_id ?? undefined,
      branch_id: visitor.branch_id ?? undefined,
      notes: visitor.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: VisitorForm) => {
    if (!company?.id) return;

    const payload = {
      name: data.name,
      company: data.company,
      email: data.email || null,
      phone: data.phone,
      purpose: data.purpose,
      host_id: data.host_id,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editVisitor) {
      const { error } = await supabase
        .from('visitors')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editVisitor.id);

      if (error) {
        toast.error('Failed to update visitor');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'visitor_updated',
        module: 'reception',
        record_id: editVisitor.id,
        new_values: { name: data.name },
      });

      toast.success('Visitor updated');
    } else {
      const { error } = await supabase.from('visitors').insert({
        company_id: company.id,
        ...payload,
        check_in: new Date().toISOString(),
        checked_in_by: currentUser?.id,
        status: 'checked_in',
      });

      if (error) {
        toast.error('Failed to check in visitor');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'visitor_checked_in',
        module: 'reception',
        new_values: { name: data.name },
      });

      toast.success('Visitor checked in');
    }

    reset();
    setEditVisitor(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('visitors').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete visitor');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'visitor_deleted',
        module: 'reception',
        record_id: deleteId,
      });
      toast.success('Visitor deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleCheckOut = async (id: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('visitors')
      .update({ 
        status: 'checked_out',
        check_out: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to check out visitor');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'visitor_checked_out',
        module: 'reception',
        record_id: id,
      });
      toast.success('Visitor checked out');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Purpose', 'Host', 'Branch', 'Check In', 'Check Out', 'Status'];
    const rows = visitors.map(v => [
      v.name,
      v.company || '',
      v.email || '',
      v.phone || '',
      v.purpose || '',
      v.host_profile ? `${v.host_profile.first_name} ${v.host_profile.last_name}` : '',
      v.branches?.name || '',
      v.check_in,
      v.check_out || '',
      v.status,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visitors.csv';
    a.click();
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            {row.company && <p className="text-xs text-gray-400">{row.company}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'purpose',
      header: 'Purpose',
      cell: (row) => <span className="text-sm text-gray-600 dark:text-gray-400">{row.purpose || '—'}</span>,
    },
    {
      key: 'host',
      header: 'Host',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.host_profile ? `${row.host_profile.first_name} ${row.host_profile.last_name}` : '—'}
        </span>
      ),
    },
    {
      key: 'check_in',
      header: 'Check In',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.check_in).toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: 'check_out',
      header: 'Check Out',
      sortable: true,
      cell: (row) => row.check_out ? (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{new Date(row.check_out).toLocaleString()}</span>
        </div>
      ) : <span className="text-sm text-gray-400">—</span>,
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
            {row.status === 'checked_in' && (
              <DropdownMenuItem onClick={() => handleCheckOut(row.id)}>
                <Clock className="h-4 w-4 mr-2" />Check Out
              </DropdownMenuItem>
            )}
            <Can resource="reception.visitors" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const checkedIn = visitors.filter(v => v.status === 'checked_in').length;
  const checkedOut = visitors.filter(v => v.status === 'checked_out').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        description="Manage visitor check-in and check-out"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Reception' }, { label: 'Visitors' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="reception.visitors" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditVisitor(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Check In Visitor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editVisitor ? 'Edit Visitor' : 'Check In Visitor'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Name *</Label>
                      <Input className="mt-1" {...register('name')} />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input className="mt-1" {...register('company')} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input className="mt-1" type="email" {...register('email')} />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input className="mt-1" {...register('phone')} />
                    </div>
                    <div>
                      <Label>Purpose</Label>
                      <Input className="mt-1" {...register('purpose')} placeholder="e.g., Meeting" />
                    </div>
                    <div>
                      <Label>Host</Label>
                      <Controller name="host_id" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select host" /></SelectTrigger>
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
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditVisitor(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editVisitor ? 'Update' : 'Check In'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Visitors" value={visitors.length} icon={<UserCheck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Checked In" value={checkedIn} icon={<Clock className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Checked Out" value={checkedOut} icon={<UserCheck className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
      </div>

      <DataTable
        data={visitors}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search visitors..."
        searchKeys={['name', 'company', 'purpose', 'email']}
        pageSize={15}
        emptyTitle="No visitors"
        emptyDescription="Check in visitors to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Visitor?"
        description="This will permanently delete the visitor record."
        confirmLabel="Delete"
      />
    </div>
  );
}
