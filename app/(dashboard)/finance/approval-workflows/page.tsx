'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Workflow, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, XCircle, Play } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const workflowSchema = z.object({
  workflow_name: z.string().min(1, 'Required'),
  entity_type: z.string().min(1, 'Required'),
  approval_levels: z.coerce.number().min(1).max(5).default(1),
  description: z.string().optional(),
});
type WorkflowForm = z.infer<typeof workflowSchema>;

export default function ApprovalWorkflowsPage() {
  const { company, user } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<WorkflowForm>({ resolver: zodResolver(workflowSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('approval_workflows').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    setWorkflows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: WorkflowForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('approval_workflows').insert({
      company_id: company.id,
      workflow_name: data.workflow_name,
      entity_type: data.entity_type,
      approval_levels: data.approval_levels,
      description: data.description,
      status: 'active',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create workflow'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'created', module: 'approval_workflows', entity_type: 'approval_workflows', new_value: { workflow_name: data.workflow_name, entity_type: data.entity_type } });
    toast.success('Approval workflow created');
    reset();
    setDialogOpen(false);
    load();
  };

  const activateWorkflow = async (workflow: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('approval_workflows').update({ status: 'active' }).eq('id', workflow.id);
    if (error) { toast.error('Failed to activate workflow'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'activated', module: 'approval_workflows', entity_type: 'approval_workflows', entity_id: workflow.id, new_value: { status: 'active' } });
    toast.success('Workflow activated');
    load();
  };

  const deactivateWorkflow = async (workflow: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('approval_workflows').update({ status: 'inactive' }).eq('id', workflow.id);
    if (error) { toast.error('Failed to deactivate workflow'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deactivated', module: 'approval_workflows', entity_type: 'approval_workflows', entity_id: workflow.id, new_value: { status: 'inactive' } });
    toast.success('Workflow deactivated');
    load();
  };

  const deleteWorkflow = async () => {
    if (!company?.id || !workflowToDelete) return;
    const { error } = await supabase.from('approval_workflows').delete().eq('id', workflowToDelete.id);
    if (error) { toast.error('Failed to delete workflow'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deleted', module: 'approval_workflows', entity_type: 'approval_workflows', entity_id: workflowToDelete.id });
    toast.success('Workflow deleted');
    setDeleteDialogOpen(false);
    setWorkflowToDelete(null);
    load();
  };

  const viewWorkflow = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setViewDialogOpen(true);
  };

  const filteredWorkflows = workflows.filter(w => {
    const matchesSearch = !search || w.workflow_name?.toLowerCase().includes(search.toLowerCase()) || w.entity_type?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<any>[] = [
    { key: 'workflow_name', header: 'Workflow Name' },
    { key: 'entity_type', header: 'Entity Type', cell: (row) => <span className="font-mono text-xs">{row.entity_type}</span> },
    { key: 'approval_levels', header: 'Approval Levels', cell: (row) => row.approval_levels },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const activeCount = workflows.filter(w => w.status === 'active').length;
  const inactiveCount = workflows.filter(w => w.status === 'inactive').length;

  return (
    <PermissionGuard permission="finance.approval_workflows.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view approval workflows</div>}>
      <div className="space-y-6">
        <PageHeader title="Approval Workflows" description="Configure approval workflows for finance operations" breadcrumbs={[{ label: 'Finance' }, { label: 'Approval Workflows' }]}>
          <Can resource="approval_workflows" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="approval_workflows" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Create Workflow</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Create Approval Workflow</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>Workflow Name *</Label><Input className="mt-1" {...register('workflow_name')} placeholder="e.g., Invoice Approval" /></div>
                    <div><Label>Entity Type *</Label>
                      <Select onValueChange={(v) => register('entity_type').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select entity" /></SelectTrigger>
                        <SelectContent><SelectItem value="invoices">Invoices</SelectItem><SelectItem value="expenses">Expenses</SelectItem><SelectItem value="budgets">Budgets</SelectItem><SelectItem value="payment_vouchers">Payment Vouchers</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Approval Levels *</Label><Input className="mt-1" type="number" min="1" max="5" {...register('approval_levels')} defaultValue={1} /></div>
                    <div className="col-span-2"><Label>Description</Label><Textarea className="mt-1" {...register('description')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Workflow</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Active Workflows" value={activeCount} icon={<Play className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Inactive Workflows" value={inactiveCount} icon={<Workflow className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total Workflows" value={workflows.length} icon={<Workflow className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search workflows..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredWorkflows}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewWorkflow(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'inactive' && (
                      <Can resource="approval_workflows" action="activate">
                        <DropdownMenuItem onClick={() => activateWorkflow(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Activate</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status === 'active' && (
                      <Can resource="approval_workflows" action="deactivate">
                        <DropdownMenuItem onClick={() => deactivateWorkflow(row)}><XCircle className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
                      </Can>
                    )}
                    <Can resource="approval_workflows" action="delete">
                      <DropdownMenuItem onClick={() => { setWorkflowToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </Can>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Workflow Details</DialogTitle></DialogHeader>
            {selectedWorkflow && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Workflow Name:</span> {selectedWorkflow.workflow_name}</div>
                  <div><span className="text-gray-500">Entity Type:</span> {selectedWorkflow.entity_type}</div>
                  <div><span className="text-gray-500">Approval Levels:</span> {selectedWorkflow.approval_levels}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedWorkflow.status} /></div>
                  {selectedWorkflow.description && <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedWorkflow.description}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Workflow"
          description="Are you sure you want to delete this approval workflow? This action cannot be undone."
          onConfirm={deleteWorkflow}
        />
      </div>
    </PermissionGuard>
  );
}
