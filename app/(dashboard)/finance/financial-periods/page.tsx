'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, Lock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const periodSchema = z.object({
  period_name: z.string().min(1, 'Required'),
  fiscal_year: z.string().min(4, 'Required'),
  start_date: z.string().min(1, 'Required'),
  end_date: z.string().min(1, 'Required'),
  notes: z.string().optional(),
});
type PeriodForm = z.infer<typeof periodSchema>;

export default function FinancialPeriodsPage() {
  const { company, user } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PeriodForm>({ resolver: zodResolver(periodSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('financial_periods').select('*').eq('company_id', company.id).order('start_date', { ascending: false });
    setPeriods(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: PeriodForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('financial_periods').insert({
      company_id: company.id,
      period_name: data.period_name,
      fiscal_year: data.fiscal_year,
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes,
      status: 'open',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create period'); return; }
    await logAuditEvent('financial_periods', null, 'created', null, { period_name: data.period_name, fiscal_year: data.fiscal_year }, company.id, user?.id);
    toast.success('Financial period created');
    reset();
    setDialogOpen(false);
    load();
  };

  const closePeriod = async (period: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('financial_periods').update({ status: 'closed', closed_by: user?.id, closed_at: new Date().toISOString() }).eq('id', period.id);
    if (error) { toast.error('Failed to close period'); return; }
    await logAuditEvent('financial_periods', period.id, 'closed', { status: 'closed' }, null, company.id, user?.id);
    toast.success('Period closed');
    load();
  };

  const lockPeriod = async (period: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('financial_periods').update({ status: 'locked', locked_by: user?.id, locked_at: new Date().toISOString() }).eq('id', period.id);
    if (error) { toast.error('Failed to lock period'); return; }
    await logAuditEvent('financial_periods', period.id, 'locked', { status: 'locked' }, null, company.id, user?.id);
    toast.success('Period locked');
    load();
  };

  const deletePeriod = async () => {
    if (!company?.id || !periodToDelete) return;
    const { error } = await supabase.from('financial_periods').delete().eq('id', periodToDelete.id);
    if (error) { toast.error('Failed to delete period'); return; }
    await logAuditEvent('financial_periods', periodToDelete.id, 'deleted', null, null, company.id, user?.id);
    toast.success('Period deleted');
    setDeleteDialogOpen(false);
    setPeriodToDelete(null);
    load();
  };

  const viewPeriod = (period: any) => {
    setSelectedPeriod(period);
    setViewDialogOpen(true);
  };

  const filteredPeriods = periods.filter(p => {
    const matchesSearch = !search || p.period_name?.toLowerCase().includes(search.toLowerCase()) || p.fiscal_year?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<any>[] = [
    { key: 'period_name', header: 'Period Name' },
    { key: 'fiscal_year', header: 'Fiscal Year' },
    { key: 'start_date', header: 'Start Date', cell: (row) => formatDate(row.start_date) },
    { key: 'end_date', header: 'End Date', cell: (row) => formatDate(row.end_date) },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const openCount = periods.filter(p => p.status === 'open').length;
  const closedCount = periods.filter(p => p.status === 'closed').length;
  const lockedCount = periods.filter(p => p.status === 'locked').length;

  return (
    <PermissionGuard permission="finance.financial_periods.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view financial periods</div>}>
      <div className="space-y-6">
        <PageHeader title="Financial Periods" description="Manage fiscal periods and year-end closing" breadcrumbs={[{ label: 'Finance' }, { label: 'Financial Periods' }]}>
          <Can resource="financial_periods" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="financial_periods" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Create Period</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Create Financial Period</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Period Name *</Label><Input className="mt-1" {...register('period_name')} placeholder="e.g., Q4 2024" /></div>
                    <div><Label>Fiscal Year *</Label><Input className="mt-1" {...register('fiscal_year')} placeholder="e.g., 2024" /></div>
                    <div><Label>Start Date *</Label><Input className="mt-1" type="date" {...register('start_date')} /></div>
                    <div><Label>End Date *</Label><Input className="mt-1" type="date" {...register('end_date')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Period</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Open Periods" value={openCount} icon={<Calendar className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Closed Periods" value={closedCount} icon={<CheckCircle2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Locked Periods" value={lockedCount} icon={<Lock className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Total Periods" value={periods.length} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search periods..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredPeriods}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewPeriod(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'open' && (
                      <Can resource="financial_periods" action="close">
                        <DropdownMenuItem onClick={() => closePeriod(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Close Period</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status === 'closed' && (
                      <Can resource="financial_periods" action="lock">
                        <DropdownMenuItem onClick={() => lockPeriod(row)}><Lock className="h-4 w-4 mr-2" />Lock Period</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status === 'open' && (
                      <Can resource="financial_periods" action="delete">
                        <DropdownMenuItem onClick={() => { setPeriodToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </Can>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Financial Period Details</DialogTitle></DialogHeader>
            {selectedPeriod && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Period Name:</span> {selectedPeriod.period_name}</div>
                  <div><span className="text-gray-500">Fiscal Year:</span> {selectedPeriod.fiscal_year}</div>
                  <div><span className="text-gray-500">Start Date:</span> {formatDate(selectedPeriod.start_date)}</div>
                  <div><span className="text-gray-500">End Date:</span> {formatDate(selectedPeriod.end_date)}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedPeriod.status} /></div>
                  {selectedPeriod.closed_at && <div><span className="text-gray-500">Closed At:</span> {formatDate(selectedPeriod.closed_at)}</div>}
                  {selectedPeriod.locked_at && <div><span className="text-gray-500">Locked At:</span> {formatDate(selectedPeriod.locked_at)}</div>}
                  {selectedPeriod.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedPeriod.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Period"
          description="Are you sure you want to delete this financial period? This action cannot be undone."
          onConfirm={deletePeriod}
        />
      </div>
    </PermissionGuard>
  );
}
