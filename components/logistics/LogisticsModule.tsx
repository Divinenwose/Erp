'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BarChart3, ClipboardCheck, Download, FileText, MapPinned, Package, Plus, RefreshCw, Route, ShieldCheck, Trash2, Truck, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { sendNotification } from '@/lib/notifications';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Row = Record<string, any>;
type Section = 'overview' | 'shipments' | 'warehouses' | 'routes' | 'carriers' | 'communications' | 'incidents' | 'compliance' | 'requests' | 'reports';
type FieldSpec = { key: string; label: string; type?: string; options?: { value: string; label: string }[]; required?: boolean; multiline?: boolean };

const stages = ['request', 'logistics_review', 'supporting_documents', 'authorization', 'execution', 'documentation', 'delivery_verification', 'follow_up', 'closure'];
const stageLabels: Record<string, string> = { request: 'Request', logistics_review: 'Logistics Review', supporting_documents: 'Supporting Documents', authorization: 'Authorization', execution: 'Execution', documentation: 'Documentation', delivery_verification: 'Delivery Verification', follow_up: 'Follow-up', closure: 'Closure' };
const reportNames = ['Shipment Status', 'Warehouse Utilization', 'Carrier Performance', 'Route Efficiency', 'Logistics Incidents', 'Compliance Audit', 'Freight Cost Analysis', 'Inventory Distribution', 'Monthly Logistics Dashboard', 'Annual Logistics Review'];
const navigation: { key: Section; label: string; icon: typeof Truck }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 }, { key: 'shipments', label: 'Shipments', icon: Truck },
  { key: 'warehouses', label: 'Warehouses', icon: Warehouse }, { key: 'routes', label: 'Routes', icon: Route },
  { key: 'carriers', label: 'Carriers', icon: Package }, { key: 'communications', label: 'Carrier Communications', icon: FileText },
  { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { key: 'compliance', label: 'Documents & Compliance', icon: ShieldCheck }, { key: 'requests', label: 'Approvals', icon: ClipboardCheck },
  { key: 'reports', label: 'Reports', icon: FileText },
];

