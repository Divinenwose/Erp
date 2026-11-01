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
import { Shield, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const safetySchema = z.object({
  compliance_type: z.enum(['safety_policy', 'regulatory', 'inspection', 'training', 'certification', 'other']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']),
  notes: z.string().optional(),
});
type SafetyForm = z.infer<typeof safetySchema>;

export default function SafetyPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.safety.create');
  const canEdit = isAdmin || hasPermission('manufacturing.safety.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.safety.delete');
  const canApprove = isAdmin || hasPermission('manufacturing.safety.approve');

  const [safety, setSafety] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSafety, setEditSafety] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0, overdue: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SafetyForm>({
    resolver: zodResolver(safetySchema),
    defaultValues: { status: 'pending', compliance_type: 'safety_policy' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('safety_compliance')
      .select('*, approved_profile:profiles!safety_compliance_approved_by_fkey(first_name, last_name), created_profile:profiles!safety_compliance_created_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading safety records:', error);
      toast.error('Failed to load safety records');
    }
    setSafety(data ?? []);

    const pending = data?.filter(s => s.status === 'pending').length || 0;
    const inProgress = data?.filter(s => s.status === 'in_progress').length || 0;
    const completed = data?.filter(s => s.status === 'completed').length || 0;
    const overdue = data?.filter(s => s.status === 'overdue').length || 0;
    setStats({ pending, inProgress, completed, overdue });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (s: any) => {
    setEditSafety(s);
    reset({
      compliance_type: s.compliance_type,
      title: s.title,
      description: s.description ?? '',
      due_date: s.due_date ?? '',
      status: s.status,
      notes: s.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: SafetyForm) => {
    if (!company?.id || !currentUser?.id) return;

    if (editSafety) {
      const { error } = await supabase
        .from('safety_compliance')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editSafety.id);

      if (error) {
        toast.error('Failed to update safety record');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'safety_compliance',
          record_id: editSafety.id,
        });
      }

      toast.success('Safety record updated');
    } else {
      const { error } = await supabase.from('safety_compliance').insert({
        company_id: company.id,
        ...data,
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create safety record');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'safety_compliance',
        });
      }

      toast.success('Safety record created');
    }

    reset();
    setEditSafety(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('safety_compliance').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete safety record');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'safety_compliance',
        record_id: deleteId,
      });
      toast.success('Safety record deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleApprove = async (s: any) => {
    if (!canApprove || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('safety_compliance')
      .update({
        status: 'completed',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', s.id);

    if (error) {
      toast.error('Failed to approve safety record');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'approved',
        module: 'manufacturing',
        entity_type: 'safety_compliance',
        record_id: s.id,
      });
      toast.success('Safety record approved');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'compliance_type', header: 'Type', sortable: true },
    { key: 'due_date', header: 'Due Date', sortable: true, cell: (v) => v ? format(new Date(v), 'MMM dd, yyyy') : '-' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
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
            {row.status !== 'completed' && canApprove && <DropdownMenuItem onClick={() => handleApprove(row)}>Approve</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Safety & Compliance" description="Safety and compliance records" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Safety' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditSafety(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editSafety ? 'Edit Record' : 'New Record'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Record title" />
                  {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                </div>
                <div>
                  <Label>Type *</Label>
                  <Select {...register('compliance_type')} defaultValue="safety_policy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safety_policy">Safety Policy</SelectItem>
                      <SelectItem value="regulatory">Regulatory</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="certification">Certification</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.compliance_type && <p className="text-red-500 text-sm">{errors.compliance_type.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" {...register('due_date')} />
                  </div>
                  <div>
                    <Label>Status *</Label>
                    <Select {...register('status')} defaultValue="pending">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && <p className="text-red-500 text-sm">{errors.status.message}</p>}
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Description" rows={3} />
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
        <KPICard title="Pending" value={stats.pending} icon={<Shield className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Shield className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Overdue" value={stats.overdue} icon={<Shield className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={safety}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Record"
        description="Are you sure you want to delete this safety record? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
