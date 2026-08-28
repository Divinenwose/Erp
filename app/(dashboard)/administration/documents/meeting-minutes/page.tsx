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
import { FileText, Plus, Edit, Trash2, Calendar, Users, Building2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const minutesSchema = z.object({
  title: z.string().min(1, 'Required'),
  meeting_type: z.enum(['board', 'management', 'department', 'project', 'other']),
  meeting_date: z.string().optional(),
  location: z.string().optional(),
  attendees: z.string().optional(),
  agenda: z.string().optional(),
  decisions: z.string().optional(),
  action_items: z.string().optional(),
  branch_id: z.string().optional(),
  notes: z.string().optional(),
});
type MinutesForm = z.infer<typeof minutesSchema>;

export default function MeetingMinutesPage() {
  const { company, user: currentUser } = useAuth();
  const [minutes, setMinutes] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMinutes, setEditMinutes] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<MinutesForm>({
    resolver: zodResolver(minutesSchema),
    defaultValues: { meeting_type: 'management' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [minRes, branchRes] = await Promise.all([
      supabase
        .from('meeting_minutes')
        .select('*, branches(name)')
        .eq('company_id', company.id)
        .order('meeting_date', { ascending: false }),
      supabase.from('branches').select('*').eq('company_id', company.id),
    ]);

    setMinutes(minRes.data ?? []);
    setBranches(branchRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (minutes: any) => {
    setEditMinutes(minutes);
    reset({
      title: minutes.title,
      meeting_type: minutes.meeting_type,
      meeting_date: minutes.meeting_date ?? '',
      location: minutes.location ?? '',
      attendees: minutes.attendees ?? '',
      agenda: minutes.agenda ?? '',
      decisions: minutes.decisions ?? '',
      action_items: minutes.action_items ?? '',
      branch_id: minutes.branch_id ?? undefined,
      notes: minutes.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: MinutesForm) => {
    if (!company?.id) return;

    const payload = {
      title: data.title,
      meeting_type: data.meeting_type,
      meeting_date: data.meeting_date || null,
      location: data.location,
      attendees: data.attendees,
      agenda: data.agenda,
      decisions: data.decisions,
      action_items: data.action_items,
      branch_id: data.branch_id,
      notes: data.notes,
    };

    if (editMinutes) {
      const { error } = await supabase
        .from('meeting_minutes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editMinutes.id);

      if (error) {
        toast.error('Failed to update meeting minutes');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_minutes_updated',
        module: 'documents',
        record_id: editMinutes.id,
        new_values: { title: data.title },
      });

      toast.success('Meeting minutes updated');
    } else {
      const { error } = await supabase.from('meeting_minutes').insert({
        company_id: company.id,
        ...payload,
        status: 'active',
      });

      if (error) {
        toast.error('Failed to create meeting minutes');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_minutes_created',
        module: 'documents',
        new_values: { title: data.title },
      });

      toast.success('Meeting minutes created');
    }

    reset();
    setEditMinutes(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('meeting_minutes').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete meeting minutes');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_minutes_deleted',
        module: 'documents',
        record_id: deleteId,
      });
      toast.success('Meeting minutes deleted');
      load();
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('meeting_minutes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'meeting_minutes_status_updated',
        module: 'documents',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const exportCSV = () => {
    const headers = ['Title', 'Meeting Type', 'Meeting Date', 'Location', 'Attendees', 'Status', 'Branch'];
    const rows = minutes.map(m => [
      m.title,
      m.meeting_type,
      m.meeting_date || '',
      m.location || '',
      m.attendees || '',
      m.status,
      m.branches?.name || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meeting_minutes.csv';
    a.click();
  };

  const typeColors: Record<string, string> = {
    board: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    management: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    department: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    project: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
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
            {row.location && <p className="text-xs text-gray-400">{row.location}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'meeting_type',
      header: 'Type',
      sortable: true,
      cell: (row) => (
        <Badge className={`${typeColors[row.meeting_type] || typeColors.other} capitalize`} variant="secondary">
          {row.meeting_type}
        </Badge>
      ),
    },
    {
      key: 'meeting_date',
      header: 'Date',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>{row.meeting_date || '—'}</span>
        </div>
      ),
    },
    {
      key: 'attendees',
      header: 'Attendees',
      cell: (row) => (
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-3 w-3" />
          <span className="truncate max-w-[150px]">{row.attendees || '—'}</span>
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
            <Can resource="documents.meeting_minutes" action="delete">
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const active = minutes.filter(m => m.status === 'active').length;
  const archived = minutes.filter(m => m.status === 'archived').length;

  return (
    <PermissionGuard permission="documents.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view meeting minutes</div>}>
      <div className="space-y-6">
      <PageHeader
        title="Meeting Minutes"
        description="Manage meeting minutes and records"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Documents' }, { label: 'Meeting Minutes' }]}
      >
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV}>
            Export CSV
          </Button>
          <Can resource="documents.meeting_minutes" action="create">
            <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditMinutes(null); reset(); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />Add Minutes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editMinutes ? 'Edit Minutes' : 'Add Meeting Minutes'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Title *</Label>
                      <Input className="mt-1" {...register('title')} />
                      {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
                    </div>
                    <div>
                      <Label>Meeting Type *</Label>
                      <Controller name="meeting_type" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="board">Board</SelectItem>
                            <SelectItem value="management">Management</SelectItem>
                            <SelectItem value="department">Department</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <div>
                      <Label>Meeting Date</Label>
                      <Input className="mt-1" type="date" {...register('meeting_date')} />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input className="mt-1" {...register('location')} />
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
                      <Label>Attendees</Label>
                      <Input className="mt-1" {...register('attendees')} placeholder="e.g., John Doe, Jane Smith" />
                    </div>
                    <div className="col-span-2">
                      <Label>Agenda</Label>
                      <Textarea className="mt-1" rows={2} {...register('agenda')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Decisions</Label>
                      <Textarea className="mt-1" rows={2} {...register('decisions')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Action Items</Label>
                      <Textarea className="mt-1" rows={2} {...register('action_items')} />
                    </div>
                    <div className="col-span-2">
                      <Label>Notes</Label>
                      <Textarea className="mt-1" rows={2} {...register('notes')} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditMinutes(null); reset(); }}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : editMinutes ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Minutes" value={minutes.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<FileText className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Archived" value={archived} icon={<FileText className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
      </div>

      <DataTable
        data={minutes}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search minutes..."
        searchKeys={['title', 'location', 'attendees']}
        pageSize={15}
        emptyTitle="No meeting minutes"
        emptyDescription="Add meeting minutes to get started"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Meeting Minutes?"
        description="This will permanently delete the meeting minutes."
        confirmLabel="Delete"
      />
      </div>
    </PermissionGuard>
  );
}
