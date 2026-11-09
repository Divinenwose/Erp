'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, CalendarClock, FileText, Plus, Scale, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type LegalAttachment, type LegalRecord } from '@/lib/supabase';
import { legalModules, legalPriorities, legalStatuses, getLegalModule, getLegalRecordPermission, isLegalRecordOpen, makeLegalReference, type LegalRecordType } from '@/lib/legal';
import { logAuditEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LegalForm {
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  department_id: string;
  assigned_to: string;
  due_date: string;
  start_date: string;
  end_date: string;
  renewal_date: string;
  contract_value: string;
  currency: string;
  risk_level: string;
  details: string;
}

interface ProfileOption {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface DepartmentOption { id: string; name: string }
interface ApprovalItem {
  id: string;
  request_id: string;
  stage_id: string;
  created_at: string;
  status: string;
  approval_stages: { stage_name: string; stage_order: number; approver_role: string | null } | null;
}

const EMPTY_FORM: LegalForm = {
  title: '', description: '', category: '', priority: 'medium', status: 'submitted',
  department_id: '', assigned_to: '', due_date: '', start_date: '', end_date: '',
  renewal_date: '', contract_value: '', currency: '', risk_level: '', details: '{}',
};
const EMPTY_RECORD_TYPES: LegalRecordType[] = [];
const PAGE_SIZE = 25;

function profileName(profile?: ProfileOption) {
  if (!profile) return 'Unassigned';
  return profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Unassigned';
}

function shortDate(value: string | null) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : '—';
}

function csvCell(value: unknown) {
  const stringValue = value == null ? '' : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export default function LegalWorkspace({ moduleKey }: { moduleKey?: string }) {
  const pathname = usePathname();
  const currentKey = moduleKey ?? (pathname === '/legal' ? '' : pathname.split('/').filter(Boolean).at(-1) ?? '');
  const isDashboard = currentKey === '';
  const isReports = currentKey === 'reports';
  const moduleConfig = isDashboard ? null : getLegalModule(currentKey);
  const { company, user, hasPermission, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin();
  const canDashboard = isAdmin || hasPermission('legal.dashboard.view');
  const canView = isAdmin || (!!moduleConfig && hasPermission(`${moduleConfig.permission}.view`))
    || (currentKey === 'employment' && hasPermission('hr.employment_matters.view'))
    || (currentKey === 'requests' && (isAdmin || hasPermission('legal.requests.create')));
  const canCreate = !!moduleConfig?.recordTypes.length && (isAdmin || hasPermission(`${moduleConfig.permission}.create`)
    || (currentKey === 'employment' && hasPermission('hr.employment_matters.create')));
  const canEdit = !!moduleConfig && (isAdmin || hasPermission(`${moduleConfig.permission}.edit`)
    || (currentKey === 'employment' && hasPermission('hr.employment_matters.edit')));
  const canReview = !!moduleConfig && (isAdmin || hasPermission(`${moduleConfig.permission}.review`));
  const canAssign = !!moduleConfig && (isAdmin || hasPermission(`${moduleConfig.permission}.edit`)
    || hasPermission(`${moduleConfig.permission}.review`));
  const canApprove = !!moduleConfig && (isAdmin || hasPermission(`${moduleConfig.permission}.approve`));
  const canExport = isAdmin || hasPermission('legal.reports.export');
  const [records, setRecords] = useState<LegalRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [attachments, setAttachments] = useState<LegalAttachment[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LegalRecord | null>(null);
  const [selected, setSelected] = useState<LegalRecord | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; action: string; created_at: string }>>([]);
  const [form, setForm] = useState<LegalForm>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [decisionComments, setDecisionComments] = useState('');
  const [page, setPage] = useState(0);

  const recordTypes = moduleConfig?.recordTypes ?? EMPTY_RECORD_TYPES;
  const recordsPermission = isDashboard ? canDashboard : canView || (isReports && canExport);

  const loadRecords = useCallback(async () => {
    if (!company?.id || !recordsPermission) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (currentKey === 'approvals') {
      const allApprovals: ApprovalItem[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from('request_approvals')
          .select('id, request_id, stage_id, created_at, status, approval_stages(stage_name, stage_order, approver_role)')
          .eq('company_id', company.id)
          .eq('request_type', 'legal')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .range(offset, offset + 999);
        if (error) {
          console.error('Failed to load Legal approvals:', error);
          toast.error('Unable to load Legal approvals');
          setApprovalItems([]);
          setRecords([]);
          setLoading(false);
          return;
        }
        allApprovals.push(...((data ?? []) as unknown as ApprovalItem[]));
        if (!data || data.length < 1000) break;
      }
      setApprovalItems(allApprovals);
      const ids = Array.from(new Set(allApprovals.map(item => item.request_id)));
      if (ids.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }
      const approvalRecords: LegalRecord[] = [];
      for (let offset = 0; offset < ids.length; offset += 1000) {
        const { data, error } = await supabase.from('legal_records').select('*').eq('company_id', company.id).in('id', ids.slice(offset, offset + 1000));
        if (error) {
          console.error('Failed to load Legal records awaiting approval:', error);
          toast.error('Unable to load records awaiting approval');
          setRecords([]);
          setLoading(false);
          return;
        }
        approvalRecords.push(...(data ?? []));
      }
      setRecords(approvalRecords);
      setLoading(false);
      return;
    }
    setApprovalItems([]);
    const allRecords: LegalRecord[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = supabase.from('legal_records').select('*').eq('company_id', company.id);
      if (recordTypes.length) query = query.in('record_type', recordTypes);
      const { data, error } = await query.order('updated_at', { ascending: false }).range(offset, offset + 999);
      if (error) {
        console.error('Failed to load Legal records:', error);
        toast.error('Unable to load Legal records');
        setRecords([]);
        setLoading(false);
        return;
      }
      allRecords.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    setRecords(allRecords);
    setLoading(false);
  }, [company?.id, currentKey, recordsPermission, recordTypes]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  useEffect(() => {
    if (!company?.id || !recordsPermission) return;
    let active = true;
    void Promise.all([
      supabase.from('profiles').select('id, display_name, first_name, last_name, email').eq('company_id', company.id).eq('is_active', true).order('first_name'),
      supabase.from('departments').select('id, name').eq('company_id', company.id).eq('is_active', true).order('name'),
    ]).then(([profileResult, departmentResult]) => {
      if (!active) return;
      if (profileResult.error) {
        console.error('Failed to load Legal assignees:', profileResult.error);
        toast.error('Unable to load Legal assignees');
      } else setProfiles(profileResult.data ?? []);
      if (departmentResult.error) {
        console.error('Failed to load Legal departments:', departmentResult.error);
        toast.error('Unable to load departments');
      } else setDepartments(departmentResult.data ?? []);
    });
    return () => { active = false; };
  }, [company?.id, recordsPermission]);

  const filteredRecords = useMemo(() => records.filter(record =>
    (statusFilter === 'all' || record.status === statusFilter)
    && (!search || `${record.reference} ${record.title} ${record.category ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    && (departmentFilter === 'all' || record.department_id === departmentFilter)
    && (assignedFilter === 'all' || record.assigned_to === assignedFilter)
    && (riskFilter === 'all' || record.risk_level === riskFilter)
    && (!categoryFilter || (record.category ?? '').toLowerCase().includes(categoryFilter.toLowerCase()))
    && (!dateFrom || record.created_at.slice(0, 10) >= dateFrom)
    && (!dateTo || record.created_at.slice(0, 10) <= dateTo)
  ), [records, search, statusFilter, departmentFilter, assignedFilter, riskFilter, categoryFilter, dateFrom, dateTo]);
  const pagedRecords = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

  useEffect(() => { setPage(0); }, [currentKey, search, statusFilter, departmentFilter, assignedFilter, riskFilter, categoryFilter, dateFrom, dateTo]);

  const openNew = () => {
    if (!moduleConfig || !canCreate) return;
    setEditing(null);
    setForm({ ...EMPTY_FORM, status: currentKey === 'requests' ? 'submitted' : 'draft' });
    setDialogOpen(true);
  };

  const openEdit = (record: LegalRecord) => {
    setEditing(record);
    setSelected(record);
    setForm({
      title: record.title,
      description: record.description ?? '',
      category: record.category ?? '',
      priority: record.priority,
      status: record.status,
      department_id: record.department_id ?? '',
      assigned_to: record.assigned_to ?? '',
      due_date: record.due_date ?? '',
      start_date: record.start_date ?? '',
      end_date: record.end_date ?? '',
      renewal_date: record.renewal_date ?? '',
      contract_value: record.contract_value == null ? '' : String(record.contract_value),
      currency: record.currency ?? '',
      risk_level: record.risk_level ?? '',
      details: JSON.stringify(record.details ?? {}, null, 2),
    });
    setDialogOpen(true);
  };

  const loadRecordDetails = async (record: LegalRecord) => {
    setSelected(record);
    const [attachmentResult, historyResult] = await Promise.all([
      supabase.from('legal_attachments').select('*').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }),
      supabase.from('legal_record_history').select('id, action, created_at').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }).limit(30),
    ]);
    if (attachmentResult.error) {
      console.error('Failed to load Legal attachments:', attachmentResult.error);
      toast.error('Unable to load document list');
    } else setAttachments(attachmentResult.data ?? []);
    if (historyResult.error) {
      console.error('Failed to load Legal history:', historyResult.error);
      toast.error('Unable to load record history');
    } else setHistory(historyResult.data ?? []);
  };

  const saveRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!moduleConfig || !company?.id || !user?.id) return;
    let details: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(form.details || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        toast.error('Additional details must be a JSON object');
        return;
      }
      details = parsed as Record<string, unknown>;
    } catch {
      toast.error('Additional details must contain valid JSON');
      return;
    }
    if (form.contract_value && (!Number.isFinite(Number(form.contract_value)) || Number(form.contract_value) < 0)) {
      toast.error('Contract value must be a valid non-negative amount');
      return;
    }
    setBusy(true);
    const existing = editing;
    const values = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      priority: form.priority,
      status: form.status,
      department_id: form.department_id || null,
      assigned_to: canAssign ? form.assigned_to || null : existing?.assigned_to ?? null,
      due_date: form.due_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      renewal_date: form.renewal_date || null,
      contract_value: form.contract_value ? Number(form.contract_value) : null,
      currency: form.currency.trim().toUpperCase() || null,
      risk_level: form.risk_level || null,
      details,
    };

    const result = existing
      ? await supabase.from('legal_records').update(values).eq('id', existing.id).eq('company_id', company.id).select('*').single()
      : await supabase.from('legal_records').insert({
        ...values,
        company_id: company.id,
        record_type: moduleConfig.recordTypes[0] as LegalRecordType,
        reference: makeLegalReference(moduleConfig.recordTypes[0] as LegalRecordType),
        created_by: user.id,
        requester_id: moduleConfig.recordTypes[0] === 'request' ? user.id : null,
        owner_id: user.id,
        status: form.status,
      }).select('*').single();

    if (result.error) {
      console.error('Failed to save Legal record:', result.error);
      toast.error(result.error.message || 'Unable to save Legal record');
      setBusy(false);
      return;
    }
    const saved = result.data;
    void logAuditEvent(company.id, user.id, {
      action: existing ? 'legal_record_updated' : 'legal_record_created',
      module: 'legal',
      entity_type: saved.record_type,
      entity_id: saved.id,
      previous_value: existing ? { status: existing.status, title: existing.title } : undefined,
      new_value: { reference: saved.reference, status: saved.status, title: saved.title },
    });
    if (existing?.requester_id && existing.requester_id !== user.id && existing.assigned_to !== saved.assigned_to) {
      void sendNotification(company.id, existing.requester_id, {
        title: 'Legal request updated',
        message: `Your request ${saved.reference} has been updated.`,
        type: 'info',
        module: 'legal',
        reference_id: saved.id,
        action_url: '/legal/requests',
      });
    }
    toast.success(existing ? 'Legal record updated' : 'Legal record created');
    setBusy(false);
    setDialogOpen(false);
    setEditing(null);
    await loadRecords();
  };

  const updateDecision = async (record: LegalRecord, approval: ApprovalItem, decision: 'approved' | 'rejected') => {
    if (!company?.id || !user?.id) return;
    const resource = getLegalRecordPermission(record.record_type);
    if (!isAdmin && !hasPermission(`${resource}.approve`)) {
      toast.error('You do not have approval permission for this record');
      return;
    }
    const { error } = await supabase.rpc('legal_decide_approval', {
      p_approval_id: approval.id,
      p_decision: decision,
      p_comments: decisionComments,
    });
    if (error) {
      console.error('Failed to record Legal decision:', error);
      toast.error(error.message || 'Unable to record decision');
      return;
    }
    void logAuditEvent(company.id, user.id, {
      action: `legal_record_${decision}`,
      module: 'legal',
      entity_type: record.record_type,
      entity_id: record.id,
      previous_value: { status: record.status, approval_status: record.approval_status },
      new_value: { decision, stage: approval.approval_stages?.stage_name },
    });
    if (record.requester_id && record.requester_id !== user.id) {
      void sendNotification(company.id, record.requester_id, {
        title: decision === 'approved' ? 'Legal approval stage completed' : 'Legal record rejected',
        message: decision === 'approved'
          ? `An approval stage for ${record.reference} has been completed.`
          : `Your request ${record.reference} has been rejected.`,
        type: decision === 'approved' ? 'success' : 'warning',
        module: 'legal',
        reference_id: record.id,
        action_url: '/legal/requests',
      });
    }
    setDecisionComments('');
    toast.success(`Decision recorded: ${decision}`);
    await loadRecords();
  };

  const submitForApproval = async (record: LegalRecord) => {
    if (!company?.id || !user?.id) return;
    const resource = getLegalRecordPermission(record.record_type);
    if (!isAdmin && !hasPermission(`${resource}.review`)) {
      toast.error('You do not have review permission for this record');
      return;
    }
    const { error } = await supabase.rpc('legal_submit_for_approval', { p_record_id: record.id });
    if (error) {
      console.error('Failed to submit Legal record for approval:', error);
      toast.error(error.message || 'Unable to submit for approval');
      return;
    }
    void logAuditEvent(company.id, user.id, {
      action: 'legal_record_submitted_for_approval',
      module: 'legal',
      entity_type: record.record_type,
      entity_id: record.id,
      previous_value: { status: record.status },
      new_value: { status: 'pending_approval' },
    });
    if (record.requester_id && record.requester_id !== user.id) {
      void sendNotification(company.id, record.requester_id, {
        title: 'Legal request submitted for approval',
        message: `Your request ${record.reference} is awaiting approval.`,
        type: 'info',
        module: 'legal',
        reference_id: record.id,
        action_url: '/legal/requests',
      });
    }
    toast.success('Submitted through the configured Legal approval workflow');
    await loadRecords();
    if (selected) setSelected({ ...record, status: 'pending_approval', approval_status: 'pending' });
  };

  const uploadAttachment = async (record: LegalRecord, file: File) => {
    if (!company?.id || !user?.id) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Files must be 20 MB or smaller');
      return;
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${company.id}/${record.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('legal-documents').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (uploadError) {
      console.error('Failed to upload Legal document:', uploadError);
      toast.error(uploadError.message || 'Unable to upload document');
      return;
    }
    const { error: metadataError } = await supabase.from('legal_attachments').insert({
      company_id: company.id,
      record_id: record.id,
      object_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: user.id,
    });
    if (metadataError) {
      console.error('Failed to register Legal document:', metadataError);
      const { error: cleanupError } = await supabase.storage.from('legal-documents').remove([path]);
      if (cleanupError) console.error('Failed to clean up unregistered Legal document:', cleanupError);
      toast.error(metadataError.message || 'Unable to register document');
      return;
    }
    toast.success('Document uploaded securely');
    await loadRecordDetails(record);
  };

  const downloadAttachment = async (attachment: LegalAttachment) => {
    const { data, error } = await supabase.storage.from('legal-documents').createSignedUrl(attachment.object_path, 60);
    if (error || !data?.signedUrl) {
      console.error('Failed to create Legal document download link:', error);
      toast.error('Unable to open document');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const exportCsv = () => {
    if (!canExport) {
      toast.error('You do not have permission to export Legal reports');
      return;
    }
    const rows = filteredRecords.map(record => [
      record.reference, record.record_type, record.title, record.category, record.status,
      record.priority, record.due_date, record.end_date, record.renewal_date,
      record.contract_value, record.currency,
    ]);
    const csv = [
      ['Reference', 'Type', 'Title', 'Category', 'Status', 'Priority', 'Due date', 'Contract end', 'Renewal date', 'Contract value', 'Currency'],
      ...rows,
    ].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `legal-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!recordsPermission) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">You do not have permission to view this Legal workspace.</div>;
  }

  const activeContracts = records.filter(record => record.record_type === 'contract' && record.status === 'active').length;
  const pendingRequests = records.filter(record => record.record_type === 'request' && isLegalRecordOpen(record)).length;
  const openAdvisory = records.filter(record => record.record_type === 'opinion' && isLegalRecordOpen(record)).length;
  const contractsUnderReview = records.filter(record => record.record_type === 'contract' && ['submitted', 'under_review', 'negotiation'].includes(record.status)).length;
  const awaitingApproval = records.filter(record => record.approval_status === 'pending' || record.status === 'pending_approval').length;
  const openLitigation = records.filter(record => ['litigation', 'dispute'].includes(record.record_type) && isLegalRecordOpen(record)).length;
  const activeRisks = records.filter(record => record.record_type === 'risk' && isLegalRecordOpen(record)).length;
  const highPriorityRisks = records.filter(record => record.record_type === 'risk' && isLegalRecordOpen(record) && ['high', 'critical'].includes(record.risk_level ?? '')).length;
  const outstandingObligations = records.filter(record => ['compliance', 'obligation'].includes(record.record_type) && !['compliant', 'closed', 'archived'].includes(record.status)).length;
  const pendingPolicyReviews = records.filter(record => record.record_type === 'policy' && record.due_date && record.due_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) && isLegalRecordOpen(record)).length;
  const activeIpRecords = records.filter(record => record.record_type === 'intellectual_property' && ['active', 'approved'].includes(record.status)).length;
  const employmentMatters = records.filter(record => record.record_type === 'employment' && isLegalRecordOpen(record)).length;
  const activeCounsel = records.filter(record => record.record_type === 'counsel' && isLegalRecordOpen(record)).length;
  const expiredContracts = records.filter(record => record.record_type === 'contract' && (record.status === 'expired' || (record.end_date && record.end_date < new Date().toISOString().slice(0, 10) && isLegalRecordOpen(record)))).length;
  const dueSoon = records.filter(record => {
    const due = record.renewal_date ?? record.end_date ?? record.due_date;
    if (!due || !isLegalRecordOpen(record)) return false;
    const days = (new Date(`${due}T00:00:00`).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 60;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDashboard ? 'Legal Department' : isReports ? 'Legal Reports & Analytics' : moduleConfig?.title ?? 'Legal'}
        description={isDashboard ? 'A permission-scoped view of legal work, deadlines, and records.' : moduleConfig?.description}
      >
        {canExport && <Button variant="outline" onClick={exportCsv}>Export CSV</Button>}
        {moduleConfig && canCreate && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New record</Button>}
      </PageHeader>

      {isDashboard && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Visible legal records" value={records.length} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Pending legal requests" value={pendingRequests} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Open advisory matters" value={openAdvisory} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Contracts under review" value={contractsUnderReview} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Active contracts" value={activeContracts} icon={<ShieldCheck className="h-5 w-5" />} />
          <KpiCard title="Awaiting approval" value={awaitingApproval} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Contracts expiring / renewing soon" value={dueSoon} icon={<CalendarClock className="h-5 w-5" />} />
          <KpiCard title="Expired contracts" value={expiredContracts} icon={<CalendarClock className="h-5 w-5" />} />
          <KpiCard title="Open litigation" value={openLitigation} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Active legal risks" value={activeRisks} icon={<AlertTriangle className="h-5 w-5" />} />
          <KpiCard title="High-priority risks" value={highPriorityRisks} icon={<AlertTriangle className="h-5 w-5" />} />
          <KpiCard title="Outstanding obligations" value={outstandingObligations} icon={<ShieldCheck className="h-5 w-5" />} />
          <KpiCard title="Policy reviews due soon" value={pendingPolicyReviews} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Active IP records" value={activeIpRecords} icon={<ShieldCheck className="h-5 w-5" />} />
          <KpiCard title="Open employment matters" value={employmentMatters} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Active counsel engagements" value={activeCounsel} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Overdue actions" value={records.filter(record => record.due_date && record.due_date < new Date().toISOString().slice(0, 10) && isLegalRecordOpen(record)).length} icon={<CalendarClock className="h-5 w-5" />} />
        </div>
      )}

      {isDashboard && (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Legal workspaces</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {legalModules.filter(item => isAdmin || hasPermission(`${item.permission}.view`) || (item.key === 'requests' && hasPermission('legal.requests.create'))).map(item => (
                <Link key={item.key} href={item.href} className="group rounded-lg border border-gray-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:bg-gray-700/40">
                  <span className="flex items-center justify-between font-medium text-gray-900 dark:text-white">
                    {item.title}<ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                  </span>
                  <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">{item.description}</span>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Recent legal activity</h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {records.slice(0, 6).map(record => (
                <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{record.title}</p><p className="text-xs text-gray-500">{record.reference} · {record.record_type.replace(/_/g, ' ')} · updated {new Date(record.updated_at).toLocaleDateString()}</p></div>
                  <StatusBadge status={record.status} />
                </div>
              ))}
              {records.length === 0 && <p className="text-sm text-gray-500">No records are visible to your account yet.</p>}
            </div>
          </section>
        </>
      )}

      {!isDashboard && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reference, title, or category" className="sm:max-w-sm" />
              <select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">
                <option value="all">All statuses</option>
                {legalStatuses.map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
              </select>
              <select aria-label="Filter by department" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="all">All departments</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
              <select aria-label="Filter by responsible officer" value={assignedFilter} onChange={event => setAssignedFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="all">All officers</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profileName(profile)}</option>)}</select>
              {moduleConfig?.recordTypes.includes('risk') && <select aria-label="Filter by risk level" value={riskFilter} onChange={event => setRiskFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="all">All risk levels</option>{['low', 'medium', 'high', 'critical'].map(level => <option key={level} value={level}>{level}</option>)}</select>}
              {moduleConfig?.recordTypes.includes('contract') && <Input value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} placeholder="Contract category" className="sm:max-w-[180px]" />}
              <Input aria-label="Created from" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="sm:max-w-[170px]" />
              <Input aria-label="Created to" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="sm:max-w-[170px]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
                  <tr>{['Reference', 'Title', 'Category', 'Status', 'Priority', 'Due / renewal', 'Assigned'].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}<th className="px-4 py-3" /></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pagedRecords.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-blue-700 dark:text-blue-300">{record.reference}</td>
                      <td className="max-w-[260px] px-4 py-3"><button className="block truncate text-left font-medium text-gray-900 hover:underline dark:text-white" onClick={() => void loadRecordDetails(record)}>{record.title}</button><span className="mt-1 block truncate text-xs text-gray-500">{record.description}</span></td>
                      <td className="px-4 py-3">{record.category || record.record_type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={record.priority} /></td>
                      <td className="whitespace-nowrap px-4 py-3">{shortDate(record.renewal_date ?? record.end_date ?? record.due_date)}</td>
                      <td className="px-4 py-3">{profileName(profiles.find(profile => profile.id === record.assigned_to))}</td>
                      <td className="px-4 py-3">
                        {(canEdit || canReview || canApprove) && <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>Edit</Button>}
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredRecords.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No Legal records match this view.</td></tr>}
                  {loading && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Loading Legal records…</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <span>{filteredRecords.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredRecords.length)} of ${filteredRecords.length}` : '0 records'}</span>
              <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(current => Math.max(0, current - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))}>Next</Button></div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Upcoming deadlines</h2>
              {records.filter(record => record.due_date && isLegalRecordOpen(record)).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')).slice(0, 6).map(record => (
                <button key={record.id} onClick={() => void loadRecordDetails(record)} className="flex w-full items-start justify-between gap-3 border-t border-gray-100 py-3 text-left first:border-0 dark:border-gray-700">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-200">{record.title}</span><span className="text-xs text-gray-500">{record.reference}</span></span>
                  <span className="shrink-0 text-xs text-gray-500">{shortDate(record.due_date)}</span>
                </button>
              ))}
              {records.filter(record => record.due_date && isLegalRecordOpen(record)).length === 0 && <p className="text-sm text-gray-500">No due dates recorded for these records.</p>}
            </section>
          </aside>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{editing ? 'Update Legal record' : `Create ${moduleConfig?.title.toLowerCase()}`}</DialogTitle></DialogHeader>
          <form onSubmit={event => void saveRecord(event)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="legal-title">Title</Label><Input id="legal-title" required maxLength={240} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="legal-category">Category / matter type</Label><Input id="legal-category" maxLength={120} value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="e.g. Supplier agreement" /></div>
            <div className="space-y-2"><Label htmlFor="legal-priority">Priority</Label><select id="legal-priority" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">{legalPriorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></div>
            {editing && (canReview || canApprove) && <div className="space-y-2"><Label htmlFor="legal-status">Status</Label><select id="legal-status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">{legalStatuses.map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select></div>}
            <div className="space-y-2"><Label htmlFor="legal-department">Related department</Label><select id="legal-department" value={form.department_id} onChange={event => setForm({ ...form, department_id: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="">Not specified</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
            {canAssign && <div className="space-y-2"><Label htmlFor="legal-assignee">Assigned officer</Label><select id="legal-assignee" value={form.assigned_to} onChange={event => setForm({ ...form, assigned_to: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="">Unassigned</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profileName(profile)}</option>)}</select></div>}
            <div className="space-y-2"><Label htmlFor="legal-due">Next action / filing deadline</Label><Input id="legal-due" type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} /></div>
            {moduleConfig?.recordTypes.includes('contract') && <>
              <div className="space-y-2"><Label htmlFor="legal-start">Contract start</Label><Input id="legal-start" type="date" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-end">Contract end / expiry</Label><Input id="legal-end" type="date" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-renewal">Renewal date</Label><Input id="legal-renewal" type="date" value={form.renewal_date} onChange={event => setForm({ ...form, renewal_date: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-value">Contract value (optional)</Label><Input id="legal-value" type="number" min="0" step="0.01" value={form.contract_value} onChange={event => setForm({ ...form, contract_value: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-currency">Currency</Label><Input id="legal-currency" maxLength={3} value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value })} placeholder="USD" /></div>
            </>}
            {moduleConfig?.recordTypes.includes('risk') && <div className="space-y-2"><Label htmlFor="legal-risk">Risk level</Label><select id="legal-risk" value={form.risk_level} onChange={event => setForm({ ...form, risk_level: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="">Not assessed</option>{['low', 'medium', 'high', 'critical'].map(level => <option key={level} value={level}>{level}</option>)}</select></div>}
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="legal-description">Description, assessment, actions, or recommendations</Label><Textarea id="legal-description" rows={4} maxLength={12000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="legal-details">Additional structured details (JSON)</Label><Textarea id="legal-details" rows={5} value={form.details} onChange={event => setForm({ ...form, details: event.target.value })} className="font-mono text-xs" /><p className="text-xs text-gray-500">Keep confidential material in records with the appropriate restricted permissions. Details are validated and saved as structured data.</p></div>
            <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create record'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected && !dialogOpen} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>
          {selected && <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-gray-500">{selected.reference}</span><StatusBadge status={selected.status} /><StatusBadge status={selected.priority} /></div>
            <p className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{selected.description || 'No description provided.'}</p>
            <dl className="grid gap-3 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/50 sm:grid-cols-2">
              <Detail label="Category" value={selected.category} /><Detail label="Department" value={departments.find(item => item.id === selected.department_id)?.name} />
              <Detail label="Due date" value={shortDate(selected.due_date)} /><Detail label="Renewal / expiry" value={shortDate(selected.renewal_date ?? selected.end_date)} />
              <Detail label="Assigned" value={profileName(profiles.find(item => item.id === selected.assigned_to))} /><Detail label="Approval" value={selected.approval_status} />
              <Detail label="Contract value" value={selected.contract_value == null ? null : `${selected.currency ?? ''} ${selected.contract_value.toLocaleString()}`} />
            </dl>
            {selected.details && Object.keys(selected.details).length > 0 && <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-900/50">{JSON.stringify(selected.details, null, 2)}</pre>}
            {(canReview && !selected.approval_status && ['draft', 'submitted', 'under_review', 'negotiation'].includes(selected.status)) && <Button onClick={() => void submitForApproval(selected)}>Submit for approval</Button>}
            {selected.status === 'pending_approval' && (() => {
              const approval = approvalItems.find(item => item.request_id === selected.id && item.status === 'pending');
              const canApproveSelected = isAdmin || hasPermission(`${getLegalRecordPermission(selected.record_type)}.approve`);
              return approval && canApproveSelected ? <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">Approval stage: {approval.approval_stages?.stage_name || 'Review'}{approval.approval_stages?.approver_role ? ` · ${approval.approval_stages.approver_role}` : ''}</p>
                <Textarea rows={2} placeholder="Decision comments (optional)" value={decisionComments} onChange={event => setDecisionComments(event.target.value)} />
                <div className="flex flex-wrap gap-2"><Button onClick={() => void updateDecision(selected, approval, 'approved')}>Approve</Button><Button variant="destructive" onClick={() => void updateDecision(selected, approval, 'rejected')}>Reject</Button></div>
              </div> : null;
            })()}
            <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex items-center justify-between"><h3 className="font-medium">Documents</h3>{(canEdit || canCreate || (selected.record_type === 'request' && hasPermission('legal.requests.create'))) && <label className="inline-flex cursor-pointer items-center gap-1 text-sm text-blue-700 hover:underline"><Upload className="h-4 w-4" />Upload<input type="file" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadAttachment(selected, file); event.currentTarget.value = ''; }} /></label>}</div>
              {attachments.map(attachment => <button key={attachment.id} onClick={() => void downloadAttachment(attachment)} className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"><span className="truncate">{attachment.file_name}</span><span className="shrink-0 text-xs text-gray-500">{new Date(attachment.created_at).toLocaleDateString()}</span></button>)}
              {attachments.length === 0 && <p className="text-sm text-gray-500">No documents attached.</p>}
            </div>
            <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="font-medium">Change history</h3>
              {history.map(item => <p key={item.id} className="text-sm text-gray-500">{item.action === 'created' ? 'Record created' : 'Record updated'} · {new Date(item.created_at).toLocaleString()}</p>)}
              {history.length === 0 && <p className="text-sm text-gray-500">No history available.</p>}
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between text-gray-500 dark:text-gray-400"><span className="text-sm">{title}</span>{icon}</div><p className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-0.5 break-words font-medium text-gray-800 dark:text-gray-200">{value || '—'}</dd></div>;
}
