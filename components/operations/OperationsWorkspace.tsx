'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Building2, CalendarDays,
  CheckCircle2, ClipboardCheck, Clock3, Cpu, Download, FileText, Factory,
  Layers, Package, Plus, RefreshCw, ShieldCheck, ShoppingCart, Trash2, Truck,
  Users, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { exportExcel } from '@/lib/excel-export';
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

const AREAS = [
  { key: 'tasks', title: 'Daily Tasks', permission: 'operations.tasks.view', icon: CheckCircle2 },
  { key: 'supply-chain', title: 'Supply Chain', permission: 'operations.supply_chain.view', icon: RefreshCw },
  { key: 'inventory', title: 'Inventory', permission: 'operations.inventory.view', icon: Package },
  { key: 'procurement', title: 'Procurement', permission: 'operations.procurement.view', icon: ShoppingCart },
  { key: 'logistics', title: 'Logistics', permission: 'operations.logistics.view', icon: Truck },
  { key: 'vendors', title: 'Vendors', permission: 'operations.vendors.view', icon: Building2 },
  { key: 'workforce', title: 'Workforce', permission: 'operations.workforce.view', icon: Users },
  { key: 'incidents', title: 'Incidents', permission: 'operations.incidents.view', icon: AlertTriangle },
  { key: 'inspections', title: 'Inspections', permission: 'operations.inspections.view', icon: ClipboardCheck },
  { key: 'production', title: 'Production', permission: 'operations.production.view', icon: Factory },
  { key: 'resources', title: 'Resources', permission: 'operations.resources.view', icon: Layers },
  { key: 'compliance', title: 'Compliance', permission: 'operations.compliance.view', icon: ShieldCheck },
  { key: 'maintenance', title: 'Maintenance', permission: 'operations.maintenance.view', icon: Wrench },
  { key: 'requests', title: 'Requests & Approvals', permission: 'operations.requests.view', icon: ClipboardCheck },
  { key: 'kpis', title: 'Operational KPIs', permission: 'operations.kpis.view', icon: Activity },
  { key: 'reports', title: 'Reports', permission: 'operations.reports.view', icon: BarChart3 },
] as const;

type Row = Record<string, any>;
type AreaKey = typeof AREAS[number]['key'];

const WORKFLOW = [
  'operations_review', 'supporting_documents', 'authorization', 'execution',
  'documentation', 'follow_up_verification', 'closure',
] as const;
const WORKFLOW_LABELS: Record<string, string> = {
  operations_review: 'Operations Review',
  supporting_documents: 'Supporting Documents',
  authorization: 'Authorization',
  execution: 'Execution',
  documentation: 'Documentation',
  follow_up_verification: 'Follow-up / Verification',
  closure: 'Closure',
};

const REPORTS = [
  { title: 'Inventory Status', kind: 'inventory' },
  { title: 'Procurement', kind: 'procurement' },
  { title: 'Vendor Performance', kind: 'vendor_evaluation' },
  { title: 'Logistics Efficiency', kind: 'logistics' },
  { title: 'Incidents', kind: 'incident' },
  { title: 'Compliance Audits', kind: 'compliance' },
  { title: 'Resource Utilization', kind: 'resource_allocation' },
  { title: 'Staff Attendance', kind: 'attendance' },
  { title: 'Production Performance', kind: 'production' },
  { title: 'Production Cost & Waste', kind: 'production_cost' },
  { title: 'Equipment / Maintenance', kind: 'maintenance' },
  { title: 'Budget Utilization', kind: 'budget' },
  { title: 'Operational KPI Dashboard', kind: 'kpi' },
  { title: 'Monthly Operations Dashboard', kind: 'month' },
  { title: 'Annual Operations Review', kind: 'year' },
] as const;

