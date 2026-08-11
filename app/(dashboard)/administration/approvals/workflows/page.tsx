'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Layers, CheckCircle, XCircle } from 'lucide-react';

export default function ApprovalWorkflowsPage() {
  const { company } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [requestType, setRequestType] = useState('purchase_request');
  const [stageName, setStageName] = useState('');
  const [approverRole, setApproverRole] = useState('');
  const [stageOrder, setStageOrder] = useState(1);
  const [requiresAll, setRequiresAll] = useState(false);
  const [isFinal, setIsFinal] = useState(false);

  const workflowColumns = [
    { key: 'name', header: 'Workflow Name' },
    { key: 'type', header: 'Request Type' },
    { key: 'stages', header: 'Stages' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  const stageColumns = [
    { key: 'order', header: 'Order' },
    { key: 'name', header: 'Stage Name' },
    { key: 'role', header: 'Approver Role' },
    { key: 'requirement', header: 'Requirement' },
    { key: 'final', header: 'Final Stage' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadWorkflows();
    loadStages();
  }, [company?.id]);

  const loadWorkflows = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('approval_workflows')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    setWorkflows(data || []);
    setLoading(false);
  };

  const loadStages = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('approval_stages')
      .select('*')
      .eq('company_id', company.id)
      .order('stage_order', { ascending: true });
    setStages(data || []);
  };

  const createWorkflow = async () => {
    if (!company?.id || !workflowName || !requestType) return;

    const { data, error } = await supabase
      .from('approval_workflows')
      .insert({
        company_id: company.id,
        workflow_name: workflowName,
        request_type: requestType,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create workflow');
      return;
    }

    setWorkflowName('');
    setRequestType('purchase_request');
    setIsDialogOpen(false);
    loadWorkflows();
  };

  const createStage = async () => {
    if (!company?.id || !stageName || !approverRole) return;

    const { data, error } = await supabase
      .from('approval_stages')
      .insert({
        company_id: company.id,
        stage_name: stageName,
        stage_order: stageOrder,
        approver_role: approverRole,
        requires_all: requiresAll,
        is_final: isFinal,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create workflow stage');
      return;
    }

    if (selectedWorkflow) {
      await supabase.from('approval_workflow_stages').insert({
        workflow_id: selectedWorkflow.id,
        stage_id: data.id,
        stage_order: stageOrder,
      });
    }

    setStageName('');
    setApproverRole('');
    setStageOrder(1);
    setRequiresAll(false);
    setIsFinal(false);
    setIsStageDialogOpen(false);
    loadStages();
  };

  const deleteWorkflow = async (id: string) => {
    await supabase.from('approval_workflows').delete().eq('id', id);
    loadWorkflows();
  };

  const deleteStage = async (id: string) => {
    await supabase.from('approval_stages').delete().eq('id', id);
    loadStages();
  };

  const formattedWorkflows = workflows.map((wf) => ({
    ...wf,
    name: wf.workflow_name,
    type: wf.request_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    stages: `${stages.filter(s => s.company_id === company.id).length} stages`,
    status: wf.is_active ? (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Inactive</Badge>
    ),
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-8" onClick={() => setSelectedWorkflow(wf)}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => deleteWorkflow(wf.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ),
  }));

  const formattedStages = stages.map((stage) => ({
    ...stage,
    order: stage.stage_order,
    name: stage.stage_name,
    role: stage.approver_role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    requirement: stage.requires_all ? 'All Approvers' : 'Any Approver',
    final: stage.is_final ? (
      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Yes</Badge>
    ) : (
      <Badge variant="secondary">No</Badge>
    ),
    actions: (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-8" onClick={() => deleteStage(stage.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Workflows"
        description="Configure multi-step approval workflows"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Approvals', href: '/administration/approvals' },
          { label: 'Workflows' },
        ]}
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Approval Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="workflowName">Workflow Name</Label>
                <Input
                  id="workflowName"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g., Standard Purchase Approval"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestType">Request Type</Label>
                <Select value={requestType} onValueChange={setRequestType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase_request">Purchase Request</SelectItem>
                    <SelectItem value="asset_request">Asset Request</SelectItem>
                    <SelectItem value="maintenance_request">Maintenance Request</SelectItem>
                    <SelectItem value="leave_request">Leave Request</SelectItem>
                    <SelectItem value="expense_request">Expense Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={createWorkflow}>
                Create Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={workflowColumns} data={formattedWorkflows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approval Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Approval Stage</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="stageName">Stage Name</Label>
                      <Input
                        id="stageName"
                        value={stageName}
                        onChange={(e) => setStageName(e.target.value)}
                        placeholder="e.g., Administration Review"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="approverRole">Approver Role</Label>
                      <Select value={approverRole} onValueChange={setApproverRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                          <SelectItem value="md">Managing Director</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="accounts">Accounts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stageOrder">Stage Order</Label>
                      <Input
                        id="stageOrder"
                        type="number"
                        value={stageOrder}
                        onChange={(e) => setStageOrder(parseInt(e.target.value))}
                        min={1}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requiresAll"
                        checked={requiresAll}
                        onChange={(e) => setRequiresAll(e.target.checked)}
                      />
                      <Label htmlFor="requiresAll">Requires all approvers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isFinal"
                        checked={isFinal}
                        onChange={(e) => setIsFinal(e.target.checked)}
                      />
                      <Label htmlFor="isFinal">Final approval stage</Label>
                    </div>
                    <Button className="w-full" onClick={createStage}>
                      Add Stage
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable columns={stageColumns} data={formattedStages} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
