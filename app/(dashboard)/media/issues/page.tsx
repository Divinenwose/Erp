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
import { AlertTriangle, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const issueSchema = z.object({
  issue_type: z.enum(['negative_publicity', 'crisis', 'misinformation', 'brand_damage', 'compliance_violation', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  source: z.string().optional(),
  source_url: z.string().optional(),
  detected_date: z.string().optional(),
  response_strategy: z.string().optional(),
  response_actions: z.string().optional(),
  resolution_notes: z.string().optional(),
});
type IssueForm = z.infer<typeof issueSchema>;

export default function MediaIssuesPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('media.issues.create');
  const canEdit = isAdmin || hasPermission('media.issues.edit');
  const canDelete = isAdmin || hasPermission('media.issues.delete');
  const canResolve = isAdmin || hasPermission('media.issues.resolve');

  const [issues, setIssues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIssue, setEditIssue] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ open: 0, investigating: 0, responding: 0, resolved: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
    defaultValues: { issue_type: 'negative_publicity', severity: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [issuesRes, usersRes] = await Promise.all([
      supabase
        .from('media_issues')
        .select('*, assigned_to_profile:profiles!media_issues_assigned_to_fkey(first_name, last_name), created_by_profile:profiles!media_issues_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('detected_date', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    if (issuesRes.error) {
      console.error('Error loading issues:', issuesRes.error);
      toast.error('Failed to load issues');
    }
    setIssues(issuesRes.data ?? []);
    setUsers(usersRes.data ?? []);

    const open = issuesRes.data?.filter(i => i.status === 'open').length || 0;
    const investigating = issuesRes.data?.filter(i => i.status === 'investigating').length || 0;
    const responding = issuesRes.data?.filter(i => i.status === 'responding').length || 0;
    const resolved = issuesRes.data?.filter(i => i.status === 'resolved').length || 0;
    setStats({ open, investigating, responding, resolved });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditIssue(item);
    reset({
      issue_type: item.issue_type,
      severity: item.severity,
      title: item.title,
      description: item.description ?? '',
      source: item.source ?? '',
      source_url: item.source_url ?? '',
      detected_date: item.detected_date ? item.detected_date.slice(0, 10) : '',
      response_strategy: item.response_strategy ?? '',
      response_actions: item.response_actions?.join(', ') ?? '',
      resolution_notes: item.resolution_notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: IssueForm) => {
    if (!company?.id || !currentUser?.id) return;

    const responseActions = data.response_actions ? data.response_actions.split(',').map(a => a.trim()).filter(a => a) : [];
    const issueNumber = `MI-${Date.now()}`;

    if (editIssue) {
      const { error } = await supabase
        .from('media_issues')
        .update({
          issue_type: data.issue_type,
          severity: data.severity,
          title: data.title,
          description: data.description,
          source: data.source,
          source_url: data.source_url,
          detected_date: data.detected_date || null,
          response_strategy: data.response_strategy,
          response_actions: responseActions,
          resolution_notes: data.resolution_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editIssue.id);

      if (error) {
        toast.error('Failed to update issue');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'updated',
        module: 'media',
        entity_type: 'media_issues',
        record_id: editIssue.id,
        new_value: { title: data.title },
      });

      toast.success('Issue updated');
    } else {
      const { error } = await supabase.from('media_issues').insert({
        company_id: company.id,
        issue_number: issueNumber,
        issue_type: data.issue_type,
        severity: data.severity,
        title: data.title,
        description: data.description,
        source: data.source,
        source_url: data.source_url,
        detected_date: data.detected_date || null,
        response_strategy: data.response_strategy,
        response_actions: responseActions,
        created_by: currentUser.id,
        status: 'open',
      });

      if (error) {
        toast.error('Failed to create issue');
        return;
      }

      await logAuditEvent(company.id, currentUser.id, {
        action: 'created',
        module: 'media',
        entity_type: 'media_issues',
        new_value: { title: data.title, issue_number: issueNumber },
      });

      toast.success('Issue created');
    }

    reset();
    setEditIssue(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('media_issues')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete issue');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'media',
        entity_type: 'media_issues',
        record_id: deleteId,
      });
      toast.success('Issue deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('media_issues')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'status_updated',
        module: 'media',
        entity_type: 'media_issues',
        record_id: id,
        new_value: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'issue_number', header: 'Number' },
    { key: 'title', header: 'Title' },
    { 
      key: 'issue_type',
      header: 'Type', 
      cell: (row) => row.issue_type?.replace('_', ' ') || '-'
    },
    { 
      key: 'severity',
      header: 'Severity', 
      cell: (row) => (
        <span className={`capitalize ${
          row.severity === 'critical' ? 'text-red-600 font-bold' :
          row.severity === 'high' ? 'text-red-600 font-semibold' :
          row.severity === 'medium' ? 'text-amber-600' :
          'text-gray-600'
        }`}>{row.severity}</span>
      )
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'detected_date',
      header: 'Detected', 
      cell: (row) => row.detected_date ? format(new Date(row.detected_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'source',
      header: 'Source', 
      cell: (row) => row.source || '-'
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
            {canEdit && (
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {row.status === 'open' && canResolve && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'investigating')}>
                <Clock className="h-4 w-4 mr-2" /> Start Investigation
              </DropdownMenuItem>
            )}
            {row.status === 'investigating' && canResolve && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'responding')}>
                <AlertTriangle className="h-4 w-4 mr-2" /> Start Response
              </DropdownMenuItem>
            )}
            {(row.status === 'responding' || row.status === 'investigating') && canResolve && (
              <DropdownMenuItem onClick={() => updateStatus(row.id, 'resolved')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Resolve
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
      <PageHeader title="Media Issues" description="Track and resolve media issues and negative publicity" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Issues' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditIssue(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editIssue ? 'Edit Issue' : 'New Issue'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input {...register('title')} placeholder="Issue title" />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Type *</Label>
                    <Controller
                      name="issue_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="negative_publicity">Negative Publicity</SelectItem>
                            <SelectItem value="crisis">Crisis</SelectItem>
                            <SelectItem value="misinformation">Misinformation</SelectItem>
                            <SelectItem value="brand_damage">Brand Damage</SelectItem>
                            <SelectItem value="compliance_violation">Compliance Violation</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Severity *</Label>
                    <Controller
                      name="severity"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Issue description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Source</Label>
                    <Input {...register('source')} placeholder="Source name" />
                  </div>
                  <div>
                    <Label>Detected Date</Label>
                    <Input type="date" {...register('detected_date')} />
                  </div>
                </div>
                <div>
                  <Label>Source URL</Label>
                  <Input {...register('source_url')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Response Strategy</Label>
                  <Textarea {...register('response_strategy')} placeholder="Response strategy" rows={2} />
                </div>
                <div>
                  <Label>Response Actions (comma-separated)</Label>
                  <Input {...register('response_actions')} placeholder="action1, action2, ..." />
                </div>
                <div>
                  <Label>Resolution Notes</Label>
                  <Textarea {...register('resolution_notes')} placeholder="Resolution notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editIssue ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Open" value={stats.open} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Investigating" value={stats.investigating} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Responding" value={stats.responding} icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Resolved" value={stats.resolved} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={issues}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Issue"
        description="Are you sure you want to delete this issue?"
        loading={deleting}
      />
    </div>
  );
}
