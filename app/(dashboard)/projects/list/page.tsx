'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FolderKanban, Plus, Search, Calendar, Clock, TrendingUp, Users, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const projectSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.coerce.number().min(0).default(0),
  priority: z.string().default('medium'),
  status: z.string().default('planning'),
});
type ProjectForm = z.infer<typeof projectSchema>;

const statusColors: Record<string, string> = {
  planning: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900',
  in_progress: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900',
  completed: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900',
  on_hold: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
};

export default function ProjectsPage() {
  const { company } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProjectForm>({ resolver: zodResolver(projectSchema), defaultValues: { priority: 'medium', status: 'planning' } });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('projects').select('*, customers(name)').eq('company_id', company.id).order('created_at', { ascending: false });
    setProjects(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: ProjectForm) => {
    if (!company?.id) return;
    const num = `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(3, '0')}`;
    const { error } = await supabase.from('projects').insert({ ...data, company_id: company.id, project_number: num, completion_percent: 0 });
    if (error) { toast.error('Failed to create project'); return; }
    toast.success('Project created');
    reset(); setDialogOpen(false); load();
  };

  const filtered = projects.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const active = projects.filter(p => p.status === 'in_progress').length;
  const completed = projects.filter(p => p.status === 'completed').length;
  const totalBudget = projects.reduce((a, p) => a + (p.budget ?? 0), 0);

  const priorityBadge = (p: string) => {
    const map: Record<string, string> = { low: 'text-blue-600 bg-blue-50', medium: 'text-amber-600 bg-amber-50', high: 'text-orange-600 bg-orange-50', critical: 'text-red-600 bg-red-50' };
    return map[p] ?? 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Manage all company projects" breadcrumbs={[{ label: 'Projects' }, { label: 'All Projects' }]}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div><Label>Project Name *</Label><Input className="mt-1" {...register('name')} /></div>
              <div><Label>Description</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-20" {...register('description')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input className="mt-1" type="date" {...register('start_date')} /></div>
                <div><Label>End Date</Label><Input className="mt-1" type="date" {...register('end_date')} /></div>
                <div><Label>Budget</Label><Input className="mt-1" type="number" {...register('budget')} /></div>
                <div><Label>Priority</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('priority')}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div><Label>Status</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('status')}>
                    <option value="planning">Planning</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Project</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Projects" value={projects.length} icon={<FolderKanban className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Progress" value={active} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={completed} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Budget" value={formatCurrency(totalBudget)} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button onClick={() => setView('grid')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Grid</button>
          <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>List</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FolderKanban className="h-12 w-12" />} title="No projects yet" description="Create your first project to start tracking work" action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Project</Button>} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white dark:bg-gray-900 rounded-xl border p-5 hover:shadow-md transition-all ${statusColors[p.status] ?? 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.project_number}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityBadge(p.priority)}`}>{p.priority}</span>
              </div>
              {p.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{p.description}</p>}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span className="font-medium text-gray-900 dark:text-white">{p.completion_percent ?? 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${p.completion_percent ?? 0}%` }} /></div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge status={p.status} />
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  {p.end_date && <><Calendar className="h-3.5 w-3.5" /><span>{formatDate(p.end_date)}</span></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="divide-y dark:divide-gray-800">
              {filtered.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.project_number} · {p.customers?.name ?? 'Internal'}</p>
                  </div>
                  <div className="w-24 hidden md:block"><div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${p.completion_percent ?? 0}%` }} /></div></div>
                  <div className="text-xs text-gray-400 hidden lg:block">{p.end_date ? formatDate(p.end_date) : '—'}</div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:block">{formatCurrency(p.budget ?? 0)}</div>
                  <StatusBadge status={p.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
