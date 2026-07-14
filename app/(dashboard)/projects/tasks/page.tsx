'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Plus, Clock, TrendingUp, AlertTriangle, MoreHorizontal, Edit, Trash2, Circle, CheckCircle2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const taskSchema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional(),
  project_id: z.string().optional(),
  assigned_to: z.string().optional(),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
  due_date: z.string().optional(),
  estimated_hours: z.coerce.number().optional(),
});
type TaskForm = z.infer<typeof taskSchema>;

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400',
  critical: 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400',
};

export default function TasksPage() {
  const { company } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { status: 'todo', priority: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [taskRes, projRes, empRes] = await Promise.all([
      supabase.from('tasks').select('*, projects(name), employees(first_name, last_name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name').eq('company_id', company.id),
      supabase.from('employees').select('id, first_name, last_name').eq('company_id', company.id).eq('employment_status', 'active'),
    ]);
    setTasks(taskRes.data ?? []);
    setProjects(projRes.data ?? []);
    setEmployees(empRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (task: any) => {
    setEditTask(task);
    reset({ title: task.title, description: task.description ?? '', project_id: task.project_id ?? undefined, assigned_to: task.assigned_to ?? undefined, status: task.status, priority: task.priority, due_date: task.due_date ?? '', estimated_hours: task.estimated_hours ?? undefined });
    setDialogOpen(true);
  };

  const onSubmit = async (data: TaskForm) => {
    if (!company?.id) return;
    if (editTask) {
      const { error } = await supabase.from('tasks').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editTask.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Task updated');
    } else {
      const { error } = await supabase.from('tasks').insert({ ...data, company_id: company.id, completion_percent: 0 });
      if (error) { toast.error('Failed to create task'); return; }
      toast.success('Task created');
    }
    reset(); setEditTask(null); setDialogOpen(false); load();
  };

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const pct = newStatus === 'done' ? 100 : 0;
    await supabase.from('tasks').update({ status: newStatus, completion_percent: pct }).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completion_percent: pct } : t));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('tasks').delete().eq('id', deleteId);
    setTasks(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
    toast.success('Task deleted');
  };

  const filteredTasks = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);
  const todo = tasks.filter(t => t.status === 'todo').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;

  const isOverdue = (t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';

  const columns: Column<any>[] = [
    {
      key: 'title', header: 'Task', sortable: true,
      cell: (row) => (
        <div className="flex items-start gap-3">
          <button onClick={() => toggleStatus(row)} className="mt-0.5 shrink-0">
            {row.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-gray-300 hover:text-blue-500 transition-colors" />}
          </button>
          <div>
            <p className={cn('font-medium text-gray-900 dark:text-white text-sm', row.status === 'done' && 'line-through text-gray-400')}>{row.title}</p>
            {row.projects?.name && <p className="text-xs text-gray-400">{row.projects.name}</p>}
          </div>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', sortable: true, cell: (row) => <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize', PRIORITY_STYLES[row.priority] ?? PRIORITY_STYLES.medium)}>{row.priority}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'assigned_to', header: 'Assigned To', cell: (row) => row.employees ? <span className="text-sm">{row.employees.first_name} {row.employees.last_name}</span> : <span className="text-gray-400 text-sm">Unassigned</span> },
    { key: 'due_date', header: 'Due Date', sortable: true, cell: (row) => row.due_date ? <span className={cn('text-sm', isOverdue(row) && 'text-red-500 font-medium')}>{formatDate(row.due_date)}</span> : <span className="text-gray-400">—</span> },
    { key: 'estimated_hours', header: 'Est. Hrs', cell: (row) => <span className="text-sm">{row.estimated_hours ? `${row.estimated_hours}h` : '—'}</span> },
    {
      key: 'actions', header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Manage all project tasks" breadcrumbs={[{ label: 'Projects' }, { label: 'Tasks' }]}>
        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditTask(null); reset(); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Task</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editTask ? 'Edit Task' : 'New Task'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div><Label>Title *</Label><Input className="mt-1" {...register('title')} /></div>
              <div><Label>Description</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-20" {...register('description')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Project</Label>
                  <Controller name="project_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Assigned To</Label>
                  <Controller name="assigned_to" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Priority</Label>
                  <Controller name="priority" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Status</Label>
                  <Controller name="status" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="in_review">In Review</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Due Date</Label><Input className="mt-1" type="date" {...register('due_date')} /></div>
                <div><Label>Estimated Hours</Label><Input className="mt-1" type="number" step="0.5" {...register('estimated_hours')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editTask ? 'Update' : 'Create Task'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="To Do" value={todo} icon={<Circle className="h-4 w-4 text-gray-500" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
        <KPICard title="In Progress" value={inProgress} icon={<Clock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Completed" value={done} change={done > 0 ? 5 : 0} changeLabel="this week" icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Overdue" value={overdue} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        data={filteredTasks}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search tasks..."
        searchKeys={['title', 'description']}
        pageSize={20}
        emptyTitle="No tasks yet"
        emptyDescription="Create tasks to track work across your projects"
        emptyAction={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Task</Button>}
        toolbar={
          <select className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
          </select>
        }
      />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Task?" description="This will permanently delete the task." confirmLabel="Delete" />
    </div>
  );
}
