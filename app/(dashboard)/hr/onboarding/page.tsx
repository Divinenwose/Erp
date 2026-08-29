'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import EmptyState from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ClipboardCheck, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_TASKS = [
  'Employment documents submitted', 'Contract signed', 'Employee handbook acknowledged',
  'ID/document verification', 'Department introduction', 'Orientation',
  'Workstation assigned', 'Equipment assigned', 'Email/account created', 'Policies acknowledged',
];

export default function OnboardingPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canView = isAdmin || hasPermission('hr.onboarding.view');
  const canManage = isAdmin || hasPermission('hr.onboarding.manage');

  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  useEffect(() => {
    if (!company?.id || !canView) { setLoading(false); return; }
    loadAll();
  }, [company?.id, canView]);

  const loadAll = async () => {
    if (!company?.id) return;
    setLoading(true);
    const [taskRes, empRes] = await Promise.all([
      supabase.from('onboarding_tasks').select('*, employees:employee_id(first_name, last_name)').eq('company_id', company.id).order('employee_id').order('sort_order'),
      supabase.from('employees').select('id, first_name, last_name, hire_date').eq('company_id', company.id).order('hire_date', { ascending: false }),
    ]);
    setTasks(taskRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setLoading(false);
  };

  const startChecklist = async () => {
    if (!company?.id || !selectedEmployee) { toast.error('Select an employee'); return; }
    const rows = DEFAULT_TASKS.map((name, i) => ({
      company_id: company.id, employee_id: selectedEmployee, task_name: name, sort_order: i, status: 'pending',
    }));
    const { error } = await supabase.from('onboarding_tasks').insert(rows);
    if (error) { toast.error('Failed to start checklist'); return; }
    toast.success('Onboarding checklist started');
    setSelectedEmployee(''); setDialogOpen(false);
    loadAll();
  };

  const toggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase.from('onboarding_tasks').update({
      status: newStatus, completion_date: newStatus === 'completed' ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', task.id);
    if (error) { toast.error('Failed to update task'); return; }
    loadAll();
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Onboarding" breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Onboarding' }]} />
        <EmptyState title="No access" description="You don't have permission to view onboarding." />
      </div>
    );
  }

  const byEmployee = tasks.reduce((acc: Record<string, any[]>, t) => {
    (acc[t.employee_id] ??= []).push(t);
    return acc;
  }, {});

  const employeesWithoutChecklist = employees.filter(e => !byEmployee[e.id]);
  const inProgressCount = Object.values(byEmployee).filter(list => list.some(t => t.status === 'pending')).length;
  const completedCount = Object.values(byEmployee).filter(list => list.every(t => t.status === 'completed')).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Onboarding" description="New employee onboarding checklists" breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Onboarding' }]}>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Start Checklist</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Start Onboarding Checklist</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employeesWithoutChecklist.length === 0
                        ? <div className="px-3 py-2 text-sm text-gray-400">All employees already have a checklist</div>
                        : employeesWithoutChecklist.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500">Creates a standard {DEFAULT_TASKS.length}-item checklist you can customize afterward.</p>
                <Button className="w-full" onClick={startChecklist} disabled={!selectedEmployee}>Start Checklist</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Checklists In Progress" value={loading ? 0 : inProgressCount} icon={<ClipboardCheck className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={loading ? 0 : completedCount} icon={<ClipboardCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Not Yet Started" value={loading ? 0 : employeesWithoutChecklist.length} icon={<UserPlus className="h-4 w-4 text-gray-500" />} iconBg="bg-gray-50 dark:bg-gray-800/50" loading={loading} />
      </div>

      {Object.keys(byEmployee).length === 0 ? (
        <Card><CardContent className="p-0"><EmptyState icon={<ClipboardCheck className="h-10 w-10" />} title="No checklists started" description="Start a checklist for a newly hired employee to track their onboarding." /></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(byEmployee).map(([employeeId, list]) => {
            const done = list.filter(t => t.status === 'completed').length;
            const emp = list[0]?.employees;
            return (
              <Card key={employeeId}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <Link href={`/hr/employees/${employeeId}`} className="hover:underline">{emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'}</Link>
                    <span className="text-xs font-normal text-gray-500">{done}/{list.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {list.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Checkbox checked={t.status === 'completed'} disabled={!canManage} onCheckedChange={() => toggleTask(t)} />
                      <span className={`text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{t.task_name}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
