'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Check, Eye, FileUp, History, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import { qualityPriorities, qualitySeverities, qualityStatuses, makeQualityReference, type QualityModule } from '@/lib/quality';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QualityRecord {
  id: string;
  company_id: string;
  record_type: string;
  record_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  severity: string | null;
  category: string | null;
  product_id: string | null;
  source_module: string | null;
  source_record_id: string | null;
  parent_id: string | null;
  owner_id: string | null;
  due_date: string | null;
  detected_at: string | null;
  closed_at: string | null;
  approval_reason: string | null;
  verification_result: string | null;
  details: Record<string, string>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileOption {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ProductOption { id: string; name: string }
interface QualityEvidence {
  id: string;
  record_id: string;
  object_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}
interface QualityHistory { id: string; action: string; created_at: string; snapshot: QualityRecord }

const EMPTY_FORM = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  severity: '',
  product_id: '',
  owner_id: '',
  due_date: '',
  source_module: '',
  source_record_id: '',
  batch: '',
  requirement: '',
  measurement: '',
  unit: '',
  containment: '',
  root_cause: '',
  action_plan: '',
  verification_criteria: '',
  review_frequency: '',
  approval_reason: '',
};

function profileName(profile?: ProfileOption) {
  if (!profile) return 'Unassigned';
  return profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Unassigned';
}

function isClosed(status: string) {
  return ['closed', 'archived', 'cancelled'].includes(status);
}