function Field({ spec, value, onChange }: { spec: FieldSpec; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1.5"><Label>{spec.label}</Label>{spec.options ? <Select value={value || 'none'} onValueChange={item => onChange(item === 'none' ? '' : item)}><SelectTrigger><SelectValue placeholder={`Select ${spec.label.toLowerCase()}`} /></SelectTrigger><SelectContent><SelectItem value="none">Not linked</SelectItem>{spec.options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select> : spec.multiline ? <Textarea required={spec.required} rows={3} value={value} onChange={event => onChange(event.target.value)} /> : <Input required={spec.required} type={spec.type || 'text'} min={spec.type === 'number' ? '0' : undefined} value={value} onChange={event => onChange(event.target.value)} />}</div>;
}

function downloadCsv(name: string, rows: Row[]) {
  if (!rows.length) return toast.info('No records to export');
  const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const csv = [keys, ...rows.map(row => keys.map(key => row[key] ?? ''))].map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export default function LogisticsModule({ section: rawSection = 'overview' }: { section?: string }) {
  const { company, user, isCompanyAdmin, hasPermission } = useAuth();
  const section: Section = rawSection === 'deliveries' || rawSection === 'dispatch' ? 'shipments' : rawSection === 'fleet' ? 'carriers' : navigation.some(item => item.key === rawSection) ? rawSection as Section : 'overview';
  const can = useCallback((permission: string) => isCompanyAdmin() || hasPermission(permission), [isCompanyAdmin, hasPermission]);
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [warehouseCapacityMode, setWarehouseCapacityMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [reportIndex, setReportIndex] = useState(0);
  const get = (key: string) => data[key] || [];
  const val = (key: string) => form[key] ?? '';
  const setVal = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const requests = [
      ['shipments', supabase.from('deliveries').select('*, vendors(name), purchase_orders!deliveries_po_id_fkey(po_number), logistics_routes(route_name)').eq('company_id', company.id).order('created_at', { ascending: false })],
      ['events', supabase.from('delivery_events').select('*').eq('company_id', company.id).order('event_date', { ascending: false }).limit(500)],
      ['orders', supabase.from('purchase_orders').select('id, po_number, vendor_id, vendors(name)').eq('company_id', company.id)],
      ['vendors', supabase.from('vendors').select('id, name, category, status, rating, total_orders, total_spend').eq('company_id', company.id).order('name')],
      ['warehouses', supabase.from('warehouses').select('id, name, code, address, storage_capacity').eq('company_id', company.id).order('name')],
      ['inventory', supabase.from('inventory_items').select('*, products(name, sku, reorder_level), warehouses(name)').eq('company_id', company.id)],
      ['routes', supabase.from('logistics_routes').select('*').eq('company_id', company.id).order('created_at', { ascending: false })],
      ['incidents', supabase.from('logistics_incidents').select('*, deliveries(tracking_number), vendors(name)').eq('company_id', company.id).order('created_at', { ascending: false })],
      ['communications', supabase.from('logistics_communications').select('*, vendors(name), deliveries(tracking_number)').eq('company_id', company.id).order('occurred_at', { ascending: false })],
      ['financeInvoices', supabase.from('invoices').select('id, invoice_number, status, total_amount, vendor_id').eq('company_id', company.id).eq('invoice_type', 'purchase').order('issue_date', { ascending: false })],
      ['documents', supabase.from('logistics_documents').select('*, deliveries(tracking_number), invoices!logistics_documents_finance_invoice_company_fkey(invoice_number, status, total_amount)').eq('company_id', company.id).order('created_at', { ascending: false })],
      ['requests', supabase.from('logistics_requests').select('*, deliveries(tracking_number), vendors(name), warehouses(name)').eq('company_id', company.id).order('created_at', { ascending: false })],
      ['history', supabase.from('logistics_approval_history').select('*, profiles(display_name, first_name)').eq('company_id', company.id).order('created_at', { ascending: false })],
      ['budgets', supabase.from('budgets').select('id, name, fiscal_year').eq('company_id', company.id)],
      ['products', supabase.from('products').select('id, name, sku, is_active').eq('company_id', company.id).eq('is_active', true).order('name')],
    ] as const;
    const results = await Promise.all(requests.map(([, query]) => query));
    const failed = results.find(result => result.error)?.error;
    if (failed) toast.error(`Unable to load Logistics data: ${failed.message}`);
    const next: Record<string, Row[]> = {};
    requests.forEach(([key], index) => { next[key] = results[index].data ?? []; });
    setData(next); setLoading(false);
  }, [company?.id]);

  useEffect(() => { void load(); }, [load]);

  const audit = async (action: string, table: string, id: string, previous?: Row, next?: Row) => {
    if (company?.id && user?.id) await logAuditEvent(company.id, user.id, { action, module: 'logistics', entity_type: table, entity_id: id, previous_value: previous, new_value: next });
  };

  const table = section === 'warehouses' ? 'warehouses' : section === 'shipments' ? 'deliveries' : section === 'routes' ? 'logistics_routes' : section === 'incidents' ? 'logistics_incidents' : section === 'communications' ? 'logistics_communications' : section === 'compliance' ? 'logistics_documents' : 'logistics_requests';
  const fields = useMemo((): FieldSpec[] => {
    const options = (rows: Row[], label: (row: Row) => string) => rows.map(row => ({ value: row.id, label: label(row) }));
    if (section === 'warehouses') return [
      { key: 'warehouse_id', label: 'Warehouse', required: true, options: options(get('warehouses'), row => row.name) },
      { key: 'storage_capacity', label: 'Storage capacity (units)', type: 'number' },
    ];
    if (section === 'shipments') return [
      { key: 'shipment_direction', label: 'Direction', options: ['inbound', 'outbound'].map(value => ({ value, label: value })) },
      { key: 'po_id', label: 'Purchase order', options: options(get('orders'), row => `${row.po_number} · ${row.vendors?.name || ''}`) },
      { key: 'vendor_id', label: 'Vendor / carrier', options: options(get('vendors'), row => row.name) },
      { key: 'tracking_number', label: 'Tracking number', required: true }, { key: 'carrier', label: 'Carrier service' },
      { key: 'route_id', label: 'Route', options: options(get('routes'), row => row.route_name) },
      { key: 'pickup_date', label: 'Pickup date', type: 'date' }, { key: 'estimated_delivery_date', label: 'Expected delivery', type: 'date' },
      { key: 'actual_delivery_date', label: 'Actual delivery', type: 'date' }, { key: 'status', label: 'Status', options: ['pending', 'shipped', 'in_transit', 'delivered', 'delayed', 'cancelled'].map(value => ({ value, label: value })) },
      { key: 'customs_status', label: 'Customs', options: ['not_required', 'pending', 'cleared', 'held'].map(value => ({ value, label: value.replace(/_/g, ' ') })) },
      { key: 'freight_cost', label: 'Freight cost', type: 'number' }, { key: 'current_location', label: 'Current tracking location' },
      { key: 'origin_address', label: 'Origin' }, { key: 'pickup_address', label: 'Pickup address' }, { key: 'delivery_address', label: 'Delivery address' },
      { key: 'notes', label: 'Notes', multiline: true },
    ];
    if (section === 'routes') return [
      { key: 'route_name', label: 'Route name', required: true }, { key: 'origin', label: 'Origin', required: true },
      { key: 'destination', label: 'Destination', required: true }, { key: 'planned_distance', label: 'Planned km', type: 'number' },
      { key: 'actual_distance', label: 'Actual km', type: 'number' }, { key: 'planned_duration_hours', label: 'Planned duration hours', type: 'number' },
      { key: 'status', label: 'Status', options: ['planned', 'active', 'completed', 'disrupted', 'cancelled'].map(value => ({ value, label: value })) },
      { key: 'notes', label: 'Notes', multiline: true },
    ];
    if (section === 'incidents') return [
      { key: 'title', label: 'Incident title', required: true }, { key: 'incident_type', label: 'Incident type', options: ['delay', 'damage', 'loss', 'misrouting', 'disruption', 'safety', 'other'].map(value => ({ value, label: value })) },
      { key: 'delivery_id', label: 'Shipment', options: options(get('shipments'), row => row.tracking_number || row.id.slice(0, 8)) },
      { key: 'vendor_id', label: 'Carrier', options: options(get('vendors'), row => row.name) },
      { key: 'severity', label: 'Severity', options: ['low', 'medium', 'high', 'critical'].map(value => ({ value, label: value })) },
      { key: 'status', label: 'Status', options: ['open', 'investigating', 'resolved', 'closed'].map(value => ({ value, label: value })) },
      { key: 'location', label: 'Location' }, { key: 'estimated_loss', label: 'Estimated loss', type: 'number' },
      { key: 'description', label: 'Description', multiline: true }, { key: 'resolution', label: 'Resolution', multiline: true },
    ];
    if (section === 'communications') return [
      { key: 'vendor_id', label: 'Carrier / vendor', required: true, options: options(get('vendors'), row => row.name) },
      { key: 'delivery_id', label: 'Shipment', options: options(get('shipments'), row => row.tracking_number || row.id.slice(0, 8)) },
      { key: 'channel', label: 'Channel', options: ['email', 'phone', 'portal', 'meeting', 'other'].map(value => ({ value, label: value })) },
      { key: 'direction', label: 'Direction', options: ['inbound', 'outbound'].map(value => ({ value, label: value })) },
      { key: 'subject', label: 'Subject', required: true }, { key: 'message', label: 'Notes', multiline: true },
      { key: 'occurred_at', label: 'Date and time', type: 'datetime-local' }, { key: 'follow_up_date', label: 'Follow-up date', type: 'date' },
      { key: 'status', label: 'Status', options: ['open', 'follow_up', 'resolved'].map(value => ({ value, label: value.replace(/_/g, ' ') })) },
    ];
    if (section === 'compliance') return [
      { key: 'title', label: 'Document title', required: true },
      { key: 'document_type', label: 'Type', options: ['delivery_note', 'manifest', 'warehouse_log', 'freight_invoice', 'customs', 'safety', 'other'].map(value => ({ value, label: value.replace(/_/g, ' ') })) },
      { key: 'delivery_id', label: 'Shipment', options: options(get('shipments'), row => row.tracking_number || row.id.slice(0, 8)) },
      { key: 'reference_number', label: 'Reference' }, { key: 'document_url', label: 'Document URL', type: 'url' },
      { key: 'finance_invoice_id', label: 'Finance payable (freight invoice)', options: options(get('financeInvoices'), row => `${row.invoice_number} · ${row.status}`) },
      { key: 'status', label: 'Status', options: ['pending', 'received', 'verified', 'rejected'].map(value => ({ value, label: value })) },
      { key: 'issue_date', label: 'Issue date', type: 'date' }, { key: 'checklist_text', label: 'Safety checklist (one per line: item | pass/fail/na/pending | notes)', multiline: true },
      { key: 'notes', label: 'Notes', multiline: true },
    ];
    return [
      { key: 'request_type', label: 'Request type', options: ['shipment', 'warehouse_allocation', 'carrier_contract', 'customs_clearance', 'budget', 'compliance'].map(value => ({ value, label: value.replace(/_/g, ' ') })) },
      { key: 'title', label: 'Request title', required: true }, { key: 'description', label: 'Description', multiline: true },
      { key: 'delivery_id', label: 'Shipment', options: options(get('shipments'), row => row.tracking_number || row.id.slice(0, 8)) },
      { key: 'vendor_id', label: 'Vendor', options: options(get('vendors'), row => row.name) },
      { key: 'warehouse_id', label: 'Warehouse', options: options(get('warehouses'), row => row.name) },
      ...(form.request_type === 'warehouse_allocation' ? [
        { key: 'product_id', label: 'Product', options: options(get('products'), row => `${row.sku || row.name} · ${row.name}`) },
        { key: 'requested_quantity', label: 'Requested quantity', type: 'number' },
      ] : []),
      { key: 'budget_id', label: 'Budget', options: options(get('budgets'), row => `${row.name} ${row.fiscal_year || ''}`) },
      { key: 'requested_amount', label: 'Requested amount', type: 'number' },
      { key: 'supporting_documents_text', label: 'Supporting document URLs (one per line)', multiline: true },
      ...(editing ? [{ key: 'verification_result', label: 'Delivery verification / follow-up', multiline: true }] : []),
    ];
  }, [section, editing, data, form.request_type]);

  const openCreate = () => { setWarehouseCapacityMode(false); setEditing(null); setForm({ shipment_direction: 'inbound', status: section === 'routes' ? 'planned' : section === 'incidents' ? 'open' : 'pending', customs_status: 'not_required', request_type: 'shipment', incident_type: 'delay', severity: 'medium', document_type: 'delivery_note' }); setDialogOpen(true); };
  const openCapacityEditor = () => { setWarehouseCapacityMode(true); setEditing(null); setForm({ warehouse_id: '', storage_capacity: '' }); setDialogOpen(true); };
  const openEdit = (row: Row) => {
    setWarehouseCapacityMode(false);
    setEditing(row);
    setForm({ ...Object.fromEntries(Object.entries(row).map(([key, item]) => [key, item == null ? '' : String(item)])),
      ...(section === 'requests' ? { supporting_documents_text: (row.supporting_documents || []).join('\n') } : {}),
      ...(section === 'compliance' ? { checklist_text: (row.checklist || []).map((item: Row) => `${item.item} | ${item.status} | ${item.notes || ''}`).join('\n') } : {}),
      ...(section === 'shipments' ? { current_location: get('events').find(item => item.delivery_id === row.id)?.location || '' } : {}),
    }); setDialogOpen(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company?.id || !user?.id) return;
    const creating = !editing && !warehouseCapacityMode;
    if (!can(creating ? 'logistics.create' : 'logistics.edit')) return toast.error('You do not have permission');
    let payload: Row = Object.fromEntries(fields.map(spec => [spec.key, val(spec.key) || null]));
    if (section === 'warehouses') {
      const capacity = val('storage_capacity') ? Number(val('storage_capacity')) : null;
      if (capacity != null && (!Number.isFinite(capacity) || capacity < 0)) return toast.error('Storage capacity must be zero or greater');
      payload = { storage_capacity: capacity };
    } else if (section === 'shipments') {
      payload = { ...payload, po_id: val('po_id') || null, vendor_id: val('vendor_id') || null, route_id: val('route_id') || null,
        freight_cost: val('freight_cost') ? Number(val('freight_cost')) : null, notes: val('notes').trim() || null,
        updated_at: new Date().toISOString() };
      delete payload.current_location;
      if (val('shipment_direction') === 'inbound' && !val('po_id')) return toast.error('Inbound shipments must link a purchase order');
    } else if (section === 'routes') {
      payload = { ...payload, planned_distance: val('planned_distance') ? Number(val('planned_distance')) : null,
        actual_distance: val('actual_distance') ? Number(val('actual_distance')) : null,
        planned_duration_hours: val('planned_duration_hours') ? Number(val('planned_duration_hours')) : null, updated_at: new Date().toISOString() };
    } else if (section === 'incidents') {
      payload = { ...payload, delivery_id: val('delivery_id') || null, vendor_id: val('vendor_id') || null,
        estimated_loss: val('estimated_loss') ? Number(val('estimated_loss')) : null, updated_at: new Date().toISOString() };
    } else if (section === 'communications') {
      if (!val('vendor_id') || !val('subject').trim()) return toast.error('Select a vendor and enter a communication subject');
      payload = { ...payload, vendor_id: val('vendor_id'), delivery_id: val('delivery_id') || null,
        occurred_at: val('occurred_at') ? new Date(val('occurred_at')).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString() };
    } else if (section === 'compliance') {
      const checklist = val('checklist_text').split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]).map(parts => ({ item: parts[0], status: parts[1] || 'pending', notes: parts.slice(2).join('|') || null }));
      if (checklist.some(item => !['pass', 'fail', 'na', 'pending'].includes(item.status))) return toast.error('Invalid checklist status');
      if (val('status') === 'verified' && checklist.some(item => ['fail', 'pending'].includes(item.status))) return toast.error('Resolve failed or pending checklist items before verification');
      payload = { ...payload, delivery_id: val('delivery_id') || null, finance_invoice_id: val('finance_invoice_id') || null, checklist, updated_at: new Date().toISOString() };
      delete payload.checklist_text;
    } else {
      payload = { ...payload, delivery_id: val('delivery_id') || null, vendor_id: val('vendor_id') || null,
        warehouse_id: val('warehouse_id') || null, budget_id: val('budget_id') || null,
        product_id: val('product_id') || null,
        requested_quantity: val('requested_quantity') ? Number(val('requested_quantity')) : null,
        requested_amount: val('requested_amount') ? Number(val('requested_amount')) : null,
        supporting_documents: val('supporting_documents_text').split('\n').map(item => item.trim()).filter(Boolean),
        verification_result: val('verification_result').trim() || null, updated_at: new Date().toISOString() };
      if (val('request_type') === 'warehouse_allocation' && (!payload.product_id || !payload.requested_quantity || payload.requested_quantity <= 0)) return toast.error('Select a product and enter a positive allocation quantity');
      delete payload.supporting_documents_text;
      if (creating) Object.assign(payload, { company_id: company.id, request_number: `LOG-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, created_by: user.id, workflow_stage: 'request', status: 'open' });
    }
    if (creating && section !== 'requests') Object.assign(payload, { company_id: company.id, created_by: user.id });
    setSaving(true);
    const editId = warehouseCapacityMode ? val('warehouse_id') : editing?.id;
    const result = creating ? await supabase.from(table).insert(payload).select('*').single() : await supabase.from(table).update(payload).eq('id', editId).eq('company_id', company.id).select('*').single();
    if (result.error || !result.data) { toast.error(result.error?.message || 'Could not save record'); setSaving(false); return; }
    if (section === 'shipments' && (!editing || editing.status !== payload.status || val('current_location'))) {
      const { error: eventError } = await supabase.from('delivery_events').insert({ company_id: company.id, delivery_id: result.data.id, event_type: payload.status, event_date: new Date().toISOString(), location: val('current_location') || null, notes: payload.notes, created_by: user.id });
      if (eventError) toast.warning(`Shipment saved but tracking event failed: ${eventError.message}`);
    }
    await audit(creating ? 'created' : 'updated', table, result.data.id, editing ?? undefined, result.data);
    toast.success(warehouseCapacityMode ? 'Warehouse capacity updated' : creating ? 'Logistics record created' : 'Logistics record updated'); setSaving(false); setDialogOpen(false); setEditing(null); setWarehouseCapacityMode(false); await load();
  };

  const remove = async (tableName: string, row: Row) => {
    if (!company?.id || !can('logistics.delete')) return toast.error('You do not have permission to delete');
    if (!window.confirm(`Delete ${row.tracking_number || row.route_name || row.title}? This cannot be undone.`)) return;
    const { error } = await supabase.from(tableName).delete().eq('id', row.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    await audit('deleted', tableName, row.id, row); await load();
  };

  const advance = async (row: Row, decision?: 'approved' | 'rejected') => {
    if (!company?.id || !user?.id) return;
    if (decision && (!can('logistics.approve') || row.workflow_stage !== 'authorization')) return toast.error('Authorization permission required');
    if (!decision && !can('logistics.edit')) return toast.error('Workflow edit permission required');
    const index = stages.indexOf(row.workflow_stage);
    let next = stages[index + 1];
    if (decision === 'approved') next = 'execution'; if (decision === 'rejected') next = 'supporting_documents';
    if (!next) return;
    if (row.workflow_stage === 'supporting_documents' && !row.supporting_documents?.length) return toast.error('Add supporting documents before authorization');
    if (['delivery_verification', 'follow_up'].includes(row.workflow_stage) && !row.verification_result?.trim()) return toast.error('Record verification before advancing');
    const updates: Row = { workflow_stage: next, updated_at: new Date().toISOString(),
      ...(row.workflow_stage === 'supporting_documents' ? { approval_status: 'pending' } : {}),
      ...(decision ? { approval_status: decision, approved_by: decision === 'approved' ? user.id : row.approved_by, status: decision === 'rejected' ? 'revision_requested' : row.status } : {}) };
    const { error } = await supabase.from('logistics_requests').update(updates).eq('id', row.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    await audit(decision || 'workflow_advanced', 'logistics_requests', row.id, row, updates);
    if (row.created_by && row.created_by !== user.id) await sendNotification(company.id, row.created_by, { title: `Logistics request ${decision || 'advanced'}: ${row.request_number}`, message: row.title, module: 'logistics', reference_id: row.id, action_url: '/logistics/requests' });
    await load();
  };

  const shipments = get('shipments'); const active = shipments.filter(row => !['delivered', 'cancelled'].includes(row.status));
  const openIncidents = get('incidents').filter(row => !['resolved', 'closed'].includes(row.status));
  const warehouseRows = useMemo(() => get('warehouses').map(row => { const items = get('inventory').filter(item => item.warehouse_id === row.id); const units = items.reduce((sum, item) => sum + Number(item.quantity_on_hand || 0), 0); return { ...row, stock_lines: items.length, stock_units: units, low_stock: items.filter(item => Number(item.quantity_available || 0) <= Number(item.products?.reorder_level || 0)).length, utilization_percent: Number(row.storage_capacity) > 0 ? Math.round(units / Number(row.storage_capacity) * 100) : null }; }), [data]);
  const reportRows = useMemo((): Row[] => {
    const name = reportNames[reportIndex]; const vendors = get('vendors'); const routes = get('routes'); const incidents = get('incidents'); const documents = get('documents'); const inventory = get('inventory'); const requests = get('requests');
    if (name === 'Shipment Status') return shipments.map(row => ({ tracking: row.tracking_number, direction: row.shipment_direction, carrier: row.vendors?.name || row.carrier, po: row.purchase_orders?.po_number, status: row.status, expected: row.estimated_delivery_date, actual: row.actual_delivery_date }));
    if (name === 'Warehouse Utilization') return warehouseRows;
    if (name === 'Carrier Performance') return vendors.map(v => { const rows = shipments.filter(row => row.vendor_id === v.id || row.carrier === v.name); return { carrier: v.name, shipments: rows.length, delivered: rows.filter(row => row.status === 'delivered').length, rating: v.rating }; }).filter(row => row.shipments);
    if (name === 'Route Efficiency') return routes;
    if (name === 'Logistics Incidents') return incidents;
    if (name === 'Compliance Audit') return documents;
    if (name === 'Freight Cost Analysis') return shipments.filter(row => row.freight_cost != null).map(row => ({ tracking: row.tracking_number, carrier: row.carrier, cost: row.freight_cost, month: row.created_at?.slice(0, 7) }));
    if (name === 'Inventory Distribution') return inventory.map(row => ({ product: row.products?.name, warehouse: row.warehouses?.name, on_hand: row.quantity_on_hand, reserved: row.quantity_reserved, available: row.quantity_available }));
    const period = name.startsWith('Monthly') ? new Date().toISOString().slice(0, 7) : String(new Date().getFullYear()); const rows = shipments.filter(row => row.created_at?.startsWith(period));
    return [{ period, shipments: rows.length, delivered: rows.filter(row => row.status === 'delivered').length, delayed: rows.filter(row => row.status === 'delayed').length, freight_cost: rows.reduce((sum, row) => sum + Number(row.freight_cost || 0), 0), incidents: incidents.filter(row => row.created_at?.startsWith(period)).length, open_requests: requests.filter(row => row.workflow_stage !== 'closure').length }];
  }, [reportIndex, data, shipments, warehouseRows]);

  const columns = (specs: { key: string; label: string; render?: (row: Row) => React.ReactNode }[]): Column<Row>[] => specs.map(spec => ({ key: spec.key, header: spec.label, sortable: true, cell: spec.render || ((row: Row) => row[spec.key] == null ? '—' : String(row[spec.key])) }));
  const actions = (tableName: string): Column<Row> => ({ key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can('logistics.edit') && <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>}{can('logistics.delete') && <Button size="icon" variant="ghost" title="Delete" onClick={() => void remove(tableName, row)}><Trash2 className="h-4 w-4" /></Button>}</div> });
  const shipmentColumns: Column<Row>[] = [...columns([{ key: 'tracking_number', label: 'Consignment' }, { key: 'shipment_direction', label: 'Direction' }, { key: 'purchase_orders', label: 'PO', render: row => row.purchase_orders?.po_number }, { key: 'vendors', label: 'Carrier', render: row => row.vendors?.name || row.carrier }, { key: 'location', label: 'Last location', render: row => get('events').find(item => item.delivery_id === row.id)?.location }, { key: 'estimated_delivery_date', label: 'Expected' }, { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> }]), actions('deliveries')];
  const requestColumns: Column<Row>[] = [
    ...columns([
      { key: 'request_number', label: 'Request' }, { key: 'title', label: 'Title' }, { key: 'request_type', label: 'Type' },
      { key: 'workflow_stage', label: 'Workflow', render: row => stageLabels[row.workflow_stage] || row.workflow_stage },
      { key: 'approval_status', label: 'Approval', render: row => <StatusBadge status={row.approval_status || row.status} /> },
    ]),
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">
      {row.workflow_stage === 'authorization' && can('logistics.approve') ? <>
        <Button size="sm" onClick={() => void advance(row, 'approved')}>Authorize</Button>
        <Button size="sm" variant="outline" onClick={() => void advance(row, 'rejected')}>Return</Button>
      </> : row.workflow_stage !== 'closure' && can('logistics.edit') ? <Button size="sm" variant="outline" onClick={() => void advance(row)}>Advance</Button> : null}
      {can('logistics.edit') && <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Button>}
      {can('logistics.delete') && <Button size="icon" variant="ghost" title="Delete" onClick={() => void remove('logistics_requests', row)}><Trash2 className="h-4 w-4" /></Button>}
    </div> },
  ];

  const renderContent = () => {
    if (section === 'shipments') return <DataTable data={shipments} columns={shipmentColumns} loading={loading} searchKeys={['tracking_number', 'carrier', 'status']} emptyTitle="No shipments" emptyDescription="Deliveries are shared with Procurement." rowKey="id" />;
    if (section === 'routes') return <DataTable data={get('routes')} columns={[...columns([{ key: 'route_name', label: 'Route' }, { key: 'origin', label: 'Origin' }, { key: 'destination', label: 'Destination' }, { key: 'planned_distance', label: 'Planned km' }, { key: 'actual_distance', label: 'Actual km' }, { key: 'status', label: 'Status' }]), actions('logistics_routes')]} loading={loading} emptyTitle="No routes" emptyDescription="Create routes from actual locations." rowKey="id" />;
    if (section === 'warehouses') return <div className="space-y-4"><div className="flex justify-between text-xs text-gray-500"><span>Live stock data from Inventory.</span><Link href="/inventory/warehouses" className="text-blue-700">Open Inventory</Link></div><DataTable data={warehouseRows} columns={columns([{ key: 'name', label: 'Warehouse' }, { key: 'code', label: 'Code' }, { key: 'address', label: 'Address' }, { key: 'stock_lines', label: 'Lines' }, { key: 'stock_units', label: 'Units' }, { key: 'storage_capacity', label: 'Capacity' }, { key: 'utilization_percent', label: 'Utilization %' }, { key: 'low_stock', label: 'Low stock' }])} loading={loading} emptyTitle="No warehouses" emptyDescription="Configure warehouses through Inventory." rowKey="id" /><DataTable data={get('inventory')} columns={columns([{ key: 'products', label: 'Product', render: row => row.products?.name }, { key: 'warehouses', label: 'Warehouse', render: row => row.warehouses?.name }, { key: 'quantity_on_hand', label: 'On hand' }, { key: 'quantity_reserved', label: 'Reserved' }, { key: 'quantity_available', label: 'Available' }])} loading={loading} emptyTitle="No stock balances" emptyDescription="Inventory distribution will appear here." rowKey="id" /></div>;
    if (section === 'carriers') return <div className="space-y-4"><Link className="text-xs text-blue-700" href="/procurement/vendors">Shared Procurement vendor directory</Link><DataTable data={get('vendors').filter(v => shipments.some(row => row.vendor_id === v.id || row.carrier === v.name))} columns={columns([{ key: 'name', label: 'Carrier' }, { key: 'category', label: 'Category' }, { key: 'rating', label: 'Rating' }, { key: 'shipments', label: 'Shipments', render: row => shipments.filter(item => item.vendor_id === row.id || item.carrier === row.name).length }])} loading={loading} emptyTitle="No carriers in shipments" emptyDescription="Select shared vendors on shipment records to report performance." rowKey="id" /></div>;
    if (section === 'communications') return <DataTable data={get('communications')} columns={[...columns([{ key: 'occurred_at', label: 'Date' }, { key: 'vendors', label: 'Carrier / vendor', render: row => row.vendors?.name }, { key: 'deliveries', label: 'Shipment', render: row => row.deliveries?.tracking_number }, { key: 'channel', label: 'Channel' }, { key: 'direction', label: 'Direction' }, { key: 'subject', label: 'Subject' }, { key: 'follow_up_date', label: 'Follow-up' }, { key: 'status', label: 'Status' }]), actions('logistics_communications')]} loading={loading} emptyTitle="No carrier communications" emptyDescription="Record calls, emails, portal updates and follow-ups against existing vendors." rowKey="id" />;
    if (section === 'incidents') return <DataTable data={get('incidents')} columns={[...columns([{ key: 'title', label: 'Incident' }, { key: 'incident_type', label: 'Type' }, { key: 'deliveries', label: 'Shipment', render: row => row.deliveries?.tracking_number }, { key: 'vendors', label: 'Carrier', render: row => row.vendors?.name }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }]), actions('logistics_incidents')]} loading={loading} emptyTitle="No incidents" emptyDescription="Record delays, damage, loss, misrouting or disruptions." rowKey="id" />;
    if (section === 'compliance') return <DataTable data={get('documents')} columns={[...columns([{ key: 'title', label: 'Document' }, { key: 'document_type', label: 'Type' }, { key: 'reference_number', label: 'Reference' }, { key: 'deliveries', label: 'Shipment', render: row => row.deliveries?.tracking_number }, { key: 'invoices', label: 'Finance payable', render: row => row.invoices?.invoice_number ? `${row.invoices.invoice_number} · ${row.invoices.status}` : '—' }, { key: 'status', label: 'Status' }, { key: 'issue_date', label: 'Issue date' }]), actions('logistics_documents')]} loading={loading} emptyTitle="No logistics documents" emptyDescription="Track manifests, customs, freight invoices and safety checklists." rowKey="id" />;
    if (section === 'requests') return <div className="space-y-4"><DataTable data={get('requests')} columns={requestColumns} loading={loading} emptyTitle="No requests" emptyDescription="Create Logistics approvals for shipment, warehouse, carrier, customs, budget or compliance work." rowKey="id" /><DataTable data={get('history')} columns={columns([{ key: 'created_at', label: 'Recorded' }, { key: 'request_id', label: 'Request' }, { key: 'from_stage', label: 'From', render: row => stageLabels[row.from_stage] || '—' }, { key: 'to_stage', label: 'To', render: row => stageLabels[row.to_stage] || row.to_stage }, { key: 'decision', label: 'Decision' }, { key: 'profiles', label: 'By', render: row => row.profiles?.display_name || row.profiles?.first_name }])} loading={loading} emptyTitle="No approval history" emptyDescription="Workflow transitions are stored as history." rowKey="id" /></div>;
    if (section === 'reports') { const cols = reportRows[0] ? Object.keys(reportRows[0]).map(key => ({ key, header: key.replace(/_/g, ' '), sortable: true, cell: (row: Row) => row[key] == null ? '—' : String(row[key]) })) : []; return <div className="grid gap-5 lg:grid-cols-[250px_1fr]"><nav className="border-y">{reportNames.map((name, index) => <button key={name} onClick={() => setReportIndex(index)} className={`block w-full border-b px-3 py-2 text-left text-sm ${index === reportIndex ? 'bg-blue-50 font-medium text-blue-800' : 'text-gray-600 hover:bg-gray-50'}`}>{name}</button>)}</nav><div><div className="mb-3 flex justify-between"><h2 className="text-sm font-semibold">{reportNames[reportIndex]}</h2>{can('logistics.export') && <Button size="sm" variant="outline" onClick={() => downloadCsv('logistics-report.csv', reportRows)}><Download className="mr-2 h-4 w-4" />Export</Button>}</div><DataTable data={reportRows} columns={cols} loading={loading} emptyTitle="No report data" emptyDescription="Reports reflect current company records." rowKey="id" /></div></div>; }
    return <div className="grid gap-6 xl:grid-cols-2"><section><h2 className="mb-3 text-sm font-semibold">Active shipments</h2><DataTable data={active.slice(0, 6)} columns={shipmentColumns.filter(column => column.key !== 'actions')} loading={loading} searchable={false} emptyTitle="No active shipments" emptyDescription="Active consignment data will appear here." rowKey="id" /></section><section><h2 className="mb-3 text-sm font-semibold">Awaiting authorization</h2><DataTable data={get('requests').filter(row => row.workflow_stage === 'authorization')} columns={requestColumns.filter(column => column.key !== 'actions')} loading={loading} searchable={false} emptyTitle="No pending approval" emptyDescription="Reviewed requests appear here." rowKey="id" /></section></div>;
  };

  const descriptions: Record<Section, string> = { overview: 'Shipment execution, warehouse coordination, carriers and compliance.', shipments: 'Inbound and outbound shipment schedules, status and delivery tracking.', warehouses: 'Live warehouse utilization and stock distribution from Inventory.', routes: 'Route planning and distance efficiency.', carriers: 'Carrier performance from shared Procurement vendors.', communications: 'Carrier calls, emails and follow-ups linked to shared vendors and shipments.', incidents: 'Logistics delays, damage, loss, misrouting and disruptions.', compliance: 'Customs, manifests, freight documents and safety checklists.', requests: 'Logistics review, authorization, execution, verification and closure.', reports: 'Live Logistics reports and annual review.' };
  const title = navigation.find(item => item.key === section)?.label || 'Logistics';

  if (!can('logistics.view')) return <div className="p-8 text-center text-sm text-gray-500">You do not have access to Logistics.</div>;
  const create = can('logistics.create'); const totalFreight = shipments.reduce((sum, row) => sum + Number(row.freight_cost || 0), 0);
  return <div className="space-y-6">
    <PageHeader title={section === 'overview' ? 'Logistics' : title} description={descriptions[section]} breadcrumbs={[{ label: 'Logistics', href: '/logistics' }, ...(section === 'overview' ? [] : [{ label: title }])]}>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      {section !== 'overview' && section !== 'warehouses' && section !== 'carriers' && section !== 'reports' && create && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New {title.replace(/s$/, '')}</Button>}
      {section === 'warehouses' && can('logistics.edit') && <Button size="sm" onClick={openCapacityEditor}>Set Capacity</Button>}
      {section === 'overview' && create && <Link href="/logistics/shipments" className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><Plus className="mr-2 h-4 w-4" />New Shipment</Link>}
      {section === 'overview' && create && <Link href="/logistics/requests" className="inline-flex h-9 items-center rounded-md border px-3 text-sm"><ClipboardCheck className="mr-2 h-4 w-4" />New Approval</Link>}
    </PageHeader>
    <nav className="flex gap-1 overflow-x-auto border-b">{navigation.map(item => <Link key={item.key} href={item.key === 'overview' ? '/logistics' : `/logistics/${item.key}`} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm ${section === item.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'}`}><item.icon className="h-4 w-4" />{item.label}</Link>)}</nav>
    {section === 'overview' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6"><KPICard title="Active shipments" value={active.length} icon={<Truck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50" loading={loading} /><KPICard title="In transit" value={shipments.filter(row => ['shipped', 'in_transit'].includes(row.status)).length} icon={<MapPinned className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50" loading={loading} /><KPICard title="Open incidents" value={openIncidents.length} icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50" loading={loading} /><KPICard title="Approval queue" value={get('requests').filter(row => row.workflow_stage !== 'closure').length} icon={<ClipboardCheck className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50" loading={loading} /><KPICard title="Warehouses" value={get('warehouses').length} icon={<Warehouse className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50" loading={loading} /><KPICard title="Freight cost" value={`${company?.currency || 'USD'} ${totalFreight.toLocaleString()}`} icon={<Package className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50" loading={loading} /></div>}
    {renderContent()}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{warehouseCapacityMode ? 'Set Warehouse Capacity' : `${editing ? 'Update' : 'Create'} ${title.replace(/s$/, '')}`}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{fields.map(spec => <Field key={spec.key} spec={spec} value={val(spec.key)} onChange={next => setVal(spec.key, next)} />)}</div><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setWarehouseCapacityMode(false); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : warehouseCapacityMode ? 'Save Capacity' : editing ? 'Save Changes' : 'Create Record'}</Button></div></form></DialogContent></Dialog>
  </div>;
}