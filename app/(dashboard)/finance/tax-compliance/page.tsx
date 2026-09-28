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
import { FileText, Plus, Download, Search, MoreHorizontal, Eye, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const taxSchema = z.object({
  tax_type: z.string().min(1, 'Required'),
  tax_period: z.string().min(1, 'Required'),
  due_date: z.string().min(1, 'Required'),
  taxable_amount: z.coerce.number().min(0).default(0),
  tax_amount: z.coerce.number().min(0).default(0),
  status: z.string().default('pending'),
  notes: z.string().optional(),
});
type TaxForm = z.infer<typeof taxSchema>;

export default function TaxCompliancePage() {
  const { company, user } = useAuth();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TaxForm>({ resolver: zodResolver(taxSchema) });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('tax_compliance').select('*').eq('company_id', company.id).order('due_date', { ascending: true });
    setTaxes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: TaxForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('tax_compliance').insert({
      company_id: company.id,
      tax_type: data.tax_type,
      tax_period: data.tax_period,
      due_date: data.due_date,
      taxable_amount: data.taxable_amount,
      tax_amount: data.tax_amount,
      status: data.status,
      notes: data.notes,
      created_by: user?.id,
    });
    if (error) { toast.error('Failed to create tax record'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'created', module: 'tax_compliance', entity_type: 'tax_compliance', new_value: { tax_type: data.tax_type, tax_period: data.tax_period } });
    toast.success('Tax record created');
    reset();
    setDialogOpen(false);
    load();
  };

  const markFiled = async (tax: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('tax_compliance').update({ status: 'filed', filed_at: new Date().toISOString() }).eq('id', tax.id);
    if (error) { toast.error('Failed to mark as filed'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'filed', module: 'tax_compliance', entity_type: 'tax_compliance', entity_id: tax.id, new_value: { status: 'filed' } });
    toast.success('Tax marked as filed');
    load();
  };

  const markPaid = async (tax: any) => {
    if (!company?.id) return;
    const { error } = await supabase.from('tax_compliance').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', tax.id);
    if (error) { toast.error('Failed to mark as paid'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'paid', module: 'tax_compliance', entity_type: 'tax_compliance', entity_id: tax.id, new_value: { status: 'paid' } });
    toast.success('Tax marked as paid');
    load();
  };

  const deleteTax = async () => {
    if (!company?.id || !taxToDelete) return;
    const { error } = await supabase.from('tax_compliance').delete().eq('id', taxToDelete.id);
    if (error) { toast.error('Failed to delete tax record'); return; }
    await logAuditEvent(company.id, user?.id, { action: 'deleted', module: 'tax_compliance', entity_type: 'tax_compliance', entity_id: taxToDelete.id });
    toast.success('Tax record deleted');
    setDeleteDialogOpen(false);
    setTaxToDelete(null);
    load();
  };

  const viewTax = (tax: any) => {
    setSelectedTax(tax);
    setViewDialogOpen(true);
  };

  const filteredTaxes = taxes.filter(t => {
    const matchesSearch = !search || t.tax_type?.toLowerCase().includes(search.toLowerCase()) || t.tax_period?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<any>[] = [
    { key: 'tax_type', header: 'Tax Type' },
    { key: 'tax_period', header: 'Period' },
    { key: 'due_date', header: 'Due Date', cell: (row) => formatDate(row.due_date) },
    { key: 'taxable_amount', header: 'Taxable Amount', cell: (row) => formatCurrency(row.taxable_amount) },
    { key: 'tax_amount', header: 'Tax Amount', cell: (row) => <span className="font-medium">{formatCurrency(row.tax_amount)}</span> },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
  ];

  const totalTaxAmount = taxes.reduce((sum, t) => sum + (t.tax_amount || 0), 0);
  const pendingAmount = taxes.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.tax_amount || 0), 0);
  const overdueCount = taxes.filter(t => t.status === 'pending' && new Date(t.due_date) < new Date()).length;

  return (
    <PermissionGuard permission="finance.tax_compliance.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view tax compliance</div>}>
      <div className="space-y-6">
        <PageHeader title="Tax Compliance" description="Manage tax filings and payments" breadcrumbs={[{ label: 'Finance' }, { label: 'Tax Compliance' }]}>
          <Can resource="tax_compliance" action="export">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </Can>
          <Can resource="tax_compliance" action="create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Tax Record</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Add Tax Record</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Tax Type *</Label>
                      <Select onValueChange={(v) => register('tax_type').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent><SelectItem value="income_tax">Income Tax</SelectItem><SelectItem value="sales_tax">Sales Tax</SelectItem><SelectItem value="vat">VAT</SelectItem><SelectItem value="payroll_tax">Payroll Tax</SelectItem><SelectItem value="property_tax">Property Tax</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label>Tax Period *</Label><Input className="mt-1" {...register('tax_period')} placeholder="e.g., Q4 2024" /></div>
                    <div><Label>Due Date *</Label><Input className="mt-1" type="date" {...register('due_date')} /></div>
                    <div><Label>Taxable Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('taxable_amount')} defaultValue={0} /></div>
                    <div><Label>Tax Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('tax_amount')} defaultValue={0} /></div>
                    <div><Label>Status *</Label>
                      <Select onValueChange={(v) => register('status').onChange({ target: { value: v } })}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="filed">Filed</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label>Notes</Label><Textarea className="mt-1" {...register('notes')} /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Add Record</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </Can>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Tax Liability" value={formatCurrency(totalTaxAmount)} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Pending" value={formatCurrency(pendingAmount)} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
          <KPICard title="Overdue" value={overdueCount} icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
          <KPICard title="Total Records" value={taxes.length} icon={<FileText className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search tax records..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="filed">Filed</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredTaxes}
              loading={loading}
              searchable={false}
              rowKey="id"
              actions={(row) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => viewTax(row)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    {row.status === 'pending' && (
                      <>
                        <Can resource="tax_compliance" action="file">
                          <DropdownMenuItem onClick={() => markFiled(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Mark Filed</DropdownMenuItem>
                        </Can>
                        <Can resource="tax_compliance" action="pay">
                          <DropdownMenuItem onClick={() => markPaid(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Mark Paid</DropdownMenuItem>
                        </Can>
                      </>
                    )}
                    {row.status === 'filed' && (
                      <Can resource="tax_compliance" action="pay">
                        <DropdownMenuItem onClick={() => markPaid(row)}><CheckCircle2 className="h-4 w-4 mr-2" />Mark Paid</DropdownMenuItem>
                      </Can>
                    )}
                    <Can resource="tax_compliance" action="delete">
                      <DropdownMenuItem onClick={() => { setTaxToDelete(row); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </Can>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Tax Record Details</DialogTitle></DialogHeader>
            {selectedTax && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Tax Type:</span> {selectedTax.tax_type}</div>
                  <div><span className="text-gray-500">Period:</span> {selectedTax.tax_period}</div>
                  <div><span className="text-gray-500">Due Date:</span> {formatDate(selectedTax.due_date)}</div>
                  <div><span className="text-gray-500">Taxable Amount:</span> {formatCurrency(selectedTax.taxable_amount)}</div>
                  <div><span className="text-gray-500">Tax Amount:</span> {formatCurrency(selectedTax.tax_amount)}</div>
                  <div><span className="text-gray-500">Status:</span> <StatusBadge status={selectedTax.status} /></div>
                  {selectedTax.filed_at && <div><span className="text-gray-500">Filed At:</span> {formatDate(selectedTax.filed_at)}</div>}
                  {selectedTax.paid_at && <div><span className="text-gray-500">Paid At:</span> {formatDate(selectedTax.paid_at)}</div>}
                  {selectedTax.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span> {selectedTax.notes}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Tax Record"
          description="Are you sure you want to delete this tax record? This action cannot be undone."
          onConfirm={deleteTax}
        />
      </div>
    </PermissionGuard>
  );
}
