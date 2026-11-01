'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Archive, Check, ChevronRight, Download, FileText, Plus, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { internalControlModules, InternalControlModule, workflowStageLabels, workflowStages } from '@/lib/internal-control';
import DataTable, { Column } from '@/components/common/DataTable';
import ExcelExportButton from '@/components/common/ExcelExportButton';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface InternalControlRecord {
  id: string;
  company_id: string;
  record_type: string;
  title: string;
  description: string | null;
  category: string | null;
  amount: number | null;
  status: string;
  priority: string;
  severity: string | null;
  likelihood: number | null;
  impact: number | null;
  inherent_score: number | null;
  inherent_rating: string | null;
  residual_likelihood: number | null;
  residual_impact: number | null;
  residual_score: number | null;
  residual_rating: string | null;
  control_effectiveness: string | null;
  mitigation_plan: string | null;
  recommendation: string | null;
  corrective_action: string | null;
  follow_up_result: string | null;
  workflow_stage: string;
  approval_status: string | null;
  approval_reason: string | null;
  owner_id: string | null;
  assigned_to: string | null;
  department_id: string | null;
  due_date: string | null;
  event_date: string | null;
  source_module: string | null;
  source_record_id: string | null;
  parent_id: string | null;
  is_confidential: boolean;
  archived_at: string | null;
  details: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Evidence {
  id: string;
  record_id: string;
  object_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  notes: string | null;
  created_at: string;
}

interface HistoryItem {
  id: string;
  action: string;
  snapshot: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
}

interface InternalControlWorkspaceProps {
  module: InternalControlModule;
}

const priorityOptions = ['low', 'medium', 'high', 'urgent'];
const statusOptions = [
  'open', 'suspected', 'pending', 'planned', 'in_progress', 'under_review', 'approved',
  'rejected', 'compliant', 'non_compliant', 'substantiated', 'resolved',
  'completed', 'closed',
];

function numericValue(form: FormData, key: string): number | null {
  const value = String(form.get(key) ?? '').trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? '').trim();
  return value || null;
}

function displayName(profile: { id: string; first_name?: string | null; last_name?: string | null; display_name?: string | null }) {
  return profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.id;
}

