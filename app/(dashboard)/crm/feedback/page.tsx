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
import { MessageSquare, Plus, Download, Check, X, MoreHorizontal, Edit, Trash2, AlertTriangle, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const feedbackSchema = z.object({
  customer_id: z.string().min(1, 'Required'),
  feedback_type: z.string().min(1, 'Required'),
  category: z.string().optional(),
  subject: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  severity: z.string().default('medium'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  resolution_notes: z.string().optional(),
});
type FeedbackForm = z.infer<typeof feedbackSchema>;

export default function FeedbackPage() {
  const { company, user } = useAuth();
  const [feedback, setFeedback] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editFeedback, setEditFeedback] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { severity: 'medium' },
  });

  const load = async () => {
    if (!company?.id) return;
    const [feedRes, custRes] = await Promise.all([
      supabase.from('customer_feedback').select('*, customers(name), auth_users(email)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name').eq('company_id', company.id),
    ]);
    setFeedback(feedRes.data ?? []);
    setCustomers(custRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (fb: any) => {
    setEditFeedback(fb);
    reset({
      customer_id: fb.customer_id,
      feedback_type: fb.feedback_type,
      category: fb.category ?? '',
      subject: fb.subject,
      description: fb.description,
      severity: fb.severity,
      rating: fb.rating ?? 0,
      resolution_notes: fb.resolution_notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FeedbackForm) => {
    if (!company?.id) return;
    
    const feedbackNumber = editFeedback?.feedback_number ?? `FB-${String(feedback.length + 1).padStart(4, '0')}`;
    
    if (editFeedback) {
      const { error } = await supabase.from('customer_feedback').update({ 
        ...data, 
        updated_at: new Date().toISOString() 
      }).eq('id', editFeedback.id);
      if (error) { toast.error('Failed to update feedback'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'customer_feedback', entity_id: editFeedback.id, new_value: { subject: data.subject } });
      }
      
      toast.success('Feedback updated');
    } else {
      if (!company?.id) return;
      const { error } = await supabase.from('customer_feedback').insert({ 
        ...data, 
        company_id: company.id, 
        feedback_number: feedbackNumber,
        status: 'open',
        created_by: user?.id 
      });
      if (error) { toast.error('Failed to create feedback'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'customer_feedback', new_value: { subject: data.subject, feedback_number } });
      }
      
      toast.success('Feedback recorded');
    }
    
    reset({ severity: 'medium' });
    setEditFeedback(null);
    setDialogOpen(false);
    load();
  };

  const resolveFeedback = async (fb: any) => {
    await supabase.from('customer_feedback').update({ 
      status: 'resolved', 
      resolved_by: user?.id, 
      resolved_at: new Date().toISOString() 
    }).eq('id', fb.id);
    setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, status: 'resolved', resolved_by: user?.id, resolved_at: new Date().toISOString() } : f));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'resolved', module: 'crm', entity_type: 'customer_feedback', entity_id: fb.id });
    }
    
    toast.success('Feedback resolved');
  };

  const closeFeedback = async (fb: any) => {
    await supabase.from('customer_feedback').update({ 
      status: 'closed', 
      closed_by: user?.id, 
      closed_at: new Date().toISOString() 
    }).eq('id', fb.id);
    setFeedback(prev => prev.map(f => f.id === fb.id ? { ...f, status: 'closed', closed_by: user?.id, closed_at: new Date().toISOString() } : f));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'closed', module: 'crm', entity_type: 'customer_feedback', entity_id: fb.id });
    }
    
    toast.success('Feedback closed');
  };

  const deleteFeedback = async () => {
    if (!deleteId) return;
    await supabase.from('customer_feedback').delete().eq('id', deleteId);
    setFeedback(prev => prev.filter(f => f.id !== deleteId));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'customer_feedback', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Feedback deleted');
  };

  const viewFeedback = (fb: any) => {
    setSelectedFeedback(fb);
    setViewDialogOpen(true);
  };

  const open = feedback.filter(f => f.status === 'open').length;
  const resolved = feedback.filter(f => f.status === 'resolved').length;
  const complaints = feedback.filter(f => f.feedback_type === 'complaint').length;
  const avgRating = feedback.filter(f => f.rating).length > 0 ? feedback.filter(f => f.rating).reduce((a, f) => a + (f.rating ?? 0), 0) / feedback.filter(f => f.rating).length : 0;

  const columns: Column<any>[] = [
    { key: 'feedback_number', header: 'Number', sortable: true, cell: (row) => <span className="font-medium text-sm">{row.feedback_number}</span> },
    { key: 'customers', header: 'Customer', cell: (row) => <span className="text-sm text-blue-600">{row.customers?.name ?? '—'}</span> },
    { key: 'feedback_type', header: 'Type', sortable: true, cell: (row) => <span className="text-sm capitalize">{row.feedback_type}</span> },
    { key: 'subject', header: 'Subject', sortable: true, cell: (row) => <span className="text-sm">{row.subject}</span> },
    { key: 'severity', header: 'Severity', sortable: true, cell: (row) => <span className={`text-sm font-medium ${row.severity === 'high' ? 'text-red-600' : row.severity === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>{row.severity}</span> },
    { key: 'rating', header: 'Rating', sortable: true, cell: (row) => row.rating ? <span className="text-sm flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{row.rating}</span> : <span className="text-sm text-gray-400">—</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <PermissionGuard permission="crm.feedback.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view feedback</div>}>
      <div className="space-y-6">
      <PageHeader title="Customer Feedback" description="Track customer feedback and complaints" breadcrumbs={[{ label: 'CRM' }, { label: 'Feedback' }]}>
        <Can resource="feedback" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="feedback" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditFeedback(null); reset({ severity: 'medium' }); } setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Record Feedback</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editFeedback ? 'Edit Feedback' : 'Record Customer Feedback'}</DialogTitle></DialogHeader>
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
                  <div><Label>Feedback Type *</Label>
                    <Controller name="feedback_type" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="complaint">Complaint</SelectItem>
                          <SelectItem value="suggestion">Suggestion</SelectItem>
                          <SelectItem value="compliment">Compliment</SelectItem>
                          <SelectItem value="inquiry">Inquiry</SelectItem>
                          <SelectItem value="bug_report">Bug Report</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Category</Label><Input className="mt-1" {...register('category')} /></div>
                  <div><Label>Severity</Label>
                    <Controller name="severity" control={control} render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div><Label>Rating (1-5)</Label><Input className="mt-1" type="number" min={1} max={5} {...register('rating')} /></div>
                </div>
                <div><Label>Subject *</Label><Input className="mt-1" {...register('subject')} />{errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}</div>
                <div><Label>Description *</Label><Textarea className="mt-1" {...register('description')} />{errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}</div>
                <div><Label>Resolution Notes</Label><Textarea className="mt-1" {...register('resolution_notes')} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset({ severity: 'medium' }); setEditFeedback(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editFeedback ? 'Update' : 'Record Feedback'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Feedback" value={feedback.length} icon={<MessageSquare className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Open" value={open} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Resolved" value={resolved} icon={<Check className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Complaints" value={complaints} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={feedback}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search feedback..."
        searchKeys={['subject', 'description', 'category']}
        rowKey="id"
        emptyTitle="No feedback yet"
        emptyDescription="Record your first customer feedback to start tracking"
        emptyAction={<Can resource="feedback" action="create"><Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Feedback</Button></Can>}
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Feedback Details</DialogTitle></DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">Number:</span> {selectedFeedback.feedback_number}</div>
                <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedFeedback.status} /></div>
                <div><span className="text-gray-500">Customer:</span> {selectedFeedback.customers?.name ?? '—'}</div>
                <div><span className="text-gray-500">Type:</span> {selectedFeedback.feedback_type}</div>
                <div className="col-span-2"><span className="text-gray-500">Subject:</span> {selectedFeedback.subject}</div>
                <div><span className="text-gray-500">Category:</span> {selectedFeedback.category ?? '—'}</div>
                <div><span className="text-gray-500">Severity:</span> {selectedFeedback.severity}</div>
                <div><span className="text-gray-500">Rating:</span> {selectedFeedback.rating ? `${selectedFeedback.rating}/5` : '—'}</div>
              </div>
              <div><span className="text-gray-500">Description:</span> {selectedFeedback.description}</div>
              {selectedFeedback.resolution_notes && <div><span className="text-gray-500">Resolution Notes:</span> {selectedFeedback.resolution_notes}</div>}
              {selectedFeedback.status === 'open' ? (
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-800">
                  <Can resource="feedback" action="resolve">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setViewDialogOpen(false); resolveFeedback(selectedFeedback); }}><Check className="h-4 w-4 mr-2" />Resolve</Button>
                  </Can>
                  <Can resource="feedback" action="close">
                    <Button size="sm" variant="outline" onClick={() => { setViewDialogOpen(false); closeFeedback(selectedFeedback); }}><X className="h-4 w-4 mr-2" />Close</Button>
                  </Can>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={deleteFeedback} title="Delete Feedback?" description="This action cannot be undone." confirmLabel="Delete" variant="danger" />
    </div>
    </PermissionGuard>
  );
}
