'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Eye, FileWarning, History, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Inspection {
  id: string;
  company_id: string;
  inspection_number: string;
  inspection_title: string | null;
  inspection_type: string;
  reference_type: string | null;
  reference_id: string | null;
  product_id: string | null;
  work_order_id: string | null;
  production_run_id: string | null;
  inspection_date: string;
  inspector_id: string | null;
  status: string;
  result: string | null;
  defects_found: number | null;
  defect_details: string | null;
  corrective_actions: string | null;
  notes: string | null;
  batch_number: string | null;
  sampling_details: string | null;
  reviewer_id: string | null;
  approval_status: string;
  approval_reason: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
interface Option { id: string; name: string }
interface UserOption { id: string; first_name: string | null; last_name: string | null; display_name: string | null; email: string | null }
interface InspectionHistory { id: string; snapshot: Inspection; actor_id: string | null; created_at: string }
interface InspectionEvidence {
  id: string;
  object_path: string;
  file_name: string;
  created_at: string;
}

const EMPTY = {
  inspection_title: '',
  inspection_type: 'incoming',
  product_id: '',
  work_order_id: '',
  production_run_id: '',
  inspection_date: new Date().toISOString().slice(0, 10),
  inspector_id: '',
  batch_number: '',
  sampling_details: '',
  result: '',
  defects_found: '0',
  defect_details: '',
  corrective_actions: '',
  notes: '',
  checklist: '',
};

function userLabel(user?: UserOption) {
  return user?.display_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Unassigned';
}

