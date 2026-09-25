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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, Printer } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const voucherSchema = z.object({
  payee: z.string().min(1, 'Required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  payment_date: z.string().min(1, 'Required'),
  payment_method: z.string().min(1, 'Required'),
  category: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type VoucherForm = z.infer<typeof voucherSchema>;

export default function PaymentVouchersPage() {
  const { company, user } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [voucherToDelete, setVoucherToDelete] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VoucherForm>({ resolver: zodResolver(voucherSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('payment_vouchers').select('*').eq('company_id', company.id).order('payment_date', { ascending: false });
    setVouchers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: VoucherForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('payment_vouchers').insert({
      company_id: company.id,
      voucher_number: `PV-${Date.now().toString().slice(-6)}`,
      payee: data.payee,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      category: data.category,
      description: data.description,
      reference: data.reference,
      notes: data.notes,
      status: 'pending',
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create voucher'); return; }
    await logAuditEvent('payment_vouchers', null, 'created', null, { amount: data.amount, payee: data.payee }, company.id, user?.id);
    toast.success('Payment voucher created');
    reset();
    setDialogOpen(false);
    load();
  };

  const approveVoucher = async (voucher: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('payment_vouchers').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', voucher.id);
    if (error) { toast.error('Failed to approve voucher'); return; }
    await logAuditEvent('payment_vouchers', voucher.id, 'approved', { status: 'approved' }, null, company.id, user?.id);
    toast.success('Voucher approved');
    load();
  };

  const processPayment = async (voucher: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('payment_vouchers').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', voucher.id);
    if (error) { toast.error('Failed to process payment'); return; }
    await logAuditEvent('payment_vouchers', voucher.id, 'paid', { status: 'paid' }, null, company.id, user?.id);
    toast.success('Payment processed');
    load();
  };

  const deleteVoucher = async () => {
    if (!company?.id || !voucherToDelete) return;
    const { error } = await supabase.from('payment_vouchers').delete().eq('id', voucherToDelete.id);
    if (error) { toast.error('Failed to delete voucher'); return; }
    await logAuditEvent('payment_vouchers', voucherToDelete.id, 'deleted', null, null, company.id, user?.id);
    toast.success('Voucher deleted');
    setDeleteDialogOpen(false);
    setVoucherToDelete(null);
    load();
  };

  const viewVoucher = (voucher: any) => {
    setSelectedVoucher(voucher);
    setViewDialogOpen(true);
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = !search || v.payee?.toLowerCase().includes(search.toLowerCase()) || v.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<any>[] = [
    { key: 'voucher_number', header: 'Voucher', cell: (row) => <span className="font-mono text-xs text-blue-600">{row.voucher_number}</span> },
    { key: 'payee', header: 'Payee' },
    { key: 'payment_date', header: 'Date', cell: (row) => formatDate(row.payment_date) },
    { key: 'category', header: 'Category' },
    { key: 'amount', header: 'Amount', cell: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span> },
    { key: 'payment_method', header: 'Method' },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalAmount = vouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
  const pendingAmount = vouchers.filter(v => v.status === 'pending').reduce((sum, v) => sum + (v.amount || 0), 0);
  const paidAmount = vouchers.filter(v => v.status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0);

  return (
    <PermissionGuard permission="finance.payment_vouchers.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view payment vouchers</div>}>
      <div className="space-y-6">
        <PageHeader title="Payment Vouchers" description="Manage payment vouchers and approvals" breadcrumbs={[{ label: 'Finance' }, { label: 'Payment Vouchers' }]}>
          <Can resource="payment_vouchers" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="payment_vouchers" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Create Voucher</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Create Payment Voucher</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Payee *</Label><Input className="mt-1" {...register('payee')} placeholder="Name of payee" /></div>
                    <div><Label>Amount *</Label><Input className="mt-1" type="number" step="0.01" {...register('amount')} /></div>
                    <div><Label>Payment Date *</Label><Input className="mt-1" type="date" {...register('payment_date')} /></div>
                    <div><Label>Payment Method *</Label>
                      <Select onValueChange={(v) => register('payment_method').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="check">Check</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Category *</Label><Input className="mt-1" {...register('category')} placeholder="e.g., Office Supplies" /></div>
                    <div><Label>Reference</Label><Input className="mt-1" {...register('reference')} placeholder="e.g., INV-001" /></div>
                    <div className="col-span-2"><Label>Description *</Label><Input className="mt-1" {...register('description')} /></div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Voucher</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Amount" value={formatCurrency(totalAmount)} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending" value={formatCurrency(pendingAmount)} icon={<FileText className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Paid" value={formatCurrency(paidAmount)} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
          <KPICard title="Total Vouchers" value={vouchers.length} icon={<FileText className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search vouchers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredVouchers}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewVoucher(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'pending' && (
                      <Can resource="payment_vouchers" action="approve">
                        <DropdownMenuItem onClick={() => approveVoucher(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status === 'approved' && (
                      <Can resource="payment_vouchers" action="pay">
                        <DropdownMenuItem onClick={() => processPayment(row)}><Printer className="h-4 w-4 mr-2" />Process Payment</DropdownMenuItem>
                      </Can>
                    )}
                    {row.status !== 'paid' && (
                      <Can resource="payment_vouchers" action="delete">
                        <DropdownMenuItem onClick={() => { setVoucherToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
            <DialogHeader><DialogTitle>Payment Voucher Details</DialogTitle></DialogHeader>
            {selectedVoucher && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Voucher:</span> {selectedVoucher.voucher_number}</div>
                  <div><span className="text-gray-500">Payee:</span> {selectedVoucher.payee}</div>
                  <div><span className="text-gray-500">Date:</span> {formatDate(selectedVoucher.payment_date)}</div>
                  <div><span className="text-gray-500">Amount:</span> {formatCurrency(selectedVoucher.amount)}</div>
                  <div><span className="text-gray-500">Category:</span> {selectedVoucher.category}</div>
                  <div><span className="text-gray-500">Method:</span> {selectedVoucher.payment_method}</div>
                  <div className="col-span-2"><span className="text-gray-500">Description:</span> {selectedVoucher.description}</div>
                  <div className="col-span-2"><span className="text-gray-500">Status:</span> <StatusBadge status={selectedVoucher.status} /></div>
                  {selectedVoucher.reference && <div className="col-span-2"><span className="text-gray-500">Reference:</span> {selectedVoucher.reference}</div>}
                  {selectedVoucher.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedVoucher.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Voucher"
          description="Are you sure you want to delete this payment voucher? This action cannot be undone."
          onConfirm={deleteVoucher}
        />
      </div>
    </PermissionGuard>
  );
}