export default function QualityWorkspace({ module }: { module: QualityModule }) {
  const { company, user, hasPermission, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin();
  const canView = isAdmin || hasPermission(`${module.permission}.view`);
  const canCreate = isAdmin || hasPermission(`${module.permission}.create`);
  const canEdit = isAdmin || hasPermission(`${module.permission}.edit`);
  const canApprove = isAdmin || hasPermission(`${module.permission}.approve`);
  const canVerify = isAdmin || hasPermission(`${module.permission}.verify`);
  const canArchive = isAdmin || hasPermission(`${module.permission}.archive`);

  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QualityRecord | null>(null);
  const [selected, setSelected] = useState<QualityRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [evidence, setEvidence] = useState<QualityEvidence[]>([]);
  const [history, setHistory] = useState<QualityHistory[]>([]);
  const [decisionReason, setDecisionReason] = useState('');
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!company?.id || !canView) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('quality_records')
      .select('*')
      .eq('company_id', company.id)
      .eq('record_type', module.recordType)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error(`Failed to load ${module.title} records:`, error);
      toast.error(`Unable to load ${module.title.toLowerCase()}`);
      setRecords([]);
    } else {
      setRecords((data ?? []) as QualityRecord[]);
    }
    setLoading(false);
  }, [canView, company?.id, module.recordType, module.title]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!company?.id || !canView) return;
    let active = true;
    void Promise.all([
      supabase.from('profiles').select('id, display_name, first_name, last_name, email').eq('company_id', company.id).eq('is_active', true),
      supabase.from('products').select('id, name').eq('company_id', company.id).order('name'),
    ]).then(([profileResult, productResult]) => {
      if (!active) return;
      if (profileResult.error) {
        console.error('Failed to load quality record owners:', profileResult.error);
        toast.error('Unable to load quality team members');
      } else setProfiles((profileResult.data ?? []) as ProfileOption[]);
      if (productResult.error) {
        console.error('Failed to load quality product references:', productResult.error);
        toast.error('Unable to load products');
      } else setProducts((productResult.data ?? []) as ProductOption[]);
    });
    return () => { active = false; };
  }, [canView, company?.id]);

  const loadDetails = useCallback(async (record: QualityRecord) => {
    setSelected(record);
    const [evidenceResult, historyResult] = await Promise.all([
      supabase.from('quality_evidence').select('*').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }),
      supabase.from('quality_record_history').select('id, action, created_at, snapshot').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }).limit(25),
    ]);
    if (evidenceResult.error) {
      console.error('Failed to load quality evidence:', evidenceResult.error);
      toast.error('Unable to load record evidence');
    } else setEvidence((evidenceResult.data ?? []) as QualityEvidence[]);
    if (historyResult.error) {
      console.error('Failed to load quality history:', historyResult.error);
      toast.error('Unable to load record history');
    } else setHistory((historyResult.data ?? []) as QualityHistory[]);
  }, []);

  const filteredRecords = useMemo(() => records.filter(record =>
    (statusFilter === 'all' || record.status === statusFilter)
    && (priorityFilter === 'all' || record.priority === priorityFilter)
  ), [records, statusFilter, priorityFilter]);

  const overdueCount = records.filter(record => record.due_date && record.due_date < new Date().toISOString().slice(0, 10) && !isClosed(record.status)).length;

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (record: QualityRecord) => {
    setEditing(record);
    setForm({
      ...EMPTY_FORM,
      title: record.title,
      description: record.description ?? '',
      category: record.category ?? '',
      priority: record.priority,
      severity: record.severity ?? '',
      product_id: record.product_id ?? '',
      owner_id: record.owner_id ?? '',
      due_date: record.due_date ?? '',
      source_module: record.source_module ?? '',
      source_record_id: record.source_record_id ?? '',
      approval_reason: record.approval_reason ?? '',
      ...Object.fromEntries(Object.entries(record.details ?? {}).map(([key, value]) => [key, String(value ?? '')])),
    });
    setDialogOpen(true);
  };

  const setField = (field: keyof typeof EMPTY_FORM, value: string) =>
    setForm(current => ({ ...current, [field]: value }));

  const saveRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company?.id || !user?.id) return;
    if (module.recordType === 'capa' && !form.source_record_id.trim()) {
      toast.error('Link a source record before creating a CAPA');
      return;
    }
    setBusy(true);
    const payload = {
      company_id: company.id,
      record_type: module.recordType,
      record_number: editing?.record_number ?? makeQualityReference(module.recordType),
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: editing?.status ?? 'open',
      priority: form.priority,
      severity: form.severity || null,
      category: form.category.trim() || null,
      product_id: form.product_id || null,
      source_module: form.source_module.trim() || null,
      source_record_id: form.source_record_id.trim() || null,
      owner_id: form.owner_id || null,
      due_date: form.due_date || null,
      detected_at: editing?.detected_at ?? new Date().toISOString(),
      approval_reason: editing?.approval_reason ?? null,
      details: {
        batch: form.batch.trim(),
        requirement: form.requirement.trim(),
        measurement: form.measurement.trim(),
        unit: form.unit.trim(),
        containment: form.containment.trim(),
        root_cause: form.root_cause.trim(),
        action_plan: form.action_plan.trim(),
        verification_criteria: form.verification_criteria.trim(),
        review_frequency: form.review_frequency.trim(),
      },
    };
    const result = editing
      ? await supabase.from('quality_records').update(payload).eq('id', editing.id).eq('company_id', company.id).select('*').single()
      : await supabase.from('quality_records').insert({ ...payload, created_by: user.id }).select('*').single();
    if (result.error || !result.data) {
      console.error('Failed to save quality record:', result.error);
      toast.error(result.error?.message || 'Unable to save record');
      setBusy(false);
      return;
    }
    const saved = result.data as QualityRecord;
    await logAuditEvent(company.id, user.id, {
      action: editing ? 'updated' : 'created',
      module: 'quality',
      entity_type: module.recordType,
      record_id: saved.id,
      new_value: { title: saved.title, record_number: saved.record_number },
    });
    if (saved.owner_id && saved.owner_id !== user.id) {
      await sendNotification(company.id, saved.owner_id, {
        title: `Quality assignment: ${saved.title}`,
        message: `You have been assigned to ${saved.record_number}.`,
        type: 'info',
        module: 'quality',
        reference_id: saved.id,
        action_url: module.href,
      });
    }
    toast.success(editing ? 'Quality record updated' : `Record created: ${saved.record_number}`);
    setBusy(false);
    setDialogOpen(false);
    await loadRecords();
    if (selected?.id === saved.id) await loadDetails(saved);
  };

  const changeStatus = async (record: QualityRecord, status: string, reason?: string) => {
    if (!company?.id || !user?.id) return;
    setBusy(true);
    const { error } = await supabase
      .from('quality_records')
      .update({
        status,
        ...(status === 'closed' && reason ? { verification_result: reason } : {}),
        ...(status !== 'closed' && reason ? { approval_reason: reason } : {}),
      })
      .eq('id', record.id)
      .eq('company_id', company.id);
    if (error) {
      console.error(`Failed to change quality status to ${status}:`, error);
      toast.error(error.message || 'Unable to change record status');
      setBusy(false);
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: `status_${status}`,
      module: 'quality',
      entity_type: record.record_type,
      record_id: record.id,
      previous_value: { status: record.status },
      new_value: { status, reason },
    });
    if (['approved', 'rejected'].includes(status) && record.created_by && record.created_by !== user.id) {
      await sendNotification(company.id, record.created_by, {
        title: `Quality record ${status}`,
        message: `${record.record_number}: ${reason || record.title}`,
        type: status === 'approved' ? 'success' : 'warning',
        module: 'quality',
        reference_id: record.id,
        action_url: module.href,
      });
    }
    toast.success(`Record moved to ${status.replace(/_/g, ' ')}`);
    setBusy(false);
    setDecision(null);
    setDecisionReason('');
    await loadRecords();
    if (selected?.id === record.id) await loadDetails({ ...record, status });
  };

  const verifyAndClose = async (record: QualityRecord) => {
    const result = window.prompt('Enter the independent verification result before closing this record:');
    if (!result?.trim()) {
      toast.info('Record closure was cancelled; a verification result is required.');
      return;
    }
    await changeStatus(record, 'closed', result.trim());
  };

  const archiveRecord = async (record: QualityRecord) => {
    if (window.confirm(`Archive ${record.record_number}? Its history will remain available.`)) {
      await changeStatus(record, 'archived');
    }
  };

  const handleDecision = async () => {
    if (!selected || !decisionReason.trim()) {
      toast.error('Enter a reason for this decision');
      return;
    }
    await changeStatus(selected, decision!, decisionReason.trim());
  };

  const uploadEvidence = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selected || !company?.id || !user?.id) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv'];
    if (file.size > 10 * 1024 * 1024 || !allowed.includes(file.type)) {
      toast.error('Choose a PDF, image, text, or CSV file no larger than 10 MB');
      return;
    }
    setBusy(true);
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const path = `${company.id}/${selected.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('quality-evidence').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      console.error('Failed to upload quality evidence:', uploadError);
      toast.error(uploadError.message || 'Unable to upload evidence');
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase.from('quality_evidence').insert({
      company_id: company.id,
      record_id: selected.id,
      object_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    });
    if (insertError) {
      console.error('Failed to register uploaded quality evidence:', insertError);
      toast.error(`File uploaded but could not be registered: ${insertError.message}`);
      setBusy(false);
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: 'evidence_uploaded',
      module: 'quality',
      entity_type: selected.record_type,
      record_id: selected.id,
      new_value: { file_name: file.name },
    });
    toast.success('Evidence uploaded');
    setBusy(false);
    await loadDetails(selected);
  };

  const openEvidence = async (item: QualityEvidence) => {
    const { data, error } = await supabase.storage.from('quality-evidence').createSignedUrl(item.object_path, 60);
    if (error) {
      console.error('Failed to create quality evidence link:', error);
      toast.error(error.message || 'Unable to open evidence');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const columns: Column<QualityRecord>[] = [
    { key: 'record_number', header: 'Reference', sortable: true },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'category', header: 'Category / Process', sortable: true, cell: row => row.category || '-' },
    { key: 'severity', header: 'Severity', sortable: true, cell: row => row.severity ? <StatusBadge status={row.severity} /> : '-' },
    { key: 'priority', header: 'Priority', sortable: true, cell: row => <StatusBadge status={row.priority} /> },
    { key: 'status', header: 'Status', sortable: true, cell: row => <StatusBadge status={row.status} /> },
    { key: 'owner_id', header: 'Owner', cell: row => profileName(profiles.find(profile => profile.id === row.owner_id)) },
    { key: 'due_date', header: 'Due', sortable: true, cell: row => row.due_date || '-' },
    {
      key: 'actions',
      header: 'Actions',
      cell: row => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" aria-label="View details" onClick={() => void loadDetails(row)}><Eye className="h-4 w-4" /></Button>
          {canEdit && !isClosed(row.status) && <Button size="sm" variant="ghost" aria-label="Edit record" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>}
          {canEdit && ['open', 'pending', 'scheduled', 'approved', 'reopened'].includes(row.status) && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus(row, 'in_progress')}>Start</Button>
          )}
          {canEdit && ['in_progress', 'contained', 'failed', 'non_compliant'].includes(row.status) && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeStatus(row, 'awaiting_verification')}>Submit</Button>
          )}
          {canApprove && ['pending', 'under_review'].includes(row.status) && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => { setSelected(row); setDecision('approved'); }}>
              <Check className="mr-1 h-3.5 w-3.5" />Review
            </Button>
          )}
          {canVerify && ['awaiting_verification', 'passed', 'compliant', 'resolved'].includes(row.status) && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void verifyAndClose(row)}>Verify & Close</Button>
          )}
          {canArchive && row.status === 'closed' && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void archiveRecord(row)}>Archive</Button>
          )}
        </div>
      ),
    },
  ];

  if (!canView) {
    return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view this quality module.</div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader title={module.title} description={module.description} breadcrumbs={[{ label: 'Quality Control & Quality Assurance', href: '/quality' }, { label: module.title }]}>
        {canCreate && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New record</Button>}
      </PageHeader>
      {overdueCount > 0 && <p className="text-sm font-medium text-red-600">{overdueCount} open record{overdueCount === 1 ? '' : 's'} past its due date.</p>}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{qualityStatuses.map(status => <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All priorities</SelectItem>{qualityPriorities.map(priority => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={filteredRecords}
        loading={loading}
        searchable
        searchKeys={['record_number', 'title', 'description', 'category', 'status', 'priority', 'severity']}
        emptyTitle={`No ${module.title.toLowerCase()} records`}
        emptyDescription="Create a quality record to begin tracking this activity."
        emptyAction={canCreate ? <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New record</Button> : undefined}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Update ${module.title}` : `Create ${module.title}`}</DialogTitle></DialogHeader>
          <form onSubmit={saveRecord} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-title">Title *</Label><Input id="quality-title" required maxLength={240} value={form.title} onChange={event => setField('title', event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-description">Description / Objective</Label><Textarea id="quality-description" rows={3} value={form.description} onChange={event => setField('description', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="quality-category">Category / Process</Label><Input id="quality-category" value={form.category} onChange={event => setField('category', event.target.value)} /></div>
            <div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={value => setField('priority', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{qualityPriorities.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Severity</Label><Select value={form.severity || 'none'} onValueChange={value => setField('severity', value === 'none' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not classified</SelectItem>{qualitySeverities.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Product / Material</Label><Select value={form.product_id || 'none'} onValueChange={value => setField('product_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Assigned owner</Label><Select value={form.owner_id || 'none'} onValueChange={value => setField('owner_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{profiles.map(profile => <SelectItem key={profile.id} value={profile.id}>{profileName(profile)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="quality-due-date">Target / Review Date</Label><Input id="quality-due-date" type="date" value={form.due_date} onChange={event => setField('due_date', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="quality-batch">Batch / Lot</Label><Input id="quality-batch" value={form.batch} onChange={event => setField('batch', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="quality-source-module">Source module</Label><Input id="quality-source-module" placeholder="manufacturing, procurement, logistics..." value={form.source_module} onChange={event => setField('source_module', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="quality-source-id">Source record ID{module.recordType === 'capa' ? ' *' : ''}</Label><Input id="quality-source-id" required={module.recordType === 'capa'} value={form.source_record_id} onChange={event => setField('source_record_id', event.target.value)} /></div>
            {(['test', 'specification', 'checklist'].includes(module.recordType)) && (
              <>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-requirement">Procedure / Requirement / Criteria</Label><Textarea id="quality-requirement" rows={2} value={form.requirement} onChange={event => setField('requirement', event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="quality-measurement">Actual measurement / result</Label><Input id="quality-measurement" value={form.measurement} onChange={event => setField('measurement', event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="quality-unit">Unit / Acceptable range</Label><Input id="quality-unit" value={form.unit} onChange={event => setField('unit', event.target.value)} /></div>
              </>
            )}
            {(['defect', 'non_conformance', 'incident'].includes(module.recordType)) && (
              <>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-containment">Immediate containment</Label><Textarea id="quality-containment" rows={2} value={form.containment} onChange={event => setField('containment', event.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-root-cause">Root cause / Investigation</Label><Textarea id="quality-root-cause" rows={2} value={form.root_cause} onChange={event => setField('root_cause', event.target.value)} /></div>
              </>
            )}
            {(['capa', 'improvement', 'risk'].includes(module.recordType)) && (
              <>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-actions">Mitigation / Corrective / Improvement plan</Label><Textarea id="quality-actions" rows={3} value={form.action_plan} onChange={event => setField('action_plan', event.target.value)} /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-verification">Verification / Effectiveness criteria</Label><Textarea id="quality-verification" rows={2} value={form.verification_criteria} onChange={event => setField('verification_criteria', event.target.value)} /></div>
              </>
            )}
            {module.recordType === 'compliance' && <div className="space-y-2 sm:col-span-2"><Label htmlFor="quality-requirement">Requirement / Standard reference</Label><Textarea id="quality-requirement" rows={2} value={form.requirement} onChange={event => setField('requirement', event.target.value)} /></div>}
            <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{editing ? 'Save changes' : 'Create record'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) { setSelected(null); setDecision(null); } }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {selected && <>
            <DialogHeader><DialogTitle>{selected.record_number}: {selected.title}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={selected.status} /><StatusBadge status={selected.priority} />{selected.severity && <StatusBadge status={selected.severity} />}</div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.description || 'No description provided.'}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Category</dt><dd>{selected.category || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Owner</dt><dd>{profileName(profiles.find(profile => profile.id === selected.owner_id))}</dd></div>
                <div><dt className="text-muted-foreground">Product</dt><dd>{products.find(product => product.id === selected.product_id)?.name ?? '—'}</dd></div>
                <div><dt className="text-muted-foreground">Batch / lot</dt><dd>{selected.details?.batch || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Target date</dt><dd>{selected.due_date || '—'}</dd></div>
                <div><dt className="text-muted-foreground">Source</dt><dd>{selected.source_module && selected.source_record_id ? `${selected.source_module}: ${selected.source_record_id}` : '—'}</dd></div>
              </dl>
              <div className="grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2">
                {Object.entries(selected.details ?? {}).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt className="font-medium capitalize">{key.replace(/_/g, ' ')}</dt><dd className="whitespace-pre-wrap text-muted-foreground">{value}</dd></div>)}
              </div>
              {decision && <div className="space-y-2 rounded-lg border p-3"><Label htmlFor="decision-reason">Decision reason *</Label><Textarea id="decision-reason" value={decisionReason} onChange={event => setDecisionReason(event.target.value)} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setDecision(null); setDecisionReason(''); }}>Cancel</Button><Button disabled={busy} onClick={() => void handleDecision()}>{decision === 'approved' ? 'Approve' : 'Reject'}</Button>{decision === 'approved' && <Button variant="outline" onClick={() => setDecision('rejected')}>Reject instead</Button>}</div></div>}
              <section className="space-y-2">
                <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><FileUp className="h-4 w-4" />Evidence</h3>
                  {canEdit && <Label className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-muted"><input className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv" disabled={busy} onChange={event => void uploadEvidence(event)} />Upload file</Label>}
                </div>
                {evidence.length ? evidence.map(item => <button key={item.id} className="block text-left text-sm text-blue-600 underline" onClick={() => void openEvidence(item)}>{item.file_name}</button>) : <p className="text-sm text-muted-foreground">No evidence attached.</p>}
              </section>
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4" />Record history</h3>
                {history.length ? history.map(item => <div key={item.id} className="flex justify-between gap-3 border-b py-2 text-sm"><span>{item.action === 'created' ? 'Created record' : `${item.snapshot.status} · ${item.snapshot.title}`}</span><time className="shrink-0 text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time></div>) : <p className="text-sm text-muted-foreground">No history available.</p>}
              </section>
              {canApprove && !decision && ['pending', 'under_review'].includes(selected.status) && <Button onClick={() => setDecision('approved')}><ShieldCheck className="mr-2 h-4 w-4" />Review decision</Button>}
              {canVerify && ['awaiting_verification', 'passed', 'compliant', 'resolved'].includes(selected.status) && <Button disabled={busy} onClick={() => void verifyAndClose(selected)}>Verify and close</Button>}
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
