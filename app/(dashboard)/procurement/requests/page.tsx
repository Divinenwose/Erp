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
import { ShoppingCart, Plus, Search, Clock, CheckCircle2, TrendingUp, FileText, MoreHorizontal, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const prSchema = z.object({
  title: z.string().min(1, 'Required'),
  priority: z.string().default('medium'),
  estimated_cost: z.coerce.number().min(0).default(0),
  required_date: z.string().optional(),
  justification: z.string().optional(),
});
type PRForm = z.infer<typeof prSchema>;

export default function PurchaseRequestsPage() {
  const { company } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PRForm>({ resolver: zodResolver(prSchema), defaultValues: { priority: 'medium' } });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('purchase_requests').select('*, departments(name), employees(first_name, last_name)').eq('company_id', company.id).order('created_at', { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: PRForm) => {
    if (!company?.id) return;
    const num = `PR-${new Date().getFullYear()}-${String(requests.length + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('purchase_requests').insert({ ...data, company_id: company.id, request_number: num, status: 'draft' });
    if (error) { toast.error('Failed to create request'); return; }
    toast.success('Purchase request created');
    reset(); setDialogOpen(false); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('purchase_requests').update({ status }).eq('id', id);
    toast.success(`Request ${status}`);
    load();
  };

  const filtered = requests.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.request_number?.toLowerCase().includes(search.toLowerCase()));
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const totalValue = requests.reduce((a, r) => a + (r.estimated_cost ?? 0), 0);

  const priorityColors: Record<string, string> = {
    low: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    urgent: 'text-red-600 bg-red-50 dark:bg-red-950/30',
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Requests" description="Create and manage internal purchase requests" breadcrumbs={[{ label: 'Procurement' }, { label: 'Purchase Requests' }]}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Purchase Request</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div><Label>Title *</Label><Input className="mt-1" placeholder="e.g. Office chairs x10" {...register('title')} />{errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}</div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Priority</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('priority')}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div><Label>Estimated Cost</Label><Input className="mt-1" type="number" step="0.01" {...register('estimated_cost')} /></div>
                <div><Label>Required Date</Label><Input className="mt-1" type="date" {...register('required_date')} /></div>
              </div>
              <div><Label>Justification</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-20" {...register('justification')} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Submit Request</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Requests" value={requests.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Pending Approval" value={pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Approved" value={approved} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Value" value={formatCurrency(totalValue)} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search requests..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="h-12 w-12" />} title="No purchase requests" description="Create your first purchase request" action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Request</Button>} />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filtered.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{r.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[r.priority ?? 'medium']}`}>{r.priority}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.request_number} · {r.departments?.name ?? 'General'} · {r.required_date ? formatDate(r.required_date) : 'No deadline'}</p>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white hidden md:block">{formatCurrency(r.estimated_cost ?? 0)}</div>
                  <StatusBadge status={r.status} />
                  {r.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'pending')}>Submit</Button>
                  )}
                  {r.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 text-xs" onClick={() => updateStatus(r.id, 'approved')}>Approve</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 text-xs" onClick={() => updateStatus(r.id, 'rejected')}>Reject</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
