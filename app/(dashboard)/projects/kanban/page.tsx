'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, User, AlertTriangle, CheckSquare, Clock, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100 dark:bg-gray-800', dotColor: 'bg-gray-400', countColor: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50 dark:bg-blue-950/30', dotColor: 'bg-blue-500', countColor: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  { id: 'in_review', label: 'In Review', color: 'bg-amber-50 dark:bg-amber-950/30', dotColor: 'bg-amber-500', countColor: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  { id: 'done', label: 'Done', color: 'bg-emerald-50 dark:bg-emerald-950/30', dotColor: 'bg-emerald-500', countColor: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
  critical: 'text-red-600 bg-red-50 dark:bg-red-950/30',
};

const taskSchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  priority: z.string().default('medium'),
  project_id: z.string().optional(),
  due_date: z.string().optional(),
  status: z.string().default('todo'),
});
type TaskForm = z.infer<typeof taskSchema>;

export default function KanbanPage() {
  const { company } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<any | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'medium', status: 'todo' },
  });

  const loadData = async () => {
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

  useEffect(() => { loadData(); }, [company?.id]);

  const onSubmit = async (data: TaskForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('tasks').insert({ ...data, company_id: company.id, completion_percent: 0 });
    if (error) { toast.error('Failed to create task'); return; }
    toast.success('Task created');
    reset();
    setDialogOpen(false);
    loadData();
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    const pct = newStatus === 'done' ? 100 : newStatus === 'in_progress' ? 50 : newStatus === 'in_review' ? 75 : 0;
    await supabase.from('tasks').update({ status: newStatus, completion_percent: pct }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completion_percent: pct } : t));
    setDetailTask((prev: any) => prev?.id === taskId ? { ...prev, status: newStatus } : prev);
    toast.success(`Moved to ${COLUMNS.find(c => c.id === newStatus)?.label}`);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDetailTask(null);
    toast.success('Task deleted');
  };

  // Drag handlers
  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };
  const onDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) await moveTask(taskId, colId);
    setDraggedTaskId(null);
    setDragOverCol(null);
  };
  const onDragEnd = () => { setDraggedTaskId(null); setDragOverCol(null); };

  const filteredTasks = selectedProject === 'all'
    ? tasks
    : tasks.filter(t => t.project_id === selectedProject);

  const getColumnTasks = (colId: string) => filteredTasks.filter(t => t.status === colId);

  const isOverdue = (dueDate: string) => dueDate && new Date(dueDate) < new Date();

  return (
    <div className="space-y-4">
      <PageHeader title="Kanban Board" description="Drag and drop tasks between columns" breadcrumbs={[{ label: 'Projects' }, { label: 'Kanban' }]}>
        <select
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value)}
        >
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input className="mt-1" placeholder="Task title..." {...register('title')} />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <Label>Description</Label>
                <textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-20" {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Project</Label>
                  <Controller name="project_id" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
                      <SelectContent>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Controller name="priority" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Initial Status</Label>
                  <Controller name="status" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input className="mt-1" type="date" {...register('due_date')} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Task</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        {COLUMNS.map(col => {
          const count = getColumnTasks(col.id).length;
          return (
            <div key={col.id} className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span className="text-gray-500 dark:text-gray-400">{col.label}:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
            </div>
          );
        })}
        <div className="ml-auto text-xs text-gray-400">
          {draggedTaskId ? 'Drop to move' : 'Drag cards to reorder'}
        </div>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = getColumnTasks(col.id);
          return (
            <div
              key={col.id}
              className={cn(
                'flex-1 min-w-[260px] max-w-[320px] rounded-xl transition-all duration-200',
                dragOverCol === col.id ? 'ring-2 ring-blue-400 ring-offset-1' : ''
              )}
              onDragOver={e => onDragOver(e, col.id)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => onDrop(e, col.id)}
            >
              {/* Column header */}
              <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-xl', col.color)}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{col.label}</span>
                </div>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', col.countColor)}>{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div className={cn('min-h-[200px] p-2 space-y-2 rounded-b-xl', col.color)}>
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-20 bg-white dark:bg-gray-800 rounded-lg animate-pulse border border-gray-200 dark:border-gray-700" />
                  ))
                ) : colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckSquare className="h-6 w-6 text-gray-300 dark:text-gray-600 mb-1.5" />
                    <p className="text-xs text-gray-400">Drop tasks here</p>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={e => onDragStart(e, task.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => setDetailTask(task)}
                      className={cn(
                        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group',
                        draggedTaskId === task.id && 'opacity-40 scale-95'
                      )}
                    >
                      {/* Priority + grip */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium)}>
                          {task.priority}
                        </span>
                        <GripVertical className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400" />
                      </div>

                      {/* Title */}
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug mb-2">{task.title}</p>

                      {/* Project */}
                      {task.projects?.name && (
                        <p className="text-xs text-gray-400 mb-2 truncate">{task.projects.name}</p>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        {task.employees ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                              <span className="text-blue-700 dark:text-blue-300 text-xs font-bold">
                                {task.employees.first_name?.charAt(0)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 truncate max-w-[80px]">{task.employees.first_name}</span>
                          </div>
                        ) : <div />}
                        {task.due_date && (
                          <div className={cn('flex items-center gap-1 text-xs', isOverdue(task.due_date) && task.status !== 'done' ? 'text-red-500' : 'text-gray-400')}>
                            {isOverdue(task.due_date) && task.status !== 'done' && <AlertTriangle className="h-3 w-3" />}
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(task.due_date, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Quick add */}
                <button
                  onClick={() => { reset({ status: col.id, priority: 'medium' }); setDialogOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task detail panel */}
      {detailTask && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={() => setDetailTask(null)}>
          <div className="w-full max-w-md h-full bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight pr-4">{detailTask.title}</h3>
                <button onClick={() => setDetailTask(null)} className="text-gray-400 hover:text-gray-600 shrink-0 text-xl leading-none">&times;</button>
              </div>

              {detailTask.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{detailTask.description}</p>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 w-20">Status</span>
                  <span className={`font-medium px-2 py-0.5 rounded text-xs ${COLUMNS.find(c => c.id === detailTask.status)?.countColor}`}>
                    {COLUMNS.find(c => c.id === detailTask.status)?.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 w-20">Priority</span>
                  <span className={cn('font-medium px-2 py-0.5 rounded text-xs', PRIORITY_COLORS[detailTask.priority])}>{detailTask.priority}</span>
                </div>
                {detailTask.projects?.name && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400 w-20">Project</span>
                    <span className="text-gray-700 dark:text-gray-300">{detailTask.projects.name}</span>
                  </div>
                )}
                {detailTask.employees && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400 w-20">Assigned</span>
                    <span className="text-gray-700 dark:text-gray-300">{detailTask.employees.first_name} {detailTask.employees.last_name}</span>
                  </div>
                )}
                {detailTask.due_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-400 w-20">Due Date</span>
                    <span className={cn('text-gray-700 dark:text-gray-300', isOverdue(detailTask.due_date) && detailTask.status !== 'done' && 'text-red-500 font-medium')}>
                      {formatDate(detailTask.due_date)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Move to</p>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMNS.filter(c => c.id !== detailTask.status).map(col => (
                    <button
                      key={col.id}
                      onClick={() => moveTask(detailTask.id, col.id)}
                      className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all hover:shadow-sm', col.color, 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600')}
                    >
                      <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-gray-700 dark:text-gray-300">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => deleteTask(detailTask.id)}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-red-600 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
