'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Plus, DollarSign, Target, Award, MoreHorizontal, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const STAGES = [
  { id: 'prospecting', label: 'Prospecting', color: 'bg-blue-50 dark:bg-blue-950/30', dot: 'bg-blue-500', count: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  { id: 'qualified', label: 'Qualified', color: 'bg-violet-50 dark:bg-violet-950/30', dot: 'bg-violet-500', count: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
  { id: 'proposal', label: 'Proposal', color: 'bg-amber-50 dark:bg-amber-950/30', dot: 'bg-amber-500', count: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-50 dark:bg-orange-950/30', dot: 'bg-orange-500', count: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
  { id: 'won', label: 'Won', color: 'bg-emerald-50 dark:bg-emerald-950/30', dot: 'bg-emerald-500', count: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
];

const oppSchema = z.object({
  title: z.string().min(1, 'Required'),
  estimated_value: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100).default(50),
  stage: z.string().default('prospecting'),
  expected_close_date: z.string().optional(),
});
type OppForm = z.infer<typeof oppSchema>;

export default function PipelinePage() {
  const { company } = useAuth();
  const [opps, setOpps] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<OppForm>({
    resolver: zodResolver(oppSchema),
    defaultValues: { probability: 50, stage: 'prospecting' },
  });

  const loadData = async () => {
    if (!company?.id) return;
    const [oppRes, custRes] = await Promise.all([
      supabase.from('opportunities').select('*, customers(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
    ]);
    setOpps(oppRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [company?.id]);

  const onSubmit = async (data: OppForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('opportunities').insert({ ...data, company_id: company.id, status: 'open' });
    if (error) { toast.error('Failed to create opportunity'); return; }
    toast.success('Opportunity created');
    reset(); setDialogOpen(false); loadData();
  };

  const moveToStage = async (id: string, stage: string) => {
    const prob = stage === 'won' ? 100 : stage === 'negotiation' ? 80 : stage === 'proposal' ? 60 : stage === 'qualified' ? 40 : 20;
    await supabase.from('opportunities').update({ stage, probability: prob }).eq('id', id);
    setOpps(prev => prev.map(o => o.id === id ? { ...o, stage, probability: prob } : o));
    toast.success(`Moved to ${STAGES.find(s => s.id === stage)?.label}`);
  };

  const deleteOpp = async (id: string) => {
    await supabase.from('opportunities').delete().eq('id', id);
    setOpps(prev => prev.filter(o => o.id !== id));
    toast.success('Opportunity removed');
  };

  const onDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.setData('id', id); setDraggedId(id); };
  const onDragOver = (e: React.DragEvent, stage: string) => { e.preventDefault(); setDragOverStage(stage); };
  const onDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('id');
    if (id) await moveToStage(id, stage);
    setDraggedId(null); setDragOverStage(null);
  };
  const onDragEnd = () => { setDraggedId(null); setDragOverStage(null); };

  const totalValue = opps.filter(o => o.status === 'open').reduce((a, o) => a + (o.estimated_value ?? 0), 0);
  const wonValue = opps.filter(o => o.stage === 'won').reduce((a, o) => a + (o.estimated_value ?? 0), 0);
  const weighted = opps.filter(o => o.status === 'open').reduce((a, o) => a + (o.estimated_value ?? 0) * (o.probability ?? 0) / 100, 0);
  const winRate = opps.length > 0 ? Math.round((opps.filter(o => o.stage === 'won').length / opps.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Sales Pipeline" description="Track deals through your sales stages" breadcrumbs={[{ label: 'CRM' }, { label: 'Pipeline' }]}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Opportunity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Opportunity</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div><Label>Title *</Label><Input className="mt-1" {...register('title')} />{errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Value ($)</Label><Input className="mt-1" type="number" {...register('estimated_value')} /></div>
                <div><Label>Probability (%)</Label><Input className="mt-1" type="number" min={0} max={100} {...register('probability')} /></div>
                <div><Label>Stage</Label>
                  <Controller name="stage" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Close Date</Label><Input className="mt-1" type="date" {...register('expected_close_date')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Pipeline Value" value={formatCurrency(totalValue)} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Weighted Value" value={formatCurrency(weighted)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Won Revenue" value={formatCurrency(wonValue)} icon={<Award className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Win Rate" value={`${winRate}%`} icon={<Target className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      {/* Pipeline board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageOpps = opps.filter(o => o.stage === stage.id);
          const stageValue = stageOpps.reduce((a, o) => a + (o.estimated_value ?? 0), 0);
          return (
            <div key={stage.id} className={cn('flex-1 min-w-[220px] max-w-[280px] rounded-xl transition-all', dragOverStage === stage.id && 'ring-2 ring-blue-400')}
              onDragOver={e => onDragOver(e, stage.id)} onDragLeave={() => setDragOverStage(null)} onDrop={e => onDrop(e, stage.id)}>
              <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-xl', stage.color)}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', stage.dot)} />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{stage.label}</span>
                </div>
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', stage.count)}>{stageOpps.length}</span>
              </div>
              <div className={cn('min-h-[150px] p-2 space-y-2 rounded-b-xl', stage.color)}>
                {stageValue > 0 && (
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {formatCurrency(stageValue)}
                  </div>
                )}
                {stageOpps.map(opp => (
                  <div key={opp.id} draggable onDragStart={e => onDragStart(e, opp.id)} onDragEnd={onDragEnd}
                    className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-grab hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group', draggedId === opp.id && 'opacity-40')}>
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug flex-1 pr-2">{opp.title}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {STAGES.filter(s => s.id !== opp.stage).map(s => (
                            <DropdownMenuItem key={s.id} onClick={() => moveToStage(opp.id, s.id)}>Move to {s.label}</DropdownMenuItem>
                          ))}
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteOpp(opp.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {opp.customers?.name && <p className="text-xs text-gray-400 mt-1">{opp.customers.name}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(opp.estimated_value ?? 0)}</span>
                      <span className="text-xs text-gray-400">{opp.probability}% likely</span>
                    </div>
                    {opp.expected_close_date && (
                      <p className="text-xs text-gray-400 mt-1">Close: {formatDate(opp.expected_close_date, { month: 'short', day: 'numeric' })}</p>
                    )}
                  </div>
                ))}
                <button onClick={() => { reset({ stage: stage.id, probability: 50 }); setDialogOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
                  <Plus className="h-3.5 w-3.5" />Add deal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
