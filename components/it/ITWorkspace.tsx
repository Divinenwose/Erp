'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity, AlertTriangle, Archive, ArrowRight, BarChart3, BookOpen, Building2,
  CheckCircle2, ClipboardCheck, Clock3, Cpu, Database, Download, FileCheck,
  FileText, Headphones, KeyRound, LifeBuoy, LockKeyhole, Plus, RefreshCw,
  Server, Shield, ShieldCheck, ShoppingCart, Trash2, Users, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MODULES = [
  { key: 'tickets', title: 'Helpdesk', permission: 'it.tickets.view', icon: Headphones, kind: 'tickets' },
  { key: 'incidents', title: 'Incidents', permission: 'it.incidents.view', icon: AlertTriangle, kind: 'incidents' },
  { key: 'assets', title: 'IT Assets', permission: 'it.assets.view', icon: Cpu, kind: 'assets' },
  { key: 'access', title: 'Accounts & Access', permission: 'it.access.view', icon: KeyRound, kind: 'access' },
  { key: 'licenses', title: 'Software & Licenses', permission: 'it.licenses.view', icon: FileCheck, kind: 'licenses' },
  { key: 'infrastructure', title: 'Infrastructure', permission: 'it.infrastructure.view', icon: Server, kind: 'infrastructure' },
  { key: 'backups', title: 'Backup & Recovery', permission: 'it.backup.view', icon: Database, kind: 'backups' },
  { key: 'security', title: 'Cybersecurity', permission: 'it.security.view', icon: Shield, kind: 'security' },
  { key: 'compliance', title: 'Policies & Compliance', permission: 'it.compliance.view', icon: ShieldCheck, kind: 'compliance' },
  { key: 'changes', title: 'Changes & Requests', permission: 'it.changes.view', icon: Wrench, kind: 'changes' },
  { key: 'vendors', title: 'Vendors & Contracts', permission: 'it.vendors.view', icon: Building2, kind: 'vendors' },
  { key: 'purchasing', title: 'IT Purchasing', permission: 'it.purchasing.view', icon: ShoppingCart, kind: 'purchasing' },
  { key: 'training', title: 'Training', permission: 'it.training.view', icon: BookOpen, kind: 'training' },
  { key: 'documentation', title: 'Documentation', permission: 'it.documentation.view', icon: FileText, kind: 'documentation' },
  { key: 'reports', title: 'Reports', permission: 'it.reports.view', icon: BarChart3, kind: 'reports' },
] as const;

type ModuleKey = typeof MODULES[number]['key'];
type Ticket = Record<string, any>;
type ITRecord = Record<string, any>;
type Asset = Record<string, any>;
type License = Record<string, any>;

const WORKFLOW_STAGES = [
  'it_review', 'supporting_documents', 'approval', 'execution',
  'documentation', 'testing_follow_up', 'closure',
] as const;

const STAGE_LABELS: Record<string, string> = {
  it_review: 'IT Review',
  supporting_documents: 'Supporting Documents / Quotes',
  approval: 'Approval',
  execution: 'Execution',
  documentation: 'Documentation',
  testing_follow_up: 'Testing / Follow-up',
  closure: 'Closure',
};

const REPORTS = [
  { title: 'System Performance Reports', type: 'monitoring' },
  { title: 'Network Uptime Reports', type: 'monitoring' },
  { title: 'Helpdesk Resolution Reports', type: 'tickets' },
  { title: 'Cybersecurity Incident Reports', type: 'security_incident' },
  { title: 'Backup & Recovery Reports', type: 'backup' },
  { title: 'Software License Compliance Reports', type: 'licenses' },
  { title: 'Hardware Asset Reports', type: 'assets' },
  { title: 'Vendor Performance Reports', type: 'vendor' },
  { title: 'IT Budget Utilization Reports', type: 'purchasing' },
  { title: 'Training Participation Reports', type: 'training' },
  { title: 'Monthly IT Dashboard', type: 'month' },
  { title: 'Annual IT Review', type: 'year' },
] as const;

