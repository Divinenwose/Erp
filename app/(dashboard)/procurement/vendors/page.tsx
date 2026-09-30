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
import EmptyState from '@/components/common/EmptyState';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Plus, Search, Star, MoreHorizontal, Mail, Phone, Edit, Trash2, MessageSquare, FileText, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const vendorSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  payment_terms: z.coerce.number().default(30),
  currency: z.string().default('USD'),
  tax_id: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  notes: z.string().optional(),
});
type VendorForm = z.infer<typeof vendorSchema>;

const commSchema = z.object({
  communication_type: z.string().min(1, 'Required'),
  subject: z.string().optional(),
  message: z.string().min(1, 'Required'),
  reference_type: z.string().optional(),
  follow_up_required: z.boolean().default(false),
  follow_up_date: z.string().optional(),
  follow_up_notes: z.string().optional(),
});
type CommForm = z.infer<typeof commSchema>;

export default function VendorsPage() {
  const { company, user } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VendorForm>({ resolver: zodResolver(vendorSchema), defaultValues: { payment_terms: 30, currency: 'USD' } });
  const { register: registerComm, handleSubmit: handleSubmitComm, reset: resetComm, formState: { errors: commErrors, isSubmitting: isSubmittingComm } } = useForm<CommForm>({ resolver: zodResolver(commSchema) });

  const load = async () => {
    if (!company?.id) return;
    const [vendorsData] = await Promise.all([
      supabase.from('vendors').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
    ]);
    setVendors(vendorsData.data ?? []);
    setLoading(false);
  };

  const loadCommunications = async (vendorId: string) => {
    if (!company?.id) return;
    const { data } = await supabase.from('supplier_communications').select('*').eq('company_id', company.id).eq('vendor_id', vendorId).order('communication_date', { ascending: false });
    setCommunications(data ?? []);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: VendorForm) => {
    if (!company?.id) return;
    
    const { data: maxVendor } = await supabase
      .from('vendors')
      .select('vendor_number')
      .eq('company_id', company.id)
      .order('vendor_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const lastNum = maxVendor?.vendor_number ? parseInt(String(maxVendor.vendor_number).split('-').pop() || '0') : 0;
    const vendorNumber = `VEN-${String(lastNum + 1).padStart(4, '0')}`;
    
    const { error } = await supabase.from('vendors').insert({
      ...data,
      company_id: company.id,
      vendor_number: vendorNumber,
      status: 'active',
      rating: 0,
      total_orders: 0,
      total_spend: 0,
    });
    
    if (error) { toast.error('Failed to create vendor'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'created', module: 'procurement', entity_type: 'vendors', new_value: { vendor_number: vendorNumber, name: data.name } });
    }
    
    toast.success('Vendor added');
    reset();
    setDialogOpen(false);
    load();
  };

  const deleteVendor = async () => {
    if (!company?.id || !vendorToDelete) return;
    const { error } = await supabase.from('vendors').delete().eq('id', vendorToDelete.id);
    if (error) { toast.error('Failed to delete vendor'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'deleted', module: 'procurement', entity_type: 'vendors', entity_id: vendorToDelete.id });
    }
    
    toast.success('Vendor deleted');
    setDeleteDialogOpen(false);
    setVendorToDelete(null);
    load();
  };

  const onCommSubmit = async (data: CommForm) => {
    if (!company?.id || !selectedVendor) return;
    
    const { error } = await supabase.from('supplier_communications').insert({
      company_id: company.id,
      vendor_id: selectedVendor.id,
      communication_type: data.communication_type,
      subject: data.subject,
      message: data.message,
      reference_type: data.reference_type,
      follow_up_required: data.follow_up_required,
      follow_up_date: data.follow_up_date,
      follow_up_notes: data.follow_up_notes,
      communicated_by: user?.id,
    });
    
    if (error) { toast.error('Failed to log communication'); return; }
    
    if (company?.id && user?.id) {
      await logAuditEvent(company.id, user.id, { action: 'logged_communication', module: 'procurement', entity_type: 'supplier_communications', new_value: { vendor_id: selectedVendor.id, type: data.communication_type } });
    }
    
    toast.success('Communication logged');
    resetComm();
    setCommDialogOpen(false);
    loadCommunications(selectedVendor.id);
  };

  const viewVendor = (vendor: any) => {
    setSelectedVendor(vendor);
    loadCommunications(vendor.id);
    setViewDialogOpen(true);
  };

  const filteredVendors = vendors.filter(v => !search || `${v.name} ${v.email ?? ''} ${v.category ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  const active = vendors.filter(v => v.status === 'active').length;
  const categories = Array.from(new Set(vendors.map(v => v.category).filter(Boolean))).length;
  const totalSpend = vendors.reduce((a, v) => a + (v.total_spend ?? 0), 0);

  const columns: Column<any>[] = [
    { key: 'vendor_number', header: 'Number', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.vendor_number}</span> },
    { key: 'name', header: 'Vendor Name' },
    { key: 'category', header: 'Category', cell: (row) => <span className="text-xs capitalize">{row.category?.replace(/_/g, ' ') || 'Other'}</span> },
    { key: 'email', header: 'Email', cell: (row) => row.email || '-' },
    { key: 'phone', header: 'Phone', cell: (row) => row.phone || '-' },
    { key: 'payment_terms', header: 'Terms', cell: (row) => <span className="text-xs">{row.payment_terms ?? 30} days</span> },
    { key: 'total_spend', header: 'Total Spend', cell: (row) => <span className="font-medium">{formatCurrency(row.total_spend || 0)}</span> },
    { key: 'rating', header: 'Rating', cell: (row) => (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < (row.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />)}
      </div>
    )},
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status ?? 'active'} /> },
  ];

  return (
    <PermissionGuard permission="procurement.vendors.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view vendors</div>}>
      <div className="space-y-6">
        <PageHeader title="Vendors" description="Manage your supplier relationships" breadcrumbs={[{ label: 'Procurement' }, { label: 'Vendors' }]}>
          <Can resource="vendors" action="export">
            <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="vendors" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><Label>Vendor Name *</Label><Input className="mt-1" {...register('name')} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}</div>
                    <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                    <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                    <div><Label>Category</Label>
                      <Select defaultValue="" onValueChange={(v) => register('category').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Select category</SelectItem>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="office_supplies">Office Supplies</SelectItem>
                          <SelectItem value="logistics">Logistics</SelectItem>
                          <SelectItem value="professional_services">Professional Services</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Currency</Label>
                      <Select defaultValue="USD" onValueChange={(v) => register('currency').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Payment Terms (days)</Label><Input className="mt-1" type="number" {...register('payment_terms')} /></div>
                    <div><Label>Tax ID</Label><Input className="mt-1" {...register('tax_id')} /></div>
                    <div className="col-span-2"><Label>Address</Label><Input className="mt-1" {...register('address')} /></div>
                    <div><Label>City</Label><Input className="mt-1" {...register('city')} /></div>
                    <div><Label>State</Label><Input className="mt-1" {...register('state')} /></div>
                    <div><Label>Country</Label><Input className="mt-1" {...register('country')} /></div>
                    <div><Label>Bank Name</Label><Input className="mt-1" {...register('bank_name')} /></div>
                    <div><Label>Bank Account</Label><Input className="mt-1" {...register('bank_account')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Add Vendor</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Vendors" value={vendors.length} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Active" value={active} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Categories" value={categories} icon={<Building2 className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
          <KPICard title="Total Spend" value={formatCurrency(totalSpend)} icon={<TrendingUp className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search vendors..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <DataTable
              columns={columns}
              data={filteredVendors}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Vendor Details</DialogTitle></DialogHeader>
            {selectedVendor && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Vendor Number:</span> {selectedVendor.vendor_number}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedVendor.status} /></div>
                  <div className="col-span-2"><span className="text-gray-500">Name:</span> {selectedVendor.name}</div>
                  <div><span className="text-gray-500">Email:</span> {selectedVendor.email || '-'}</div>
                  <div><span className="text-gray-500">Phone:</span> {selectedVendor.phone || '-'}</div>
                  <div><span className="text-gray-500">Category:</span> {selectedVendor.category?.replace(/_/g, ' ') || 'Other'}</div>
                  <div><span className="text-gray-500">Currency:</span> {selectedVendor.currency}</div>
                  <div><span className="text-gray-500">Payment Terms:</span> {selectedVendor.payment_terms ?? 30} days</div>
                  <div><span className="text-gray-500">Total Orders:</span> {selectedVendor.total_orders ?? 0}</div>
                  <div><span className="text-gray-500">Total Spend:</span> {formatCurrency(selectedVendor.total_spend || 0)}</div>
                  <div><span className="text-gray-500">Rating:</span> <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < (selectedVendor.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />)}</div></div>
                  <div><span className="text-gray-500">Last Order:</span> {selectedVendor.last_order_date ? formatDate(selectedVendor.last_order_date) : '-'}</div>
                  {selectedVendor.address && <div className="col-span-2"><span className="text-gray-500">Address:</span> {selectedVendor.address}</div>}
                  {selectedVendor.tax_id && <div><span className="text-gray-500">Tax ID:</span> {selectedVendor.tax_id}</div>}
                  {selectedVendor.bank_name && <div><span className="text-gray-500">Bank:</span> {selectedVendor.bank_name}</div>}
                  {selectedVendor.bank_account && <div><span className="text-gray-500">Account:</span> {selectedVendor.bank_account}</div>}
                  {selectedVendor.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedVendor.notes}</div>}
                </div>

                {/* Communication Log */}
                <div className="border-t dark:border-gray-800 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Communication Log</h3>
                    <Button size="sm" variant="outline" onClick={() => setCommDialogOpen(true)}><MessageSquare className="h-4 w-4 mr-2" />Log Communication</Button>
                  </div>
                  {communications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No communications logged yet</div>
                  ) : (
                    <div className="space-y-2">
                      {communications.map((comm) => (
                        <div key={comm.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium capitalize">{comm.communication_type.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-gray-500">{formatDate(comm.communication_date)}</span>
                          </div>
                          {comm.subject && <div className="text-gray-700 dark:text-gray-300">{comm.subject}</div>}
                          <div className="text-gray-600 dark:text-gray-400 mt-1">{comm.message}</div>
                          {comm.follow_up_required && comm.follow_up_date && (
                            <div className="mt-2 text-xs text-amber-600">Follow-up required: {formatDate(comm.follow_up_date)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Communication Dialog */}
        <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmitComm(onCommSubmit)} className="space-y-4">
              <div><Label>Communication Type *</Label>
                <Select onValueChange={(v) => registerComm('communication_type').onChange({ target: { value: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {commErrors.communication_type && <p className="text-xs text-red-500 mt-1">{commErrors.communication_type.message}</p>}
              </div>
              <div><Label>Subject</Label><Input className="mt-1" {...registerComm('subject')} /></div>
              <div><Label>Message *</Label><Textarea className="mt-1" {...registerComm('message')} />{commErrors.message && <p className="text-xs text-red-500 mt-1">{commErrors.message.message}</p>}</div>
              <div><Label>Reference Type (Optional)</Label>
                <Select onValueChange={(v) => registerComm('reference_type').onChange({ target: { value: v } })}>
                  <SelectTrigger><SelectValue placeholder="Select reference" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No reference</SelectItem>
                    <SelectItem value="purchase_order">Purchase Order</SelectItem>
                    <SelectItem value="grn">Goods Received Note</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" {...registerComm('follow_up_required')} />
                <Label>Follow-up required</Label>
              </div>
              <div><Label>Follow-up Date</Label><Input className="mt-1" type="date" {...registerComm('follow_up_date')} /></div>
              <div><Label>Follow-up Notes</Label><Textarea className="mt-1" {...registerComm('follow_up_notes')} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCommDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmittingComm}>Log Communication</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Delete Vendor"
          description="Are you sure you want to delete this vendor? This action cannot be undone."
          onConfirm={deleteVendor}
        />
      </div>
    </PermissionGuard>
  );
}
