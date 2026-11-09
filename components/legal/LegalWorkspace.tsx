'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ArrowUpRight, CalendarClock, FileText, Plus, Scale, ShieldCheck, Upload } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, type LegalAttachment, type LegalRecord, type LegalRecordEvent, type LegalRecordVersion } from '@/lib/supabase';
import { legalModules, legalPriorities, legalRecordFields, legalStatuses, getLegalModule, getLegalRecordPermission, isLegalRecordOpen, makeLegalReference, type LegalRecordType } from '@/lib/legal';
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
  record_type: LegalRecordType | '';
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
  likelihood: string;
  impact: string;
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
  record_type: '',
  title: '', description: '', category: '', priority: 'medium', status: 'submitted',
  department_id: '', assigned_to: '', due_date: '', start_date: '', end_date: '',
  renewal_date: '', contract_value: '', currency: '', risk_level: '', details: '{}',
  likelihood: '', impact: '',
};
const EMPTY_RECORD_TYPES: LegalRecordType[] = [];
const PAGE_SIZE = 25;
const CHART_COLORS = ['#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#64748b'];

function countBy(records: LegalRecord[], getLabel: (record: LegalRecord) => string | null | undefined) {
  const counts = new Map<string, number>();
  records.forEach(record => {
    const label = getLabel(record);
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts, ([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value);
}

function monthlyCounts(records: LegalRecord[], now = new Date()) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: date.toLocaleDateString(undefined, { month: 'short' }),
      value: records.filter(record => record.created_at.slice(0, 7) === key).length,
    };
  });
}

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
  const canEditRecord = (record: LegalRecord) => {
    const resource = getLegalRecordPermission(record.record_type);
    return isAdmin
      || hasPermission(`${resource}.edit`)
      || hasPermission(`${resource}.review`)
      || (record.record_type === 'employment' && hasPermission('hr.employment_matters.edit'))
      || (record.record_type === 'request'
        && record.requester_id === user?.id
        && ['draft', 'submitted'].includes(record.status)
        && record.approval_status !== 'pending'
        && hasPermission('legal.requests.create'));
  };
  const [records, setRecords] = useState<LegalRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [attachments, setAttachments] = useState<LegalAttachment[]>([]);
  const [events, setEvents] = useState<LegalRecordEvent[]>([]);
  const [versions, setVersions] = useState<LegalRecordVersion[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LegalRecord | null>(null);
  const [selected, setSelected] = useState<LegalRecord | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; action: string; created_at: string }>>([]);
  const [form, setForm] = useState<LegalForm>(EMPTY_FORM);
  const [detailValues, setDetailValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recordTypeFilter, setRecordTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'reference' | 'due' | 'title' | 'status'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [busy, setBusy] = useState(false);
  const [decisionComments, setDecisionComments] = useState('');
  const [eventBody, setEventBody] = useState('');
  const [eventType, setEventType] = useState<LegalRecordEvent['event_type']>('comment');
  const [page, setPage] = useState(0);

  const recordTypes = moduleConfig?.recordTypes ?? EMPTY_RECORD_TYPES;
  const activeFormRecordType = recordTypes.find(type => type === form.record_type) ?? recordTypes[0];
  const detailFields = activeFormRecordType ? legalRecordFields[activeFormRecordType] : [];
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
    (!isReports || recordTypeFilter === 'all' || record.record_type === recordTypeFilter)
    &&
    (statusFilter === 'all' || record.status === statusFilter)
    && (!search || `${record.reference} ${record.title} ${record.category ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    && (departmentFilter === 'all' || record.department_id === departmentFilter)
    && (assignedFilter === 'all' || record.assigned_to === assignedFilter)
    && (riskFilter === 'all' || record.risk_level === riskFilter)
    && (!categoryFilter || (record.category ?? '').toLowerCase().includes(categoryFilter.toLowerCase()))
    && (!dateFrom || record.created_at.slice(0, 10) >= dateFrom)
    && (!dateTo || record.created_at.slice(0, 10) <= dateTo)
  ), [records, search, statusFilter, recordTypeFilter, isReports, departmentFilter, assignedFilter, riskFilter, categoryFilter, dateFrom, dateTo]);
  const sortedRecords = useMemo(() => [...filteredRecords].sort((left, right) => {
    const leftValue = sortBy === 'updated' ? left.updated_at
      : sortBy === 'reference' ? left.reference
        : sortBy === 'due' ? left.due_date ?? left.renewal_date ?? left.end_date ?? ''
          : sortBy === 'title' ? left.title : left.status;
    const rightValue = sortBy === 'updated' ? right.updated_at
      : sortBy === 'reference' ? right.reference
        : sortBy === 'due' ? right.due_date ?? right.renewal_date ?? right.end_date ?? ''
          : sortBy === 'title' ? right.title : right.status;
    const comparison = leftValue.localeCompare(rightValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [filteredRecords, sortBy, sortDirection]);
  const pagedRecords = sortedRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));

  useEffect(() => { setPage(0); }, [currentKey, search, statusFilter, recordTypeFilter, departmentFilter, assignedFilter, riskFilter, categoryFilter, dateFrom, dateTo, sortBy, sortDirection]);

  const openNew = () => {
    if (!moduleConfig || !canCreate) return;
    setEditing(null);
    setDetailValues({});
    setForm({
      ...EMPTY_FORM,
      record_type: moduleConfig.recordTypes[0] ?? '',
      status: moduleConfig.recordTypes[0] === 'request' ? 'submitted' : 'draft',
    });
    setDialogOpen(true);
  };

  const openEdit = (record: LegalRecord) => {
    setEditing(record);
    setSelected(record);
    setForm({
      record_type: record.record_type as LegalRecordType,
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
      likelihood: record.likelihood == null ? '' : String(record.likelihood),
      impact: record.impact == null ? '' : String(record.impact),
      details: JSON.stringify(record.details ?? {}, null, 2),
    });
    setDetailValues(Object.fromEntries(
      Object.entries(record.details ?? {}).map(([key, value]) => [key, typeof value === 'string' ? value : String(value ?? '')]),
    ));
    setDialogOpen(true);
  };

  const loadRecordDetails = async (record: LegalRecord) => {
    setSelected(record);
    const [attachmentResult, historyResult, eventResult, versionResult] = await Promise.all([
      supabase.from('legal_attachments').select('*').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }),
      supabase.from('legal_record_history').select('id, action, created_at').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('legal_record_events').select('*').eq('company_id', record.company_id).eq('record_id', record.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('legal_record_versions').select('*').eq('company_id', record.company_id).eq('record_id', record.id).order('version_number', { ascending: false }),
    ]);
    if (attachmentResult.error) {
      console.error('Failed to load Legal attachments:', attachmentResult.error);
      toast.error('Unable to load document list');
    } else setAttachments(attachmentResult.data ?? []);
    if (historyResult.error) {
      console.error('Failed to load Legal history:', historyResult.error);
      toast.error('Unable to load record history');
    } else setHistory(historyResult.data ?? []);
    if (eventResult.error) {
      console.error('Failed to load Legal activity:', eventResult.error);
      toast.error('Unable to load Legal activity');
    } else setEvents(eventResult.data ?? []);
    if (versionResult.error) {
      console.error('Failed to load Legal versions:', versionResult.error);
      toast.error('Unable to load version history');
    } else setVersions(versionResult.data ?? []);
  };

  const addEvent = async (record: LegalRecord) => {
    if (!company?.id || !user?.id || !eventBody.trim()) return;
    const resource = getLegalRecordPermission(record.record_type);
    const canManageRecord = isAdmin
      || hasPermission(`${resource}.edit`)
      || hasPermission(`${resource}.review`)
      || (record.record_type === 'employment' && hasPermission('hr.employment_matters.edit'))
      || (record.record_type === 'request' && record.requester_id === user.id && hasPermission('legal.requests.create'));
    if (!canManageRecord) {
      toast.error('You do not have permission to add activity to this record');
      return;
    }
    const { error } = await supabase.from('legal_record_events').insert({
      company_id: company.id,
      record_id: record.id,
      actor_id: user.id,
      event_type: eventType,
      body: eventBody.trim(),
    });
    if (error) {
      console.error('Failed to add Legal activity:', error);
      toast.error(error.message || 'Unable to add Legal activity');
      return;
    }
    void logAuditEvent(company.id, user.id, {
      action: 'legal_record_activity_added',
      module: 'legal',
      entity_type: record.record_type,
      entity_id: record.id,
      new_value: { event_type: eventType },
    });
    const notifyUser = record.requester_id && record.requester_id !== user.id
      ? record.requester_id
      : record.assigned_to && record.assigned_to !== user.id ? record.assigned_to : null;
    if (notifyUser) {
      void sendNotification(company.id, notifyUser, {
        title: 'Legal record activity added',
        message: `New activity was added to ${record.reference}.`,
        type: 'info',
        module: 'legal',
        reference_id: record.id,
        action_url: record.record_type === 'request' ? '/legal/requests' : '/legal',
      });
    }
    setEventBody('');
    setEventType('comment');
    const { data: refreshedEvents, error: refreshError } = await supabase.from('legal_record_events')
      .select('*').eq('company_id', record.company_id).eq('record_id', record.id)
      .order('created_at', { ascending: false }).limit(100);
    if (refreshError) {
      console.error('Failed to refresh Legal activity:', refreshError);
      toast.error('Activity was saved but could not be refreshed');
    } else setEvents(refreshedEvents ?? []);
    toast.success('Legal activity added');
  };

  const saveRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!moduleConfig || !company?.id || !user?.id) return;
    if (!moduleConfig.recordTypes.includes(form.record_type as LegalRecordType)) {
      toast.error('Select a valid Legal record type');
      return;
    }
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
    for (const [label, value] of [['Likelihood', form.likelihood], ['Impact', form.impact]] as const) {
      if (value && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5)) {
        toast.error(`${label} must be a whole number from 1 to 5`);
        return;
      }
    }
    for (const field of detailFields.filter(item => item.type === 'number')) {
      const value = detailValues[field.key];
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        toast.error(`${field.label} must be a non-negative number`);
        return;
      }
    }
    if (form.contract_value && (!Number.isFinite(Number(form.contract_value)) || Number(form.contract_value) < 0)) {
      toast.error('Contract value must be a valid non-negative amount');
      return;
    }
    const mergedDetails: Record<string, unknown> = { ...details, ...detailValues };
    detailFields.forEach(field => {
      const value = detailValues[field.key]?.trim();
      if (!value) delete mergedDetails[field.key];
      else if (field.type === 'number') mergedDetails[field.key] = Number(value);
    });
    setBusy(true);
    const existing = editing;
    const values = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      priority: form.priority,
      status: form.status,
      department_id: canAssign ? form.department_id || null : existing?.department_id ?? null,
      assigned_to: canAssign ? form.assigned_to || null : existing?.assigned_to ?? null,
      due_date: form.due_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      renewal_date: form.renewal_date || null,
      contract_value: form.contract_value ? Number(form.contract_value) : null,
      currency: form.currency.trim().toUpperCase() || null,
      risk_level: form.risk_level || null,
      likelihood: form.likelihood ? Number(form.likelihood) : null,
      impact: form.impact ? Number(form.impact) : null,
      details: mergedDetails,
    };

    const result = existing
      ? await supabase.from('legal_records').update(values).eq('id', existing.id).eq('company_id', company.id).select('*').single()
      : await supabase.from('legal_records').insert({
        ...values,
        company_id: company.id,
        record_type: form.record_type as LegalRecordType,
        reference: makeLegalReference(form.record_type as LegalRecordType),
        created_by: user.id,
        requester_id: form.record_type === 'request' ? user.id : null,
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
    setSelected(null);
    toast.success(`Decision recorded: ${decision}`);
    await loadRecords();
  };

  const returnForCorrection = async (record: LegalRecord, approval: ApprovalItem) => {
    if (!company?.id || !user?.id) return;
    if (!decisionComments.trim()) {
      toast.error('Add a comment explaining the required corrections');
      return;
    }
    const resource = getLegalRecordPermission(record.record_type);
    if (!isAdmin && !hasPermission(`${resource}.approve`)) {
      toast.error('You do not have approval permission for this record');
      return;
    }
    const { error } = await supabase.rpc('legal_return_approval', {
      p_approval_id: approval.id,
      p_comments: decisionComments,
    });
    if (error) {
      console.error('Failed to return Legal record for correction:', error);
      toast.error(error.message || 'Unable to return record for correction');
      return;
    }
    void logAuditEvent(company.id, user.id, {
      action: 'legal_record_returned_for_correction',
      module: 'legal',
      entity_type: record.record_type,
      entity_id: record.id,
      previous_value: { status: record.status, approval_status: record.approval_status },
      new_value: { status: 'submitted', approval_status: 'returned' },
    });
    if (record.requester_id && record.requester_id !== user.id) {
      void sendNotification(company.id, record.requester_id, {
        title: 'Legal record returned for correction',
        message: `Corrections were requested for ${record.reference}.`,
        type: 'warning',
        module: 'legal',
        reference_id: record.id,
        action_url: '/legal/requests',
      });
    }
    setDecisionComments('');
    setSelected(null);
    toast.success('Record returned for correction');
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
    const generatedAt = new Date().toISOString();
    const rows = filteredRecords.map(record => [
      record.reference, record.record_type, record.title, record.category, record.status,
      record.priority, record.due_date, record.end_date, record.renewal_date,
      record.contract_value, record.currency, generatedAt,
    ]);
    const csv = [
      ['Reference', 'Type', 'Title', 'Category', 'Status', 'Priority', 'Due date', 'Contract end', 'Renewal date', 'Contract value', 'Currency', 'Report generated at'],
      ...rows,
    ].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `legal-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (!canExport) {
      toast.error('You do not have permission to export Legal reports');
      return;
    }
    const generatedAt = new Date().toISOString();
    const rows = filteredRecords.map(record => ({
      Reference: record.reference,
      Type: record.record_type,
      Title: record.title,
      Category: record.category ?? '',
      Status: record.status,
      Priority: record.priority,
      Department: departments.find(item => item.id === record.department_id)?.name ?? '',
      'Responsible officer': profileName(profiles.find(item => item.id === record.assigned_to)),
      'Due date': record.due_date ?? '',
      'Contract start': record.start_date ?? '',
      'Contract end': record.end_date ?? '',
      'Renewal date': record.renewal_date ?? '',
      'Contract value': record.contract_value ?? '',
      Currency: record.currency ?? '',
      'Risk level': record.risk_level ?? '',
      'Approval status': record.approval_status ?? '',
      Details: JSON.stringify(record.details ?? {}),
      'Created at': record.created_at,
      'Updated at': record.updated_at,
      'Report generated at (UTC)': generatedAt,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = Object.keys(rows[0] ?? {}).map(key => ({ wch: Math.min(Math.max(key.length + 2, 14), 36) }));
    const workbook = XLSX.utils.book_new();
    const metadata = XLSX.utils.aoa_to_sheet([
      ['Report', 'Permission-scoped Legal records'],
      ['Generated at (UTC)', generatedAt],
      ['Record count', filteredRecords.length],
      ['Record type filter', recordTypeFilter],
      ['Status filter', statusFilter],
      ['Department filter', departmentFilter],
      ['Responsible officer filter', assignedFilter],
      ['Risk filter', riskFilter],
      ['Category filter', categoryFilter],
      ['Created from', dateFrom || 'All'],
      ['Created to', dateTo || 'All'],
      ['Search', search || 'None'],
    ]);
    XLSX.utils.book_append_sheet(workbook, metadata, 'Report info');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Legal report');
    XLSX.writeFile(workbook, `legal-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!recordsPermission) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">You do not have permission to view this Legal workspace.</div>;
  }

  const activeContracts = filteredRecords.filter(record => record.record_type === 'contract' && record.status === 'active').length;
  const pendingRequests = filteredRecords.filter(record => record.record_type === 'request' && isLegalRecordOpen(record)).length;
  const openAdvisory = filteredRecords.filter(record => record.record_type === 'opinion' && isLegalRecordOpen(record)).length;
  const contractsUnderReview = filteredRecords.filter(record => record.record_type === 'contract' && ['submitted', 'under_review', 'negotiation'].includes(record.status)).length;
  const awaitingApproval = filteredRecords.filter(record => record.approval_status === 'pending' || record.status === 'pending_approval').length;
  const totalRequests = filteredRecords.filter(record => record.record_type === 'request').length;
  const contractsAwaitingApproval = filteredRecords.filter(record => record.record_type === 'contract' && (record.approval_status === 'pending' || record.status === 'pending_approval')).length;
  const pendingDisputes = filteredRecords.filter(record => record.record_type === 'dispute' && isLegalRecordOpen(record)).length;
  const upcomingRenewals = filteredRecords.filter(record => {
    if (record.record_type !== 'contract' || !record.renewal_date || !isLegalRecordOpen(record)) return false;
    const days = (new Date(`${record.renewal_date}T00:00:00`).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 60;
  }).length;
  const upcomingRegulatoryDeadlines = filteredRecords.filter(record => {
    if (!['compliance', 'obligation'].includes(record.record_type) || !record.due_date || !isLegalRecordOpen(record)) return false;
    const days = (new Date(`${record.due_date}T00:00:00`).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 60;
  }).length;
  const openLitigation = filteredRecords.filter(record => ['litigation', 'dispute'].includes(record.record_type) && isLegalRecordOpen(record)).length;
  const activeRisks = filteredRecords.filter(record => record.record_type === 'risk' && isLegalRecordOpen(record)).length;
  const highPriorityRisks = filteredRecords.filter(record => record.record_type === 'risk' && isLegalRecordOpen(record) && ['high', 'critical'].includes(record.risk_level ?? '')).length;
  const outstandingObligations = filteredRecords.filter(record => ['compliance', 'obligation'].includes(record.record_type) && !['compliant', 'closed', 'archived'].includes(record.status)).length;
  const pendingPolicyReviews = filteredRecords.filter(record => record.record_type === 'policy' && record.due_date && record.due_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) && isLegalRecordOpen(record)).length;
  const activeIpRecords = filteredRecords.filter(record => record.record_type === 'intellectual_property' && ['active', 'approved'].includes(record.status)).length;
  const employmentMatters = filteredRecords.filter(record => record.record_type === 'employment' && isLegalRecordOpen(record)).length;
  const activeCounsel = filteredRecords.filter(record => record.record_type === 'counsel' && isLegalRecordOpen(record)).length;
  const expiredContracts = filteredRecords.filter(record => record.record_type === 'contract' && (record.status === 'expired' || (record.end_date && record.end_date < new Date().toISOString().slice(0, 10) && isLegalRecordOpen(record)))).length;
  const dueSoon = filteredRecords.filter(record => {
    const due = record.renewal_date ?? record.end_date ?? record.due_date;
    if (!due || !isLegalRecordOpen(record)) return false;
    const days = (new Date(`${due}T00:00:00`).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 60;
  }).length;
  const contracts = filteredRecords.filter(record => record.record_type === 'contract');
  const risks = filteredRecords.filter(record => record.record_type === 'risk');
  const complianceRecords = filteredRecords.filter(record => ['compliance', 'obligation'].includes(record.record_type));
  const contractStatusData = countBy(contracts, record => record.status);
  const contractCategoryData = countBy(contracts, record => record.category || 'Uncategorised');
  const requestDepartmentData = countBy(
    filteredRecords.filter(record => record.record_type === 'request'),
    record => departments.find(department => department.id === record.department_id)?.name ?? 'Unassigned',
  );
  const legalActivityData = monthlyCounts(filteredRecords);
  const riskSeverityData = countBy(risks.filter(isLegalRecordOpen), record => record.risk_level ?? 'unassessed');
  const complianceStatusData = countBy(complianceRecords, record => record.status);
  const litigationTrendData = monthlyCounts(filteredRecords.filter(record => ['litigation', 'dispute'].includes(record.record_type)));
  const contractExpiryData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: date.toLocaleDateString(undefined, { month: 'short' }),
      value: contracts.filter(record => {
        const deadline = record.renewal_date ?? record.end_date;
        return deadline?.slice(0, 7) === key;
      }).length,
    };
  });
  const dashboardDeadlines = filteredRecords
    .filter(record => isLegalRecordOpen(record) && (record.due_date || record.renewal_date || record.end_date))
    .sort((a, b) => (a.due_date ?? a.renewal_date ?? a.end_date ?? '').localeCompare(b.due_date ?? b.renewal_date ?? b.end_date ?? ''))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDashboard ? 'Legal Department' : isReports ? 'Legal Reports & Analytics' : moduleConfig?.title ?? 'Legal'}
        description={isDashboard ? 'A permission-scoped view of legal work, deadlines, and records.' : moduleConfig?.description}
      >
        {canExport && <Button variant="outline" onClick={exportCsv}>Export CSV</Button>}
        {canExport && <Button variant="outline" onClick={exportExcel}>Export Excel</Button>}
        {isReports && <Button variant="outline" onClick={() => window.print()}>Print / Save PDF</Button>}
        {moduleConfig && canCreate && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />New record</Button>}
      </PageHeader>

      {isDashboard && (
        <section className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <label className="space-y-1 text-xs text-gray-500">Department
            <select aria-label="Dashboard filter by department" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="block h-10 min-w-40 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
              <option value="all">All departments</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-gray-500">Status
            <select aria-label="Dashboard filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="block h-10 min-w-40 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
              <option value="all">All statuses</option>{legalStatuses.map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-gray-500">Responsible officer
            <select aria-label="Dashboard filter by responsible officer" value={assignedFilter} onChange={event => setAssignedFilter(event.target.value)} className="block h-10 min-w-40 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
              <option value="all">All officers</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profileName(profile)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-gray-500">Risk level
            <select aria-label="Dashboard filter by risk level" value={riskFilter} onChange={event => setRiskFilter(event.target.value)} className="block h-10 min-w-36 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
              <option value="all">All risk levels</option>{['low', 'medium', 'high', 'critical'].map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs text-gray-500">Contract type
            <Input aria-label="Dashboard filter by contract type" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} placeholder="All types" className="h-10 min-w-36" />
          </label>
          <label className="space-y-1 text-xs text-gray-500">Created from<Input aria-label="Dashboard created from date" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="h-10" /></label>
          <label className="space-y-1 text-xs text-gray-500">Created to<Input aria-label="Dashboard created to date" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="h-10" /></label>
        </section>
      )}

      {isDashboard && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Visible legal records" value={filteredRecords.length} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Total legal requests" value={totalRequests} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Pending legal requests" value={pendingRequests} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Open advisory matters" value={openAdvisory} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Contracts under review" value={contractsUnderReview} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Active contracts" value={activeContracts} icon={<ShieldCheck className="h-5 w-5" />} />
          <KpiCard title="Awaiting approval" value={awaitingApproval} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Contracts awaiting approval" value={contractsAwaitingApproval} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Contracts expiring / renewing soon" value={dueSoon} icon={<CalendarClock className="h-5 w-5" />} />
          <KpiCard title="Upcoming contract renewals" value={upcomingRenewals} icon={<CalendarClock className="h-5 w-5" />} />
          <KpiCard title="Expired contracts" value={expiredContracts} icon={<CalendarClock className="h-5 w-5" />} />
          <KpiCard title="Open litigation" value={openLitigation} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Pending dispute resolutions" value={pendingDisputes} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Active legal risks" value={activeRisks} icon={<AlertTriangle className="h-5 w-5" />} />
          <KpiCard title="High-priority risks" value={highPriorityRisks} icon={<AlertTriangle className="h-5 w-5" />} />
          <KpiCard title="Outstanding obligations" value={outstandingObligations} icon={<ShieldCheck className="h-5 w-5" />} />
          <KpiCard title="Regulatory deadlines (60 days)" value={upcomingRegulatoryDeadlines} icon={<CalendarClock className="h-5 w-5" />} />
          <KpiCard title="Policy reviews due soon" value={pendingPolicyReviews} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Active IP records" value={activeIpRecords} icon={<ShieldCheck className="h-5 w-5" />} />
          <KpiCard title="Open employment matters" value={employmentMatters} icon={<FileText className="h-5 w-5" />} />
          <KpiCard title="Active counsel engagements" value={activeCounsel} icon={<Scale className="h-5 w-5" />} />
          <KpiCard title="Overdue actions" value={filteredRecords.filter(record => record.due_date && record.due_date < new Date().toISOString().slice(0, 10) && isLegalRecordOpen(record)).length} icon={<CalendarClock className="h-5 w-5" />} />
        </div>
      )}

      {isDashboard && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartPanel title="Contracts by status">
            {contractStatusData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={contractStatusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}
          </ChartPanel>
          <ChartPanel title="Contracts by category">
            {contractCategoryData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={contractCategoryData.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={55} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}
          </ChartPanel>
          <ChartPanel title="Contract expiries and renewals (next 6 months)">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={contractExpiryData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" name="Contracts due" stroke="#d97706" strokeWidth={2} /></LineChart></ResponsiveContainer>
          </ChartPanel>
          <ChartPanel title="Legal requests by department">
            {requestDepartmentData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={requestDepartmentData.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={55} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyChart />}
          </ChartPanel>
          <ChartPanel title="Legal activity by month">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={legalActivityData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" name="Records created" stroke="#16a34a" strokeWidth={2} /></LineChart></ResponsiveContainer>
          </ChartPanel>
          <ChartPanel title="Open legal risks by severity">
            {riskSeverityData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskSeverityData} dataKey="value" nameKey="name" outerRadius={90} label>{riskSeverityData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <EmptyChart />}
          </ChartPanel>
          <ChartPanel title="Regulatory compliance status">
            {complianceStatusData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={complianceStatusData} dataKey="value" nameKey="name" outerRadius={90} label>{complianceStatusData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <EmptyChart />}
          </ChartPanel>
          <ChartPanel title="Legal matters by status">
            {countBy(filteredRecords.filter(record => !['contract', 'request', 'risk', 'compliance', 'obligation', 'policy', 'intellectual_property'].includes(record.record_type)), record => record.status).length
              ? <ResponsiveContainer width="100%" height="100%"><BarChart data={countBy(filteredRecords.filter(record => !['contract', 'request', 'risk', 'compliance', 'obligation', 'policy', 'intellectual_property'].includes(record.record_type)), record => record.status)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
              : <EmptyChart />}
          </ChartPanel>
          <ChartPanel title="Litigation and dispute matters by month">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={litigationTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="value" name="Matters opened" stroke="#dc2626" strokeWidth={2} /></LineChart></ResponsiveContainer>
          </ChartPanel>
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
              {filteredRecords.length === 0 && <p className="text-sm text-gray-500">No records are visible to your account yet.</p>}
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Upcoming legal deadlines</h2>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {dashboardDeadlines.map(record => (
                  <button key={record.id} onClick={() => void loadRecordDetails(record)} className="flex w-full items-center justify-between gap-3 py-3 text-left first:pt-0">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{record.title}</span><span className="text-xs text-gray-500">{record.reference} · {record.record_type.replace(/_/g, ' ')}</span></span>
                    <span className="shrink-0 text-xs text-gray-500">{shortDate(record.due_date ?? record.renewal_date ?? record.end_date)}</span>
                  </button>
                ))}
                {dashboardDeadlines.length === 0 && <p className="py-2 text-sm text-gray-500">No upcoming deadlines recorded.</p>}
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Contracts awaiting approval</h2>
              {filteredRecords.filter(record => record.record_type === 'contract' && (record.approval_status === 'pending' || record.status === 'pending_approval')).slice(0, 6).map(record => (
                <button key={record.id} onClick={() => void loadRecordDetails(record)} className="flex w-full items-center justify-between gap-3 border-t border-gray-100 py-3 text-left first:border-0 dark:border-gray-700">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{record.title}</span><span className="text-xs text-gray-500">{record.reference}</span></span><StatusBadge status={record.status} />
                </button>
              ))}
              {filteredRecords.filter(record => record.record_type === 'contract' && (record.approval_status === 'pending' || record.status === 'pending_approval')).length === 0 && <p className="text-sm text-gray-500">No contracts are awaiting approval.</p>}
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Active litigation and disputes</h2>
              {filteredRecords.filter(record => ['litigation', 'dispute'].includes(record.record_type) && isLegalRecordOpen(record)).slice(0, 6).map(record => (
                <button key={record.id} onClick={() => void loadRecordDetails(record)} className="flex w-full items-center justify-between gap-3 border-t border-gray-100 py-3 text-left first:border-0 dark:border-gray-700">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{record.title}</span><span className="text-xs text-gray-500">{record.reference}</span></span><StatusBadge status={record.status} />
                </button>
              ))}
              {filteredRecords.filter(record => ['litigation', 'dispute'].includes(record.record_type) && isLegalRecordOpen(record)).length === 0 && <p className="text-sm text-gray-500">No open litigation matters are visible.</p>}
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">High-priority legal risks</h2>
              {filteredRecords.filter(record => record.record_type === 'risk' && isLegalRecordOpen(record) && ['high', 'critical'].includes(record.risk_level ?? '')).slice(0, 6).map(record => (
                <button key={record.id} onClick={() => void loadRecordDetails(record)} className="flex w-full items-center justify-between gap-3 border-t border-gray-100 py-3 text-left first:border-0 dark:border-gray-700">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{record.title}</span><span className="text-xs text-gray-500">{record.reference}</span></span><StatusBadge status={record.risk_level ?? 'high'} />
                </button>
              ))}
              {filteredRecords.filter(record => record.record_type === 'risk' && isLegalRecordOpen(record) && ['high', 'critical'].includes(record.risk_level ?? '')).length === 0 && <p className="text-sm text-gray-500">No high-priority risks are visible.</p>}
            </section>
          </div>
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
              {isReports && <select aria-label="Filter by record type" value={recordTypeFilter} onChange={event => setRecordTypeFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">
                <option value="all">All record types</option>{Array.from(new Set(legalModules.flatMap(item => item.recordTypes))).map(type => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
              </select>}
              <select aria-label="Filter by department" value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="all">All departments</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
              <select aria-label="Filter by responsible officer" value={assignedFilter} onChange={event => setAssignedFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="all">All officers</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profileName(profile)}</option>)}</select>
              {(isReports || moduleConfig?.recordTypes.includes('risk')) && <select aria-label="Filter by risk level" value={riskFilter} onChange={event => setRiskFilter(event.target.value)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="all">All risk levels</option>{['low', 'medium', 'high', 'critical'].map(level => <option key={level} value={level}>{level}</option>)}</select>}
              {(isReports || moduleConfig?.recordTypes.includes('contract')) && <Input aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} placeholder={isReports ? 'Category / contract type' : 'Contract category'} className="sm:max-w-[180px]" />}
              <Input aria-label="Created from" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="sm:max-w-[170px]" />
              <Input aria-label="Created to" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="sm:max-w-[170px]" />
              <select aria-label="Sort Legal records" value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)} className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">
                <option value="updated">Sort: recently updated</option><option value="reference">Sort: reference</option><option value="due">Sort: due date</option><option value="title">Sort: title</option><option value="status">Sort: status</option>
              </select>
              <Button variant="outline" size="sm" aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`} onClick={() => setSortDirection(current => current === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</Button>
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
                            {canEditRecord(record) && <Button variant="ghost" size="sm" onClick={() => openEdit(record)}>Edit</Button>}
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
            {!editing && moduleConfig?.recordTypes.length && moduleConfig.recordTypes.length > 1 && <div className="space-y-2 sm:col-span-2"><Label htmlFor="legal-record-type">Record type</Label><select id="legal-record-type" required value={form.record_type} onChange={event => { setForm({ ...form, record_type: event.target.value as LegalRecordType }); setDetailValues({}); }} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">{moduleConfig.recordTypes.map(type => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select></div>}
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="legal-title">Title</Label><Input id="legal-title" required maxLength={240} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="legal-category">Category / matter type</Label><Input id="legal-category" maxLength={120} value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} placeholder="e.g. Supplier agreement" /></div>
            <div className="space-y-2"><Label htmlFor="legal-priority">Priority</Label><select id="legal-priority" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">{legalPriorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></div>
            {editing && (canReview || canApprove) && <div className="space-y-2"><Label htmlFor="legal-status">Status</Label><select id="legal-status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">{legalStatuses.map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select></div>}
            <div className="space-y-2"><Label htmlFor="legal-department">Related department</Label><select id="legal-department" value={form.department_id} onChange={event => setForm({ ...form, department_id: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="">Not specified</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
            {canAssign && <div className="space-y-2"><Label htmlFor="legal-assignee">Assigned officer</Label><select id="legal-assignee" value={form.assigned_to} onChange={event => setForm({ ...form, assigned_to: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="">Unassigned</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profileName(profile)}</option>)}</select></div>}
            <div className="space-y-2"><Label htmlFor="legal-due">Next action / filing deadline</Label><Input id="legal-due" type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} /></div>
            {activeFormRecordType === 'contract' && <>
              <div className="space-y-2"><Label htmlFor="legal-start">Contract start</Label><Input id="legal-start" type="date" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-end">Contract end / expiry</Label><Input id="legal-end" type="date" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-renewal">Renewal date</Label><Input id="legal-renewal" type="date" value={form.renewal_date} onChange={event => setForm({ ...form, renewal_date: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-value">Contract value (optional)</Label><Input id="legal-value" type="number" min="0" step="0.01" value={form.contract_value} onChange={event => setForm({ ...form, contract_value: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-currency">Currency</Label><Input id="legal-currency" maxLength={3} value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value })} placeholder="USD" /></div>
            </>}
            {activeFormRecordType === 'risk' && <div className="space-y-2"><Label htmlFor="legal-risk">Risk level</Label><select id="legal-risk" value={form.risk_level} onChange={event => setForm({ ...form, risk_level: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="">Not assessed</option>{['low', 'medium', 'high', 'critical'].map(level => <option key={level} value={level}>{level}</option>)}</select></div>}
            {activeFormRecordType === 'risk' && <>
              <div className="space-y-2"><Label htmlFor="legal-likelihood">Likelihood (1–5)</Label><Input id="legal-likelihood" type="number" min="1" max="5" step="1" value={form.likelihood} onChange={event => setForm({ ...form, likelihood: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="legal-impact">Impact (1–5)</Label><Input id="legal-impact" type="number" min="1" max="5" step="1" value={form.impact} onChange={event => setForm({ ...form, impact: event.target.value })} /></div>
            </>}
            {detailFields.map(field => (
              <div key={field.key} className={`space-y-2 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                <Label htmlFor={`legal-detail-${field.key}`}>{field.label}</Label>
                {field.type === 'textarea'
                  ? <Textarea id={`legal-detail-${field.key}`} rows={3} maxLength={12000} value={detailValues[field.key] ?? ''} onChange={event => setDetailValues({ ...detailValues, [field.key]: event.target.value })} />
                  : field.type === 'select'
                    ? <select id={`legal-detail-${field.key}`} value={detailValues[field.key] ?? ''} onChange={event => setDetailValues({ ...detailValues, [field.key]: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900"><option value="">Select…</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>
                    : <Input id={`legal-detail-${field.key}`} type={field.type} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? '0.01' : undefined} maxLength={field.type === 'text' ? 500 : undefined} value={detailValues[field.key] ?? ''} onChange={event => setDetailValues({ ...detailValues, [field.key]: event.target.value })} />}
              </div>
            ))}
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
            {canEditRecord(selected) && <Button variant="outline" onClick={() => openEdit(selected)}>Edit record</Button>}
            {(canReview && (!selected.approval_status || selected.approval_status === 'returned') && ['draft', 'submitted', 'under_review', 'negotiation'].includes(selected.status)) && <Button onClick={() => void submitForApproval(selected)}>Submit for approval</Button>}
            {selected.status === 'pending_approval' && (() => {
              const approval = approvalItems.find(item => item.request_id === selected.id && item.status === 'pending');
              const canApproveSelected = isAdmin || hasPermission(`${getLegalRecordPermission(selected.record_type)}.approve`);
              return approval && canApproveSelected ? <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300">Approval stage: {approval.approval_stages?.stage_name || 'Review'}{approval.approval_stages?.approver_role ? ` · ${approval.approval_stages.approver_role}` : ''}</p>
                <Textarea rows={2} placeholder="Decision comments (optional)" value={decisionComments} onChange={event => setDecisionComments(event.target.value)} />
                <div className="flex flex-wrap gap-2"><Button onClick={() => void updateDecision(selected, approval, 'approved')}>Approve</Button><Button onClick={() => void returnForCorrection(selected, approval)} disabled={!decisionComments.trim()}>Return for correction</Button><Button variant="destructive" onClick={() => void updateDecision(selected, approval, 'rejected')}>Reject</Button></div>
              </div> : null;
            })()}
            <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex items-center justify-between"><h3 className="font-medium">Documents</h3>{(canEdit || canCreate || (selected.record_type === 'request' && hasPermission('legal.requests.create'))) && <label className="inline-flex cursor-pointer items-center gap-1 text-sm text-blue-700 hover:underline"><Upload className="h-4 w-4" />Upload<input type="file" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadAttachment(selected, file); event.currentTarget.value = ''; }} /></label>}</div>
              {attachments.map(attachment => <button key={attachment.id} onClick={() => void downloadAttachment(attachment)} className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"><span className="truncate">{attachment.file_name}</span><span className="shrink-0 text-xs text-gray-500">{new Date(attachment.created_at).toLocaleDateString()}</span></button>)}
              {attachments.length === 0 && <p className="text-sm text-gray-500">No documents attached.</p>}
            </div>
            <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="font-medium">Activity and comments</h3>
              {(isAdmin || hasPermission(`${getLegalRecordPermission(selected.record_type)}.edit`)
                || hasPermission(`${getLegalRecordPermission(selected.record_type)}.review`)
                || (selected.record_type === 'employment' && hasPermission('hr.employment_matters.edit'))
                || (selected.record_type === 'request' && selected.requester_id === user?.id && hasPermission('legal.requests.create'))) && (
                <div className="space-y-2">
                  <select aria-label="Activity type" value={eventType} onChange={event => setEventType(event.target.value as LegalRecordEvent['event_type'])} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-900">
                    <option value="comment">Comment</option><option value="requested_information">Request information</option>
                    <option value="assessment">Legal assessment</option><option value="recommendation">Recommendation</option>
                    <option value="status_update">Progress update</option><option value="deadline_update">Deadline update</option>
                  </select>
                  <Textarea rows={3} maxLength={12000} value={eventBody} onChange={event => setEventBody(event.target.value)} placeholder="Add a comment or legal progress update" />
                  <div className="flex justify-end"><Button onClick={() => void addEvent(selected)} disabled={!eventBody.trim()}>Add activity</Button></div>
                </div>
              )}
              {events.map(item => (
                <article key={item.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                    <span className="font-medium capitalize">{item.event_type.replace(/_/g, ' ')} · {profileName(profiles.find(profile => profile.id === item.actor_id))}</span>
                    <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">{item.body}</p>
                </article>
              ))}
              {events.length === 0 && <p className="text-sm text-gray-500">No activity recorded yet.</p>}
            </div>
            {['contract', 'draft', 'template', 'document', 'policy'].includes(selected.record_type) && <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <h3 className="font-medium">Document / record versions</h3>
              {versions.map(version => (
                <div key={version.id} className="rounded-md border border-gray-200 p-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>Version {version.version_number} · {String(version.record_snapshot.status ?? 'saved')}</span>
                    <time dateTime={version.created_at}>{new Date(version.created_at).toLocaleString()}</time>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-700 dark:text-blue-300">View saved record snapshot</summary>
                    <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">{JSON.stringify(version.record_snapshot, null, 2)}</pre>
                  </details>
                </div>
              ))}
              {versions.length === 0 && <p className="text-sm text-gray-500">No versions have been recorded.</p>}
            </div>}
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

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
    <div className="h-64">{children}</div>
  </section>;
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm text-gray-500">No records available for this chart.</div>;
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-0.5 break-words font-medium text-gray-800 dark:text-gray-200">{value || '—'}</dd></div>;
}
