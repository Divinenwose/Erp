'use client';

import { useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, Pencil, Trash2, Users } from 'lucide-react';

const INITIAL_DEPARTMENTS = [
  { id: 1, name: 'Engineering', head: 'Mark Johnson', employees: 24, costCenter: 'CC-1001', status: 'active' },
  { id: 2, name: 'Sales', head: 'David Kim', employees: 18, costCenter: 'CC-1002', status: 'active' },
  { id: 3, name: 'Finance', head: 'Lisa Park', employees: 8, costCenter: 'CC-1003', status: 'active' },
  { id: 4, name: 'Human Resources', head: 'Jane Doe', employees: 6, costCenter: 'CC-1004', status: 'active' },
  { id: 5, name: 'Marketing', head: 'Eva Williams', employees: 12, costCenter: 'CC-1005', status: 'active' },
  { id: 6, name: 'Operations', head: 'Tom Reed', employees: 15, costCenter: 'CC-1006', status: 'active' },
  { id: 7, name: 'Customer Success', head: 'Sarah Lin', employees: 10, costCenter: 'CC-1007', status: 'active' },
  { id: 8, name: 'Legal', head: '—', employees: 2, costCenter: 'CC-1008', status: 'inactive' },
];

export default function DepartmentsPage() {
  const [departments] = useState(INITIAL_DEPARTMENTS);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHead, setNewHead] = useState('');
  const [newCost, setNewCost] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Manage organizational departments and cost centers"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Departments' }]}
      >
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowForm(v => !v)}
        >
          <Plus className="h-4 w-4 mr-2" />{showForm ? 'Cancel' : 'Add Department'}
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">New Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Department Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Product Design"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Department Head</label>
                <input
                  type="text"
                  value={newHead}
                  onChange={e => setNewHead(e.target.value)}
                  placeholder="e.g. Alice Johnson"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Center</label>
                <input
                  type="text"
                  value={newCost}
                  onChange={e => setNewCost(e.target.value)}
                  placeholder="e.g. CC-1009"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowForm(false)}>
                Save Department
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Department List
            </CardTitle>
            <span className="text-xs text-gray-400">{departments.length} departments</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {departments.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-12 w-12" />}
              title="No departments yet"
              description="Create your first department to organize employees and track costs."
              action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Department</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Department</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Head</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Employees</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Cost Center</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{dept.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{dept.head}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300">
                          <Users className="h-3.5 w-3.5 text-gray-400" />{dept.employees}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{dept.costCenter}</td>
                      <td className="px-4 py-3"><StatusBadge status={dept.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
