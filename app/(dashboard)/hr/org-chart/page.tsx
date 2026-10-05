'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { exportExcel } from '@/lib/excel-export';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, GitBranch, RefreshCw, Save, Users } from 'lucide-react';

type EmployeeRecord = {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  employment_status: string;
  departments?: { name: string } | null;
};

type OrgNode = {
  employee: EmployeeRecord;
  children: OrgNode[];
};

function buildOrgTree(employees: EmployeeRecord[]) {
  const byId = new Map(employees.map(employee => [employee.id, employee]));
  const reports = new Map<string, EmployeeRecord[]>();
  const roots: EmployeeRecord[] = [];

  employees.forEach(employee => {
    if (!employee.manager_id || !byId.has(employee.manager_id) || employee.manager_id === employee.id) {
      roots.push(employee);
      return;
    }
    const children = reports.get(employee.manager_id) ?? [];
    children.push(employee);
    reports.set(employee.manager_id, children);
  });

  const createNode = (employee: EmployeeRecord, ancestors: Set<string>): OrgNode => {
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(employee.id);
    return {
      employee,
      children: (reports.get(employee.id) ?? [])
        .filter(child => !nextAncestors.has(child.id))
        .map(child => createNode(child, nextAncestors)),
    };
  };

  const tree = roots.map(root => createNode(root, new Set()));
  const visited = new Set<string>();
  const markVisited = (node: OrgNode) => {
    if (visited.has(node.employee.id)) return;
    visited.add(node.employee.id);
    node.children.forEach(markVisited);
  };
  tree.forEach(markVisited);
  employees.forEach(employee => {
    if (!visited.has(employee.id)) {
      const node = createNode(employee, new Set());
      tree.push(node);
      markVisited(node);
    }
  });
  return tree;
}