function makeNumber(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function nameOf(row?: Row | null) {
  return row?.display_name || [row?.first_name, row?.last_name].filter(Boolean).join(' ') || row?.email || 'Unassigned';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Stat({ label, value, color = 'text-gray-900 dark:text-white' }: { label: string; value: React.ReactNode; color?: string }) {
  return <div className="border-l-2 border-gray-200 pl-3 dark:border-gray-700"><div className={`text-xl font-semibold tabular-nums ${color}`}>{value}</div><div className="mt-1 text-xs text-gray-500">{label}</div></div>;
}

function csvDownload(filename: string, rows: Row[]) {
  if (!rows.length) return toast.info('No records to export');
  const fields = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const csv = [fields, ...rows.map(row => fields.map(field => row[field] ?? ''))]
    .map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OperationsWorkspace({ section = 'overview' }: { section?: string }) {
  const { company, user, isCompanyAdmin, hasPermission } = useAuth();
  const [tasks, setTasks] = useState<Row[]>([]);
  const [inventory, setInventory] = useState<Row[]>([]);
  const [stockMovements, setStockMovements] = useState<Row[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<Row[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<Row[]>([]);
  const [deliveries, setDeliveries] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Row[]>([]);
  const [employees, setEmployees] = useState<Row[]>([]);
  const [attendance, setAttendance] = useState<Row[]>([]);
  const [inspections, setInspections] = useState<Row[]>([]);
  const [checklistItems, setChecklistItems] = useState<Row[]>([]);
  const [workOrders, setWorkOrders] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [budgets, setBudgets] = useState<Row[]>([]);
  const [records, setRecords] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Row[]>([]);
  const [products, setProducts] = useState<Row[]>([]);
  const [warehouses, setWarehouses] = useState<Row[]>([]);
  const [projects, setProjects] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);

  const area = AREAS.find(item => item.key === section);
  const can = useCallback((permission: string) => isCompanyAdmin() || hasPermission(permission), [isCompanyAdmin, hasPermission]);
  const canView = section === 'overview' || !area || can(area.permission);
  const opsDepartmentId = departments.find(department => department.name === 'Operations')?.id;
  const currentEmployee = employees.find(employee => employee.user_id === user?.id);

  const load = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const results = await Promise.all([
      supabase.from('tasks').select('*, projects(name), employees(first_name, last_name, employee_number)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('inventory_items').select('*, products(name, sku, reorder_level, reorder_quantity, unit_of_measure), warehouses(name, code)').eq('company_id', company.id).order('updated_at', { ascending: false }),
      supabase.from('stock_movements').select('*, products(name, sku), warehouses(name, code)').eq('company_id', company.id).order('created_at', { ascending: false }).limit(250),
      supabase.from('purchase_requests').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('purchase_orders').select('*, vendors(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('deliveries').select('*, vendors(name), purchase_orders!deliveries_po_id_fkey(po_number)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, name, category, status, rating, total_orders, total_spend').eq('company_id', company.id).order('name'),
      supabase.from('employees').select('id, user_id, first_name, last_name, employee_number, department_id, employment_status').eq('company_id', company.id).order('first_name'),
      supabase.from('attendance_records').select('*, profiles(display_name, first_name, last_name, email), departments(name)').eq('company_id', company.id).order('attendance_date', { ascending: false }).limit(500),
      supabase.from('office_inspections').select('*').eq('company_id', company.id).order('inspection_date', { ascending: false }),
      supabase.from('inspection_checklist_items').select('*').order('created_at', { ascending: false }),
      supabase.from('work_orders').select('*, assets(name, asset_number, location)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('assets').select('*').eq('company_id', company.id).order('name'),
      supabase.from('budgets').select('*').eq('company_id', company.id).order('fiscal_year', { ascending: false }),
      supabase.from('operations_records').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('operations_requests').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku, unit_of_measure, reorder_level, reorder_quantity, cost_price').eq('company_id', company.id).eq('is_active', true).order('name'),
      supabase.from('warehouses').select('id, name, code').eq('company_id', company.id).eq('is_active', true).order('name'),
      supabase.from('projects').select('id, name, status').eq('company_id', company.id).order('name'),
      supabase.from('departments').select('id, name').eq('company_id', company.id).order('name'),
    ]);
    const [taskRows, inventoryRows, movementRows, requestRows, orderRows, deliveryRows, vendorRows, employeeRows, attendanceRows, inspectionRows, itemRows, workRows, assetRows, budgetRows, recordRows, operationsRequestRows, productRows, warehouseRows, projectRows, departmentRows] = results;
    const firstError = results.find(result => result.error)?.error;
    if (firstError) toast.error(`Unable to load Operations data: ${firstError.message}`);
    setTasks(taskRows.data ?? []);
    setInventory(inventoryRows.data ?? []);
    setStockMovements(movementRows.data ?? []);
    setPurchaseRequests(requestRows.data ?? []);
    setPurchaseOrders(orderRows.data ?? []);
    setDeliveries(deliveryRows.data ?? []);
    setVendors(vendorRows.data ?? []);
    setEmployees(employeeRows.data ?? []);
    setAttendance(attendanceRows.data ?? []);
    setInspections(inspectionRows.data ?? []);
    setChecklistItems(itemRows.data ?? []);
    setWorkOrders(workRows.data ?? []);
    setAssets(assetRows.data ?? []);
    setBudgets(budgetRows.data ?? []);
    setRecords(recordRows.data ?? []);
    setRequests(operationsRequestRows.data ?? []);
    setProducts(productRows.data ?? []);
    setWarehouses(warehouseRows.data ?? []);
    setProjects(projectRows.data ?? []);
    setDepartments(departmentRows.data ?? []);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { void load(); }, [load]);

  const audit = async (action: string, entity: string, id?: string, previous?: Row, next?: Row) => {
    if (company?.id && user?.id) await logAuditEvent(company.id, user.id, {
      action, module: 'operations', entity_type: entity, entity_id: id,
      previous_value: previous, new_value: next,
    });
  };

  const setValue = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const value = (key: string) => form[key] ?? '';

  const openCreate = () => {
    setEditing(null);
    setForm({
      priority: 'medium', status: section === 'tasks' ? 'todo' : section === 'maintenance' ? 'pending' : section === 'logistics' ? 'pending' : 'open',
      request_type: section === 'procurement' ? 'procurement' : section === 'inventory' ? 'inventory' : section === 'logistics' ? 'logistics' : 'other',
      record_type: section === 'incidents' ? 'incident' : section === 'production' ? 'production' : section === 'workforce' ? 'schedule' : section === 'resources' ? 'resource_allocation' : section === 'compliance' ? 'compliance' : section === 'kpis' ? 'kpi' : section === 'vendors' ? 'vendor_evaluation' : 'incident',
      event_date: new Date().toISOString().slice(0, 10),
      owner_id: user?.id ?? '',
      inspection_type: 'general',
      inspection_status: 'pending',
      checklist: '',
      supporting_documents: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    if (section === 'requests') {
      setForm({
        ...Object.fromEntries(Object.entries(row).map(([key, item]) => [key, item == null ? '' : String(item)])),
        supporting_documents: (row.supporting_documents ?? []).join('\n'),
      });
    } else if (section === 'inspections') {
      setForm({
        ...Object.fromEntries(Object.entries(row).map(([key, item]) => [key, item == null ? '' : String(item)])),
        checklist: checklistItems.filter(item => item.inspection_id === row.id).map(item => `${item.item_name}|${item.status}|${item.notes || ''}`).join('\n'),
      });
    } else if (section === 'tasks' || section === 'maintenance' || section === 'logistics') {
      setForm(Object.fromEntries(Object.entries(row).map(([key, item]) => [key, item == null ? '' : String(item)])));
    } else {
      setForm({
        ...Object.fromEntries(Object.entries(row).map(([key, item]) => [key, item == null ? '' : String(item)])),
        category: row.category ?? '',
        details_text: JSON.stringify(row.details ?? {}, null, 2),
        supporting_documents: (row.supporting_documents ?? []).join('\n'),
      });
    }
    setDialogOpen(true);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company?.id || !user?.id || !area) return;
    setSaving(true);
    const creating = !editing;
    let table = 'operations_records';
    let permission = `${area.permission.replace('.view', creating ? '.create' : '.edit')}`;
    let payload: Row = {};

    if (section === 'tasks') {
      table = 'tasks';
      permission = `operations.tasks.${creating ? 'create' : 'edit'}`;
      payload = {
        title: value('title').trim(), description: value('description').trim() || null,
        project_id: value('project_id') || null, assigned_to: value('assigned_to') || null,
        status: value('status') || 'todo', priority: value('priority') || 'medium',
        due_date: value('due_date') || null, estimated_hours: Number(value('estimated_hours') || 0),
        updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id, created_by: user.id };
    } else if (section === 'maintenance') {
      table = 'work_orders';
      permission = `operations.maintenance.${creating ? 'create' : 'edit'}`;
      payload = {
        title: value('title').trim(), description: value('description').trim() || null,
        work_type: value('work_type') || 'maintenance', priority: value('priority') || 'medium',
        status: value('status') || 'pending', asset_id: value('asset_id') || null,
        assigned_to: value('assigned_to') || null, scheduled_date: value('scheduled_date') || null,
        estimated_cost: Number(value('estimated_cost') || 0), notes: value('notes').trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id, order_number: makeNumber('WO'), requested_by: currentEmployee?.id ?? null };
    } else if (section === 'logistics') {
      table = 'deliveries';
      permission = `operations.logistics.${creating ? 'create' : 'edit'}`;
      payload = {
        po_id: value('po_id'), vendor_id: value('vendor_id'), tracking_number: value('tracking_number').trim() || null,
        carrier: value('carrier').trim() || null, estimated_delivery_date: value('estimated_delivery_date') || null,
        actual_delivery_date: value('actual_delivery_date') || null, delivery_address: value('delivery_address').trim() || null,
        contact_person: value('contact_person').trim() || null, contact_phone: value('contact_phone').trim() || null,
        status: value('status') || 'pending', notes: value('notes').trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id };
    } else if (section === 'inspections') {
      table = 'office_inspections';
      permission = `operations.inspections.${creating ? 'create' : 'edit'}`;
      payload = {
        inspection_type: value('inspection_type') || 'general', inspection_date: value('inspection_date') || new Date().toISOString().slice(0, 10),
        inspected_by: user.id, status: value('inspection_status') || 'pending',
        overall_score: value('overall_score') ? Number(value('overall_score')) : null,
        findings: value('findings').trim() || null, updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id };
    } else if (section === 'requests') {
      table = 'operations_requests';
      permission = `operations.requests.${creating ? 'create' : 'edit'}`;
      payload = {
        request_type: value('request_type') || 'other', title: value('title').trim(),
        description: value('description').trim() || null, priority: value('priority') || 'medium',
        requested_for_department_id: value('requested_for_department_id') || null,
        requested_amount: value('requested_amount') ? Number(value('requested_amount')) : null,
        required_date: value('required_date') || null, vendor_id: value('vendor_id') || null,
        budget_id: value('budget_id') || null, source_module: value('source_module') || null,
        source_record_id: value('source_record_id') || null,
        delivery_id: value('delivery_id') || null,
        supporting_documents: value('supporting_documents').split('\n').map(item => item.trim()).filter(Boolean),
        execution_notes: value('execution_notes').trim() || null,
        documentation_url: value('documentation_url').trim() || null,
        verification_result: value('verification_result').trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (creating) payload = {
        ...payload, company_id: company.id, request_number: makeNumber('OPS'),
        requested_by: user.id, created_by: user.id, department_id: opsDepartmentId ?? null,
        workflow_stage: 'operations_review', status: 'open',
      };
    } else {
      table = 'operations_records';
      permission = `${area.permission.replace('.view', creating ? '.create' : '.edit')}`;
      let details: Row = {};
      try {
        details = value('details_text') ? JSON.parse(value('details_text')) : {};
      } catch {
        toast.error('Additional details must be valid JSON');
        setSaving(false);
        return;
      }
      payload = {
        record_type: value('record_type') || recordTypeForArea(section),
        title: value('title').trim(), description: value('description').trim() || null,
        category: value('category').trim() || null, status: value('status') || 'open',
        priority: value('priority') || 'medium', owner_id: value('owner_id') || user.id,
        assigned_to: value('assigned_to') || null, department_id: value('department_id') || null,
        vendor_id: value('vendor_id') || null, asset_id: value('asset_id') || null,
        project_id: value('project_id') || null, budget_id: value('budget_id') || null,
        quantity: value('quantity') ? Number(value('quantity')) : null,
        waste_quantity: value('waste_quantity') ? Number(value('waste_quantity')) : null,
        amount: value('amount') ? Number(value('amount')) : null,
        metric_name: value('metric_name').trim() || null,
        metric_value: value('metric_value') ? Number(value('metric_value')) : null,
        target_value: value('target_value') ? Number(value('target_value')) : null,
        metric_unit: value('metric_unit').trim() || null,
        event_date: value('event_date') || null, due_date: value('due_date') || null,
        source_module: value('source_module') || null, source_record_id: value('source_record_id') || null,
        reference_url: value('reference_url').trim() || null,
        supporting_documents: value('supporting_documents').split('\n').map(item => item.trim()).filter(Boolean),
        details, updated_at: new Date().toISOString(),
      };
      if (creating) payload = { ...payload, company_id: company.id, created_by: user.id };
    }

    if (!value('title').trim()) {
      toast.error('A title is required');
      setSaving(false);
      return;
    }
    if (!can(permission)) {
      toast.error('You do not have permission to perform this action');
      setSaving(false);
      return;
    }

    let linkedPurchaseId: string | null = null;
    let linkedReplenishmentId: string | null = null;
    if (creating && section === 'requests' && value('request_type') === 'procurement') {
      if (!opsDepartmentId) {
        toast.error('Create the Operations department in Settings before raising a purchase request');
        setSaving(false);
        return;
      }
      const { data, error } = await supabase.from('purchase_requests').insert({
        company_id: company.id, request_number: makeNumber('OPS-PR'), title: payload.title,
        department_id: opsDepartmentId, requested_by: currentEmployee?.id ?? null,
        required_date: payload.required_date, estimated_cost: payload.requested_amount ?? 0,
        status: 'draft', priority: payload.priority, justification: payload.description,
      }).select('id').single();
      if (error || !data) {
        toast.error(error?.message || 'Could not create the linked Procurement request');
        setSaving(false);
        return;
      }
      linkedPurchaseId = data.id;
      payload.purchase_request_id = data.id;
      payload.source_module = 'procurement';
      payload.source_record_id = data.id;
    }
    if (creating && section === 'requests' && value('request_type') === 'inventory') {
      if (!opsDepartmentId || !value('product_id')) {
        toast.error('Select a product and ensure the Operations department exists');
        setSaving(false);
        return;
      }
      const { data: replenishment, error } = await supabase.from('replenishment_requests').insert({
        company_id: company.id, request_number: makeNumber('OPS-IR'), warehouse_id: value('warehouse_id') || null,
        requested_by: currentEmployee?.id ?? null, department_id: opsDepartmentId,
        priority: payload.priority, status: 'draft', required_date: payload.required_date,
        justification: payload.description,
      }).select('id').single();
      if (error || !replenishment) {
        toast.error(error?.message || 'Could not create the linked Inventory request');
        setSaving(false);
        return;
      }
      const product = products.find(item => item.id === value('product_id'));
      if (!product) {
        await supabase.from('replenishment_requests').delete().eq('id', replenishment.id).eq('company_id', company.id);
        toast.error('The selected product is no longer available');
        setSaving(false);
        return;
      }
      const currentStock = inventory.filter(item => item.product_id === value('product_id')).reduce((sum, item) => sum + Number(item.quantity_available || 0), 0);
      const { error: itemError } = await supabase.from('replenishment_items').insert({
        company_id: company.id, replenishment_request_id: replenishment.id,
        product_id: product.id, description: product.name,
        current_stock: currentStock, reorder_level: product.reorder_level ?? 0,
        requested_quantity: Number(value('requested_quantity') || 1), unit_of_measure: product.unit_of_measure || 'unit',
        estimated_cost: Number(value('requested_quantity') || 1) * Number(product.cost_price || 0),
      });
      if (itemError) {
        await supabase.from('replenishment_requests').delete().eq('id', replenishment.id).eq('company_id', company.id);
        toast.error(itemError.message);
        setSaving(false);
        return;
      }
      linkedReplenishmentId = replenishment.id;
      payload.replenishment_request_id = replenishment.id;
      payload.source_module = 'inventory';
      payload.source_record_id = replenishment.id;
    }

    let saved: Row | null = null;
    let error: Row | null = null;
    if (section === 'inspections') {
      const result = creating
        ? await supabase.from(table).insert(payload).select('*').single()
        : await supabase.from(table).update(payload).eq('id', editing.id).eq('company_id', company.id).select('*').single();
      saved = result.data;
      error = result.error;
      if (saved) {
        const items = value('checklist').split('\n').map(line => line.split('|').map(part => part.trim())).filter(parts => parts[0]);
        if (!creating) await supabase.from('inspection_checklist_items').delete().eq('inspection_id', saved.id);
        if (items.length) {
          const { error: itemsError } = await supabase.from('inspection_checklist_items').insert(items.map(parts => ({
            inspection_id: saved!.id, item_name: parts[0], status: ['fail', 'na'].includes(parts[1]) ? parts[1] : 'pass', notes: parts.slice(2).join('|') || null,
          })));
          if (itemsError) toast.error(`Inspection saved, but checklist items failed: ${itemsError.message}`);
        }
      }
    } else {
      const result = creating
        ? await supabase.from(table).insert(payload).select('*').single()
        : await supabase.from(table).update(payload).eq('id', editing.id).eq('company_id', company.id).select('*').single();
      saved = result.data;
      error = result.error;
    }
    if (error || !saved) {
      if (linkedPurchaseId) await supabase.from('purchase_requests').delete().eq('id', linkedPurchaseId).eq('company_id', company.id);
      if (linkedReplenishmentId) await supabase.from('replenishment_requests').delete().eq('id', linkedReplenishmentId).eq('company_id', company.id);
      toast.error(error?.message || 'Could not save Operations record');
      setSaving(false);
      return;
    }
    await audit(creating ? 'created' : 'updated', table, saved.id, editing ?? undefined, saved);
    if (section === 'tasks' && payload.assigned_to && payload.assigned_to !== user.id) {
      const employee = employees.find(row => row.id === payload.assigned_to);
      if (employee?.user_id) await sendNotification(company.id, employee.user_id, {
        title: `Operations task assigned: ${saved.title}`, module: 'operations', reference_id: saved.id, action_url: '/operations/tasks',
      });
    }
    toast.success(creating ? 'Operations record created' : 'Operations record updated');
    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    await load();
  };

  const deleteRecord = async (table: string, row: Row, permission: string) => {
    if (!company?.id || !can(permission)) return toast.error('You do not have permission to delete this record');
    if (!window.confirm(`Delete ${row.title || row.name || row.request_number || row.tracking_number}? This cannot be undone.`)) return;
    const { error } = await supabase.from(table).delete().eq('id', row.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    await audit('deleted', table, row.id, row);
    toast.success('Operations record deleted');
    await load();
  };

  const advanceRequest = async (request: Row, nextStage?: string, decision?: 'approved' | 'rejected') => {
    if (!company?.id || !user?.id) return;
    if (decision && !can('operations.requests.approve')) return toast.error('You do not have authorization permission');
    if (nextStage && !can('operations.requests.edit')) return toast.error('You do not have workflow edit permission');
    if (decision && request.workflow_stage !== 'authorization') return toast.error('Requests can only be authorized at the authorization stage');
    if (nextStage) {
      const oldIndex = WORKFLOW.indexOf(request.workflow_stage);
      const newIndex = WORKFLOW.indexOf(nextStage as typeof WORKFLOW[number]);
      if (newIndex !== oldIndex + 1) return toast.error('Advance one workflow stage at a time');
      if (request.workflow_stage === 'authorization' && request.approval_status !== 'approved') return toast.error('Authorize this request before execution');
      if (request.workflow_stage === 'follow_up_verification' && !request.verification_result?.trim()) return toast.error('Record follow-up verification before closure');
    }
    const stage = decision === 'approved' ? 'execution' : decision === 'rejected' ? 'supporting_documents' : nextStage || request.workflow_stage;
    const updates: Row = {
      workflow_stage: stage,
      approval_status: decision ?? (stage === 'authorization' ? 'pending' : request.approval_status),
      status: decision === 'rejected' ? 'revision_requested' : stage === 'closure' ? 'closed' : request.status,
      approved_by: decision === 'approved' ? user.id : request.approved_by,
      approved_at: decision === 'approved' ? new Date().toISOString() : request.approved_at,
      closed_at: stage === 'closure' ? new Date().toISOString() : request.closed_at,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('operations_requests').update(updates).eq('id', request.id).eq('company_id', company.id);
    if (error) return toast.error(error.message);
    if (request.purchase_request_id) {
      const purchaseStatus = decision === 'rejected' ? 'draft' : decision === 'approved' || stage === 'authorization' ? 'pending' : stage === 'closure' ? 'completed' : null;
      if (purchaseStatus) await supabase.from('purchase_requests').update({ status: purchaseStatus }).eq('id', request.purchase_request_id).eq('company_id', company.id);
    }
    if (request.replenishment_request_id) {
      const replenishmentStatus = decision === 'rejected' ? 'draft' : decision === 'approved' || stage === 'authorization' ? 'pending' : stage === 'closure' ? 'completed' : null;
      if (replenishmentStatus) await supabase.from('replenishment_requests').update({ status: replenishmentStatus }).eq('id', request.replenishment_request_id).eq('company_id', company.id);
    }
    await audit(decision || 'workflow_advanced', 'operations_requests', request.id, request, updates);
    const notifyUser = request.assigned_to || request.requested_by;
    if (decision && notifyUser && notifyUser !== user.id) await sendNotification(company.id, notifyUser, {
      title: `Operations request ${decision}: ${request.request_number}`,
      message: request.title, type: decision === 'approved' ? 'success' : 'warning',
      module: 'operations', reference_id: request.id, action_url: '/operations/requests',
    });
    toast.success(decision ? `Request ${decision}` : 'Request advanced');
    await load();
  };

  const lowStock = inventory.filter(item => Number(item.quantity_available ?? item.quantity_on_hand ?? 0) <= Number(item.products?.reorder_level ?? 0));
  const openTasks = tasks.filter(task => !['done', 'completed', 'cancelled'].includes(task.status));
  const openIncidents = records.filter(record => record.record_type === 'incident' && !['closed', 'resolved'].includes(record.status));
  const openRequests = requests.filter(request => request.status !== 'closed');
  const activeDeliveries = deliveries.filter(delivery => !['delivered', 'cancelled'].includes(delivery.status));
  const openInspections = inspections.filter(inspection => ['pending', 'in_progress', 'failed'].includes(inspection.status));
  const activeWorkOrders = workOrders.filter(order => !['completed', 'cancelled'].includes(order.status));
  const operationsBudgets = useMemo(() => opsDepartmentId ? budgets.filter(budget => budget.department_id === opsDepartmentId) : [], [budgets, opsDepartmentId]);
  const activeBudget = operationsBudgets.reduce((sum, budget) => sum + (budget.status === 'active' ? Number(budget.total_amount || 0) : 0), 0);
  const spentBudget = operationsBudgets.reduce((sum, budget) => sum + (budget.status === 'active' ? Number(budget.spent_amount || 0) : 0), 0);

  const reportRows = useMemo(() => {
    if (section !== 'reports' || selectedReport === null) return [];
    const kind = REPORTS[selectedReport].kind;
    if (kind === 'inventory') return inventory.map(row => ({ product: row.products?.name, sku: row.products?.sku, warehouse: row.warehouses?.name, on_hand: row.quantity_on_hand, reserved: row.quantity_reserved, available: row.quantity_available, reorder_level: row.products?.reorder_level }));
    if (kind === 'procurement') return [...purchaseRequests.map(row => ({ type: 'request', request_number: row.request_number, title: row.title, status: row.status, amount: row.estimated_cost })), ...purchaseOrders.map(row => ({ type: 'purchase_order', po_number: row.po_number, vendor: row.vendors?.name, status: row.status, amount: row.total_amount }))];
    if (kind === 'logistics') return deliveries.map(row => ({ tracking_number: row.tracking_number, purchase_order: row.purchase_orders?.po_number, vendor: row.vendors?.name, status: row.status, estimated_delivery: row.estimated_delivery_date, actual_delivery: row.actual_delivery_date }));
    if (kind === 'attendance') return attendance.map(row => ({ employee: nameOf(row.profiles), department: row.departments?.name, date: row.attendance_date, status: row.status, hours: row.working_hours, lateness_minutes: row.late_minutes }));
    if (kind === 'maintenance') return workOrders;
    if (kind === 'budget') return operationsBudgets;
    if (kind === 'compliance') return records.filter(row => ['compliance', 'safety'].includes(row.record_type));
    if (kind === 'production_cost') return records.filter(row => row.record_type === 'production');
    if (kind === 'month') {
      const month = new Date().toISOString().slice(0, 7);
      return [{ month, tasks_open: openTasks.length, low_stock_lines: lowStock.length, deliveries_active: activeDeliveries.length, incidents_open: openIncidents.length, inspections_open: openInspections.length, requests_open: openRequests.length, production_records: records.filter(row => row.record_type === 'production' && row.event_date?.startsWith(month)).length }];
    }
    if (kind === 'year') {
      const year = String(new Date().getFullYear());
      return [{ year, tasks_created: tasks.filter(row => row.created_at?.startsWith(year)).length, production_records: records.filter(row => row.record_type === 'production' && row.event_date?.startsWith(year)).length, incidents: records.filter(row => row.record_type === 'incident' && row.event_date?.startsWith(year)).length, inspections: inspections.filter(row => row.inspection_date?.startsWith(year)).length, maintenance_orders: workOrders.filter(row => row.created_at?.startsWith(year)).length, budget_allocated: activeBudget, budget_spent: spentBudget }];
    }
    return records.filter(row => row.record_type === kind);
  }, [section, selectedReport, inventory, purchaseRequests, purchaseOrders, deliveries, attendance, workOrders, operationsBudgets, openTasks.length, lowStock.length, activeDeliveries.length, openIncidents.length, openInspections.length, openRequests.length, records, inspections, tasks, activeBudget, spentBudget]);

  const tableColumns = (keys: { key: string; label: string; render?: (row: Row) => React.ReactNode }[]): Column<Row>[] => [
    ...keys.map(item => ({ key: item.key, header: item.label, sortable: true, cell: item.render ?? ((row: Row) => String(row[item.key] ?? '—')) })),
  ];

  const taskColumns: Column<Row>[] = [
    { key: 'title', header: 'Task', sortable: true },
    { key: 'projects', header: 'Project', cell: row => row.projects?.name || 'Operations' },
    { key: 'assigned_to', header: 'Assigned to', cell: row => nameOf(employees.find(employee => employee.id === row.assigned_to)) },
    { key: 'priority', header: 'Priority', cell: row => <StatusBadge status={row.priority} /> },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'due_date', header: 'Due' },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can('operations.tasks.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}{can('operations.tasks.delete') && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRecord('tasks', row, 'operations.tasks.delete')}><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  const workColumns: Column<Row>[] = [
    { key: 'order_number', header: 'Work Order', sortable: true },
    { key: 'title', header: 'Work', sortable: true },
    { key: 'assets', header: 'Equipment', cell: row => row.assets?.name || '—' },
    { key: 'scheduled_date', header: 'Scheduled' },
    { key: 'estimated_cost', header: 'Est. Cost' },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can('operations.maintenance.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}{can('operations.maintenance.delete') && <Button variant="ghost" size="icon" onClick={() => void deleteRecord('work_orders', row, 'operations.maintenance.delete')} title="Delete"><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  const deliveryColumns: Column<Row>[] = [
    { key: 'tracking_number', header: 'Tracking', sortable: true },
    { key: 'purchase_orders', header: 'PO', cell: row => row.purchase_orders?.po_number || '—' },
    { key: 'vendors', header: 'Vendor', cell: row => row.vendors?.name || '—' },
    { key: 'carrier', header: 'Carrier' },
    { key: 'estimated_delivery_date', header: 'ETA' },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can('operations.logistics.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}{can('operations.logistics.delete') && <Button variant="ghost" size="icon" onClick={() => void deleteRecord('deliveries', row, 'operations.logistics.delete')} title="Delete"><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  const requestColumns: Column<Row>[] = [
    { key: 'request_number', header: 'Request', sortable: true },
    { key: 'title', header: 'Title', sortable: true },
    { key: 'request_type', header: 'Type', cell: row => row.request_type.replace(/_/g, ' ') },
    { key: 'requested_for_department_id', header: 'For department', cell: row => departments.find(department => department.id === row.requested_for_department_id)?.name || '—' },
    { key: 'requested_amount', header: 'Amount', cell: row => row.requested_amount == null ? '—' : `${company?.currency || 'USD'} ${Number(row.requested_amount).toLocaleString()}` },
    { key: 'workflow_stage', header: 'Workflow', cell: row => WORKFLOW_LABELS[row.workflow_stage] ?? row.workflow_stage },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.approval_status || row.status} /> },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex items-center gap-1">{can('operations.requests.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}<WorkflowActions request={row} />{can('operations.requests.delete') && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRecord('operations_requests', row, 'operations.requests.delete')}><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  function WorkflowActions({ request }: { request: Row }) {
    if (request.workflow_stage === 'authorization') {
      return can('operations.requests.approve') ? <div className="flex gap-1"><Button size="sm" onClick={() => void advanceRequest(request, undefined, 'approved')}>Authorize</Button><Button variant="outline" size="sm" onClick={() => void advanceRequest(request, undefined, 'rejected')}>Return</Button></div> : <span className="text-xs text-gray-500">Awaiting authorization</span>;
    }
    if (request.workflow_stage === 'closure') return null;
    return can('operations.requests.edit') ? <Button variant="outline" size="sm" onClick={() => void advanceRequest(request, WORKFLOW[WORKFLOW.indexOf(request.workflow_stage) + 1])}>Advance</Button> : null;
  }

  const recordTypeByArea: Record<string, string[]> = {
    vendors: ['vendor_evaluation', 'vendor_communication', 'vendor_contract'], workforce: ['schedule'], incidents: ['incident'],
    production: ['production'], resources: ['resource_allocation'], compliance: ['compliance'], kpis: ['kpi'],
  };
  const recordsForSection = records.filter(row => recordTypeByArea[section]?.includes(row.record_type));
  const recordPermissionPrefix: Record<string, string> = {
    vendors: 'operations.vendors', workforce: 'operations.workforce', incidents: 'operations.incidents',
    production: 'operations.production', resources: 'operations.resources', compliance: 'operations.compliance', kpis: 'operations.kpis',
  };
  const recordColumns: Column<Row>[] = [
    { key: 'title', header: 'Record', sortable: true },
    { key: 'category', header: 'Category' },
    { key: 'owner_id', header: 'Owner', cell: row => nameOf(employees.find(employee => employee.user_id === row.owner_id) || { display_name: row.owner_id === user?.id ? 'You' : '' }) },
    { key: 'vendor_id', header: 'Vendor', cell: row => vendors.find(vendor => vendor.id === row.vendor_id)?.name || '—' },
    { key: 'budget_id', header: 'Budget', cell: row => budgets.find(budget => budget.id === row.budget_id)?.name || '—' },
    { key: 'event_date', header: 'Date' },
    { key: 'quantity', header: 'Output / Qty', cell: row => row.quantity == null ? '—' : `${row.quantity}${row.metric_unit ? ` ${row.metric_unit}` : ''}` },
    { key: 'amount', header: 'Cost / Amount', cell: row => row.amount == null ? '—' : `${company?.currency || 'USD'} ${Number(row.amount).toLocaleString()}` },
    { key: 'metric_value', header: 'KPI', cell: row => row.metric_value == null ? '—' : `${row.metric_value}${row.metric_unit ? ` ${row.metric_unit}` : ''}` },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can(`${recordPermissionPrefix[section]}.edit`) && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}{can(`${recordPermissionPrefix[section]}.delete`) && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRecord('operations_records', row, `${recordPermissionPrefix[section]}.delete`)}><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  const inspectionColumns: Column<Row>[] = [
    { key: 'inspection_date', header: 'Date', sortable: true },
    { key: 'inspection_type', header: 'Type', cell: row => row.inspection_type.replace(/_/g, ' ') },
    { key: 'status', header: 'Status', cell: row => <StatusBadge status={row.status} /> },
    { key: 'overall_score', header: 'Score', cell: row => row.overall_score == null ? '—' : `${row.overall_score}%` },
    { key: 'findings', header: 'Findings', cell: row => row.findings || '—' },
    { key: 'checklist_count', header: 'Checklist', cell: row => checklistItems.filter(item => item.inspection_id === row.id).length },
    { key: 'actions', header: 'Actions', cell: row => <div className="flex gap-1">{can('operations.inspections.edit') && <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>}{can('operations.inspections.delete') && <Button variant="ghost" size="icon" title="Delete" onClick={() => void deleteRecord('office_inspections', row, 'operations.inspections.delete')}><Trash2 className="h-4 w-4" /></Button>}</div> },
  ];

  const reportColumns = (rows: Row[]): Column<Row>[] => rows[0] ? Object.keys(rows[0]).filter(key => !['id', 'company_id', 'details', 'supporting_documents'].includes(key)).slice(0, 8).map(key => ({
    key, header: key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()), sortable: true,
    cell: row => row[key] == null ? '—' : typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key]),
  })) : [];

  const renderedTable = () => {
    if (section === 'tasks') return <DataTable data={tasks} columns={taskColumns} loading={loading} searchKeys={['title', 'description', 'status', 'priority']} searchPlaceholder="Search tasks..." emptyTitle="No operations tasks" emptyDescription="Create a task to track operational work." rowKey="id" />;
    if (section === 'maintenance') return <DataTable data={workOrders} columns={workColumns} loading={loading} searchKeys={['order_number', 'title', 'status', 'work_type']} searchPlaceholder="Search work orders..." emptyTitle="No equipment work orders" emptyDescription="Create a maintenance work order linked to an existing asset." rowKey="id" />;
    if (section === 'logistics') return <DataTable data={deliveries} columns={deliveryColumns} loading={loading} searchKeys={['tracking_number', 'carrier', 'status']} searchPlaceholder="Search deliveries..." emptyTitle="No delivery records" emptyDescription="Delivery records are shared with Procurement and Logistics." rowKey="id" />;
    if (section === 'requests') return <DataTable data={requests} columns={requestColumns} loading={loading} searchKeys={['request_number', 'title', 'request_type', 'status']} searchPlaceholder="Search Operations requests..." emptyTitle="No cross-department requests" emptyDescription="Create a request to start its authorization workflow." rowKey="id" />;
    if (section === 'inspections') return <DataTable data={inspections} columns={inspectionColumns} loading={loading} searchable={false} emptyTitle="No inspections recorded" emptyDescription="Create a quality, safety, process, or general inspection." rowKey="id" />;
    if (section === 'inventory') return <div className="space-y-5"><div><h2 className="mb-2 text-sm font-semibold">Warehouse balances</h2><DataTable data={inventory} columns={tableColumns([
      { key: 'products', label: 'Product', render: row => row.products?.name || '—' },
      { key: 'warehouses', label: 'Warehouse', render: row => row.warehouses?.name || '—' },
      { key: 'quantity_on_hand', label: 'On hand' }, { key: 'quantity_reserved', label: 'Reserved' },
      { key: 'quantity_available', label: 'Available' },
      { key: 'products', label: 'Reorder at', render: row => row.products?.reorder_level ?? 0 },
    ])} loading={loading} emptyTitle="No inventory balances" emptyDescription="Inventory balances are read from the Inventory module." rowKey="id" /></div><div><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent stock movements</h2><Link className="text-xs text-blue-700" href="/inventory/movements">Inventory movements</Link></div><DataTable data={stockMovements.slice(0, 100)} columns={tableColumns([{ key: 'created_at', label: 'Recorded', render: row => new Date(row.created_at).toLocaleString() }, { key: 'products', label: 'Product', render: row => row.products?.name || '—' }, { key: 'warehouses', label: 'Warehouse', render: row => row.warehouses?.name || '—' }, { key: 'movement_type', label: 'Movement' }, { key: 'quantity', label: 'Quantity' }, { key: 'reference_type', label: 'Reference' }, { key: 'notes', label: 'Notes' }])} loading={loading} emptyTitle="No stock movement records" emptyDescription="Movement history is read from Inventory without modifying stock here." rowKey="id" /></div></div>;
    if (section === 'procurement') return <div className="space-y-5"><div><h2 className="mb-2 text-sm font-semibold">Purchase Requests</h2><DataTable data={purchaseRequests} columns={tableColumns([{ key: 'request_number', label: 'Request' }, { key: 'title', label: 'Title' }, { key: 'priority', label: 'Priority' }, { key: 'estimated_cost', label: 'Estimate' }, { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> }])} loading={loading} rowKey="id" emptyTitle="No purchase requests" emptyDescription="Create an Operations request to raise a linked Procurement request." /></div><div><h2 className="mb-2 text-sm font-semibold">Purchase Orders</h2><DataTable data={purchaseOrders} columns={tableColumns([{ key: 'po_number', label: 'PO' }, { key: 'vendors', label: 'Vendor', render: row => row.vendors?.name || '—' }, { key: 'issue_date', label: 'Issued' }, { key: 'expected_delivery', label: 'Expected delivery' }, { key: 'total_amount', label: 'Total' }, { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> }])} loading={loading} rowKey="id" emptyTitle="No purchase orders" emptyDescription="Purchase orders remain owned by Procurement." /></div></div>;
    if (section === 'workforce') return <div className="space-y-5"><DataTable data={records.filter(row => row.record_type === 'schedule')} columns={recordColumns} loading={loading} emptyTitle="No staff schedules" emptyDescription="Create operational shift and resource schedules." rowKey="id" /><div><h2 className="mb-2 text-sm font-semibold">Recent Attendance</h2><DataTable data={attendance.slice(0, 100)} columns={tableColumns([{ key: 'profiles', label: 'Employee', render: row => nameOf(row.profiles) }, { key: 'departments', label: 'Department', render: row => row.departments?.name || '—' }, { key: 'attendance_date', label: 'Date' }, { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> }, { key: 'working_hours', label: 'Hours' }, { key: 'late_minutes', label: 'Late minutes' }])} loading={loading} rowKey="id" emptyTitle="No attendance records" emptyDescription="Attendance is sourced from HR and Administration." /></div></div>;
    if (section === 'vendors') return <div className="space-y-5"><div><h2 className="mb-2 text-sm font-semibold">Shared Vendor Directory</h2><DataTable data={vendors} columns={tableColumns([{ key: 'name', label: 'Vendor', render: row => <Link className="text-blue-700 hover:underline dark:text-blue-300" href="/procurement/vendors">{row.name}</Link> }, { key: 'category', label: 'Category' }, { key: 'rating', label: 'Rating' }, { key: 'total_orders', label: 'Orders' }, { key: 'total_spend', label: 'Spend' }, { key: 'status', label: 'Status', render: row => <StatusBadge status={row.status} /> }])} loading={loading} rowKey="id" emptyTitle="No vendors" emptyDescription="Vendors are maintained by Procurement." /></div><div><h2 className="mb-2 text-sm font-semibold">Operations Vendor Evaluations & Communications</h2><DataTable data={records.filter(row => ['vendor_evaluation', 'vendor_communication'].includes(row.record_type))} columns={recordColumns} loading={loading} rowKey="id" emptyTitle="No vendor evaluations" emptyDescription="Create a vendor scorecard or communication record." /></div></div>;
    if (section === 'supply-chain') return <div className="grid gap-6 xl:grid-cols-2"><section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Inventory exceptions</h2><Link className="text-xs text-blue-700" href="/operations/inventory">Inventory</Link></div><DataTable data={lowStock} columns={tableColumns([{ key: 'products', label: 'Product', render: row => row.products?.name || '—' }, { key: 'warehouses', label: 'Warehouse', render: row => row.warehouses?.name || '—' }, { key: 'quantity_available', label: 'Available' }, { key: 'products', label: 'Reorder level', render: row => row.products?.reorder_level ?? 0 }])} loading={loading} rowKey="id" emptyTitle="No low-stock items" emptyDescription="Availability is calculated from live warehouse balances." /></section><section><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Active deliveries</h2><Link className="text-xs text-blue-700" href="/operations/logistics">Logistics</Link></div><DataTable data={activeDeliveries} columns={deliveryColumns.filter(column => column.key !== 'actions')} loading={loading} rowKey="id" emptyTitle="No active deliveries" emptyDescription="Delivery updates are shared with Logistics and Procurement." /></section></div>;
    if (section === 'reports') return <div className="grid gap-5 lg:grid-cols-[260px_1fr]"><nav className="border-y border-gray-200 dark:border-gray-800">{REPORTS.map((report, index) => <button key={report.title} onClick={() => setSelectedReport(index)} className={`flex w-full items-center justify-between gap-2 border-b border-gray-100 px-3 py-2.5 text-left text-sm dark:border-gray-800 ${selectedReport === index ? 'bg-blue-50 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900'}`}><span>{report.title}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-50" /></button>)}</nav><div className="min-w-0">{selectedReport === null ? <div className="flex min-h-52 items-center justify-center border-y text-sm text-gray-500">Select a report to view live data.</div> : <><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">{REPORTS[selectedReport].title}</h2><p className="mt-1 text-xs text-gray-500">Generated from current ERP records.</p></div>{can('operations.reports.export') && <Button variant="outline" size="sm" onClick={() => csvDownload(`${REPORTS[selectedReport].title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, reportRows)}><Download className="mr-2 h-4 w-4" />Export</Button>}</div><DataTable data={reportRows} columns={reportColumns(reportRows)} loading={loading} searchable emptyTitle="No report data" emptyDescription="Records will appear as your teams record operational activity." rowKey="id" /></>}</div></div>;
    if (recordTypeByArea[section]) return <DataTable data={recordsForSection} columns={recordColumns} loading={loading} searchKeys={['title', 'category', 'status', 'description']} searchPlaceholder={`Search ${area?.title.toLowerCase()}...`} emptyTitle={`No ${area?.title.toLowerCase()} records`} emptyDescription="Create an Operations record to begin tracking." rowKey="id" />;
    return <DataTable data={workOrders} columns={workColumns} loading={loading} rowKey="id" emptyTitle="No records" emptyDescription="No Operations records are available for this area yet." />;
  };

  const reportData = () => {
    if (selectedReport === null) return [];
    const kind = REPORTS[selectedReport].kind;
    if (kind === 'inventory') return inventory;
    if (kind === 'procurement') return [...purchaseRequests, ...purchaseOrders];
    if (kind === 'vendor_evaluation') return records.filter(row => row.record_type === 'vendor_evaluation');
    if (kind === 'logistics') return deliveries;
    if (kind === 'attendance') return attendance;
    if (kind === 'maintenance') return workOrders;
    if (kind === 'budget') return operationsBudgets;
    if (kind === 'month' || kind === 'year') return reportRows;
    if (kind === 'production_cost') return records.filter(row => row.record_type === 'production');
    return records.filter(row => row.record_type === kind || (kind === 'compliance' && row.record_type === 'safety'));
  };

  const canCreate = area ? can(`${area.permission.replace('.view', '.create')}`) : false;
  const pageDescription: Record<string, string> = {
    tasks: 'Daily operational work, ownership, priorities, and due dates.',
    inventory: 'Live warehouse balances and stock movements from Inventory.',
    procurement: 'Shared purchase requests and purchase orders managed by Procurement.',
    logistics: 'Delivery and shipment records shared with Logistics and Procurement.',
    workforce: 'Operations shift plans alongside HR attendance records.',
    inspections: 'Quality, safety, process, and general checklists.',
    maintenance: 'Equipment work orders linked to existing company assets.',
    requests: 'Route procurement, inventory, logistics, budget, and compliance work through authorization.',
    reports: 'Cross-department operational reports calculated from current ERP records.',
  };

  if (!canView) return <div className="p-8 text-center text-sm text-gray-500">You do not have access to this Operations area.</div>;

  if (section === 'overview') {
    const visibleAreas = AREAS.filter(item => can(item.permission));
    return <div className="space-y-6">
      <PageHeader title="Operations" description="Daily delivery, supply chain coordination, quality, and operational performance" breadcrumbs={[{ label: 'Operations' }]}>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
        {can('operations.requests.create') && <Button size="sm" onClick={() => { window.location.href = '/operations/requests'; }}><Plus className="mr-2 h-4 w-4" />New Request</Button>}
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KPICard title="Open Tasks" value={openTasks.length} icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Low Stock Lines" value={lowStock.length} icon={<Package className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Open Requests" value={openRequests.length} icon={<ClipboardCheck className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Active Deliveries" value={activeDeliveries.length} icon={<Truck className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50 dark:bg-cyan-950/50" loading={loading} />
        <KPICard title="Incidents" value={openIncidents.length} icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
        <KPICard title="Open Inspections" value={openInspections.length} icon={<ClipboardCheck className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Work Orders" value={activeWorkOrders.length} icon={<Wrench className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Active Budget" value={`${company?.currency || 'USD'} ${spentBudget.toLocaleString()}`} icon={<Activity className="h-4 w-4 text-indigo-600" />} iconBg="bg-indigo-50 dark:bg-indigo-950/50" loading={loading} />
      </div>
      <section><div className="flex items-end justify-between border-b border-gray-200 pb-3 dark:border-gray-800"><div><h2 className="text-sm font-semibold">Operations Areas</h2><p className="mt-1 text-xs text-gray-500">Live data shared with Procurement, Inventory, Logistics, Finance, HR, and Administration.</p></div><span className="text-xs text-gray-500">{visibleAreas.length} areas</span></div><div className="grid gap-x-6 gap-y-1 pt-2 sm:grid-cols-2 lg:grid-cols-4">{visibleAreas.map(item => <Link key={item.key} href={`/operations/${item.key}`} className="group flex items-center gap-3 border-b border-gray-100 py-3 hover:text-blue-700 dark:border-gray-800 dark:hover:text-blue-300"><item.icon className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-blue-600" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" /></Link>)}</div></section>
      <div className="grid gap-6 xl:grid-cols-2"><section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Priority queue</h2><Link className="text-xs text-blue-700" href="/operations/tasks">All tasks</Link></div><DataTable data={openTasks.slice(0, 6)} columns={taskColumns.filter(column => column.key !== 'actions')} loading={loading} searchable={false} pageSize={6} rowKey="id" emptyTitle="No open tasks" emptyDescription="Tasks will appear as teams record their operational work." /></section><section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Requests awaiting authorization</h2><Link className="text-xs text-blue-700" href="/operations/requests">Request queue</Link></div><DataTable data={requests.filter(row => row.workflow_stage === 'authorization')} columns={requestColumns.filter(column => column.key !== 'actions')} loading={loading} searchable={false} pageSize={6} rowKey="id" emptyTitle="No pending authorizations" emptyDescription="Requests enter this queue after Operations review and supporting documents." /></section></div>
    </div>;
  }

  if (!area) return <div className="p-8 text-center text-sm text-gray-500">This Operations area is not available.</div>;

  const headerActions = <>
    <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
    {section === 'inventory' && can('operations.requests.create') && <Button size="sm" onClick={() => { window.location.href = '/operations/requests'; }}><Plus className="mr-2 h-4 w-4" />Replenishment Request</Button>}
    {section === 'procurement' && can('operations.requests.create') && <Button size="sm" onClick={() => { window.location.href = '/operations/requests'; }}><Plus className="mr-2 h-4 w-4" />Purchase Request</Button>}
    {section !== 'reports' && canCreate && <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New {sectionLabel(section)}</Button>}
  </>;

  const formElement = () => <>
    {section === 'tasks' ? <>
      <Field label="Task title"><Input required value={value('title')} onChange={event => setValue('title', event.target.value)} /></Field>
      <Field label="Description"><Textarea rows={3} value={value('description')} onChange={event => setValue('description', event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Project"><Select value={value('project_id') || 'none'} onValueChange={item => setValue('project_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Operations</SelectItem>{projects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Owner"><Select value={value('assigned_to') || 'none'} onValueChange={item => setValue('assigned_to', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{employees.map(employee => <SelectItem key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</SelectItem>)}</SelectContent></Select></Field><Field label="Priority"><Select value={value('priority') || 'medium'} onValueChange={item => setValue('priority', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'urgent'].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={value('status') || 'todo'} onValueChange={item => setValue('status', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['todo', 'in_progress', 'blocked', 'done', 'cancelled'].map(item => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Due date"><Input type="date" value={value('due_date')} onChange={event => setValue('due_date', event.target.value)} /></Field><Field label="Estimated hours"><Input type="number" min="0" step="0.25" value={value('estimated_hours')} onChange={event => setValue('estimated_hours', event.target.value)} /></Field></div>
    </> : section === 'maintenance' ? <>
      <Field label="Work order title"><Input required value={value('title')} onChange={event => setValue('title', event.target.value)} /></Field><Field label="Description"><Textarea rows={3} value={value('description')} onChange={event => setValue('description', event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Equipment"><Select value={value('asset_id') || 'none'} onValueChange={item => setValue('asset_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Not assigned</SelectItem>{assets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.asset_number || asset.name} · {asset.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Work type"><Select value={value('work_type') || 'maintenance'} onValueChange={item => setValue('work_type', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['maintenance', 'repair', 'inspection', 'upgrade'].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Assigned technician"><Select value={value('assigned_to') || 'none'} onValueChange={item => setValue('assigned_to', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{employees.map(employee => <SelectItem key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</SelectItem>)}</SelectContent></Select></Field><Field label="Scheduled date"><Input type="date" value={value('scheduled_date')} onChange={event => setValue('scheduled_date', event.target.value)} /></Field><Field label="Priority"><Select value={value('priority') || 'medium'} onValueChange={item => setValue('priority', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'urgent'].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Estimated cost"><Input type="number" min="0" step="0.01" value={value('estimated_cost')} onChange={event => setValue('estimated_cost', event.target.value)} /></Field>{editing && <Field label="Status"><Select value={value('status') || 'pending'} onValueChange={item => setValue('status', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(item => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></Field>}</div>
    </> : section === 'logistics' ? <>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Purchase order"><Select value={value('po_id')} onValueChange={item => { setValue('po_id', item); const order = purchaseOrders.find(row => row.id === item); if (order) setValue('vendor_id', order.vendor_id); }}><SelectTrigger><SelectValue placeholder="Select a PO" /></SelectTrigger><SelectContent>{purchaseOrders.map(order => <SelectItem key={order.id} value={order.id}>{order.po_number} · {order.vendors?.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Vendor"><Select value={value('vendor_id')} onValueChange={item => setValue('vendor_id', item)}><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Tracking number"><Input value={value('tracking_number')} onChange={event => setValue('tracking_number', event.target.value)} /></Field><Field label="Carrier"><Input value={value('carrier')} onChange={event => setValue('carrier', event.target.value)} /></Field><Field label="Estimated delivery"><Input type="date" value={value('estimated_delivery_date')} onChange={event => setValue('estimated_delivery_date', event.target.value)} /></Field><Field label="Actual delivery"><Input type="date" value={value('actual_delivery_date')} onChange={event => setValue('actual_delivery_date', event.target.value)} /></Field><Field label="Status"><Select value={value('status') || 'pending'} onValueChange={item => setValue('status', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['pending', 'shipped', 'in_transit', 'delivered', 'delayed', 'cancelled'].map(item => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Contact"><Input value={value('contact_person')} onChange={event => setValue('contact_person', event.target.value)} /></Field></div><Field label="Delivery address"><Input value={value('delivery_address')} onChange={event => setValue('delivery_address', event.target.value)} /></Field><Field label="Notes"><Textarea value={value('notes')} onChange={event => setValue('notes', event.target.value)} /></Field>
    </> : section === 'inspections' ? <>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Inspection type"><Select value={value('inspection_type') || 'general'} onValueChange={item => setValue('inspection_type', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['general', 'quality', 'safety', 'production', 'process', 'workspace', 'cleanliness'].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Inspection date"><Input required type="date" value={value('inspection_date') || value('event_date')} onChange={event => setValue('inspection_date', event.target.value)} /></Field><Field label="Status"><Select value={value('inspection_status') || 'pending'} onValueChange={item => setValue('inspection_status', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['pending', 'in_progress', 'completed', 'failed'].map(item => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Score (0-100)"><Input type="number" min="0" max="100" value={value('overall_score')} onChange={event => setValue('overall_score', event.target.value)} /></Field></div><Field label="Findings"><Textarea rows={3} value={value('findings')} onChange={event => setValue('findings', event.target.value)} /></Field><Field label="Checklist items (one per line: item | pass/fail/na | notes)"><Textarea rows={5} value={value('checklist')} onChange={event => setValue('checklist', event.target.value)} placeholder="Machine guard | pass | Secure\nEmergency exit | fail | Blocked by pallets" /></Field>
    </> : section === 'requests' ? <>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Request type"><Select value={value('request_type') || 'other'} onValueChange={item => setValue('request_type', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['procurement', 'inventory', 'logistics', 'vendor_contract', 'budget', 'compliance', 'resource', 'other'].map(item => <SelectItem key={item} value={item}>{item.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Priority"><Select value={value('priority') || 'medium'} onValueChange={item => setValue('priority', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['low', 'medium', 'high', 'urgent'].map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field></div><Field label="Request title"><Input required value={value('title')} onChange={event => setValue('title', event.target.value)} /></Field><Field label="Justification"><Textarea rows={3} value={value('description')} onChange={event => setValue('description', event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Estimated amount"><Input type="number" min="0" step="0.01" value={value('requested_amount')} onChange={event => setValue('requested_amount', event.target.value)} /></Field><Field label="Required date"><Input type="date" value={value('required_date')} onChange={event => setValue('required_date', event.target.value)} /></Field>{value('request_type') === 'inventory' && <><Field label="Product"><Select value={value('product_id')} onValueChange={item => setValue('product_id', item)}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map(product => <SelectItem key={product.id} value={product.id}>{product.sku || product.name} · {product.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Quantity"><Input type="number" min="0.01" step="0.01" value={value('requested_quantity')} onChange={event => setValue('requested_quantity', event.target.value)} /></Field><Field label="Warehouse"><Select value={value('warehouse_id') || 'none'} onValueChange={item => setValue('warehouse_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Select later</SelectItem>{warehouses.map(warehouse => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent></Select></Field></>}{value('request_type') === 'logistics' && <Field label="Linked delivery"><Select value={value('delivery_id') || 'none'} onValueChange={item => { setValue('delivery_id', item === 'none' ? '' : item); setValue('source_module', item === 'none' ? '' : 'logistics'); setValue('source_record_id', item === 'none' ? '' : item); }}><SelectTrigger><SelectValue placeholder="Select delivery" /></SelectTrigger><SelectContent><SelectItem value="none">No linked delivery</SelectItem>{deliveries.map(delivery => <SelectItem key={delivery.id} value={delivery.id}>{delivery.tracking_number || delivery.id.slice(0, 8)} · {delivery.status}</SelectItem>)}</SelectContent></Select></Field>}{value('request_type') === 'vendor_contract' && <Field label="Vendor"><Select value={value('vendor_id') || 'none'} onValueChange={item => setValue('vendor_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent><SelectItem value="none">Select later</SelectItem>{vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}</SelectContent></Select></Field>}{value('request_type') === 'budget' && <Field label="Budget"><Select value={value('budget_id') || 'none'} onValueChange={item => setValue('budget_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue placeholder="Link department budget" /></SelectTrigger><SelectContent><SelectItem value="none">No linked budget</SelectItem>{budgets.map(budget => <SelectItem key={budget.id} value={budget.id}>{budget.name} · {budget.fiscal_year}</SelectItem>)}</SelectContent></Select></Field>}</div><Field label="Supporting document / quote URLs (one per line)"><Textarea rows={2} value={value('supporting_documents')} onChange={event => setValue('supporting_documents', event.target.value)} /></Field>{editing && <><Field label="Execution notes"><Textarea rows={2} value={value('execution_notes')} onChange={event => setValue('execution_notes', event.target.value)} /></Field><Field label="Documentation URL"><Input type="url" value={value('documentation_url')} onChange={event => setValue('documentation_url', event.target.value)} /></Field><Field label="Follow-up / verification result"><Textarea rows={2} value={value('verification_result')} onChange={event => setValue('verification_result', event.target.value)} /></Field></>}
    </> : <>
      {section === 'vendors' && <Field label="Vendor record type"><Select value={value('record_type') || 'vendor_evaluation'} onValueChange={item => setValue('record_type', item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vendor_evaluation">Performance evaluation</SelectItem><SelectItem value="vendor_communication">Communication record</SelectItem><SelectItem value="vendor_contract">Contract / renewal</SelectItem></SelectContent></Select></Field>}<Field label={section === 'kpis' ? 'KPI name' : 'Record title'}><Input required value={value('title')} onChange={event => setValue('title', event.target.value)} /></Field><Field label="Description"><Textarea rows={3} value={value('description')} onChange={event => setValue('description', event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><Input value={value('category')} onChange={event => setValue('category', event.target.value)} placeholder="Shift, safety, output, audit..." /></Field><Field label="Status"><Input value={value('status') || 'open'} onChange={event => setValue('status', event.target.value)} /></Field><Field label="Owner"><Select value={value('owner_id') || 'unassigned'} onValueChange={item => setValue('owner_id', item === 'unassigned' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{employees.map(employee => <SelectItem key={employee.user_id || employee.id} value={employee.user_id || employee.id}>{employee.first_name} {employee.last_name}</SelectItem>)}</SelectContent></Select></Field><Field label="Department"><Select value={value('department_id') || 'none'} onValueChange={item => setValue('department_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Operations</SelectItem>{departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Date"><Input type="date" value={value('event_date')} onChange={event => setValue('event_date', event.target.value)} /></Field><Field label="Due date"><Input type="date" value={value('due_date')} onChange={event => setValue('due_date', event.target.value)} /></Field><Field label="Vendor"><Select value={value('vendor_id') || 'none'} onValueChange={item => setValue('vendor_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Asset / equipment"><Select value={value('asset_id') || 'none'} onValueChange={item => setValue('asset_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{assets.map(asset => <SelectItem key={asset.id} value={asset.id}>{asset.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Quantity / output"><Input type="number" min="0" step="0.001" value={value('quantity')} onChange={event => setValue('quantity', event.target.value)} /></Field><Field label="Waste quantity"><Input type="number" min="0" step="0.001" value={value('waste_quantity')} onChange={event => setValue('waste_quantity', event.target.value)} /></Field><Field label="Cost / amount"><Input type="number" min="0" step="0.01" value={value('amount')} onChange={event => setValue('amount', event.target.value)} /></Field><Field label="Metric"><Input value={value('metric_name')} onChange={event => setValue('metric_name', event.target.value)} /></Field><Field label="Measured value"><Input type="number" step="0.0001" value={value('metric_value')} onChange={event => setValue('metric_value', event.target.value)} /></Field><Field label="Target"><Input type="number" step="0.0001" value={value('target_value')} onChange={event => setValue('target_value', event.target.value)} /></Field><Field label="Metric unit"><Input value={value('metric_unit')} onChange={event => setValue('metric_unit', event.target.value)} placeholder="units, %, minutes" /></Field></div><Field label="Reference URL"><Input type="url" value={value('reference_url')} onChange={event => setValue('reference_url', event.target.value)} /></Field><Field label="Supporting document URLs (one per line)"><Textarea rows={2} value={value('supporting_documents')} onChange={event => setValue('supporting_documents', event.target.value)} /></Field><Field label="Additional operational details (JSON)"><Textarea rows={4} value={value('details_text') || '{}'} onChange={event => setValue('details_text', event.target.value)} /></Field>
    </>}
  </>;

  return <div className="space-y-6">
    <PageHeader title={area.title} description={pageDescription[section] || `${area.title} coordination and performance records.`} breadcrumbs={[{ label: 'Operations', href: '/operations' }, { label: area.title }]}>{headerActions}</PageHeader>
    {section === 'inventory' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Stock lines" value={inventory.length} /><Stat label="Low stock" value={lowStock.length} color="text-amber-700" /><Stat label="Warehouses" value={warehouses.length} /><Stat label="Products" value={products.length} /></div>}
    {section === 'procurement' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Open requests" value={purchaseRequests.filter(row => !['completed', 'rejected', 'cancelled'].includes(row.status)).length} /><Stat label="Purchase orders" value={purchaseOrders.length} /><Stat label="PO value" value={`${company?.currency || 'USD'} ${purchaseOrders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0).toLocaleString()}`} /><Stat label="Awaiting orders" value={purchaseOrders.filter(row => !['completed', 'cancelled'].includes(row.status)).length} /></div>}
    {section === 'logistics' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Deliveries" value={deliveries.length} /><Stat label="In transit" value={deliveries.filter(row => ['shipped', 'in_transit'].includes(row.status)).length} /><Stat label="Delayed" value={deliveries.filter(row => row.status === 'delayed').length} color="text-rose-700" /><Stat label="Delivered" value={deliveries.filter(row => row.status === 'delivered').length} /></div>}
    {section === 'workforce' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Staff schedules" value={records.filter(row => row.record_type === 'schedule').length} /><Stat label="Attendance records" value={attendance.length} /><Stat label="Present today" value={attendance.filter(row => row.attendance_date === new Date().toISOString().slice(0, 10) && row.status === 'present').length} /><Stat label="Absent today" value={attendance.filter(row => row.attendance_date === new Date().toISOString().slice(0, 10) && row.status === 'absent').length} /></div>}
    {section === 'production' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Production records" value={recordsForSection.length} /><Stat label="Output" value={recordsForSection.reduce((sum, row) => sum + Number(row.quantity || 0), 0)} /><Stat label="Waste" value={recordsForSection.reduce((sum, row) => sum + Number(row.waste_quantity || 0), 0)} color="text-amber-700" /><Stat label="Recorded costs" value={`${company?.currency || 'USD'} ${recordsForSection.reduce((sum, row) => sum + Number(row.amount || 0), 0).toLocaleString()}`} /></div>}
    {section === 'resources' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Allocation plans" value={recordsForSection.length} /><Stat label="Assets tracked" value={assets.length} /><Stat label="Active budgets" value={budgets.filter(row => row.status === 'active').length} /><Stat label="Budget remaining" value={`${company?.currency || 'USD'} ${(activeBudget - spentBudget).toLocaleString()}`} /></div>}
    {section === 'incidents' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Incidents" value={recordsForSection.length} /><Stat label="Open" value={openIncidents.length} color="text-rose-700" /><Stat label="Urgent" value={recordsForSection.filter(row => row.priority === 'urgent').length} color="text-rose-700" /><Stat label="Resolved" value={recordsForSection.filter(row => ['resolved', 'closed'].includes(row.status)).length} /></div>}
    {section === 'requests' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Requests" value={requests.length} /><Stat label="Open" value={openRequests.length} /><Stat label="Awaiting authorization" value={requests.filter(row => row.workflow_stage === 'authorization').length} color="text-amber-700" /><Stat label="Closed" value={requests.filter(row => row.workflow_stage === 'closure').length} /></div>}
    {section === 'kpis' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="KPI records" value={recordsForSection.length} /><Stat label="On target" value={recordsForSection.filter(row => row.target_value != null && row.metric_value >= row.target_value).length} color="text-emerald-700" /><Stat label="Below target" value={recordsForSection.filter(row => row.target_value != null && row.metric_value < row.target_value).length} color="text-amber-700" /><Stat label="Reporting period" value={new Date().getFullYear()} /></div>}
    {section === 'maintenance' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Work orders" value={workOrders.length} /><Stat label="Active" value={activeWorkOrders.length} /><Stat label="Company assets" value={assets.length} /><Stat label="Scheduled" value={workOrders.filter(row => row.status === 'scheduled').length} /></div>}
    {section === 'reports' && selectedReport !== null && can('operations.reports.export') && <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => csvDownload(`${REPORTS[selectedReport].title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, reportData())}><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button variant="outline" size="sm" onClick={() => exportExcel(REPORTS[selectedReport].title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), [{ name: REPORTS[selectedReport].title, rows: reportData() }])}><Download className="mr-2 h-4 w-4" />Export Excel</Button></div>}
    {section === 'inspections' ? <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Inspections" value={inspections.length} /><Stat label="Open / failed" value={openInspections.length} color="text-amber-700" /><Stat label="Checklist items" value={checklistItems.length} /><Stat label="Completed" value={inspections.filter(row => row.status === 'completed').length} /></div> : null}
    {renderedTable()}
    {section === 'requests' && requests.find(row => row.id === editing?.id) && <p className="text-xs text-gray-500">Request workflow: Operations Review → Supporting Documents → Authorization → Execution → Documentation → Follow-up / Verification → Closure.</p>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? 'Update' : 'Create'} {sectionLabel(section, value('record_type'))}</DialogTitle></DialogHeader><form onSubmit={save} className="space-y-4">{formElement()}{section === 'requests' && <Field label="Requested-for department"><Select value={value('requested_for_department_id') || 'none'} onValueChange={item => setValue('requested_for_department_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger><SelectContent><SelectItem value="none">Operations</SelectItem>{departments.map(department => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}</SelectContent></Select></Field>}{['workforce', 'resources', 'production'].includes(section) && <Field label="Assigned staff"><Select value={value('assigned_to') || 'none'} onValueChange={item => setValue('assigned_to', item === 'none' ? '' : item)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Unassigned</SelectItem>{employees.filter(employee => employee.user_id).map(employee => <SelectItem key={employee.user_id} value={employee.user_id}>{employee.first_name} {employee.last_name}</SelectItem>)}</SelectContent></Select></Field>}{section === 'resources' && <Field label="Operations department budget"><Select value={value('budget_id') || 'none'} onValueChange={item => setValue('budget_id', item === 'none' ? '' : item)}><SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger><SelectContent><SelectItem value="none">No linked budget</SelectItem>{operationsBudgets.map(budget => <SelectItem key={budget.id} value={budget.id}>{budget.name} · {budget.fiscal_year}</SelectItem>)}</SelectContent></Select></Field>}<div className="flex justify-end gap-2 border-t pt-4 dark:border-gray-800"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Record'}</Button></div></form></DialogContent></Dialog>
  </div>;
}

function recordTypeForArea(section: string) {
  const map: Record<string, string> = {
    vendors: 'vendor_evaluation', workforce: 'schedule', incidents: 'incident', production: 'production',
    resources: 'resource_allocation', compliance: 'compliance', kpis: 'kpi',
  };
  return map[section] || 'incident';
}

function sectionLabel(section: string, recordType?: string) {
  const area = AREAS.find(item => item.key === section);
  if (section === 'vendors' && recordType) return ({ vendor_evaluation: 'Vendor Evaluation', vendor_communication: 'Vendor Communication', vendor_contract: 'Vendor Contract' } as Record<string, string>)[recordType] || 'Vendor Record';
  return section === 'tasks' ? 'Task' : section === 'maintenance' ? 'Work Order' : section === 'logistics' ? 'Delivery' : section === 'inspections' ? 'Inspection' : section === 'requests' ? 'Operations Request' : section === 'vendors' ? 'Vendor Evaluation' : area?.title.slice(0, -1) || 'Operations Record';
}
