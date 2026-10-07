'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
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
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, Plus, Download, MoreHorizontal, Edit, Trash2, DollarSign, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const forecastSchema = z.object({
  forecast_type: z.string().min(1, 'Required'),
  period_type: z.string().default('monthly'),
  period_start: z.string().min(1, 'Required'),
  period_end: z.string().min(1, 'Required'),
  forecast_amount: z.coerce.number().min(0).default(0),
  confidence_level: z.coerce.number().min(0).max(100).default(75),
  assumptions: z.string().optional(),
  notes: z.string().optional(),
});
type ForecastForm = z.infer<typeof forecastSchema>;

export default function ForecastsPage() {
  const { company, user } = useAuth();
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editForecast, setEditForecast] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedForecast, setSelectedForecast] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ForecastForm>({
    resolver: zodResolver(forecastSchema),
    defaultValues: { period_type: 'monthly', confidence_level: 75 },
  });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('sales_forecasts').select('*').eq('company_id', company.id).order('period_start', { ascending: false });
    setForecasts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (forecast: any) => {
    setEditForecast(forecast);
    reset({
      forecast_type: forecast.forecast_type,
      period_type: forecast.period_type,
      period_start: forecast.period_start,
      period_end: forecast.period_end,
      forecast_amount: forecast.forecast_amount ?? 0,
      confidence_level: forecast.confidence_level ?? 75,
      assumptions: forecast.assumptions ?? '',
      notes: forecast.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ForecastForm) => {
    if (!company?.id) return;
    
    const forecastNumber = editForecast?.forecast_number ?? `FC-${String(forecasts.length + 1).padStart(4, '0')}`;
    
    if (editForecast) {
      const { error } = await supabase.from('sales_forecasts').update({ 
        ...data, 
        updated_at: new Date().toISOString() 
      }).eq('id', editForecast.id);
      if (error) { toast.error('Failed to update forecast'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'sales_forecasts', entity_id: editForecast.id, new_value: { forecast_type: data.forecast_type } });
      }
      
      toast.success('Forecast updated');
    } else {
      const { error } = await supabase.from('sales_forecasts').insert({ 
        ...data, 
        company_id: company.id, 
        forecast_number: forecastNumber,
        status: 'active',
        created_by: user?.id 
      });
      if (error) { toast.error('Failed to create forecast'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'sales_forecasts', new_value: { forecast_type: data.forecast_type, forecast_number } });
      }
      
      toast.success('Forecast created');
    }
    
    reset({ period_type: 'monthly', confidence_level: 75 });
    setEditForecast(null);
    setDialogOpen(false);
    load();
  };

  const deleteForecast = async () => {
    if (!deleteId) return;
    await supabase.from('sales_forecasts').delete().eq('id', deleteId);
    setForecasts(prev => prev.filter(f => f.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'sales_forecasts', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Forecast deleted');
  };

  const viewForecast = (forecast: any) => {
    setSelectedForecast(forecast);
    setViewDialogOpen(true);
  };

  const active = forecasts.filter(f => f.status === 'active').length;
  const totalForecast = forecasts.filter(f => f.status === 'active').reduce((a, f) => a + (f.forecast_amount ?? 0), 0);
  const avgConfidence = forecasts.length > 0 ? forecasts.reduce((a, f) => a + (f.confidence_level ?? 0), 0) / forecasts.length : 0;

  const columns: Column<any>[] = [
    { key: 'forecast_number', header: 'Number', sortable: true, cell: (row) => <span className="font-medium text-sm">{row.forecast_number}</span> },
    { key: 'forecast_type', header: 'Type', sortable: true, cell: (row) => <span className="text-sm capitalize">{row.forecast_type}</span> },
    { key: 'period_start', header: 'Period', sortable: true, cell: (row) => <span className="text-sm">{formatDate(row.period_start)} - {formatDate(row.period_end)}</span> },
    { key: 'forecast_amount', header: 'Forecast Amount', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.forecast_amount)}</span> },
    { key: 'confidence_level', header: 'Confidence', sortable: true, cell: (row) => <span className="text-sm">{row.confidence_level}%</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.forecasts.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view forecasts</div>}>
      <div className="space-y-6">
      <PageHeader title="Sales Forecasting" description="Revenue projections and sales forecasts" breadcrumbs={[{ label: 'CRM' }, { label: 'Forecasts' }]}>
        <Can resource="forecasts" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="forecasts" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditForecast(null); reset({ period_type: 'monthly', confidence_level: 75 }); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Forecast</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editForecast ? 'Edit Forecast' : 'New Sales Forecast'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Forecast Type *</Label>
                    <Controller name="forecast_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="units">Units</SelectItem>
                          <SelectItem value="growth">Growth Rate</SelectItem>
                          <SelectItem value="pipeline">Pipeline Conversion</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Period Type</Label>
                    <Controller name="period_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Period Start *</Label><Input className="mt-1" type="date" {...register('period_start')} />{errors.period_start && <p className="text-xs text-red-500 mt-1">{errors.period_start.message}</p>}</div>
                  <div><Label>Period End *</Label><Input className="mt-1" type="date" {...register('period_end')} />{errors.period_end && <p className="text-xs text-red-500 mt-1">{errors.period_end.message}</p>}</div>
                  <div><Label>Forecast Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('forecast_amount')} /></div>
                  <div><Label>Confidence Level (%)</Label><Input className="mt-1" type="number" min={0} max={100} {...register('confidence_level')} /></div>
                </div>
                <div><Label>Assumptions</Label><Textarea className="mt-1" {...register('assumptions')} placeholder="Describe the assumptions behind this forecast..." /></div>
                <div><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset({ period_type: 'monthly', confidence_level: 75 }); setEditForecast(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editForecast ? 'Update' : 'Create Forecast'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Forecasts" value={active} icon={<TrendingUp className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Forecast" value={formatCurrency(totalForecast)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Avg Confidence" value={`${avgConfidence.toFixed(0)}%`} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Forecast Periods" value={forecasts.length} icon={<Calendar className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={forecasts}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search forecasts..."
        searchKeys={['forecast_number', 'forecast_type', 'assumptions', 'notes']}
        rowKey="id"
        emptyTitle="No forecasts yet"
        emptyDescription="Create your first sales forecast to start tracking projections"
        emptyAction={<Can resource="forecasts" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Forecast</Button></Can>}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Forecast Details</DialogTitle></DialogHeader>
          {selectedForecast && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Number:</span> {selectedForecast.forecast_number}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedForecast.status} /></div>
                <div className="col-span-2"><span className="text-gray-500">Type:</span> {selectedForecast.forecast_type}</div>
                <div><span className="text-gray-500">Period:</span> {formatDate(selectedForecast.period_start)} - {formatDate(selectedForecast.period_end)}</div>
                <div><span className="text-gray-500">Period Type:</span> {selectedForecast.period_type}</div>
                <div className="font-semibold"><span className="text-gray-500">Forecast Amount:</span> {formatCurrency(selectedForecast.forecast_amount)}</div>
                <div><span className="text-gray-500">Confidence Level:</span> {selectedForecast.confidence_level}%</div>
              </div>
              {selectedForecast.assumptions && <div><span className="text-gray-500">Assumptions:</span> {selectedForecast.assumptions}</div>}
              {selectedForecast.notes && <div><span className="text-gray-500">Notes:</span> {selectedForecast.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteForecast} title="Delete Forecast?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