function makeReference() {
  return `QI-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export default function QualityInspectionsWorkspace() {
  const { company, user, hasPermission, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin();
  const canView = isAdmin || hasPermission('quality.inspections.view') || hasPermission('manufacturing.quality.view');
  const canCreate = isAdmin || hasPermission('quality.inspections.create') || hasPermission('manufacturing.quality.create');
  const canEdit = isAdmin || hasPermission('quality.inspections.edit') || hasPermission('manufacturing.quality.edit');
  const canApprove = isAdmin || hasPermission('quality.inspections.approve') || hasPermission('manufacturing.quality.approve');
  const canCreateNcr = isAdmin || hasPermission('quality.non_conformances.create');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [workOrders, setWorkOrders] = useState<Option[]>([]);
  const [runs, setRuns] = useState<Option[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Inspection | null>(null);
  const [selected, setSelected] = useState<Inspection | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [decisionReason, setDecisionReason] = useState('');
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'changes_requested' | null>(null);
  const [history, setHistory] = useState<InspectionHistory[]>([]);
  const [evidence, setEvidence] = useState<InspectionEvidence[]>([]);
  const [checklists, setChecklists] = useState<Array<{ id: string; checklist_item: string; result: string | null; notes: string | null }>>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!company?.id || !canView) {
      setInspections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [inspectionResult, productResult, orderResult, runResult, profileResult] = await Promise.all([
      supabase.from('quality_inspections').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('products').select('id, name').eq('company_id', company.id).order('name'),
      supabase.from('work_orders').select('id, work_order_number').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('production_runs').select('id, run_number').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name, display_name, email').eq('company_id', company.id).eq('is_active', true),
    ]);
    if (inspectionResult.error) {
      console.error('Failed to load QC/QA inspections:', inspectionResult.error);
      toast.error('Unable to load inspections');
      setInspections([]);
    } else setInspections((inspectionResult.data ?? []) as Inspection[]);
    if (productResult.error) {
      console.error('Failed to load inspection product options:', productResult.error);
      toast.error('Unable to load products');
    } else setProducts((productResult.data ?? []) as Option[]);
    if (orderResult.error) {
      console.error('Failed to load inspection work orders:', orderResult.error);
      toast.error('Unable to load work orders');
    } else setWorkOrders((orderResult.data ?? []).map(row => ({ id: row.id, name: row.work_order_number })));
    if (runResult.error) {
      console.error('Failed to load inspection production runs:', runResult.error);
      toast.error('Unable to load production runs');
    } else setRuns((runResult.data ?? []).map(row => ({ id: row.id, name: row.run_number })));
    if (profileResult.error) {
      console.error('Failed to load inspection users:', profileResult.error);
      toast.error('Unable to load inspectors');
    } else setUsers((profileResult.data ?? []) as UserOption[]);
    setLoading(false);
  }, [canView, company?.id]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    pending: inspections.filter(item => item.approval_status === 'pending').length,
    passed: inspections.filter(item => item.result === 'pass' || item.status === 'passed').length,
    failed: inspections.filter(item => item.result === 'fail' || item.status === 'failed').length,
  }), [inspections]);

  const setField = (field: keyof typeof EMPTY, value: string) => setForm(current => ({ ...current, [field]: value }));

  const openNew = () => {
    setEditRecord(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };

  const openEdit = (record: Inspection) => {
    if (record.approval_status === 'approved') {
      toast.error('Approved inspections are locked; create a linked follow-up inspection for revisions');
      return;
    }
    setEditRecord(record);
    setForm({
      inspection_title: record.inspection_title ?? '',
      inspection_type: record.inspection_type,
      product_id: record.product_id ?? '',
      work_order_id: record.work_order_id ?? '',
      production_run_id: record.production_run_id ?? '',
      inspection_date: record.inspection_date,
      inspector_id: record.inspector_id ?? '',
      batch_number: record.batch_number ?? '',
      sampling_details: record.sampling_details ?? '',
      result: record.result ?? '',
      defects_found: String(record.defects_found ?? 0),
      defect_details: record.defect_details ?? '',
      corrective_actions: record.corrective_actions ?? '',
      notes: record.notes ?? '',
      checklist: '',
    });
    setDialogOpen(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company?.id || !user?.id) return;
    setBusy(true);
    const resultValue = form.result || null;
    const payload = {
      inspection_title: form.inspection_title.trim() || null,
      inspection_type: form.inspection_type,
      product_id: form.product_id || null,
      work_order_id: form.work_order_id || null,
      production_run_id: form.production_run_id || null,
      inspection_date: form.inspection_date,
      inspector_id: form.inspector_id || null,
      batch_number: form.batch_number.trim() || null,
      sampling_details: form.sampling_details.trim() || null,
      result: resultValue,
      ...(editRecord?.approval_status === 'changes_requested' ? { approval_status: 'pending' } : {}),
      status: resultValue === 'pass' ? 'passed' : resultValue === 'fail' ? 'failed' : resultValue === 'conditional' ? 'conditional' : editRecord?.status === 'pending' ? 'in_progress' : (editRecord?.status ?? 'pending'),
      defects_found: Number(form.defects_found) || 0,
      defect_details: form.defect_details.trim() || null,
      corrective_actions: form.corrective_actions.trim() || null,
      notes: form.notes.trim() || null,
      completed_at: resultValue ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const savedResult = editRecord
      ? await supabase.from('quality_inspections').update(payload).eq('id', editRecord.id).eq('company_id', company.id).select('*').single()
      : await supabase.from('quality_inspections').insert({
        ...payload,
        company_id: company.id,
        inspection_number: makeReference(),
        status: resultValue === 'pass' ? 'passed' : resultValue === 'fail' ? 'failed' : resultValue === 'conditional' ? 'conditional' : 'pending',
        approval_status: 'pending',
        created_by: user.id,
      }).select('*').single();
    if (savedResult.error || !savedResult.data) {
      console.error('Failed to save quality inspection:', savedResult.error);
      toast.error(savedResult.error?.message || 'Unable to save inspection');
      setBusy(false);
      return;
    }
    const saved = savedResult.data as Inspection;
    const checklistLines = form.checklist.split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]);
    if (checklistLines.length) {
      const { error: checklistError } = await supabase.from('manufacturing_inspection_checklist_items').insert(checklistLines.map(parts => ({
        company_id: company.id,
        inspection_id: saved.id,
        checklist_item: parts[0],
        result: ['pass', 'fail', 'na'].includes(parts[1]) ? parts[1] : null,
        notes: parts.slice(2).join('|') || null,
      })));
      if (checklistError) {
        console.error('Inspection saved but checklist results failed:', checklistError);
        toast.error(`Inspection saved, but checklist results failed: ${checklistError.message}`);
      }
    }
    await logAuditEvent(company.id, user.id, {
      action: editRecord ? 'updated' : 'created',
      module: 'quality',
      entity_type: 'quality_inspection',
      record_id: saved.id,
      new_value: { inspection_number: saved.inspection_number, result: saved.result, status: saved.status },
    });
    toast.success(editRecord ? 'Inspection updated' : `Inspection created: ${saved.inspection_number}`);
    setBusy(false);
    setDialogOpen(false);
    setEditRecord(null);
    await load();
  };

  const openDetails = async (record: Inspection) => {
    setSelected(record);
    const [historyResult, checklistResult, evidenceResult] = await Promise.all([
      supabase.from('quality_inspection_history').select('id, actor_id, snapshot, created_at').eq('company_id', record.company_id).eq('inspection_id', record.id).order('created_at', { ascending: false }).limit(25),
      supabase.from('manufacturing_inspection_checklist_items').select('id, checklist_item, result, notes').eq('company_id', record.company_id).eq('inspection_id', record.id).order('created_at'),
      supabase.from('quality_evidence').select('id, object_path, file_name, created_at').eq('company_id', record.company_id).eq('inspection_id', record.id).order('created_at', { ascending: false }),
    ]);
    if (historyResult.error) {
      console.error('Failed to load inspection history:', historyResult.error);
      toast.error('Unable to load inspection history');
    } else setHistory((historyResult.data ?? []) as InspectionHistory[]);
    if (checklistResult.error) {
      console.error('Failed to load inspection checklist:', checklistResult.error);
      toast.error('Unable to load checklist results');
    } else setChecklists(checklistResult.data ?? []);
    if (evidenceResult.error) {
      console.error('Failed to load inspection evidence:', evidenceResult.error);
      toast.error('Unable to load inspection evidence');
    } else setEvidence((evidenceResult.data ?? []) as InspectionEvidence[]);
  };

  const uploadEvidence = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selected || !company?.id || !user?.id) return;
    if (!canEdit || ['approved', 'rejected'].includes(selected.approval_status)) {
      toast.error('Evidence cannot be added to a locked inspection');
      return;
    }
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
      console.error('Failed to upload inspection evidence:', uploadError);
      toast.error(uploadError.message || 'Unable to upload evidence');
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase.from('quality_evidence').insert({
      company_id: company.id,
      inspection_id: selected.id,
      object_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: user.id,
    });
    if (insertError) {
      console.error('Uploaded inspection evidence could not be registered:', insertError);
      toast.error(`File uploaded but could not be registered: ${insertError.message}`);
      setBusy(false);
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: 'evidence_uploaded',
      module: 'quality',
      entity_type: 'quality_inspection',
      record_id: selected.id,
      new_value: { file_name: file.name },
    });
    toast.success('Evidence uploaded');
    setBusy(false);
    await openDetails(selected);
  };

  const openEvidence = async (item: InspectionEvidence) => {
    const { data, error } = await supabase.storage.from('quality-evidence').createSignedUrl(item.object_path, 60);
    if (error) {
      console.error('Failed to create inspection evidence link:', error);
      toast.error(error.message || 'Unable to open evidence');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const decide = async () => {
    if (!selected || !decision || !company?.id || !user?.id || !decisionReason.trim()) {
      toast.error('Enter a review reason before deciding');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('quality_inspections').update({
      approval_status: decision,
      approval_reason: decisionReason.trim(),
      approved_by: user.id,
      reviewer_id: user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', selected.id).eq('company_id', company.id);
    if (error) {
      console.error('Failed to review quality inspection:', error);
      toast.error(error.message || 'Unable to save review decision');
      setBusy(false);
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: `inspection_${decision}`,
      module: 'quality',
      entity_type: 'quality_inspection',
      record_id: selected.id,
      new_value: { approval_reason: decisionReason.trim() },
    });
    if (selected.created_by && selected.created_by !== user.id) {
      await sendNotification(company.id, selected.created_by, {
        title: `Inspection ${decision.replace(/_/g, ' ')}`,
        message: `${selected.inspection_number}: ${decisionReason.trim()}`,
        type: decision === 'approved' ? 'success' : 'warning',
        module: 'quality',
        reference_id: selected.id,
        action_url: '/quality/inspections',
      });
    }
    toast.success(`Inspection ${decision.replace(/_/g, ' ')}`);
    setBusy(false);
    setDecision(null);
    setDecisionReason('');
    setSelected(null);
    await load();
  };

  const createNcr = async (inspection: Inspection) => {
    if (!company?.id || !user?.id || !canCreateNcr) return;
    const { error } = await supabase.from('quality_records').insert({
      company_id: company.id,
      record_type: 'non_conformance',
      record_number: `QNCR-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      title: `Non-conformance from ${inspection.inspection_number}`,
      description: inspection.defect_details || `Inspection result recorded as ${inspection.result ?? inspection.status}.`,
      status: 'open',
      priority: inspection.result === 'fail' ? 'high' : 'medium',
      severity: inspection.result === 'fail' ? 'major' : null,
      product_id: inspection.product_id,
      source_module: 'quality_inspections',
      source_record_id: inspection.id,
      owner_id: inspection.inspector_id,
      created_by: user.id,
      details: { batch: inspection.batch_number ?? '', containment: inspection.corrective_actions ?? '' },
    });
    if (error) {
      console.error('Failed to create linked non-conformance:', error);
      toast.error(error.message || 'Unable to create non-conformance');
      return;
    }
    await logAuditEvent(company.id, user.id, {
      action: 'non_conformance_created',
      module: 'quality',
      entity_type: 'quality_inspection',
      record_id: inspection.id,
      new_value: { source: 'quality_inspections' },
    });
    toast.success('Linked non-conformance report created');
  };

  const columns: Column<Inspection>[] = [
    { key: 'inspection_number', header: 'Reference', sortable: true },
    { key: 'inspection_title', header: 'Inspection', sortable: true, cell: row => row.inspection_title || row.inspection_type.replace(/_/g, ' ') },
    { key: 'inspection_type', header: 'Type', sortable: true, cell: row => row.inspection_type.replace(/_/g, ' ') },
    { key: 'batch_number', header: 'Batch / Lot', sortable: true, cell: row => row.batch_number || '—' },
    { key: 'inspection_date', header: 'Date', sortable: true },
    { key: 'result', header: 'Result', sortable: true, cell: row => row.result ? <StatusBadge status={row.result} /> : 'Pending' },
    { key: 'approval_status', header: 'Review', sortable: true, cell: row => <StatusBadge status={row.approval_status} /> },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" aria-label="View inspection" onClick={() => void openDetails(row)}><Eye className="h-4 w-4" /></Button>
      {canEdit && !['approved', 'rejected'].includes(row.approval_status) && <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button>}
      {canApprove && row.approval_status === 'pending' && <Button size="sm" variant="outline" onClick={() => { setSelected(row); setDecision('approved'); }}>Review</Button>}
      {canCreateNcr && row.result === 'fail' && <Button size="sm" variant="outline" onClick={() => void createNcr(row)}><FileWarning className="mr-1 h-4 w-4" />NCR</Button>}
    </div> },
  ];

  if (!canView) return <div className="p-6 text-sm text-muted-foreground">You do not have permission to view inspections.</div>;

  return <div className="space-y-5">
    <PageHeader title="Inspection Management" description="Create, assign, perform, review, and retain quality inspection results. Manufacturing work orders, runs, products, and inspection records are reused." breadcrumbs={[{ label: 'Quality Control & Quality Assurance', href: '/quality' }, { label: 'Inspection Management' }]}>
      {canCreate && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New inspection</Button>}
    </PageHeader>
    <div className="grid gap-3 sm:grid-cols-3">
      {[['Pending review', counts.pending], ['Passed', counts.passed], ['Failed', counts.failed]].map(([label, count]) => <div key={String(label)} className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{loading ? '…' : count}</p></div>)}
    </div>
    <DataTable columns={columns} data={inspections} loading={loading} searchable searchKeys={['inspection_number', 'inspection_title', 'inspection_type', 'batch_number', 'status', 'result']} emptyTitle="No inspections recorded" emptyDescription="Inspection records created here are shared with Manufacturing & Warehouse." rowKey="id" />

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{editRecord ? `Update ${editRecord.inspection_number}` : 'New quality inspection'}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Inspection title</Label><Input required value={form.inspection_title} onChange={event => setField('inspection_title', event.target.value)} /></div>
          <div className="space-y-2"><Label>Inspection type</Label><Select value={form.inspection_type} onValueChange={value => setField('inspection_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[['incoming', 'Incoming material'], ['in_process', 'In-process'], ['finished_goods', 'Finished goods'], ['equipment', 'Equipment'], ['other', 'Other']].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Inspection date</Label><Input required type="date" value={form.inspection_date} onChange={event => setField('inspection_date', event.target.value)} /></div>
          <div className="space-y-2"><Label>Product / Material</Label><Select value={form.product_id || 'none'} onValueChange={value => setField('product_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{products.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Batch / Lot</Label><Input value={form.batch_number} onChange={event => setField('batch_number', event.target.value)} /></div>
          <div className="space-y-2"><Label>Work order</Label><Select value={form.work_order_id || 'none'} onValueChange={value => setField('work_order_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{workOrders.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Production run</Label><Select value={form.production_run_id || 'none'} onValueChange={value => setField('production_run_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{runs.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Inspector</Label><Select value={form.inspector_id || 'none'} onValueChange={value => setField('inspector_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Assign inspector" /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{users.map(item => <SelectItem key={item.id} value={item.id}>{userLabel(item)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Sampling details</Label><Input value={form.sampling_details} onChange={event => setField('sampling_details', event.target.value)} placeholder="Sample size, method, selection" /></div>
          <div className="space-y-2"><Label>Inspection result</Label><Select value={form.result || 'none'} onValueChange={value => setField('result', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="Not completed" /></SelectTrigger><SelectContent><SelectItem value="none">Not completed</SelectItem><SelectItem value="pass">Pass</SelectItem><SelectItem value="fail">Fail</SelectItem><SelectItem value="conditional">Conditional</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Defects found</Label><Input type="number" min="0" step="1" value={form.defects_found} onChange={event => setField('defects_found', event.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Defect summary</Label><Textarea rows={2} value={form.defect_details} onChange={event => setField('defect_details', event.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Containment / corrective action</Label><Textarea rows={2} value={form.corrective_actions} onChange={event => setField('corrective_actions', event.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Inspection checklist results (one per line: criterion | pass/fail/na | notes)</Label><Textarea rows={4} value={form.checklist} onChange={event => setField('checklist', event.target.value)} placeholder={'Dimensions | pass | Within tolerance\nSurface finish | fail | Scratches found'} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Remarks</Label><Textarea rows={2} value={form.notes} onChange={event => setField('notes', event.target.value)} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button disabled={busy}>{editRecord ? 'Save changes' : 'Create inspection'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) { setSelected(null); setDecision(null); } }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {selected && <>
          <DialogHeader><DialogTitle>{selected.inspection_number} · {selected.inspection_title || selected.inspection_type.replace(/_/g, ' ')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><StatusBadge status={selected.status} />{selected.result && <StatusBadge status={selected.result} />}<StatusBadge status={selected.approval_status} /></div>
            <p className="text-sm">Product: {products.find(item => item.id === selected.product_id)?.name ?? '—'} · Batch: {selected.batch_number || '—'}</p>
            <p className="text-sm">Inspector: {userLabel(users.find(item => item.id === selected.inspector_id))} · Date: {selected.inspection_date}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected.defect_details || selected.notes || 'No remarks recorded.'}</p>
            {checklists.length > 0 && <section className="space-y-2"><h3 className="font-semibold">Recorded checklist results</h3>{checklists.map(item => <div key={item.id} className="flex justify-between gap-3 border-b py-1 text-sm"><span>{item.checklist_item}{item.notes ? ` — ${item.notes}` : ''}</span>{item.result && <StatusBadge status={item.result} />}</div>)}</section>}
            <section className="space-y-2">
              <h3 className="font-semibold">Evidence</h3>
              {evidence.length ? evidence.map(item => <Button key={item.id} type="button" variant="link" className="h-auto p-0" onClick={() => void openEvidence(item)}>{item.file_name}</Button>) : <p className="text-sm text-muted-foreground">No evidence attached.</p>}
              {canEdit && !['approved', 'rejected'].includes(selected.approval_status) && <div className="space-y-1">
                <Label htmlFor="inspection-evidence">Add evidence (PDF, image, text, or CSV; max 10 MB)</Label>
                <Input id="inspection-evidence" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv" disabled={busy} onChange={event => void uploadEvidence(event)} />
              </div>}
            </section>
            {selected.result === 'fail' && canCreateNcr && <Button variant="outline" onClick={() => void createNcr(selected)}><FileWarning className="mr-2 h-4 w-4" />Create linked non-conformance</Button>}
            {canApprove && selected.approval_status === 'pending' && !decision && <Button onClick={() => setDecision('approved')}><ShieldCheck className="mr-2 h-4 w-4" />Review inspection</Button>}
            {decision && <div className="space-y-2 rounded-md border p-3">
              <Label>Review decision</Label>
              <Select value={decision} onValueChange={value => setDecision(value as 'approved' | 'rejected' | 'changes_requested')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="approved">Approve</SelectItem><SelectItem value="changes_requested">Return for correction</SelectItem><SelectItem value="rejected">Reject</SelectItem></SelectContent>
              </Select>
              <Label>Decision reason *</Label>
              <Textarea value={decisionReason} onChange={event => setDecisionReason(event.target.value)} />
              <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => { setDecision(null); setDecisionReason(''); }}>Cancel</Button><Button disabled={busy} onClick={() => void decide()}>Confirm {decision.replace(/_/g, ' ')}</Button></div>
            </div>}
            <section className="space-y-2"><h3 className="flex items-center gap-2 font-semibold"><History className="h-4 w-4" />History</h3>{history.map(item => <div key={item.id} className="border-b py-2 text-sm"><span>{item.snapshot.result || item.snapshot.status} · {item.snapshot.approval_status}</span><span className="float-right text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span></div>)}</section>
          </div>
        </>}
      </DialogContent>
    </Dialog>
  </div>;
}
