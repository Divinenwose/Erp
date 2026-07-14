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
import { Target, Plus, Search, TrendingUp, Users, DollarSign, Award, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const leadSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  source: z.string().optional(),
  rating: z.string().default('warm'),
});
type LeadForm = z.infer<typeof leadSchema>;

const sourceColors: Record<string, string> = {
  website: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  referral: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  email: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  social: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cold_call: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  event: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

export default function LeadsPage() {
  const { company } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadForm>({ resolver: zodResolver(leadSchema), defaultValues: { rating: 'warm' } });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('leads').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: LeadForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('leads').insert({ ...data, company_id: company.id, status: 'new' });
    if (error) { toast.error('Failed to create lead'); return; }
    toast.success('Lead created');
    reset(); setDialogOpen(false); load();
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search || `${l.first_name} ${l.last_name ?? ''} ${l.company_name ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const newLeads = leads.filter(l => l.status === 'new').length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const qualified = leads.filter(l => l.status === 'qualified').length;

  const ratingColors: Record<string, string> = {
    hot: 'text-red-600',
    warm: 'text-amber-600',
    cold: 'text-blue-600',
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Track and manage sales leads" breadcrumbs={[{ label: 'CRM' }, { label: 'Leads' }]}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Lead</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input className="mt-1" {...register('first_name')} /></div>
                <div><Label>Last Name</Label><Input className="mt-1" {...register('last_name')} /></div>
                <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                <div><Label>Company</Label><Input className="mt-1" {...register('company_name')} /></div>
                <div><Label>Source</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('source')}>
                    <option value="">Select source</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="email">Email Campaign</option>
                    <option value="social">Social Media</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div><Label>Rating</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('rating')}>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Add Lead</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Leads" value={leads.length} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="New" value={newLeads} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Qualified" value={qualified} icon={<Award className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Converted" value={converted} icon={<Users className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search leads..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={<Target className="h-12 w-12" />} title="No leads found" description="Add your first lead to start building your pipeline" action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Lead</Button>} />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filtered.map(l => (
                <div key={l.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{l.first_name} {l.last_name ?? ''}</p>
                      <span className={`text-xs font-semibold ${ratingColors[l.rating] ?? 'text-gray-500'}`}>{l.rating}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{l.company_name ?? '—'} · {l.email ?? l.phone ?? '—'}</p>
                  </div>
                  {l.source && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden md:inline-flex ${sourceColors[l.source] ?? 'bg-gray-100 text-gray-600'}`}>
                      {l.source.replace(/_/g, ' ')}
                    </span>
                  )}
                  <StatusBadge status={l.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem>Convert to Opportunity</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