function OrgNodeCard({
  node,
  depth,
  employees,
  canEdit,
  editingId,
  selectedManager,
  onEdit,
  onSelectManager,
  onSave,
  saving,
}: {
  node: OrgNode;
  depth: number;
  employees: EmployeeRecord[];
  canEdit: boolean;
  editingId: string | null;
  selectedManager: string;
  onEdit: (employee: EmployeeRecord) => void;
  onSelectManager: (managerId: string) => void;
  onSave: (employee: EmployeeRecord) => void;
  saving: boolean;
}) {
  const { employee } = node;
  const isEditing = editingId === employee.id;

  return (
    <div className="flex flex-col items-center">
      <div className={`min-w-[210px] rounded-xl border p-4 text-center shadow-sm ${
        depth === 0
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white'
      }`}>
        <p className="font-semibold text-sm">{employee.first_name} {employee.last_name}</p>
        <p className="text-xs opacity-75 mt-1">{employee.job_title || 'No job title'}</p>
        <p className="text-xs opacity-70 mt-0.5">{employee.departments?.name || 'Unassigned department'}</p>
        {canEdit && (
          <div className="mt-3">
            {isEditing ? (
              <div className="flex gap-2">
                <select
                  aria-label={`Manager for ${employee.first_name} ${employee.last_name}`}
                  className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                  value={selectedManager}
                  onChange={event => onSelectManager(event.target.value)}
                >
                  <option value="">No manager</option>
                  {employees.filter(option => option.id !== employee.id).map(option => (
                    <option key={option.id} value={option.id}>
                      {option.first_name} {option.last_name} {option.job_title ? `· ${option.job_title}` : ''}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" onClick={() => onSave(employee)} disabled={saving}>
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button size="sm" variant={depth === 0 ? 'secondary' : 'outline'} onClick={() => onEdit(employee)}>
                Edit reporting line
              </Button>
            )}
          </div>
        )}
      </div>
      {node.children.length > 0 && (
        <>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
          <div className="flex items-start gap-6">
            {node.children.map(child => (
              <div key={child.employee.id} className="flex flex-col items-center">
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
                <OrgNodeCard
                  node={child}
                  depth={depth + 1}
                  employees={employees}
                  canEdit={canEdit}
                  editingId={editingId}
                  selectedManager={selectedManager}
                  onEdit={onEdit}
                  onSelectManager={onSelectManager}
                  onSave={onSave}
                  saving={saving}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canEdit = isSuperAdmin() || isCompanyAdmin() || hasPermission('hr.employees.edit');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState('');

  const loadEmployees = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, job_title, department_id, manager_id, employment_status, departments(name)')
      .eq('company_id', company.id)
      .eq('employment_status', 'active')
      .order('first_name');
    if (error) {
      toast.error('Could not load the organization chart');
      setLoading(false);
      return;
    }
    setEmployees((data ?? []).map((employee: any) => ({
      ...employee,
      departments: Array.isArray(employee.departments) ? employee.departments[0] ?? null : employee.departments,
    })));
    setLoading(false);
  };

  useEffect(() => { void loadEmployees(); }, [company?.id]);

  const tree = useMemo(() => buildOrgTree(employees), [employees]);

  const saveManager = async (employee: EmployeeRecord) => {
    if (!company?.id) return;
    let managerId = selectedManager || null;
    const byId = new Map(employees.map(item => [item.id, item]));
    const ancestors = new Set<string>();
    while (managerId && !ancestors.has(managerId)) {
      if (managerId === employee.id) {
        toast.error('This reporting line would create a management cycle');
        return;
      }
      ancestors.add(managerId);
      managerId = byId.get(managerId)?.manager_id ?? null;
    }

    setSaving(true);
    const { error } = await supabase
      .from('employees')
      .update({ manager_id: selectedManager || null, updated_at: new Date().toISOString() })
      .eq('id', employee.id)
      .eq('company_id', company.id);
    if (error) {
      toast.error('Could not update the reporting line');
      setSaving(false);
      return;
    }
    toast.success('Reporting line updated');
    setEditingId(null);
    setSaving(false);
    await loadEmployees();
  };

  const exportChart = () => {
    exportExcel('organization-chart', [{
      name: 'Reporting Lines',
      rows: employees.map(employee => ({
        Employee: `${employee.first_name} ${employee.last_name}`,
        'Job Title': employee.job_title ?? '',
        Department: employee.departments?.name ?? '',
        Manager: employees.find(manager => manager.id === employee.manager_id)
          ? `${employees.find(manager => manager.id === employee.manager_id)?.first_name} ${employees.find(manager => manager.id === employee.manager_id)?.last_name}`
          : '',
        Status: employee.employment_status,
      })),
    }]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Chart"
        description="View and maintain employee reporting lines from current workforce records."
        breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Org Chart' }]}
      >
        <Button variant="outline" onClick={() => void loadEmployees()} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
        <Button variant="outline" onClick={exportChart} disabled={loading || !employees.length}>
          <Download className="h-4 w-4 mr-2" />Export Excel
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-600" />Company reporting structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading organization data…</p>
          ) : tree.length ? (
            <div className="overflow-x-auto py-4">
              <div className="flex min-w-max justify-center gap-10">
                {tree.map(node => (
                  <OrgNodeCard
                    key={node.employee.id}
                    node={node}
                    depth={0}
                    employees={employees}
                    canEdit={canEdit}
                    editingId={editingId}
                    selectedManager={selectedManager}
                    onEdit={employee => {
                      setEditingId(employee.id);
                      setSelectedManager(employee.manager_id ?? '');
                    }}
                    onSelectManager={setSelectedManager}
                    onSave={saveManager}
                    saving={saving}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-3 font-medium">No active employee records</p>
              <p className="mt-1 text-sm text-gray-500">Add employees to populate the organization chart.</p>
            </div>
          )}
        </CardContent>
      </Card>
      {canEdit && <p className="text-xs text-gray-500">Changes update employee manager records and appear in the chart after saving.</p>}
    </div>
  );
}