function personName(person?: Record<string, any> | null) {
  if (!person) return 'Unassigned';
  return person.display_name || [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email || 'User';
}

function makeReference(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.info('There are no records to export');
    return;
  }
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const csv = [headers, ...rows.map(row => headers.map(header => row[header] ?? ''))]
    .map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Metric({ label, value, tone = 'text-gray-900 dark:text-white' }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-3"><div className={`text-xl font-semibold tabular-nums ${tone}`}>{value}</div><div className="text-xs text-gray-500 mt-1">{label}</div></div>;
}

export default function ITWorkspace({ section = 'overview' }: { section?: string }) {
  const router = useRouter();
  const { company, profile, user, isCompanyAdmin, hasPermission } = useAuth();
  const admin = isCompanyAdmin();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
    const [licenseAssignments, setLicenseAssignments] = useState<Record<string, any>[]>([]);
  const [records, setRecords] = useState<ITRecord[]>([]);
  const [itPurchaseRequests, setItPurchaseRequests] = useState<Record<string, any>[]>([]);
  const [itBudgets, setItBudgets] = useState<Record<string, any>[]>([]);
  const [people, setPeople] = useState<Record<string, any>[]>([]);
  const [vendorDirectory, setVendorDirectory] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ITRecord | Ticket | Asset | License | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [seatDialogOpen, setSeatDialogOpen] = useState(false);
  const [seatLicenseId, setSeatLicenseId] = useState('');
  const [seatUserId, setSeatUserId] = useState('');

  const activeModule = MODULES.find(item => item.key === section as ModuleKey);
  const can = useCallback((permission: string) => admin || hasPermission(permission), [admin, hasPermission]);
  const canView = !activeModule || can(activeModule.permission);

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data: itDepartment, error: departmentError } = await supabase.from('departments').select('id').eq('company_id', company.id).eq('name', 'IT').maybeSingle();
    const [ticketResult, assetResult, licenseResult, assignmentResult, recordResult, peopleResult, vendorResult, purchaseResult, budgetResult] = await Promise.all([
      supabase.from('it_tickets').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('it_assets').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('it_licenses').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('it_license_assignments').select('*').eq('company_id', company.id).is('released_at', null).order('assigned_at', { ascending: false }),
      supabase.from('it_records').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, display_name, first_name, last_name, email, department_id, job_title, role, is_active').eq('company_id', company.id).order('display_name'),
      supabase.from('vendors').select('id, name, category, status').eq('company_id', company.id).order('name'),
      itDepartment ? supabase.from('purchase_requests').select('*').eq('company_id', company.id).eq('department_id', itDepartment.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      itDepartment ? supabase.from('budgets').select('*').eq('company_id', company.id).eq('department_id', itDepartment.id).order('fiscal_year', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    const firstError = departmentError || ticketResult.error || assetResult.error || licenseResult.error || assignmentResult.error || recordResult.error || peopleResult.error || vendorResult.error || purchaseResult.error || budgetResult.error;
    if (firstError) toast.error(`Unable to load IT records: ${firstError.message}`);
    setTickets(ticketResult.data ?? []);
    setAssets(assetResult.data ?? []);
    setLicenses(licenseResult.data ?? []);
    setLicenseAssignments(assignmentResult.data ?? []);
    setRecords(recordResult.data ?? []);
    setPeople(peopleResult.data ?? []);
    setVendorDirectory(vendorResult.data ?? []);
    setItPurchaseRequests(purchaseResult.data ?? []);
    setItBudgets(budgetResult.data ?? []);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { void load(); }, [load]);

  const audit = async (action: string, entity: string, id: string | undefined, previous?: any, next?: any) => {
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, {
        action,
        module: 'it',
        entity_type: entity,
        entity_id: id,
        previous_value: previous,
        new_value: next,
      });
    }
  };

  const assignLicenseSeat = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company?.id || !user?.id || !can('it.licenses.assign')) return toast.error('You do not have permission to assign licenses');
    const license = licenses.find(item => item.id === seatLicenseId);
    if (!license || !seatUserId) return toast.error('Choose a license and user');
    const activeAssignments = licenseAssignments.filter(item => item.license_id === license.id);
    if (activeAssignments.length >= Number(license.licensed_seats)) return toast.error('All licensed seats are assigned');
    const { data, error } = await supabase.from('it_license_assignments').insert({
      company_id: company.id,
      license_id: license.id,
      user_id: seatUserId,
      assigned_by: user.id,
    }).select('*').single();
    if (error || !data) return toast.error(error?.message || 'Unable to assign this license seat');
    await audit('license_seat_assigned', 'it_license_assignments', data.id, undefined, data);
    setSeatDialogOpen(false);
    setSeatUserId('');
    toast.success('License seat assigned');
    await load();
  };

  const releaseLicenseSeat = async (assignment: Record<string, any>) => {
    if (!company?.id || !user?.id || !can('it.licenses.assign')) return toast.error('You do not have permission to release licenses');
    const updates = { released_at: new Date().toISOString() };
    const { error } = await supabase.from('it_license_assignments').update(updates).eq('id', assignment.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    await audit('license_seat_released', 'it_license_assignments', assignment.id, assignment, updates);
    toast.success('License seat released');
    await load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      priority: 'medium',
      status: ['tickets', 'incidents', 'access', 'changes', 'purchasing', 'security'].includes(section) ? 'open'
        : section === 'assets' ? 'in_service'
          : section === 'infrastructure' ? 'online'
            : section === 'vendors' ? 'active'
              : section === 'compliance' ? 'under_review'
                : section === 'documentation' ? 'current'
                  : 'planned',
      owner_id: user?.id ?? '',
      ticket_type: section === 'incidents' ? 'incident' : 'helpdesk',
      workflow_stage: 'it_review',
      record_type: section === 'security' ? 'security_incident' : section === 'backups' ? 'backup' : section === 'vendors' ? 'vendor' : 'change_request',
      category: section === 'assets' ? 'computer' : '',
      license_type: 'subscription',
      licensed_seats: '1',
      compliance_status: 'compliant',
      supporting_documents: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (row: ITRecord | Ticket | Asset | License) => {
    setEditing(row);
    if (section === 'tickets' || section === 'incidents') {
      const ticket = row as Ticket;
      setForm(Object.fromEntries(Object.entries(ticket).map(([key, value]) => [key, value == null ? '' : String(value)])));
    } else if (section === 'assets') {
      const asset = row as Asset;
      setForm(Object.fromEntries(Object.entries(asset).map(([key, value]) => [key, value == null ? '' : String(value)])));
    } else if (section === 'licenses') {
      const license = row as License;
      setForm(Object.fromEntries(Object.entries(license).map(([key, value]) => [key, value == null ? '' : String(value)])));
    } else {
      const record = row as ITRecord;
      setForm({
        ...Object.fromEntries(Object.entries(record).map(([key, value]) => [key, value == null ? '' : String(value)])),
        category: String(record.details?.category ?? ''),
        supporting_documents: (record.supporting_documents ?? []).join('\n'),
      });
    }
    setDialogOpen(true);
  };

  const formValue = (key: string) => form[key] ?? '';
  const setValue = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company?.id || !user?.id || !activeModule) return;
    setSaving(true);
    const creating = !editing;
    const id = editing?.id;
    let table: 'it_tickets' | 'it_assets' | 'it_licenses' | 'it_records' = 'it_records';
    let payload: Record<string, any> = {};
    let permission = creating ? `${activeModule.permission.replace('.view', '.create')}` : `${activeModule.permission.replace('.view', '.edit')}`;

    if (section === 'tickets' || section === 'incidents') {
      table = 'it_tickets';
      permission = section === 'incidents'
        ? creating ? 'it.incidents.create' : 'it.incidents.edit'
        : creating ? 'it.tickets.create' : 'it.tickets.edit';
      payload = {
        title: formValue('title').trim(),
        description: formValue('description').trim(),
        ticket_type: section === 'incidents' ? 'incident' : formValue('ticket_type') || 'helpdesk',
        priority: formValue('priority'),
        status: formValue('status'),
        assignee_id: formValue('assignee_id') || null,
        resolution: formValue('resolution').trim() || null,
        resolution_minutes: formValue('resolution_minutes') ? Number(formValue('resolution_minutes')) : null,
        asset_id: formValue('asset_id') || null,
        workflow_stage: formValue('workflow_stage') || 'it_review',
        approval_status: formValue('approval_status') || null,
        supporting_documents: formValue('supporting_documents').split('\n').map(value => value.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      };
      if (creating) {
        permission = section === 'incidents' ? 'it.incidents.create' : 'it.tickets.create';
        payload = { ...payload, company_id: company.id, ticket_number: makeReference('IT'), requester_id: user.id, created_by: user.id };
      }
    } else if (section === 'assets') {
      table = 'it_assets';
      permission = creating ? 'it.assets.create' : 'it.assets.edit';
      payload = {
        asset_tag: formValue('asset_tag').trim(), name: formValue('name').trim(), category: formValue('category'),
        manufacturer: formValue('manufacturer').trim() || null, model: formValue('model').trim() || null,
        serial_number: formValue('serial_number').trim() || null, operating_system: formValue('operating_system').trim() || null,
        purchase_date: formValue('purchase_date') || null, purchase_cost: formValue('purchase_cost') ? Number(formValue('purchase_cost')) : null,
        warranty_expires: formValue('warranty_expires') || null, status: formValue('status'),
        assigned_to: formValue('assigned_to') || null, location: formValue('location').trim() || null,
        notes: formValue('notes').trim() || null, updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id, created_by: user.id };
    } else if (section === 'licenses') {
      table = 'it_licenses';
      permission = creating ? 'it.licenses.create' : 'it.licenses.edit';
      payload = {
        product_name: formValue('product_name').trim(), vendor_name: formValue('vendor_name').trim() || null,
        version: formValue('version').trim() || null, license_type: formValue('license_type'),
        license_reference: formValue('license_reference').trim() || null, licensed_seats: Number(formValue('licensed_seats') || 1),
        renewal_date: formValue('renewal_date') || null, annual_cost: formValue('annual_cost') ? Number(formValue('annual_cost')) : null,
        compliance_status: formValue('compliance_status'), owner_id: formValue('owner_id') || null,
        notes: formValue('notes').trim() || null, updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id, created_by: user.id };
    } else {
      table = 'it_records';
      const recordType = section === 'access' ? 'access_request'
        : section === 'security' ? formValue('record_type') || 'security_incident'
          : section === 'infrastructure' ? 'monitoring'
            : section === 'backups' ? formValue('record_type') || 'backup'
              : section === 'compliance' ? 'policy'
                : section === 'changes' ? 'change_request'
                  : section === 'vendors' ? formValue('record_type') || 'vendor'
                    : section === 'purchasing' ? 'purchase_request'
                      : section === 'training' ? 'training'
                        : 'documentation';
      permission = creating ? `${activeModule.permission.replace('.view', '.create')}` : `${activeModule.permission.replace('.view', '.edit')}`;
      payload = {
        record_type: recordType,
        title: formValue('title').trim(), description: formValue('description').trim() || null,
        status: formValue('status') || 'open', priority: formValue('priority') || 'medium',
        owner_id: formValue('owner_id') || user.id,
        vendor_name: vendorDirectory.find(vendor => vendor.id === formValue('vendor_id'))?.name || formValue('vendor_name').trim() || null,
        vendor_id: formValue('vendor_id') || null,
        amount: formValue('amount') ? Number(formValue('amount')) : null,
        metric_name: formValue('metric_name').trim() || null,
        metric_value: formValue('metric_value') ? Number(formValue('metric_value')) : null,
        metric_unit: formValue('metric_unit').trim() || null,
        event_date: formValue('event_date') || null,
        due_date: formValue('due_date') || null,
        reference_url: formValue('reference_url').trim() || null,
        supporting_documents: formValue('supporting_documents').split('\n').map(value => value.trim()).filter(Boolean),
        details: { ...(editing as ITRecord | null)?.details, category: formValue('category').trim() || null },
        workflow_stage: ['access', 'changes', 'purchasing', 'security'].includes(section) ? formValue('workflow_stage') || 'it_review' : null,
        approval_status: ['change_request', 'purchase_request', 'access_request', 'security_request', 'security_incident'].includes(recordType) ? formValue('approval_status') || 'pending' : null,
        execution_notes: formValue('execution_notes').trim() || null,
        test_result: formValue('test_result').trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id, created_by: user.id };
    }

    if ((section === 'tickets' || section === 'incidents') && (creating ? Boolean(payload.assignee_id) : payload.assignee_id !== (editing as Ticket).assignee_id) && !can(section === 'incidents' ? 'it.incidents.assign' : 'it.tickets.assign')) {
      toast.error('You do not have permission to assign tickets');
      setSaving(false);
      return;
    }
    if (section === 'assets' && (creating ? Boolean(payload.assigned_to) : payload.assigned_to !== (editing as Asset).assigned_to) && !can('it.assets.assign')) {
      toast.error('You do not have permission to assign IT assets');
      setSaving(false);
      return;
    }
    if (!can(permission)) {
      toast.error('You do not have permission to perform this action');
      setSaving(false);
      return;
    }
    if (!payload.title && table !== 'it_assets' && table !== 'it_licenses') {
      toast.error('Enter a title');
      setSaving(false);
      return;
    }

    let linkedPurchaseRequestId: string | null = null;
    if (creating && section === 'purchasing') {
      const [{ data: department }, { data: employee }] = await Promise.all([
        supabase.from('departments').select('id').eq('company_id', company.id).eq('name', 'IT').maybeSingle(),
        supabase.from('employees').select('id').eq('company_id', company.id).eq('user_id', user.id).maybeSingle(),
      ]);
      if (!department) {
        toast.error('Create the IT department in Settings before submitting a purchase request');
        setSaving(false);
        return;
      }
      const requestNumber = makeReference('IT-PR');
      const { data: purchaseRequest, error: purchaseError } = await supabase.from('purchase_requests').insert({
        company_id: company.id,
        request_number: requestNumber,
        title: payload.title,
        department_id: department.id,
        requested_by: employee?.id ?? null,
        required_date: payload.due_date,
        estimated_cost: payload.amount ?? 0,
        status: 'draft',
        priority: payload.priority,
        justification: payload.description,
      }).select('id').single();
      if (purchaseError || !purchaseRequest) {
        toast.error(purchaseError?.message || 'Unable to create the linked purchasing request');
        setSaving(false);
        return;
      }
      linkedPurchaseRequestId = purchaseRequest.id;
      payload.linked_purchase_request_id = linkedPurchaseRequestId;
    }

    const query = creating
      ? supabase.from(table).insert(payload).select('*').single()
      : supabase.from(table).update(payload).eq('id', id).eq('company_id', company.id).select('*').single();
    const { data, error } = await query;
    if (error || !data) {
      if (linkedPurchaseRequestId) await supabase.from('purchase_requests').delete().eq('id', linkedPurchaseRequestId).eq('company_id', company.id);
      toast.error(error?.message || 'Unable to save this IT record');
      setSaving(false);
      return;
    }

    await audit(creating ? 'created' : 'updated', table, data.id, editing, data);
    if (table === 'it_tickets' && data.assignee_id && data.assignee_id !== user.id) {
      await sendNotification(company.id, data.assignee_id, {
        title: `IT ticket assigned: ${data.ticket_number}`,
        message: data.title,
        type: data.priority === 'urgent' ? 'error' : 'info',
        module: 'it',
        reference_id: data.id,
        action_url: '/it/tickets',
      });
    }
    toast.success(creating ? 'IT record created' : 'IT record updated');
    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    await load();
  };

  const deleteRow = async (table: string, row: Record<string, any>, permission: string) => {
    if (!company?.id || !can(permission)) {
      toast.error('You do not have permission to delete this record');
      return;
    }
    if (!window.confirm(`Delete ${row.title || row.name || row.product_name || row.ticket_number}? This cannot be undone.`)) return;
    const { error } = await supabase.from(table).delete().eq('id', row.id).eq('company_id', company.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await audit('deleted', table, row.id, row);
    toast.success('Record deleted');
    await load();
  };

  const updateTicketWorkflow = async (ticket: Ticket, nextStage?: string, decision?: 'approved' | 'rejected') => {
    if (!company?.id || !user?.id) return;
    if (decision && !can(ticket.ticket_type === 'incident' ? 'it.incidents.approve' : 'it.tickets.approve')) return toast.error('You do not have approval permission');
    if (nextStage && !can(ticket.ticket_type === 'incident' ? 'it.incidents.edit' : 'it.tickets.edit')) return toast.error('You do not have permission to update tickets');
    if (decision && ticket.workflow_stage !== 'approval') return toast.error('Tickets can only be approved at the approval stage');
    if (nextStage) {
      const currentIndex = WORKFLOW_STAGES.indexOf(ticket.workflow_stage);
      if (WORKFLOW_STAGES.indexOf(nextStage as typeof WORKFLOW_STAGES[number]) !== currentIndex + 1) return toast.error('Advance the ticket one workflow stage at a time');
      if (ticket.workflow_stage === 'approval' && ticket.approval_status !== 'approved') return toast.error('This ticket must be approved or returned for more information first');
      if (ticket.workflow_stage === 'testing_follow_up' && ticket.status !== 'resolved') return toast.error('Resolve the ticket and record its resolution before closure');
    }
    let workflow_stage = nextStage || ticket.workflow_stage;
    if (decision === 'approved') workflow_stage = 'execution';
    if (decision === 'rejected') workflow_stage = 'supporting_documents';
    const status = decision === 'rejected' ? 'triaged'
      : workflow_stage === 'closure' ? 'closed'
        : workflow_stage === 'it_review' ? 'open'
          : workflow_stage === 'supporting_documents' ? 'triaged'
            : workflow_stage === 'approval' ? 'waiting'
              : workflow_stage === 'execution' ? 'in_progress'
                : workflow_stage === 'testing_follow_up' ? 'waiting' : ticket.status;
    const updates: Record<string, any> = {
      workflow_stage,
      status,
      approval_status: decision ?? (workflow_stage === 'approval' ? 'pending' : ticket.approval_status),
      updated_at: new Date().toISOString(),
    };
    if (workflow_stage === 'closure') updates.closed_at = new Date().toISOString();
    const { error } = await supabase.from('it_tickets').update(updates).eq('id', ticket.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    await audit(decision || 'workflow_advanced', 'it_tickets', ticket.id, ticket, updates);
    if (decision && ticket.requester_id && ticket.requester_id !== user.id) {
      await sendNotification(company.id, ticket.requester_id, {
        title: `IT ticket ${decision}: ${ticket.ticket_number}`,
        message: ticket.title,
        type: decision === 'approved' ? 'success' : 'warning',
        module: 'it',
        reference_id: ticket.id,
        action_url: '/it/tickets',
      });
    }
    toast.success(decision ? `Ticket ${decision}` : 'Ticket workflow advanced');
    await load();
  };

  const updateTicketStatus = async (ticket: Ticket, status: string) => {
    if (!company?.id || !user?.id) return;
    const resource = ticket.ticket_type === 'incident' ? 'it.incidents' : 'it.tickets';
    const requiredPermission = status === 'resolved' ? `${resource}.resolve` : status === 'escalated' ? `${resource}.escalate` : `${resource}.edit`;
    if (!can(requiredPermission)) return toast.error('You do not have permission to change this ticket status');
    if (status === 'resolved' && ticket.workflow_stage !== 'testing_follow_up') return toast.error('Resolve tickets during testing and follow-up');
    if (status === 'resolved' && !ticket.resolution?.trim()) return toast.error('Edit the ticket and record a resolution before resolving it');
    const updates = {
      status,
      escalated_at: status === 'escalated' ? new Date().toISOString() : ticket.escalated_at,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('it_tickets').update(updates).eq('id', ticket.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    await audit(status, 'it_tickets', ticket.id, ticket, updates);
    if (ticket.requester_id && ticket.requester_id !== user.id) {
      await sendNotification(company.id, ticket.requester_id, {
        title: `IT ticket ${status}: ${ticket.ticket_number}`,
        message: ticket.title,
        type: status === 'escalated' ? 'warning' : 'info',
        module: 'it',
        reference_id: ticket.id,
        action_url: '/it/tickets',
      });
    }
    toast.success(`Ticket ${status}`);
    await load();
  };

  const updateRecordWorkflow = async (record: ITRecord, nextStage?: string, decision?: 'approved' | 'rejected') => {
    if (!company?.id || !user?.id) return;
    const permission = record.record_type === 'purchase_request' ? 'it.purchasing.approve'
      : record.record_type.startsWith('security_') ? 'it.security.approve'
        : record.record_type === 'access_request' ? 'it.access.approve'
        : 'it.changes.approve';
    if (decision && !can(permission)) return toast.error('You do not have approval permission');
    if (nextStage && !can(permission.replace('.approve', '.edit'))) return toast.error('You do not have permission to update this workflow');
    if (decision && record.workflow_stage !== 'approval') return toast.error('Requests can only be approved at the approval stage');
    if (nextStage) {
      const currentIndex = WORKFLOW_STAGES.indexOf(record.workflow_stage);
      if (WORKFLOW_STAGES.indexOf(nextStage as typeof WORKFLOW_STAGES[number]) !== currentIndex + 1) return toast.error('Advance one workflow stage at a time');
      if (record.workflow_stage === 'approval' && record.approval_status !== 'approved') return toast.error('This request must be approved or returned for more information first');
    }
    let workflow_stage = nextStage || record.workflow_stage;
    if (decision === 'approved') workflow_stage = 'execution';
    if (decision === 'rejected') workflow_stage = 'supporting_documents';
    const updates: Record<string, any> = {
      workflow_stage,
      approval_status: decision ?? (workflow_stage === 'approval' ? 'pending' : record.approval_status),
      status: decision === 'rejected' ? 'revision_requested' : workflow_stage === 'closure' ? 'closed' : record.status,
      approved_by: decision === 'approved' ? user.id : record.approved_by,
      approved_at: decision === 'approved' ? new Date().toISOString() : record.approved_at,
      closed_at: workflow_stage === 'closure' ? new Date().toISOString() : record.closed_at,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('it_records').update(updates).eq('id', record.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    if (record.record_type === 'purchase_request' && record.linked_purchase_request_id) {
      const linkedStatus = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : workflow_stage === 'approval' ? 'pending' : workflow_stage === 'closure' ? 'completed' : null;
      const { error: linkedError } = linkedStatus
        ? await supabase.from('purchase_requests').update({ status: linkedStatus, ...(decision === 'approved' ? { approved_at: new Date().toISOString() } : {}) }).eq('id', record.linked_purchase_request_id).eq('company_id', company.id)
        : { error: null };
      if (linkedError) toast.error(`IT workflow updated, but linked purchasing submission failed: ${linkedError.message}`);
    }
    await audit(decision || 'workflow_advanced', 'it_records', record.id, record, updates);
    if (decision && record.owner_id && record.owner_id !== user.id) {
      await sendNotification(company.id, record.owner_id, {
        title: `IT request ${decision}: ${record.title}`,
        message: record.description,
        type: decision === 'approved' ? 'success' : 'warning',
        module: 'it',
        reference_id: record.id,
        action_url: `/it/${record.record_type === 'purchase_request' ? 'purchasing' : record.record_type === 'access_request' ? 'access' : record.record_type.startsWith('security_') ? 'security' : 'changes'}`,
      });
    }
    toast.success(decision ? `Request ${decision}` : 'Workflow advanced');
    await load();
  };

  const activeTickets = tickets.filter(ticket => !['closed', 'resolved'].includes(ticket.status));
  const resolvedTickets = tickets.filter(ticket => ['closed', 'resolved'].includes(ticket.status));
  const resolutionTimes = resolvedTickets.map(ticket => ticket.resolution_minutes).filter((minutes): minutes is number => typeof minutes === 'number');
  const avgResolution = resolutionTimes.length
    ? Math.round(resolutionTimes.reduce((total, minutes) => total + minutes, 0) / resolutionTimes.length)
    : null;
  const uptimeEntries = records.filter(record => record.record_type === 'monitoring' && /uptime/i.test(record.metric_name || ''));
  const averageUptime = uptimeEntries.length
    ? `${(uptimeEntries.reduce((total, record) => total + Number(record.metric_value || 0), 0) / uptimeEntries.length).toFixed(2)}%`
    : '—';
  const pendingRequests = itPurchaseRequests.filter(request => !['completed', 'rejected', 'cancelled'].includes(request.status)).length;
  const activeIncidents = tickets.filter(ticket => ticket.ticket_type === 'incident' && !['resolved', 'closed'].includes(ticket.status)).length
    + records.filter(record => record.record_type === 'security_incident' && !['resolved', 'closed'].includes(record.status)).length;
  const backupFailures = records.filter(record => ['backup', 'disaster_recovery'].includes(record.record_type) && ['failed', 'overdue', 'at_risk'].includes(record.status)).length;
  const nonCompliantLicenses = licenses.filter(license => license.compliance_status !== 'compliant').length;

  const reportRows = useMemo(() => {
    if (section !== 'reports' || selectedReport === null) return [];
    const spec = REPORTS[selectedReport];
    if (spec.type === 'tickets') return tickets.map(ticket => ({ ticket_number: ticket.ticket_number, title: ticket.title, type: ticket.ticket_type, priority: ticket.priority, status: ticket.status, resolution_minutes: ticket.resolution_minutes, created_at: ticket.created_at }));
    if (spec.type === 'assets') return assets;
    if (spec.type === 'licenses') return licenses;
    if (spec.type === 'month') {
      const month = new Date().toISOString().slice(0, 7);
      return [
        { month, tickets_created: tickets.filter(ticket => ticket.created_at?.startsWith(month)).length, open_tickets: activeTickets.length, incidents: activeIncidents, monitored_uptime_average: averageUptime, assets_in_service: assets.filter(asset => asset.status === 'in_service').length, license_issues: nonCompliantLicenses, pending_purchase_requests: pendingRequests },
      ];
    }
    if (spec.type === 'year') {
      const year = String(new Date().getFullYear());
      return [
        { year, tickets_created: tickets.filter(ticket => ticket.created_at?.startsWith(year)).length, tickets_resolved: resolvedTickets.length, incidents: activeIncidents, backups_failed_or_at_risk: backupFailures, assets: assets.length, license_issues: nonCompliantLicenses, pending_purchase_requests: pendingRequests },
      ];
    }
    if (spec.type === 'monitoring') {
      const monitoringRecords = records.filter(record => record.record_type === 'monitoring');
      return spec.title.startsWith('Network Uptime') ? monitoringRecords.filter(record => /uptime|availability/i.test(record.metric_name || '')) : monitoringRecords.filter(record => !/uptime/i.test(record.metric_name || ''));
    }
    if (spec.type === 'backup') return records.filter(record => ['backup', 'disaster_recovery'].includes(record.record_type));
    if (spec.type === 'vendor') return records.filter(record => ['vendor', 'contract'].includes(record.record_type));
    if (spec.type === 'purchasing') return [
      ...itBudgets.map(budget => ({ report_type: 'department_budget', name: budget.name, fiscal_year: budget.fiscal_year, allocated_amount: budget.total_amount, spent_amount: budget.spent_amount, remaining_amount: budget.remaining_amount, status: budget.status })),
      ...itPurchaseRequests.map(request => ({ report_type: 'purchase_request', request_number: request.request_number, title: request.title, status: request.status, estimated_cost: request.estimated_cost, required_date: request.required_date, created_at: request.created_at })),
    ];
    return records.filter(record => record.record_type === spec.type);
  }, [section, selectedReport, tickets, assets, licenses, records, itPurchaseRequests, itBudgets, activeTickets.length, activeIncidents, averageUptime, nonCompliantLicenses, pendingRequests, resolvedTickets.length, backupFailures]);

  const openRecordCount = (key: string) => {
    if (key === 'tickets') return tickets.filter(ticket => !['closed', 'resolved'].includes(ticket.status)).length;
    if (key === 'incidents') return tickets.filter(ticket => ticket.ticket_type === 'incident' && !['closed', 'resolved'].includes(ticket.status)).length;
    if (key === 'assets') return assets.length;
    if (key === 'licenses') return licenses.length;
    const moduleConfig = MODULES.find(item => item.key === key);
    if (!moduleConfig) return 0;
    const typesBySection: Record<string, string[]> = {
      access: ['access_request'], infrastructure: ['monitoring'], backups: ['backup', 'disaster_recovery'],
      security: ['security_incident', 'security_request'], compliance: ['policy'], changes: ['change_request'],
      vendors: ['vendor', 'contract'], purchasing: ['purchase_request'], training: ['training'], documentation: ['documentation'],
    };
    return records.filter(record => typesBySection[key]?.includes(record.record_type)).length;
  };

  const ticketColumns: Column<Ticket>[] = [
    { key: 'ticket_number', header: 'Ticket', cell: row => <span className="font-mono text-xs text-blue-700 dark:text-blue-300">{row.ticket_number}</span>, sortable: true },
    { key: 'title', header: 'Issue', sortable: true },
    { key: 'ticket_type', header: 'Type', cell: row => <span className="capitalize">{String(row.ticket_type).replace('_', ' ')}</span> },
    { key: 'priority', header: 'Priority', cell: row => <StatusBadge status={row.priority} /> },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'workflow_stage', header: 'Workflow', cell: row => STAGE_LABELS[row.workflow_stage] ?? 'IT Review' },
    { key: 'assignee_id', header: 'Assigned To', cell: row => personName(people.find(person => person.id === row.assignee_id)) },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex items-center gap-1">
      {can(section === 'incidents' ? 'it.incidents.edit' : 'it.tickets.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}
      {row.workflow_stage === 'approval' ? row.approval_status === 'approved' ? <Button variant="outline" size="sm" onClick={() => void updateTicketWorkflow(row, 'execution')}>Continue</Button> : can(section === 'incidents' ? 'it.incidents.approve' : 'it.tickets.approve') ? <><Button size="sm" onClick={() => void updateTicketWorkflow(row, undefined, 'approved')}>Approve</Button><Button variant="outline" size="sm" onClick={() => void updateTicketWorkflow(row, undefined, 'rejected')}>Return</Button></> : <span className="px-2 text-xs text-gray-500">Awaiting approval</span> : row.workflow_stage === 'testing_follow_up' && row.status !== 'resolved' && can(section === 'incidents' ? 'it.incidents.resolve' : 'it.tickets.resolve') ? <Button size="sm" onClick={() => void updateTicketStatus(row, 'resolved')}>Resolve</Button> : row.workflow_stage !== 'closure' && can(section === 'incidents' ? 'it.incidents.edit' : 'it.tickets.edit') && <Button variant="outline" size="sm" onClick={() => void updateTicketWorkflow(row, WORKFLOW_STAGES[Math.min(WORKFLOW_STAGES.indexOf(row.workflow_stage) + 1, WORKFLOW_STAGES.length - 1)])}>Advance</Button>}
      {row.status !== 'escalated' && can(section === 'incidents' ? 'it.incidents.escalate' : 'it.tickets.escalate') && <Button variant="outline" size="sm" onClick={() => void updateTicketStatus(row, 'escalated')}>Escalate</Button>}
      {can(section === 'incidents' ? 'it.incidents.delete' : 'it.tickets.delete') && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRow('it_tickets', row, section === 'incidents' ? 'it.incidents.delete' : 'it.tickets.delete')}><Trash2 className="h-4 w-4" /></Button>}
    </div> },
  ];

  const assetColumns: Column<Asset>[] = [
    { key: 'asset_tag', header: 'Asset Tag', sortable: true },
    { key: 'name', header: 'Asset', sortable: true },
    { key: 'category', header: 'Type', cell: row => <span className="capitalize">{row.category}</span> },
    { key: 'assigned_to', header: 'Assigned To', cell: row => personName(people.find(person => person.id === row.assigned_to)) },
    { key: 'warranty_expires', header: 'Warranty' },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can('it.assets.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}{can('it.assets.delete') && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRow('it_assets', row, 'it.assets.delete')}><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  const licenseColumns: Column<License>[] = [
    { key: 'product_name', header: 'Software', sortable: true },
    { key: 'vendor_name', header: 'Publisher' },
    { key: 'license_type', header: 'License', cell: row => <span className="capitalize">{row.license_type}</span> },
    { key: 'licensed_seats', header: 'Seats', sortable: true },
    { key: 'renewal_date', header: 'Renewal' },
    { key: 'compliance_status', header: 'Compliance', cell: row => <StatusBadge status={row.compliance_status} /> },
    { key: 'active_seats', header: 'Assigned', cell: row => `${licenseAssignments.filter(assignment => assignment.license_id === row.id).length} / ${row.licensed_seats}` },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can('it.licenses.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}{can('it.licenses.assign') && <Button variant="outline" size="sm" onClick={() => { setSeatLicenseId(row.id); setSeatUserId(''); setSeatDialogOpen(true); }}>Assign seat</Button>}{can('it.licenses.delete') && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRow('it_licenses', row, 'it.licenses.delete')}><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  const typesBySection: Record<string, string[]> = {
    access: ['access_request'], infrastructure: ['monitoring'], backups: ['backup', 'disaster_recovery'],
    security: ['security_incident', 'security_request'], compliance: ['policy'], changes: ['change_request'],
    vendors: ['vendor', 'contract'], purchasing: ['purchase_request'], training: ['training'], documentation: ['documentation'],
  };
  const recordsForSection = records.filter(record => typesBySection[section]?.includes(record.record_type));
  const recordColumns: Column<ITRecord>[] = [
    { key: 'title', header: 'Record', sortable: true },
    { key: 'record_type', header: 'Type', cell: row => <span className="capitalize">{String(row.record_type).replace(/_/g, ' ')}</span> },
    { key: 'vendor_name', header: section === 'vendors' ? 'Provider' : 'Metric / Provider', cell: row => row.vendor_name || [row.metric_name, row.metric_value, row.metric_unit].filter(value => value != null && value !== '').join(' ') || '—' },
    { key: 'amount', header: 'Amount', cell: row => row.amount == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: company?.currency || 'USD' }).format(Number(row.amount)) },
    { key: 'due_date', header: 'Due Date', cell: row => row.due_date || row.event_date || '—' },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'workflow_stage', header: 'Workflow', cell: row => row.workflow_stage ? STAGE_LABELS[row.workflow_stage] : '—' },
    { key: 'actions', header: 'Actions', cell: row => {
      const isSecurityRecord = row.record_type.startsWith('security_');
      const approvalPermission = row.record_type === 'purchase_request' ? 'it.purchasing.approve' : isSecurityRecord ? 'it.security.approve' : row.record_type === 'access_request' ? 'it.access.approve' : 'it.changes.approve';
      const editPermission = row.record_type === 'purchase_request' ? 'it.purchasing.edit' : isSecurityRecord ? 'it.security.edit' : row.record_type === 'access_request' ? 'it.access.edit' : 'it.changes.edit';
      const deletePermission = row.record_type === 'purchase_request' ? 'it.purchasing.delete' : isSecurityRecord ? 'it.security.delete' : row.record_type === 'access_request' ? 'it.access.delete' : 'it.changes.delete';
      return <div className="flex items-center gap-1">
        {can(editPermission) && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}
        {row.workflow_stage === 'approval' ? row.approval_status === 'approved' ? <Button variant="outline" size="sm" onClick={() => void updateRecordWorkflow(row, 'execution')}>Continue</Button> : row.approval_status === 'pending' && can(approvalPermission) ? <><Button size="sm" onClick={() => void updateRecordWorkflow(row, undefined, 'approved')}>Approve</Button><Button variant="outline" size="sm" onClick={() => void updateRecordWorkflow(row, undefined, 'rejected')}>Return</Button></> : <span className="px-2 text-xs text-gray-500">Awaiting review</span> : row.workflow_stage && row.workflow_stage !== 'closure' && can(editPermission) ? <Button variant="outline" size="sm" onClick={() => void updateRecordWorkflow(row, WORKFLOW_STAGES[Math.min(WORKFLOW_STAGES.indexOf(row.workflow_stage) + 1, WORKFLOW_STAGES.length - 1)])}>Advance</Button> : null}
        {can(deletePermission) && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRow('it_records', row, deletePermission)}><Trash2 className="h-4 w-4" /></Button>}
      </div>;
    } },
  ];

  const recordsForReport = selectedReport === null ? [] : reportRows;

  if (!canView) {
    return <div className="p-8 text-center"><LockKeyhole className="h-8 w-8 mx-auto text-gray-400" /><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">You do not have permission to view this IT area.</p><Button variant="link" onClick={() => router.push('/it')}>Return to IT overview</Button></div>;
  }

  if (section === 'overview') {
    const visibleModules = MODULES.filter(item => can(item.permission));
    return (
      <div className="space-y-6">
        <PageHeader title="Information Technology" description="IT operations, service delivery, assets, and risk" breadcrumbs={[{ label: 'Information Technology' }]}>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          {can('it.tickets.create') && <Button size="sm" asChild><Link href="/it/tickets"><Plus className="mr-2 h-4 w-4" />New Ticket</Link></Button>}
        </PageHeader>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <KPICard title="Open Tickets" value={activeTickets.length} icon={<LifeBuoy className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Avg. Resolution" value={avgResolution == null ? '—' : `${avgResolution} min`} icon={<Clock3 className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Assets in Service" value={assets.filter(asset => asset.status === 'in_service').length} icon={<Cpu className="h-4 w-4 text-teal-600" />} iconBg="bg-teal-50 dark:bg-teal-950/50" loading={loading} />
          <KPICard title="License Issues" value={nonCompliantLicenses} icon={<FileCheck className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
          <KPICard title="Recorded Uptime" value={averageUptime} icon={<Activity className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Active Incidents" value={activeIncidents} icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
          <KPICard title="Backup Risks" value={backupFailures} icon={<Database className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Pending Requests" value={pendingRequests} icon={<ShoppingCart className="h-4 w-4 text-indigo-600" />} iconBg="bg-indigo-50 dark:bg-indigo-950/50" loading={loading} />
        </div>

        <section>
          <div className="flex items-end justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
            <div><h2 className="text-sm font-semibold text-gray-900 dark:text-white">IT Operations</h2><p className="mt-1 text-xs text-gray-500">Live records from your company workspace</p></div>
            <span className="text-xs text-gray-500">{visibleModules.length} areas</span>
          </div>
          <div className="grid gap-x-6 gap-y-1 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleModules.map(item => <Link key={item.key} href={`/it/${item.key}`} className="group flex min-w-0 items-center gap-3 border-b border-gray-100 py-3 hover:text-blue-700 dark:border-gray-800 dark:hover:text-blue-300">
              <item.icon className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-blue-600" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
              <span className="text-xs tabular-nums text-gray-500">{openRecordCount(item.key)}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>)}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent helpdesk activity</h2><Link href="/it/tickets" className="text-xs font-medium text-blue-700 hover:underline dark:text-blue-300">All tickets</Link></div>
            <DataTable data={tickets.slice(0, 6)} columns={ticketColumns.filter(column => column.key !== 'actions')} loading={loading} searchable={false} pageSize={6} emptyTitle="No IT tickets yet" emptyDescription="New helpdesk requests will appear here." rowKey="id" />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Approval queue</h2>
            <div className="divide-y divide-gray-100 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {[...tickets.filter(ticket => ticket.workflow_stage === 'approval'), ...records.filter(record => record.workflow_stage === 'approval')].slice(0, 6).map(record => <div key={record.id} className="flex items-center gap-3 py-3"><ClipboardCheck className="h-4 w-4 shrink-0 text-amber-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{record.title}</p><p className="text-xs text-gray-500">{record.ticket_number || record.record_type} · {STAGE_LABELS[record.workflow_stage]}</p></div><StatusBadge status={record.priority || record.approval_status || 'pending'} /></div>)}
+              {!loading && !tickets.some(ticket => ticket.workflow_stage === 'approval') && !records.some(record => record.workflow_stage === 'approval') && <p className="py-8 text-center text-sm text-gray-500">No requests awaiting approval.</p>}
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!activeModule) {
    return <div className="p-8 text-center"><p className="text-sm text-gray-500">This IT area is not available.</p><Button variant="link" asChild><Link href="/it">Return to IT overview</Link></Button></div>;
  }

  const needsWorkflow = ['access', 'changes', 'purchasing', 'security'].includes(section);
  const canCreate = can(`${activeModule.permission.replace('.view', '.create')}`) || (section === 'tickets' && can('it.tickets.create')) || (section === 'incidents' && can('it.incidents.create'));
  const recordsTitle = section === 'incidents' ? 'Incident Queue' : activeModule.title;
  const ticketRows = section === 'incidents' ? tickets.filter(ticket => ticket.ticket_type === 'incident') : tickets.filter(ticket => ['helpdesk', 'access', 'security'].includes(ticket.ticket_type));

  return (
    <div className="space-y-6">
      <PageHeader title={activeModule.title} description={sectionDescription(section)} breadcrumbs={[{ label: 'Information Technology', href: '/it' }, { label: activeModule.title }]}>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
        {section === 'reports' && selectedReport !== null && can('it.reports.export') && <Button variant="outline" size="sm" onClick={() => downloadCsv(`${REPORTS[selectedReport].title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, recordsForReport)}><Download className="mr-2 h-4 w-4" />Export CSV</Button>}
        {section === 'access' && can('settings.users.view') && <Button variant="outline" size="sm" asChild><Link href="/settings/users"><Users className="mr-2 h-4 w-4" />User Administration</Link></Button>}
        {section === 'vendors' && can('procurement.vendors.view') && <Button variant="outline" size="sm" asChild><Link href="/procurement/vendors"><Building2 className="mr-2 h-4 w-4" />Procurement Vendors</Link></Button>}
        {canCreate && section !== 'reports' && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New {createLabel(section)}</Button>}
      </PageHeader>

      {section === 'reports' ? (
        <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
          <nav className="border-y border-gray-200 dark:border-gray-800">
            {REPORTS.map((report, index) => <button key={report.title} onClick={() => setSelectedReport(index)} className={`flex w-full items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm dark:border-gray-800 ${selectedReport === index ? 'bg-blue-50 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900'}`}><span>{report.title}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" /></button>)}
          </nav>
          <div className="min-w-0">
            {selectedReport === null ? <div className="flex min-h-56 items-center justify-center border-y border-gray-200 text-sm text-gray-500 dark:border-gray-800">Select a report to view current records.</div> : <><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">{REPORTS[selectedReport].title}</h2><p className="mt-1 text-xs text-gray-500">Generated from current company records. No sample metrics are included.</p></div><span className="text-xs text-gray-500">{recordsForReport.length} rows</span></div><DataTable data={recordsForReport as any[]} columns={reportColumns(recordsForReport)} loading={loading} searchable pageSize={15} emptyTitle="No report data" emptyDescription="Records will appear here as your team logs IT activity." rowKey="id" /></>}
          </div>
        </div>
      ) : section === 'tickets' || section === 'incidents' ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="Total" value={ticketRows.length} /><Metric label="Open" value={ticketRows.filter(row => !['resolved', 'closed'].includes(row.status)).length} tone="text-amber-700 dark:text-amber-300" /><Metric label="Urgent" value={ticketRows.filter(row => row.priority === 'urgent').length} tone="text-rose-700 dark:text-rose-300" /><Metric label="Resolved" value={ticketRows.filter(row => ['resolved', 'closed'].includes(row.status)).length} tone="text-emerald-700 dark:text-emerald-300" /></div>
          <DataTable data={ticketRows} columns={ticketColumns} loading={loading} searchKeys={['ticket_number', 'title', 'description', 'ticket_type', 'status']} searchPlaceholder="Search tickets..." emptyTitle={section === 'incidents' ? 'No incidents recorded' : 'No helpdesk requests'} emptyDescription="Create an IT record to begin tracking work." rowKey="id" />
        </>
      ) : section === 'assets' ? (
        <><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="Total assets" value={assets.length} /><Metric label="In service" value={assets.filter(row => row.status === 'in_service').length} /><Metric label="Repair" value={assets.filter(row => row.status === 'repair').length} /><Metric label="Warranty expired" value={assets.filter(row => row.warranty_expires && row.warranty_expires < new Date().toISOString().slice(0, 10)).length} /></div><DataTable data={assets} columns={assetColumns} loading={loading} searchKeys={['asset_tag', 'name', 'category', 'manufacturer', 'serial_number']} searchPlaceholder="Search IT assets..." emptyTitle="No IT assets registered" emptyDescription="Asset records are stored for this company only." rowKey="id" /></>
      ) : section === 'licenses' ? (
        <><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="Products" value={licenses.length} /><Metric label="Seats licensed" value={licenses.reduce((sum, license) => sum + Number(license.licensed_seats || 0), 0)} /><Metric label="Compliance issues" value={nonCompliantLicenses} tone="text-rose-700 dark:text-rose-300" /><Metric label="Renewals in 60 days" value={licenses.filter(license => license.renewal_date && (new Date(license.renewal_date).getTime() - Date.now()) <= 60 * 86400000 && new Date(license.renewal_date).getTime() >= Date.now()).length} /></div><DataTable data={licenses} columns={licenseColumns} loading={loading} searchKeys={['product_name', 'vendor_name', 'version', 'compliance_status']} searchPlaceholder="Search licenses..." emptyTitle="No software licenses recorded" emptyDescription="Add licenses to track ownership, renewals, and compliance." rowKey="id" /><div className="pt-2"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Active seat assignments</h2><p className="mt-1 text-xs text-gray-500">Assignments are checked against each license seat limit.</p></div><span className="text-xs text-gray-500">{licenseAssignments.length} active</span></div><DataTable data={licenseAssignments.map(assignment => ({ ...assignment, product_name: licenses.find(license => license.id === assignment.license_id)?.product_name || 'License removed', user_name: personName(people.find(person => person.id === assignment.user_id)) }))} columns={[
          { key: 'product_name', header: 'Software', sortable: true },
          { key: 'user_name', header: 'Assigned user', sortable: true },
          { key: 'assigned_at', header: 'Assigned on', cell: row => new Date(row.assigned_at).toLocaleDateString() },
          { key: 'actions', header: 'Actions', cell: row => can('it.licenses.assign') ? <Button variant="outline" size="sm" onClick={() => void releaseLicenseSeat(row)}>Release seat</Button> : '—' },
        ] as Column<Record<string, any>>[]} loading={loading} searchable searchKeys={['product_name', 'user_name']} emptyTitle="No active assignments" emptyDescription="Assign a license seat to a user to track deployment." rowKey="id" /></div>
          <Dialog open={seatDialogOpen} onOpenChange={setSeatDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Assign software seat</DialogTitle></DialogHeader><form onSubmit={assignLicenseSeat} className="space-y-4"><Field label="License"><Select value={seatLicenseId} onValueChange={setSeatLicenseId}><SelectTrigger><SelectValue placeholder="Select a license" /></SelectTrigger><SelectContent>{licenses.map(license => <SelectItem key={license.id} value={license.id}>{license.product_name} ({licenseAssignments.filter(assignment => assignment.license_id === license.id).length}/{license.licensed_seats})</SelectItem>)}</SelectContent></Select></Field><Field label="User"><Select value={seatUserId} onValueChange={setSeatUserId}><SelectTrigger><SelectValue placeholder="Select an active user" /></SelectTrigger><SelectContent>{people.filter(person => person.is_active).map(person => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select></Field><div className="flex justify-end"><Button type="submit" disabled={!seatLicenseId || !seatUserId}>Assign Seat</Button></div></form></DialogContent></Dialog>
        </>
      ) : (
        <><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Metric label="Records" value={recordsForSection.length} /><Metric label="Open" value={recordsForSection.filter(record => !['closed', 'resolved', 'completed'].includes(record.status)).length} /><Metric label="Pending approval" value={recordsForSection.filter(record => record.approval_status === 'pending').length} /><Metric label={needsWorkflow ? 'Workflow' : 'Due / event'} value={needsWorkflow ? '7 stages' : recordsForSection.filter(record => record.due_date || record.event_date).length} /></div><DataTable data={recordsForSection} columns={recordColumns} loading={loading} searchKeys={['title', 'description', 'record_type', 'status', 'vendor_name', 'metric_name']} searchPlaceholder={`Search ${activeModule.title.toLowerCase()}...`} emptyTitle={`No ${activeModule.title.toLowerCase()} records`} emptyDescription="Add an operational record to start building your report history." rowKey="id" />
          {section === 'access' && <section className="pt-3"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Company user directory</h2><p className="mt-1 text-xs text-gray-500">Authentication credentials and role changes remain in User Administration.</p></div><span className="text-xs text-gray-500">{people.length} profiles</span></div><DataTable data={people} columns={[
            { key: 'display_name', header: 'User', cell: person => personName(person), sortable: true },
            { key: 'email', header: 'Email' },
            { key: 'job_title', header: 'Job title' },
            { key: 'role', header: 'Account role' },
            { key: 'is_active', header: 'Account', cell: person => <StatusBadge status={person.is_active ? 'active' : 'inactive'} /> },
          ] as Column<Record<string, any>>[]} loading={loading} searchable searchKeys={['display_name', 'first_name', 'last_name', 'email', 'job_title', 'role']} emptyTitle="No company profiles found" emptyDescription="User profiles are managed from User Administration." rowKey="id" /></section>}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Update' : 'Create'} {createLabel(section)}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {(section === 'tickets' || section === 'incidents') ? <TicketFields formValue={formValue} setValue={setValue} section={section} people={people} assets={assets} editing={Boolean(editing)} />
              : section === 'assets' ? <AssetFields formValue={formValue} setValue={setValue} people={people} />
                : section === 'licenses' ? <LicenseFields formValue={formValue} setValue={setValue} people={people} />
                  : <RecordFields formValue={formValue} setValue={setValue} section={section} people={people} vendorDirectory={vendorDirectory} editing={Boolean(editing)} />}
            <div className="flex justify-end gap-2 border-t pt-4 dark:border-gray-800"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Record'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

}

function sectionDescription(section: string) {
  const descriptions: Record<string, string> = {
    tickets: 'Ticket intake, assignment, escalation, resolution, and service history.',
    incidents: 'Track technical incidents, response ownership, and resolution.',
    assets: 'Track IT hardware, warranties, ownership, and lifecycle status.',
    access: 'Record account access, provisioning, and review requests.',
    licenses: 'Track software entitlements, renewal dates, and compliance.',
    infrastructure: 'Record measured system, server, and network health.',
    backups: 'Track backup runs, recovery events, and disaster recovery tests.',
    security: 'Manage cybersecurity incidents and security requests.',
    compliance: 'Maintain IT policy, control, and compliance records.',
    changes: 'Route system upgrades and service changes through review and approval.',
    vendors: 'Manage IT service providers, contracts, and renewal costs.',
    purchasing: 'Create IT purchase requests linked to ERP purchasing approvals.',
    training: 'Record staff IT and security-awareness participation.',
    documentation: 'Maintain configuration, network, recovery, incident, and policy references.',
    reports: 'Generate live operational and annual review reports.',
  };
  return descriptions[section] ?? 'Manage IT operations.';
}

function createLabel(section: string) {
  const labels: Record<string, string> = {
    tickets: 'Ticket', incidents: 'Incident', assets: 'IT Asset', access: 'Access Request', licenses: 'Software License',
    infrastructure: 'Monitoring Record', backups: 'Backup / Recovery Record', security: 'Security Record', compliance: 'Policy / Compliance Record',
    changes: 'Change Request', vendors: 'Vendor / Contract', purchasing: 'IT Purchase Request', training: 'Training Record', documentation: 'IT Document',
  };
  return labels[section] ?? 'IT Record';
}

function reportColumns(rows: Record<string, any>[]): Column<Record<string, any>>[] {
  const keys = rows[0] ? Object.keys(rows[0]).filter(key => !['id', 'company_id', 'created_by', 'updated_at', 'details', 'supporting_documents'].includes(key)).slice(0, 7) : [];
  return keys.map(key => ({ key, header: key.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()), sortable: true, cell: row => typeof row[key] === 'object' && row[key] !== null ? JSON.stringify(row[key]) : String(row[key] ?? '—') }));
}

function TicketFields({ formValue, setValue, section, people, assets, editing }: { formValue: (key: string) => string; setValue: (key: string, value: string) => void; section: string; people: Record<string, any>[]; assets: Asset[]; editing: boolean }) {
  return <>
    <Field label="Summary"><Input required maxLength={180} value={formValue('title')} onChange={event => setValue('title', event.target.value)} /></Field>
    <Field label="Issue details"><Textarea required rows={4} value={formValue('description')} onChange={event => setValue('description', event.target.value)} /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      {section !== 'incidents' && <Field label="Request type"><Select value={formValue('ticket_type') || 'helpdesk'} onValueChange={value => setValue('ticket_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="helpdesk">Helpdesk</SelectItem><SelectItem value="access">Access</SelectItem><SelectItem value="security">Security</SelectItem></SelectContent></Select></Field>}
      <Field label="Priority"><Select value={formValue('priority') || 'medium'} onValueChange={value => setValue('priority', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'urgent'].map(value => <SelectItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Assign to"><Select value={formValue('assignee_id') || 'unassigned'} onValueChange={value => setValue('assignee_id', value === 'unassigned' ? '' : value)}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.filter(person => person.is_active).map(person => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Related asset"><Select value={formValue('asset_id') || 'none'} onValueChange={value => setValue('asset_id', value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="No linked asset" /></SelectTrigger><SelectContent><SelectItem value="none">No linked asset</SelectItem>{assets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.asset_tag} · {asset.name}</SelectItem>)}</SelectContent></Select></Field>
      {editing && <Field label="Resolution time (minutes)"><Input type="number" min="0" value={formValue('resolution_minutes')} onChange={event => setValue('resolution_minutes', event.target.value)} /></Field>}
    </div>
    {editing && <Field label="Resolution / follow-up"><Textarea rows={3} value={formValue('resolution')} onChange={event => setValue('resolution', event.target.value)} /></Field>}
    {editing && <Field label="Supporting document URLs (one per line)"><Textarea rows={2} value={formValue('supporting_documents')} onChange={event => setValue('supporting_documents', event.target.value)} /></Field>}
  </>;
}

function AssetFields({ formValue, setValue, people }: { formValue: (key: string) => string; setValue: (key: string, value: string) => void; people: Record<string, any>[] }) {
  return <>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Asset tag"><Input required value={formValue('asset_tag')} onChange={event => setValue('asset_tag', event.target.value)} /></Field><Field label="Name"><Input required value={formValue('name')} onChange={event => setValue('name', event.target.value)} /></Field>
      <Field label="Category"><Select value={formValue('category') || 'computer'} onValueChange={value => setValue('category', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['computer', 'mobile', 'network', 'server', 'peripheral', 'other'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Status"><Select value={formValue('status') || 'in_service'} onValueChange={value => setValue('status', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['in_service', 'spare', 'repair', 'retired', 'disposed'].map(value => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Manufacturer"><Input value={formValue('manufacturer')} onChange={event => setValue('manufacturer', event.target.value)} /></Field><Field label="Model"><Input value={formValue('model')} onChange={event => setValue('model', event.target.value)} /></Field>
      <Field label="Serial number"><Input value={formValue('serial_number')} onChange={event => setValue('serial_number', event.target.value)} /></Field><Field label="Operating system"><Input value={formValue('operating_system')} onChange={event => setValue('operating_system', event.target.value)} /></Field>
      <Field label="Assigned user"><Select value={formValue('assigned_to') || 'unassigned'} onValueChange={value => setValue('assigned_to', value === 'unassigned' ? '' : value)}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.filter(person => person.is_active).map(person => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Location"><Input value={formValue('location')} onChange={event => setValue('location', event.target.value)} /></Field>
      <Field label="Purchase date"><Input type="date" value={formValue('purchase_date')} onChange={event => setValue('purchase_date', event.target.value)} /></Field><Field label="Warranty expires"><Input type="date" value={formValue('warranty_expires')} onChange={event => setValue('warranty_expires', event.target.value)} /></Field>
      <Field label="Purchase cost"><Input type="number" min="0" step="0.01" value={formValue('purchase_cost')} onChange={event => setValue('purchase_cost', event.target.value)} /></Field>
    </div><Field label="Notes"><Textarea rows={2} value={formValue('notes')} onChange={event => setValue('notes', event.target.value)} /></Field>
  </>;
}

function LicenseFields({ formValue, setValue, people }: { formValue: (key: string) => string; setValue: (key: string, value: string) => void; people: Record<string, any>[] }) {
  return <>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Software product"><Input required value={formValue('product_name')} onChange={event => setValue('product_name', event.target.value)} /></Field><Field label="Publisher / vendor"><Input value={formValue('vendor_name')} onChange={event => setValue('vendor_name', event.target.value)} /></Field>
      <Field label="Version"><Input value={formValue('version')} onChange={event => setValue('version', event.target.value)} /></Field><Field label="License type"><Select value={formValue('license_type') || 'subscription'} onValueChange={value => setValue('license_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['subscription', 'perpetual', 'open_source', 'other'].map(value => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="License reference"><Input value={formValue('license_reference')} onChange={event => setValue('license_reference', event.target.value)} /></Field><Field label="Licensed seats"><Input required type="number" min="1" step="1" value={formValue('licensed_seats') || '1'} onChange={event => setValue('licensed_seats', event.target.value)} /></Field>
      <Field label="Renewal date"><Input type="date" value={formValue('renewal_date')} onChange={event => setValue('renewal_date', event.target.value)} /></Field><Field label="Annual cost"><Input type="number" min="0" step="0.01" value={formValue('annual_cost')} onChange={event => setValue('annual_cost', event.target.value)} /></Field>
      <Field label="Compliance status"><Select value={formValue('compliance_status') || 'compliant'} onValueChange={value => setValue('compliance_status', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['compliant', 'review', 'non_compliant', 'expired'].map(value => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="License owner"><Select value={formValue('owner_id') || 'unassigned'} onValueChange={value => setValue('owner_id', value === 'unassigned' ? '' : value)}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.filter(person => person.is_active).map(person => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select></Field>
    </div><Field label="Notes"><Textarea rows={2} value={formValue('notes')} onChange={event => setValue('notes', event.target.value)} /></Field>
  </>;
}

function RecordFields({ formValue, setValue, section, people, vendorDirectory, editing }: { formValue: (key: string) => string; setValue: (key: string, value: string) => void; section: string; people: Record<string, any>[]; vendorDirectory: Record<string, any>[]; editing: boolean }) {
  const recordTypes: Record<string, { value: string; label: string }[]> = {
    security: [{ value: 'security_incident', label: 'Cybersecurity incident' }, { value: 'security_request', label: 'Security request' }],
    backups: [{ value: 'backup', label: 'Backup log' }, { value: 'disaster_recovery', label: 'Disaster recovery test' }],
    vendors: [{ value: 'vendor', label: 'Service provider' }, { value: 'contract', label: 'Contract' }],
  };
  const types = recordTypes[section];
  const requiresWorkflow = ['access', 'changes', 'purchasing', 'security'].includes(section);
  const statusOptions: Record<string, string[]> = {
    infrastructure: ['online', 'degraded', 'offline', 'maintenance'],
    backups: ['completed', 'failed', 'partial', 'overdue', 'at_risk', 'planned'],
    compliance: ['active', 'under_review', 'compliant', 'non_compliant', 'archived'],
    vendors: ['active', 'inactive', 'expired', 'terminated'],
    training: ['planned', 'completed', 'incomplete', 'expired'],
    documentation: ['current', 'under_review', 'archived'],
  };
  return <>
    {types && <Field label="Record type"><Select value={formValue('record_type') || types[0].value} onValueChange={value => setValue('record_type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{types.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></Field>}
    <Field label="Title"><Input required maxLength={180} value={formValue('title')} onChange={event => setValue('title', event.target.value)} /></Field>
    <Field label="Description / details"><Textarea rows={3} value={formValue('description')} onChange={event => setValue('description', event.target.value)} /></Field>
    {section === 'vendors' && <Field label="Procurement vendor"><Select value={formValue('vendor_id') || 'none'} onValueChange={value => { setValue('vendor_id', value === 'none' ? '' : value); setValue('vendor_name', vendorDirectory.find(vendor => vendor.id === value)?.name || ''); }}><SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger><SelectContent><SelectItem value="none">No linked vendor</SelectItem>{vendorDirectory.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}</SelectContent></Select>{vendorDirectory.length === 0 && <p className="text-xs text-gray-500">Add service providers in Procurement Vendors, then link their contracts here.</p>}</Field>}
    <div className="grid gap-4 sm:grid-cols-2">
      {(section === 'infrastructure' || section === 'backups') && <Field label="System / record category"><Input value={formValue('category')} onChange={event => setValue('category', event.target.value)} placeholder="Server, network, database, endpoint..." /></Field>}
      {['security', 'compliance', 'changes', 'training', 'documentation', 'access'].includes(section) && <Field label="Category"><Input value={formValue('category')} onChange={event => setValue('category', event.target.value)} /></Field>}
      {['vendors', 'purchasing'].includes(section) && <Field label="Vendor / supplier"><Input value={formValue('vendor_name')} onChange={event => setValue('vendor_name', event.target.value)} /></Field>}
      {['vendors', 'purchasing'].includes(section) && <Field label="Estimated / contract amount"><Input type="number" min="0" step="0.01" value={formValue('amount')} onChange={event => setValue('amount', event.target.value)} /></Field>}
      {(section === 'infrastructure' || section === 'vendors') && <><Field label={section === 'vendors' ? 'Performance measure' : 'Metric'}><Input value={formValue('metric_name')} onChange={event => setValue('metric_name', event.target.value)} placeholder={section === 'vendors' ? 'Response time, quality, satisfaction' : 'CPU, latency, uptime'} /></Field><Field label={section === 'vendors' ? 'Score / value' : 'Measured value'}><Input type="number" step="0.0001" value={formValue('metric_value')} onChange={event => setValue('metric_value', event.target.value)} /></Field><Field label="Unit"><Input value={formValue('metric_unit')} onChange={event => setValue('metric_unit', event.target.value)} placeholder={section === 'vendors' ? 'out of 5, %, days' : '%, ms, GB'} /></Field></>}
      {section === 'backups' && <Field label="Recovery point / result"><Input value={formValue('metric_name')} onChange={event => setValue('metric_name', event.target.value)} /></Field>}
      {requiresWorkflow ? editing && <Field label="Request status"><Input disabled value={formValue('status')} /></Field> : <Field label={section === 'training' ? 'Completion status' : section === 'backups' ? 'Outcome' : 'Status'}><Select value={formValue('status') || statusOptions[section]?.[0] || 'open'} onValueChange={value => setValue('status', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(statusOptions[section] || ['open', 'in_progress', 'waiting', 'resolved']).map(value => <SelectItem key={value} value={value}>{value.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></Field>}
      <Field label="Priority"><Select value={formValue('priority') || 'medium'} onValueChange={value => setValue('priority', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'urgent'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Owner"><Select value={formValue('owner_id') || 'unassigned'} onValueChange={value => setValue('owner_id', value === 'unassigned' ? '' : value)}><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{people.filter(person => person.is_active).map(person => <SelectItem key={person.id} value={person.id}>{personName(person)}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Event / review date"><Input type="date" value={formValue('event_date')} onChange={event => setValue('event_date', event.target.value)} /></Field><Field label="Due / renewal date"><Input type="date" value={formValue('due_date')} onChange={event => setValue('due_date', event.target.value)} /></Field>
      <Field label="Reference URL"><Input type="url" value={formValue('reference_url')} onChange={event => setValue('reference_url', event.target.value)} placeholder="https://" /></Field>
    </div>
    <Field label="Supporting documents / quote URLs (one per line)"><Textarea rows={2} value={formValue('supporting_documents')} onChange={event => setValue('supporting_documents', event.target.value)} /></Field>
    {requiresWorkflow && <p className="text-xs text-gray-500">Workflow: IT Review → Supporting Documents / Quotes → Approval → Execution → Documentation → Testing / Follow-up → Closure.</p>}
    {requiresWorkflow && editing && <><Field label="Execution notes"><Textarea rows={2} value={formValue('execution_notes')} onChange={event => setValue('execution_notes', event.target.value)} /></Field><Field label="Test result / follow-up"><Textarea rows={2} value={formValue('test_result')} onChange={event => setValue('test_result', event.target.value)} /></Field></>}
    {!editing && section === 'access' && <p className="text-xs text-gray-500">This records a request for review; it does not create or alter authentication credentials.</p>}
    {people.length === 0 && <p className="text-xs text-amber-700">No active user directory entries are available for assignment.</p>}
  </>;
}