export default function InternalControlWorkspace({ module }: InternalControlWorkspaceProps) {
  const { company, user, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canView = isAdmin || hasPermission(`${module.permission}.view`);
  const canCreate = isAdmin || hasPermission(`${module.permission}.create`);
  const canEdit = isAdmin || hasPermission(`${module.permission}.edit`);
  const canApprove = isAdmin || hasPermission(`${module.permission}.approve`);
  const canVerify = isAdmin || hasPermission(`${module.permission}.verify`);
  const canArchive = isAdmin || hasPermission(`${module.permission}.archive`);
  const canSeeEvidence = isAdmin || hasPermission('internal_control.evidence.view') || hasPermission('internal_control.fraud.view');
  const canAddEvidence = isAdmin || hasPermission('internal_control.evidence.create');

  const [records, setRecords] = useState<InternalControlRecord[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; display_name: string | null }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState<InternalControlRecord | null>(null);
  const [selected, setSelected] = useState<InternalControlRecord | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionRecord, setDecisionRecord] = useState<InternalControlRecord | null>(null);
  const [closureRecord, setClosureRecord] = useState<InternalControlRecord | null>(null);
  const [closureResult, setClosureResult] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<InternalControlRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const loadRecords = useCallback(async () => {
    if (!company?.id || !canView) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [recordResult, profileResult, departmentResult] = await Promise.all([
      supabase
        .from('internal_control_records')
        .select('*')
        .eq('company_id', company.id)
        .eq('record_type', module.recordType)
        .is('archived_at', null)
        .order('updated_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name, display_name').eq('company_id', company.id),
      supabase.from('departments').select('id, name').eq('company_id', company.id).eq('is_active', true).order('name'),
    ]);

    if (recordResult.error) {
      console.error(`Failed to load ${module.title} records:`, recordResult.error);
      toast.error(`Unable to load ${module.title.toLowerCase()}`);
      setRecords([]);
    } else {
      setRecords((recordResult.data ?? []) as InternalControlRecord[]);
    }

    if (profileResult.error) {
      console.error('Failed to load Internal Control assignees:', profileResult.error);
      toast.error('Unable to load user assignments');
    } else {
      setProfiles(profileResult.data ?? []);
    }

    if (departmentResult.error) {
      console.error('Failed to load departments for Internal Control:', departmentResult.error);
      toast.error('Unable to load department options');
    } else {
      setDepartments(departmentResult.data ?? []);
    }
    setLoading(false);
  }, [canView, company?.id, module.recordType, module.title]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => records.filter(record =>
    (statusFilter === 'all' || record.status === statusFilter)
    && (priorityFilter === 'all' || record.priority === priorityFilter)
  ), [records, statusFilter, priorityFilter]);

  const counts = useMemo(() => ({
    total: records.length,
    open: records.filter(record => !['closed', 'archived', 'resolved', 'completed'].includes(record.status)).length,
    overdue: records.filter(record => record.due_date && record.due_date < new Date().toISOString().slice(0, 10)
      && !['closed', 'archived', 'resolved', 'completed'].includes(record.status)).length,
    high: records.filter(record => ['high', 'critical', 'urgent'].includes(record.priority) || ['high', 'critical'].includes(record.inherent_rating ?? '')).length,
  }), [records]);

  const loadDetails = async (record: InternalControlRecord) => {
    setSelected(record);
    setDetailsOpen(true);
    const [evidenceResult, historyResult] = await Promise.all([
      canSeeEvidence
        ? supabase.from('internal_control_evidence').select('*').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase.from('internal_control_record_history').select('id, action, actor_id, snapshot, created_at').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }).limit(25),
    ]);
    if (evidenceResult.error) {
      console.error('Failed to load evidence:', evidenceResult.error);
      toast.error('Unable to load supporting evidence');
    }
    if (historyResult.error) {
      console.error('Failed to load record history:', historyResult.error);
      toast.error('Unable to load record history');
    }
    setEvidence((evidenceResult.data ?? []) as Evidence[]);
    setHistory((historyResult.data ?? []) as HistoryItem[]);
  };

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (record: InternalControlRecord) => {
    setEditing(record);
    setDialogOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company?.id || !user?.id) {
      toast.error('A signed-in user and company are required');
      return;
    }

    const form = new FormData(event.currentTarget);
    const likelihood = numericValue(form, 'likelihood');
    const impact = numericValue(form, 'impact');
    const recordData = {
      title: textValue(form, 'title') ?? '',
      description: textValue(form, 'description'),
      category: textValue(form, 'category'),
      amount: numericValue(form, 'amount'),
      status: textValue(form, 'status') ?? 'open',
      priority: textValue(form, 'priority') ?? 'medium',
      severity: textValue(form, 'severity'),
      likelihood,
      impact,
      residual_likelihood: numericValue(form, 'residual_likelihood'),
      residual_impact: numericValue(form, 'residual_impact'),
      control_effectiveness: textValue(form, 'control_effectiveness'),
      mitigation_plan: textValue(form, 'mitigation_plan'),
      recommendation: textValue(form, 'recommendation'),
      corrective_action: textValue(form, 'corrective_action'),
      follow_up_result: textValue(form, 'follow_up_result'),
      approval_reason: textValue(form, 'approval_reason'),
      owner_id: textValue(form, 'owner_id'),
      assigned_to: textValue(form, 'assigned_to'),
      department_id: textValue(form, 'department_id'),
      due_date: textValue(form, 'due_date'),
      event_date: textValue(form, 'event_date'),
      source_module: textValue(form, 'source_module'),
      source_record_id: textValue(form, 'source_record_id'),
      parent_id: textValue(form, 'parent_id'),
      is_confidential: module.recordType === 'fraud_case',
      details: {
        notes: textValue(form, 'details'),
        scope: textValue(form, 'scope'),
        objectives: textValue(form, 'objectives'),
        criteria: textValue(form, 'criteria'),
        checklist: textValue(form, 'checklist'),
        requirement: textValue(form, 'requirement'),
        control_objective: textValue(form, 'control_objective'),
        control_procedure: textValue(form, 'control_procedure'),
        sample_summary: textValue(form, 'sample_summary'),
        attendance_summary: textValue(form, 'attendance_summary'),
        training_material: textValue(form, 'training_material'),
      },
    };

    if (!recordData.title) {
      toast.error('A title is required');
      return;
    }
    if (module.recordType === 'risk' && (likelihood === null || impact === null)) {
      toast.error('Likelihood and impact are required to calculate a risk rating');
      return;
    }
    if (module.recordType === 'risk' && likelihood !== null && impact !== null
      && (likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5)) {
      toast.error('Likelihood and impact must be scored from 1 to 5');
      return;
    }
    if (recordData.due_date && recordData.event_date && recordData.due_date < recordData.event_date) {
      toast.error('The due date cannot be earlier than the event date');
      return;
    }

    setBusy(true);
    let recordId = editing?.id;
    let savedRecord: InternalControlRecord | null = null;
    if (editing) {
      const { data, error } = await supabase
        .from('internal_control_records')
        .update(recordData)
        .eq('id', editing.id)
        .eq('company_id', company.id)
        .select('*')
        .single();
      if (error) {
        console.error('Failed to update Internal Control record:', error);
        toast.error(error.message || 'Unable to update record');
        setBusy(false);
        return;
      }
      savedRecord = data as InternalControlRecord;
    } else {
      const { data, error } = await supabase
        .from('internal_control_records')
        .insert({
          company_id: company.id,
          record_type: module.recordType,
          created_by: user.id,
          ...recordData,
        })
        .select('*')
        .single();
      if (error) {
        console.error('Failed to create Internal Control record:', error);
        toast.error(error.message || 'Unable to create record');
        setBusy(false);
        return;
      }
      savedRecord = data as InternalControlRecord;
      recordId = savedRecord.id;
    }

    await logAuditEvent(company.id, user.id, {
      action: editing ? 'updated' : 'created',
      module: 'internal_control',
      entity_type: module.recordType,
      record_id: recordId,
      new_value: { title: recordData.title, status: recordData.status },
    });

    if (recordData.assigned_to && recordData.assigned_to !== user.id) {
      await sendNotification(company.id, recordData.assigned_to, {
        title: `Internal Control assignment: ${recordData.title}`,
        message: `You have been assigned to a ${module.title.toLowerCase()} record.`,
        type: 'info',
        module: 'internal_control',
        reference_id: recordId,
        action_url: module.href,
      });
    }

    const file = form.get('evidence_file');
    if (file instanceof File && file.size > 0 && recordId && savedRecord) {
      if (!canAddEvidence) {
        toast.error('Record saved, but you do not have permission to attach evidence');
      } else if (file.size > 10 * 1024 * 1024) {
        toast.error('Record saved, but evidence files must be 10 MB or smaller');
      } else {
        const path = `${company.id}/${recordId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('internal-control-evidence')
          .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (uploadError) {
          console.error('Failed to upload Internal Control evidence:', uploadError);
          toast.error(`Record saved, but evidence upload failed: ${uploadError.message}`);
        } else {
          const { error: evidenceError } = await supabase.from('internal_control_evidence').insert({
            company_id: company.id,
            record_id: recordId,
            object_path: path,
            file_name: file.name,
            mime_type: file.type || null,
            file_size: file.size,
            uploaded_by: user.id,
          });
          if (evidenceError) {
            console.error('Failed to register Internal Control evidence:', evidenceError);
            const { error: cleanupError } = await supabase.storage
              .from('internal-control-evidence')
              .remove([path]);
            if (cleanupError) {
              console.error('Failed to clean up unregistered Internal Control evidence:', cleanupError);
            }
            toast.error(
              cleanupError
                ? `Record saved, but evidence registration failed: ${evidenceError.message}. Uploaded file cleanup also failed: ${cleanupError.message}`
                : `Record saved, but evidence registration failed: ${evidenceError.message}`
            );
          } else {
            await logAuditEvent(company.id, user.id, {
              action: 'evidence_uploaded',
              module: 'internal_control',
              entity_type: module.recordType,
              record_id: recordId,
              new_value: { file_name: file.name },
            });
          }
        }
      }
    }

    toast.success(editing ? 'Record updated' : 'Record created');
    setBusy(false);
    setDialogOpen(false);
    await loadRecords();
    if (selected?.id === recordId && savedRecord) await loadDetails(savedRecord);
  };

  const advanceWorkflow = async (record: InternalControlRecord) => {
    if (!company?.id || !user?.id || !canEdit) return;
    const stageIndex = workflowStages.indexOf(record.workflow_stage as (typeof workflowStages)[number]);
    const nextStage = workflowStages[stageIndex + 1];
    if (!nextStage) {
      toast.error('This record is already at the final workflow stage');
      return;
    }
    const changes: Record<string, unknown> = { workflow_stage: nextStage };
    if (nextStage === 'authorization') {
      changes.approval_status = 'pending';
      changes.status = 'pending';
    }
    if (nextStage === 'follow_up_verification') {
      changes.status = 'under_review';
    }
    const { error } = await supabase
      .from('internal_control_records')
      .update(changes)
      .eq('id', record.id)
      .eq('company_id', company.id);
    if (error) {
      console.error('Failed to advance Internal Control workflow:', error);
      toast.error(error.message || 'Unable to advance workflow');
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: 'workflow_advanced',
      module: 'internal_control',
      entity_type: record.record_type,
      record_id: record.id,
      new_value: { workflow_stage: nextStage },
    });
    toast.success(`Moved to ${workflowStageLabels[nextStage]}`);
    await loadRecords();
  };

  const decideApproval = async () => {
    if (!decision || !decisionRecord || !company?.id || !user?.id || !decisionReason.trim()) {
      toast.error('Enter a reason for this authorization decision');
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('internal_control_records')
      .update({ approval_status: decision, approval_reason: decisionReason.trim() })
      .eq('id', decisionRecord.id)
      .eq('company_id', company.id);
    if (error) {
      console.error('Failed to record Internal Control authorization:', error);
      toast.error(error.message || 'Unable to record authorization');
      setBusy(false);
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: decision,
      module: 'internal_control',
      entity_type: decisionRecord.record_type,
      record_id: decisionRecord.id,
      new_value: { approval_reason: decisionReason.trim() },
    });
    if (decisionRecord.created_by && decisionRecord.created_by !== user.id) {
      await sendNotification(company.id, decisionRecord.created_by, {
        title: `Internal Control request ${decision}`,
        message: `${decisionRecord.title}: ${decisionReason.trim()}`,
        type: decision === 'approved' ? 'success' : 'warning',
        module: 'internal_control',
        reference_id: decisionRecord.id,
        action_url: module.href,
      });
    }
    toast.success(`Request ${decision}`);
    setBusy(false);
    setDecision(null);
    setDecisionReason('');
    setDecisionRecord(null);
    await loadRecords();
  };

  const archiveRecord = async (record: InternalControlRecord) => {
    if (!company?.id || !canArchive) return;
    const { error } = await supabase
      .from('internal_control_records')
      .update({ archived_at: new Date().toISOString(), status: 'archived' })
      .eq('id', record.id)
      .eq('company_id', company.id);
    if (error) {
      console.error('Failed to archive Internal Control record:', error);
      toast.error(error.message || 'Unable to archive record');
      return;
    }
    if (user?.id) {
      await logAuditEvent(company.id, user.id, {
        action: 'archived',
        module: 'internal_control',
        entity_type: record.record_type,
        record_id: record.id,
      });
    }
    toast.success('Record archived');
    await loadRecords();
  };

  const closeRecord = async (record: InternalControlRecord, result: string) => {
    if (!company?.id || !user?.id || !canVerify || !result.trim()) {
      toast.error('Follow-up verification and permission are required for closure');
      return;
    }
    const { error } = await supabase
      .from('internal_control_records')
      .update({
        workflow_stage: 'closure',
        follow_up_result: result.trim(),
        status: 'closed',
      })
      .eq('id', record.id)
      .eq('company_id', company.id);
    if (error) {
      console.error('Failed to close Internal Control record:', error);
      toast.error(error.message || 'Unable to close record');
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: 'verified_and_closed',
      module: 'internal_control',
      entity_type: record.record_type,
      record_id: record.id,
      new_value: { follow_up_result: result.trim() },
    });
    toast.success('Follow-up verified and record closed');
    await loadRecords();
  };

  const openEvidence = async (item: Evidence) => {
    const { data, error } = await supabase.storage
      .from('internal-control-evidence')
      .createSignedUrl(item.object_path, 60);
    if (error) {
      console.error('Failed to create evidence download link:', error);
      toast.error(error.message || 'Unable to open evidence');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const columns: Column<InternalControlRecord>[] = [
    { key: 'title', header: 'Title', sortable: true },
    { key: 'category', header: 'Category', sortable: true, cell: row => row.category || '-' },
    { key: 'amount', header: 'Transaction Amount', sortable: true, hidden: module.recordType !== 'transaction_review', cell: row => row.amount === null ? '-' : row.amount.toLocaleString() },
    { key: 'priority', header: 'Priority', sortable: true, cell: row => <StatusBadge status={row.priority} /> },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'risk_rating',
      header: 'Risk Rating',
      sortable: true,
      hidden: module.recordType !== 'risk',
      cell: row => row.inherent_rating
        ? `${row.inherent_rating} (${row.inherent_score}) · residual ${row.residual_rating ?? 'not assessed'}${row.residual_score ? ` (${row.residual_score})` : ''}`
        : '-',
    },
    {
      key: 'workflow_stage',
      header: 'Workflow',
      sortable: true,
      cell: row => workflowStageLabels[row.workflow_stage] ?? row.workflow_stage,
    },
    { key: 'due_date', header: 'Due Date', sortable: true, cell: row => row.due_date ? format(new Date(`${row.due_date}T00:00:00`), 'MMM dd, yyyy') : '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: row => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => void loadDetails(row)}>View</Button>
          {canEdit && <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>}
          {canEdit && row.workflow_stage !== 'closure' && row.workflow_stage !== 'authorization' && (
            <Button size="sm" variant="ghost" title="Advance workflow" onClick={() => void advanceWorkflow(row)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {canApprove && row.workflow_stage === 'authorization' && row.approval_status === 'pending' && (
            <>
              <Button size="sm" variant="ghost" className="text-emerald-700" onClick={() => { setDecision('approved'); setDecisionRecord(row); }}>
                <Check className="mr-1 h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="ghost" className="text-red-700" onClick={() => { setDecision('rejected'); setDecisionRecord(row); }}>
                <X className="mr-1 h-4 w-4" /> Reject
              </Button>
            </>
          )}
          {canVerify && row.workflow_stage === 'follow_up_verification' && (
            <Button size="sm" variant="ghost" onClick={() => { setClosureRecord(row); setClosureResult(row.follow_up_result ?? ''); }}>Verify</Button>
          )}
          {canArchive && row.status === 'closed' && (
            <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(row)}>
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const exportRows = filteredRecords.map(record => ({
    title: record.title,
    category: record.category ?? '',
    status: record.status,
    priority: record.priority,
    amount: record.amount ?? '',
    severity: record.severity ?? '',
    inherent_rating: record.inherent_rating ?? '',
    inherent_score: record.inherent_score ?? '',
    residual_rating: record.residual_rating ?? '',
    residual_score: record.residual_score ?? '',
    workflow_stage: workflowStageLabels[record.workflow_stage] ?? record.workflow_stage,
    due_date: record.due_date ?? '',
    department_id: record.department_id ?? '',
    source_module: record.source_module ?? '',
    source_record_id: record.source_record_id ?? '',
    parent_id: record.parent_id ?? '',
  }));

  if (!canView) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        You do not have permission to view {module.title.toLowerCase()}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={module.title}
        description={module.description}
        breadcrumbs={[{ label: 'Internal Control', href: '/internal-control' }, { label: module.title }]}
      >
        {(canCreate || canEdit) && (
          <Button onClick={openNew} disabled={!canCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New {module.recordType === 'fraud_case' ? 'Confidential Case' : 'Record'}
          </Button>
        )}
        {isAdmin || hasPermission(`${module.permission}.export`) ? (
          <ExcelExportButton filename={`internal-control-${module.recordType}`} sheetName={module.title} rows={exportRows} disabled={loading || exportRows.length === 0} />
        ) : null}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Records</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{loading ? '—' : counts.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Open</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{loading ? '—' : counts.open}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">High Priority / Risk</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{loading ? '—' : counts.high}</CardContent></Card>
      </div>

      {module.recordType === 'fraud_case' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Cases are confidential and remain allegations until the investigation process substantiates them. An anomaly alone does not establish wrongdoing.</p>
        </div>
      )}

      {counts.overdue > 0 && (
        <p className="text-sm font-medium text-red-600">{counts.overdue} open record{counts.overdue === 1 ? '' : 's'} past its due date.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map(status => <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {priorityOptions.map(priority => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredRecords}
        loading={loading}
        searchable
        searchKeys={['title', 'description', 'category', 'status', 'priority', 'source_module', 'source_record_id']}
        emptyTitle={`No ${module.title.toLowerCase()} records`}
        emptyDescription="Create a record to start tracking this Internal Control activity."
        emptyAction={canCreate ? <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Create Record</Button> : undefined}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${module.title} Record` : `New ${module.title} Record`}</DialogTitle></DialogHeader>
          <form key={editing?.id ?? 'new-record'} onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" name="title" required defaultValue={editing?.title ?? ''} maxLength={240} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description / Objective</Label>
              <Textarea id="description" name="description" rows={3} defaultValue={editing?.description ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category / Process</Label>
              <Input id="category" name="category" defaultValue={editing?.category ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select id="priority" name="priority" defaultValue={editing?.priority ?? 'medium'} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {priorityOptions.map(priority => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={editing?.status ?? (module.recordType === 'audit' ? 'planned' : module.recordType === 'fraud_case' ? 'suspected' : 'open')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {statusOptions.map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <select id="severity" name="severity" defaultValue={editing?.severity ?? ''} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Not classified</option>
                {['low', 'medium', 'high', 'critical'].map(level => <option key={level} value={level}>{level}</option>)}
              </select>
            </div>
            {module.recordType === 'risk' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="likelihood">Inherent likelihood (1–5) *</Label>
                  <Input id="likelihood" name="likelihood" type="number" min="1" max="5" required defaultValue={editing?.likelihood ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impact">Inherent impact (1–5) *</Label>
                  <Input id="impact" name="impact" type="number" min="1" max="5" required defaultValue={editing?.impact ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residual_likelihood">Residual likelihood (1–5)</Label>
                  <Input id="residual_likelihood" name="residual_likelihood" type="number" min="1" max="5" defaultValue={editing?.residual_likelihood ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="residual_impact">Residual impact (1–5)</Label>
                  <Input id="residual_impact" name="residual_impact" type="number" min="1" max="5" defaultValue={editing?.residual_impact ?? ''} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="mitigation_plan">Existing controls / mitigation plan</Label>
                  <Textarea id="mitigation_plan" name="mitigation_plan" rows={3} defaultValue={editing?.mitigation_plan ?? ''} />
                </div>
              </>
            )}
            {module.recordType === 'control_test' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="control_effectiveness">Control effectiveness</Label>
                  <select id="control_effectiveness" name="control_effectiveness" defaultValue={editing?.control_effectiveness ?? 'not_tested'} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {['not_tested', 'effective', 'partially_effective', 'ineffective'].map(value => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_date">Test date</Label>
                  <Input id="event_date" name="event_date" type="date" defaultValue={editing?.event_date ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="control_objective">Control objective</Label>
                  <Input id="control_objective" name="control_objective" defaultValue={String(editing?.details?.control_objective ?? '')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="control_procedure">Testing procedure</Label>
                  <Input id="control_procedure" name="control_procedure" defaultValue={String(editing?.details?.control_procedure ?? '')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sample_summary">Sample / test result summary</Label>
                  <Textarea id="sample_summary" name="sample_summary" rows={2} defaultValue={String(editing?.details?.sample_summary ?? '')} />
                </div>
              </>
            )}
            {module.recordType === 'audit' && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="scope">Audit scope / process</Label>
                  <Textarea id="scope" name="scope" rows={2} defaultValue={String(editing?.details?.scope ?? '')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="objectives">Audit objectives</Label>
                  <Textarea id="objectives" name="objectives" rows={2} defaultValue={String(editing?.details?.objectives ?? '')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="criteria">Audit criteria / checklist</Label>
                  <Textarea id="criteria" name="criteria" rows={3} defaultValue={String(editing?.details?.criteria ?? '')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="checklist">Testing checklist / procedures</Label>
                  <Textarea id="checklist" name="checklist" rows={3} defaultValue={String(editing?.details?.checklist ?? '')} />
                </div>
              </>
            )}
            {['compliance_check', 'policy', 'policy_enforcement'].includes(module.recordType) && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="requirement">Regulatory / policy requirement</Label>
                <Textarea id="requirement" name="requirement" rows={3} defaultValue={String(editing?.details?.requirement ?? '')} />
              </div>
            )}
            {module.recordType === 'training' && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="training_material">Training material / reference</Label>
                  <Input id="training_material" name="training_material" defaultValue={String(editing?.details?.training_material ?? '')} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="attendance_summary">Attendance / completion summary</Label>
                  <Textarea id="attendance_summary" name="attendance_summary" rows={2} defaultValue={String(editing?.details?.attendance_summary ?? '')} />
                </div>
              </>
            )}
            {module.recordType === 'transaction_review' && (
              <div className="space-y-2">
                <Label htmlFor="amount">Transaction amount</Label>
                <Input id="amount" name="amount" type="number" min="0" step="0.01" defaultValue={editing?.amount ?? ''} />
              </div>
            )}
            {module.recordType !== 'control_test' && (
              <div className="space-y-2">
                <Label htmlFor="event_date">{module.recordType === 'audit' ? 'Scheduled date' : 'Event / review date'}</Label>
                <Input id="event_date" name="event_date" type="date" defaultValue={editing?.event_date ?? ''} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" name="due_date" type="date" defaultValue={editing?.due_date ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_id">Department / process owner</Label>
              <select id="department_id" name="department_id" defaultValue={editing?.department_id ?? ''} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No department assigned</option>
                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner_id">Record owner</Label>
              <select id="owner_id" name="owner_id" defaultValue={editing?.owner_id ?? ''} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No owner assigned</option>
                {profiles.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assigned reviewer / action owner</Label>
              <select id="assigned_to" name="assigned_to" defaultValue={editing?.assigned_to ?? ''} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Unassigned</option>
                {profiles.map(person => <option key={person.id} value={person.id}>{displayName(person)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_module">Related source module</Label>
              <Input id="source_module" name="source_module" placeholder="Finance, Procurement, HR..." defaultValue={editing?.source_module ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_record_id">Source record ID</Label>
              <Input id="source_record_id" name="source_record_id" defaultValue={editing?.source_record_id ?? ''} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="parent_id">Related Internal Control record ID</Label>
              <Input id="parent_id" name="parent_id" defaultValue={editing?.parent_id ?? ''} />
              <p className="text-xs text-gray-500">Link this record to a related risk, audit, finding, incident, or request in this company.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recommendation">Recommendation / investigation findings</Label>
              <Textarea id="recommendation" name="recommendation" rows={2} defaultValue={editing?.recommendation ?? ''} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="corrective_action">Corrective / preventive action</Label>
              <Textarea id="corrective_action" name="corrective_action" rows={2} defaultValue={editing?.corrective_action ?? ''} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="follow_up_result">Follow-up verification result</Label>
              <Textarea id="follow_up_result" name="follow_up_result" rows={2} defaultValue={editing?.follow_up_result ?? ''} />
            </div>
            {editing && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="approval_reason">Approval reason (required for decision)</Label>
                <Textarea id="approval_reason" name="approval_reason" rows={2} defaultValue={editing.approval_reason ?? ''} />
              </div>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="details">Additional notes</Label>
              <Textarea id="details" name="details" rows={2} defaultValue={String(editing?.details?.notes ?? '')} />
            </div>
            {canAddEvidence && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="evidence_file">Supporting document (private, max 10 MB)</Label>
                <Input id="evidence_file" name="evidence_file" type="file" />
              </div>
            )}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={Boolean(busy || (!editing && !canCreate) || (editing && !canEdit))}>
                {busy ? 'Saving…' : editing ? 'Save Changes' : 'Create Record'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{selected?.title ?? 'Record details'}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selected.status} />
                <StatusBadge status={selected.priority} />
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                  {workflowStageLabels[selected.workflow_stage] ?? selected.workflow_stage}
                </span>
                {selected.is_confidential && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-900">Confidential</span>}
              </div>
              {selected.description && <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{selected.description}</p>}
              {selected.record_type === 'risk' && (
                <Card><CardHeader><CardTitle className="text-base">Risk assessment</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>Inherent score: <strong>{selected.inherent_score ?? 'Not scored'} · {selected.inherent_rating ?? ''}</strong></p>
                  <p>Residual score: <strong>{selected.residual_score ?? 'Not scored'} · {selected.residual_rating ?? ''}</strong></p>
                  <p>Likelihood × impact: {selected.likelihood ?? '—'} × {selected.impact ?? '—'}</p>
                  <p>Residual likelihood × impact: {selected.residual_likelihood ?? '—'} × {selected.residual_impact ?? '—'}</p>
                  {selected.mitigation_plan && <p className="whitespace-pre-wrap sm:col-span-2">Mitigation: {selected.mitigation_plan}</p>}
                </CardContent></Card>
              )}
              {selected.source_module && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Source: {selected.source_module} {selected.source_record_id ? `· ${selected.source_record_id}` : ''}
                </p>
              )}
              {selected.approval_reason && <p className="text-sm">Authorization reason: {selected.approval_reason}</p>}
              {selected.corrective_action && <p className="whitespace-pre-wrap text-sm">Corrective action: {selected.corrective_action}</p>}
              {selected.follow_up_result && <p className="whitespace-pre-wrap text-sm">Verification: {selected.follow_up_result}</p>}

              {canSeeEvidence && (
                <section className="space-y-2">
                  <h3 className="font-semibold">Supporting evidence</h3>
                  {evidence.length === 0 ? <p className="text-sm text-gray-500">No evidence attached.</p> : evidence.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate text-sm">{item.file_name}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void openEvidence(item)}>
                        <Download className="mr-1 h-4 w-4" />Open
                      </Button>
                    </div>
                  ))}
                </section>
              )}

              <section className="space-y-2">
                <h3 className="font-semibold">Record history</h3>
                {history.length === 0 ? <p className="text-sm text-gray-500">No history available.</p> : history.map(item => (
                  <div key={item.id} className="border-l-2 border-blue-300 py-1 pl-3 text-sm">
                    <p className="font-medium">{item.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')} · {item.actor_id ?? 'System'}</p>
                  </div>
                ))}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!decision} onOpenChange={open => { if (!open) { setDecision(null); setDecisionRecord(null); setDecisionReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{decision === 'approved' ? 'Approve request' : 'Reject request'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{decisionRecord?.title}</p>
            <Label htmlFor="decision-reason">Decision reason *</Label>
            <Textarea id="decision-reason" value={decisionReason} onChange={event => setDecisionReason(event.target.value)} required rows={4} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDecision(null); setDecisionRecord(null); }}>Cancel</Button>
              <Button onClick={() => void decideApproval()} disabled={busy || !decisionReason.trim()}>
                {busy ? 'Saving…' : decision === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closureRecord} onOpenChange={open => { if (!open) { setClosureRecord(null); setClosureResult(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify corrective action</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{closureRecord?.title}</p>
            <Label htmlFor="closure-result">Independent follow-up result *</Label>
            <Textarea id="closure-result" value={closureResult} onChange={event => setClosureResult(event.target.value)} rows={4} required />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setClosureRecord(null); setClosureResult(''); }}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (closureRecord) await closeRecord(closureRecord, closureResult);
                  setClosureRecord(null);
                  setClosureResult('');
                }}
                disabled={!closureResult.trim()}
              >Verify &amp; Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveTarget} onOpenChange={open => { if (!open) setArchiveTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive Internal Control record?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">{archiveTarget?.title} will be removed from active workspaces but its history will be retained.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button onClick={async () => { if (archiveTarget) await archiveRecord(archiveTarget); setArchiveTarget(null); }}>Archive</Button>
          </div>
        </DialogContent>
      </Dialog>

      {module.recordType === 'request' && (
        <p className="text-sm text-gray-500">
          Workflow order: request initiation → internal review → risk/compliance assessment → supporting documents → authorization → execution → findings → corrective actions → independent follow-up verification → closure.
          <Link href="/administration/approvals" className="ml-1 text-blue-600 hover:underline">Existing approvals workspace</Link>
        </p>
      )}
    </div>
  );
}
