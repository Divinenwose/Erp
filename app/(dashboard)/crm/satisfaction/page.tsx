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
import { Smile, Plus, Download, MoreHorizontal, Edit, Trash2, Star, TrendingUp, Award } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const satisfactionSchema = z.object({
  customer_id: z.string().min(1, 'Required'),
  survey_type: z.string().min(1, 'Required'),
  rating: z.coerce.number().int().min(1).max(5),
  category: z.string().optional(),
  feedback: z.string().optional(),
  follow_up_required: z.boolean().default(false),
  follow_up_notes: z.string().optional(),
});
type SatisfactionForm = z.infer<typeof satisfactionSchema>;

export default function SatisfactionPage() {
  const { company, user } = useAuth();
  const [satisfaction, setSatisfaction] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editSatisfaction, setEditSatisfaction] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedSatisfaction, setSelectedSatisfaction] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<SatisfactionForm>({
    resolver: zodResolver(satisfactionSchema),
    defaultValues: { rating: 5, follow_up_required: false },
  });

  const load = async () => {
    if (!company?.id) return;
    const [satRes, custRes] = await Promise.all([
      supabase.from('customer_satisfaction').select('*, customers(name), auth_users(email)').eq('company_id', company.id).order('survey_date', { ascending: false }),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
    ]);
    setSatisfaction(satRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (sat: any) => {
    setEditSatisfaction(sat);
    reset({
      customer_id: sat.customer_id,
      survey_type: sat.survey_type,
      rating: sat.rating,
      category: sat.category ?? '',
      feedback: sat.feedback ?? '',
      follow_up_required: sat.follow_up_required,
      follow_up_notes: sat.follow_up_notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: SatisfactionForm) => {
    if (!company?.id) return;
    
    const surveyNumber = editSatisfaction?.survey_number ?? `CSAT-${String(satisfaction.length + 1).padStart(4, '0')}`;
    
    if (editSatisfaction) {
      const { error } = await supabase.from('customer_satisfaction').update({ 
        ...data, 
        updated_at: new Date().toISOString() 
      }).eq('id', editSatisfaction.id);
      if (error) { toast.error('Failed to update satisfaction record'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'customer_satisfaction', entity_id: editSatisfaction.id, new_value: { rating: data.rating } });
      }
      
      toast.success('Satisfaction record updated');
    } else {
      if (!company?.id) return;
      const { error } = await supabase.from('customer_satisfaction').insert({ 
        ...data, 
        company_id: company.id, 
        survey_number: surveyNumber,
        survey_date: new Date().toISOString(),
        created_by: user?.id 
      });
      if (error) { toast.error('Failed to create satisfaction record'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'customer_satisfaction', new_value: { rating: data.rating, survey_number: surveyNumber } });
      }
      
      toast.success('Satisfaction record created');
    }
    
    reset({ rating: 5, follow_up_required: false });
    setEditSatisfaction(null);
    setDialogOpen(false);
    load();
  };

  const deleteSatisfaction = async () => {
    if (!deleteId) return;
    await supabase.from('customer_satisfaction').delete().eq('id', deleteId);
    setSatisfaction(prev => prev.filter(s => s.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'customer_satisfaction', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Satisfaction record deleted');
  };

  const viewSatisfaction = (sat: any) => {
    setSelectedSatisfaction(sat);
    setViewDialogOpen(true);
  };

  const avgRating = satisfaction.length > 0 ? satisfaction.reduce((a, s) => a + (s.rating ?? 0), 0) / satisfaction.length : 0;
  const highSatisfaction = satisfaction.filter(s => s.rating >= 4).length;
  const lowSatisfaction = satisfaction.filter(s => s.rating <= 2).length;
  const followUps = satisfaction.filter(s => s.follow_up_required).length;

  const columns: Column<any>[] = [
    { key: 'survey_number', header: 'Number', sortable: true, cell: (row) => <span className="font-medium text-sm">{row.survey_number}</span> },
    { key: 'customers', header: 'Customer', cell: (row) => <span className="text-sm text-blue-600">{row.customers?.name ?? '—'}</span> },
    { key: 'survey_type', header: 'Type', sortable: true, cell: (row) => <span className="text-sm capitalize">{row.survey_type}</span> },
    { key: 'rating', header: 'Rating', sortable: true, cell: (row) => (
      <span className="text-sm flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star key={star} className={`h-4 w-4 ${star <= row.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
        ))}
      </span>
    )},
    { key: 'survey_date', header: 'Date', sortable: true, cell: (row) => <span className="text-sm">{formatDate(row.survey_date)}</span> },
    { key: 'follow_up_required', header: 'Follow-up', cell: (row) => row.follow_up_required ? <span className="text-sm text-amber-600 font-medium">Yes</span> : <span className="text-sm text-gray-400">No</span> },
  ];

  return (
    <PermissionGuard permission="crm.satisfaction.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view satisfaction data</div>}>
      <div className="space-y-6">
      <PageHeader title="Customer Satisfaction" description="Track CSAT scores and customer satisfaction" breadcrumbs={[{ label: 'CRM' }, { label: 'Satisfaction' }]}>
        <Can resource="satisfaction" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="satisfaction" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditSatisfaction(null); reset({ rating: 5, follow_up_required: false }); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Record CSAT</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editSatisfaction ? 'Edit Record' : 'Record Customer Satisfaction'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Customer *</Label>
                    <Controller name="customer_id" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select customer" /></SelectTrigger>
                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Survey Type *</Label>
                    <Controller name="survey_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="post_purchase">Post Purchase</SelectItem>
                          <SelectItem value="support_ticket">Support Ticket</SelectItem>
                          <SelectItem value="quarterly">Quarterly Survey</SelectItem>
                          <SelectItem value="annual">Annual Survey</SelectItem>
                          <SelectItem value="product_feedback">Product Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Category</Label><Input className="mt-1" {...register('category')} /></div>
                  <div><Label>Rating (1-5) *</Label>
                    <Controller name="rating" control={control} render={({ field }) => (
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 - Excellent</SelectItem>
                          <SelectItem value="4">4 - Good</SelectItem>
                          <SelectItem value="3">3 - Average</SelectItem>
                          <SelectItem value="2">2 - Poor</SelectItem>
                          <SelectItem value="1">1 - Very Poor</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>
                <div><Label>Feedback</Label><Textarea className="mt-1" {...register('feedback')} /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="follow_up_required" {...register('follow_up_required')} className="rounded" />
                  <Label htmlFor="follow_up_required">Follow-up Required</Label>
                </div>
                <div><Label>Follow-up Notes</Label><Textarea className="mt-1" {...register('follow_up_notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset({ rating: 5, follow_up_required: false }); setEditSatisfaction(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editSatisfaction ? 'Update' : 'Record CSAT'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Surveys" value={satisfaction.length} icon={<Smile className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Avg Rating" value={`${avgRating.toFixed(1)}/5`} icon={<Star className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="High Satisfaction" value={highSatisfaction} icon={<Award className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Follow-ups" value={followUps} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={satisfaction}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search satisfaction records..."
        searchKeys={['survey_number', 'feedback', 'category']}
        rowKey="id"
        emptyTitle="No satisfaction records yet"
        emptyDescription="Record your first CSAT survey to start tracking satisfaction"
        emptyAction={<Can resource="satisfaction" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Record CSAT</Button></Can>}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Satisfaction Details</DialogTitle></DialogHeader>
          {selectedSatisfaction && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Number:</span> {selectedSatisfaction.survey_number}</div>
                <div><span className="text-gray-500">Customer:</span> {selectedSatisfaction.customers?.name ?? '—'}</div>
                <div><span className="text-gray-500">Type:</span> {selectedSatisfaction.survey_type}</div>
                <div><span className="text-gray-500">Date:</span> {formatDate(selectedSatisfaction.survey_date)}</div>
                <div><span className="text-gray-500">Category:</span> {selectedSatisfaction.category ?? '—'}</div>
                <div className="col-span-2"><span className="text-gray-500">Rating:</span> 
                  <span className="flex items-center gap-1 ml-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className={`h-4 w-4 ${star <= selectedSatisfaction.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} />
                    ))}
                    <span className="ml-2 font-semibold">{selectedSatisfaction.rating}/5</span>
                  </span>
                </div>
              </div>
              {selectedSatisfaction.feedback && <div><span className="text-gray-500">Feedback:</span> {selectedSatisfaction.feedback}</div>}
              <div><span className="text-gray-500">Follow-up Required:</span> {selectedSatisfaction.follow_up_required ? 'Yes' : 'No'}</div>
              {selectedSatisfaction.follow_up_notes && <div><span className="text-gray-500">Follow-up Notes:</span> {selectedSatisfaction.follow_up_notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteSatisfaction} title="Delete Record?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
