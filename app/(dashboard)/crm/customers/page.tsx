'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatCurrency } from '@/lib/utils';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Download, Building2, TrendingUp, MoreHorizontal, Edit, Trash2, Mail, Phone, MessageSquare, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const custSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  customer_type: z.string().default('business'),
  credit_limit: z.coerce.number().min(0).default(0),
  payment_terms: z.coerce.number().int().min(0).default(30),
  currency: z.string().default('USD'),
  status: z.string().default('active'),
});
type CustForm = z.infer<typeof custSchema>;

export default function CustomersPage() {
  const { company, user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CustForm>({
    resolver: zodResolver(custSchema),
    defaultValues: { customer_type: 'business', payment_terms: 30, currency: 'USD', status: 'active' },
  });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('customers').select('*').eq('company_id', company.id).order('name');
    setCustomers(data ?? []);
    setLoading(false);
  };

  const loadCommunications = async (customerId: string) => {
    if (!company?.id) return;
    const { data } = await supabase.from('customer_communications').select('*').eq('company_id', company.id).eq('customer_id', customerId).order('sent_at', { ascending: false });
    setCommunications(data ?? []);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (c: any) => {
    setEditCustomer(c);
    reset({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', website: c.website ?? '', address: c.address ?? '', city: c.city ?? '', country: c.country ?? '', industry: c.industry ?? '', customer_type: c.customer_type, credit_limit: c.credit_limit, payment_terms: c.payment_terms, currency: c.currency, status: c.status });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CustForm) => {
    if (!company?.id) return;
    if (editCustomer) {
      const { error } = await supabase.from('customers').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editCustomer.id);
      if (error) { toast.error('Failed to update'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'updated', module: 'crm', entity_type: 'customers', entity_id: editCustomer.id, new_value: { name: data.name } });
      }
      
      toast.success('Customer updated');
    } else {
      if (!company?.id) return;
      const num = `CUS-${String(customers.length + 1).padStart(4, '0')}`;
      const { error } = await supabase.from('customers').insert({ ...data, company_id: company.id, customer_number: num });
      if (error) { toast.error('Failed to create customer'); return; }
      
      if (company?.id && user?.id) {
        await logAuditEvent(company.id, user.id, { action: 'created', module: 'crm', entity_type: 'customers', new_value: { name: data.name, customer_number: num } });
      }
      
      toast.success('Customer created');
    }
    reset(); setEditCustomer(null); setDialogOpen(false); load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('customers').update({ status: 'inactive' }).eq('id', deleteId);
    setCustomers(prev => prev.map(c => c.id === deleteId ? { ...c, status: 'inactive' } : c));
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'crm', entity_type: 'customers', entity_id: deleteId });
    }
    
    setDeleteId(null);
    toast.success('Customer deactivated');
  };

  const viewCommunications = (customer: any) => {
    setSelectedCustomer(customer);
    loadCommunications(customer.id);
    setCommDialogOpen(true);
  };

  const active = customers.filter(c => c.status === 'active').length;

  const columns: Column<any>[] = [
    {
      key: 'name', header: 'Customer', sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.name}</p>
            <p className="text-xs text-gray-400">{row.customer_number ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', cell: (row) => row.email ? <a href={`mailto:${row.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{row.email}</a> : <span className="text-gray-400">—</span> },
    { key: 'phone', header: 'Phone', cell: (row) => row.phone ? <span className="text-sm flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-gray-400" />{row.phone}</span> : <span className="text-gray-400">—</span> },
    { key: 'industry', header: 'Industry', cell: (row) => <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{row.industry ?? '—'}</span> },
    { key: 'credit_limit', header: 'Credit Limit', sortable: true, cell: (row) => <span className="text-sm">{formatCurrency(row.credit_limit)}</span> },
    { key: 'payment_terms', header: 'Terms', sortable: true, cell: (row) => <span className="text-sm">{row.payment_terms} days</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions', header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => setDeleteId(row.id)}><Trash2 className="h-4 w-4 mr-2" />Deactivate</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PermissionGuard permission="crm.customers.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view customers</div>}>
      <div className="space-y-6">
      <PageHeader title="Customers" description="Manage your customer accounts" breadcrumbs={[{ label: 'CRM' }, { label: 'Customers' }]}>
        <Can resource="customers" action="export">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </Can>
        <Can resource="customers" action="create">
          <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setEditCustomer(null); reset(); } setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editCustomer ? 'Edit Customer' : 'New Customer'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Company Name *</Label><Input className="mt-1" {...register('name')} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}</div>
                <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                <div><Label>Website</Label><Input className="mt-1" {...register('website')} /></div>
                <div><Label>Industry</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('industry')}>
                    <option value="">Select industry</option>
                    {['Technology', 'Retail', 'Healthcare', 'Finance', 'Manufacturing', 'Education', 'Logistics', 'Construction', 'Consulting', 'Other'].map(i => <option key={i} value={i.toLowerCase()}>{i}</option>)}
                  </select>
                </div>
                <div><Label>Type</Label>
                  <Controller name="customer_type" control={control} render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="business">Business</SelectItem><SelectItem value="individual">Individual</SelectItem><SelectItem value="government">Government</SelectItem><SelectItem value="nonprofit">Non-profit</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
                <div><Label>Credit Limit ($)</Label><Input className="mt-1" type="number" step="1000" {...register('credit_limit')} /></div>
                <div><Label>Payment Terms (days)</Label><Input className="mt-1" type="number" {...register('payment_terms')} /></div>
                <div className="col-span-2"><Label>Address</Label><Input className="mt-1" {...register('address')} /></div>
                <div><Label>City</Label><Input className="mt-1" {...register('city')} /></div>
                <div><Label>Country</Label><Input className="mt-1" {...register('country')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>{editCustomer ? 'Update' : 'Create Customer'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Customers" value={customers.length} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} change={4.3} changeLabel="this month" icon={<Users className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Retention Rate" value="87%" icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Credit" value={formatCurrency(customers.reduce((a, c) => a + (c.credit_limit ?? 0), 0))} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        data={customers}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search customers..."
        searchKeys={['name', 'email', 'phone', 'customer_number', 'industry']}
        pageSize={15}
        emptyTitle="No customers yet"
        emptyDescription="Add your first customer to start tracking relationships"
        emptyAction={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Customer</Button>}
      />

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Deactivate Customer?" description="The customer will be marked as inactive. All related records are preserved." confirmLabel="Deactivate" variant="warning" />

      {/* Communications Dialog */}
      <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Communication History - {selectedCustomer?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {communications.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No communications recorded yet</div>
            ) : (
              <div className="space-y-3">
                {communications.map(comm => (
                  <div key={comm.id} className="border dark:border-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${comm.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{comm.direction}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(comm.sent_at).toLocaleDateString()}</span>
                    </div>
                    {comm.subject && <p className="font-medium text-sm mb-1">{comm.subject}</p>}
                    <p className="text-sm text-gray-600 dark:text-gray-400">{comm.message}</p>
                    {comm.follow_up_required && (
                      <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Follow-up required: {comm.follow_up_date ? new Date(comm.follow_up_date).toLocaleDateString() : 'TBD'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  );
}
