'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserCheck, Plus, Search, Clock, CheckCircle2, LogOut } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const visitorSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  purpose: z.string().optional(),
  phone: z.string().optional(),
});
type VisitorForm = z.infer<typeof visitorSchema>;

export default function VisitorsPage() {
  const { company } = useAuth();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VisitorForm>({ resolver: zodResolver(visitorSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('visitors').select('*, employees(first_name, last_name)').eq('company_id', company.id).order('created_at', { ascending: false });
    setVisitors(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: VisitorForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('visitors').insert({ ...data, company_id: company.id, status: 'checked_in', check_in: new Date().toISOString() });
    if (error) { toast.error('Failed to register visitor'); return; }
    toast.success('Visitor checked in');
    reset(); setDialogOpen(false); load();
  };

  const checkout = async (id: string) => {
    await supabase.from('visitors').update({ status: 'checked_out', check_out: new Date().toISOString() }).eq('id', id);
    toast.success('Visitor checked out');
    load();
  };

  const filtered = visitors.filter(v => !search || `${v.first_name} ${v.last_name ?? ''} ${v.company_name ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const checkedIn = visitors.filter(v => v.status === 'checked_in').length;
  const todayVisitors = visitors.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Visitor Management" description="Track and manage office visitors" breadcrumbs={[{ label: 'Administration' }, { label: 'Visitors' }]}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Check In Visitor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Visitor Check-In</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input className="mt-1" {...register('first_name')} /></div>
                <div><Label>Last Name</Label><Input className="mt-1" {...register('last_name')} /></div>
                <div><Label>Company</Label><Input className="mt-1" {...register('company_name')} /></div>
                <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                <div className="col-span-2"><Label>Purpose of Visit</Label><Input className="mt-1" {...register('purpose')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Check In</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Currently In" value={checkedIn} icon={<UserCheck className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Today's Visitors" value={todayVisitors} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Visits" value={visitors.length} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Checked Out" value={visitors.filter(v => v.status === 'checked_out').length} icon={<LogOut className="h-4 w-4 text-gray-600" />} iconBg="bg-gray-50 dark:bg-gray-800" loading={loading} />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search visitors..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={<UserCheck className="h-12 w-12" />} title="No visitors today" description="Check in your first visitor" action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Check In Visitor</Button>} />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filtered.map(v => (
                <div key={v.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {v.first_name.charAt(0)}{v.last_name?.charAt(0) ?? ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{v.first_name} {v.last_name ?? ''}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{v.company_name ?? 'Individual'} · {v.purpose ?? 'General'}</p>
                  </div>
                  <div className="text-xs text-gray-400 hidden md:block">{formatDate(v.check_in, { hour: '2-digit', minute: '2-digit' })}</div>
                  <StatusBadge status={v.status} />
                  {v.status === 'checked_in' && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => checkout(v.id)}>
                      <LogOut className="h-3.5 w-3.5 mr-1" />Check Out
                    </Button>
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
