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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, Search, FileText, TrendingUp, TrendingDown, CreditCard, MoreHorizontal, Edit, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const invoiceSchema = z.object({
  invoice_number: z.string().min(1, 'Required'),
  issue_date: z.string().min(1, 'Required'),
  due_date: z.string().optional(),
  subtotal: z.coerce.number().min(0),
  tax_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});
type InvoiceForm = z.infer<typeof invoiceSchema>;

const MOCK_INVOICES = [
  { id: '1', invoice_number: 'INV-2024-0089', customer_name: 'Acme Corp', issue_date: '2024-11-01', due_date: '2024-12-01', total_amount: 12500, status: 'paid' },
  { id: '2', invoice_number: 'INV-2024-0090', customer_name: 'TechVision Ltd', issue_date: '2024-11-05', due_date: '2024-12-05', total_amount: 8200, status: 'pending' },
  { id: '3', invoice_number: 'INV-2024-0091', customer_name: 'Global Retail', issue_date: '2024-10-15', due_date: '2024-11-15', total_amount: 3400, status: 'overdue' },
  { id: '4', invoice_number: 'INV-2024-0092', customer_name: 'StartupHub', issue_date: '2024-11-10', due_date: '2024-12-10', total_amount: 5800, status: 'draft' },
  { id: '5', invoice_number: 'INV-2024-0093', customer_name: 'MegaTech Inc', issue_date: '2024-11-12', due_date: '2024-12-12', total_amount: 21000, status: 'pending' },
];

export default function InvoicesPage() {
  const { company } = useAuth();
  const [invoices, setInvoices] = useState(MOCK_INVOICES);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InvoiceForm>({ resolver: zodResolver(invoiceSchema) });

  useEffect(() => {
    if (!company?.id) return;
    supabase.from('customers').select('id, name').eq('company_id', company.id).then(({ data }) => setCustomers(data ?? []));
  }, [company?.id]);

  const onSubmit = async (data: InvoiceForm) => {
    if (!company?.id) return;
    const { error } = await supabase.from('invoices').insert({
      ...data,
      company_id: company.id,
      total_amount: data.subtotal + data.tax_amount,
      balance_due: data.subtotal + data.tax_amount,
      status: 'draft',
    });
    if (error) { toast.error('Failed to create invoice'); return; }
    toast.success('Invoice created');
    reset(); setDialogOpen(false);
  };

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.total_amount, 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((a, i) => a + i.total_amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((a, i) => a + i.total_amount, 0);

  const filtered = invoices.filter(i => {
    const matchSearch = !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || i.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || i.status === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Manage customer invoices and payments" breadcrumbs={[{ label: 'Finance' }, { label: 'Invoices' }]}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Invoice Number *</Label><Input className="mt-1" placeholder="INV-2024-001" {...register('invoice_number')} /></div>
                <div><Label>Issue Date *</Label><Input className="mt-1" type="date" {...register('issue_date')} /></div>
                <div><Label>Due Date</Label><Input className="mt-1" type="date" {...register('due_date')} /></div>
                <div><Label>Subtotal *</Label><Input className="mt-1" type="number" step="0.01" {...register('subtotal')} /></div>
                <div><Label>Tax Amount</Label><Input className="mt-1" type="number" step="0.01" {...register('tax_amount')} /></div>
              </div>
              <div><Label>Notes</Label><textarea className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950 resize-none h-20" {...register('notes')} /></div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Create Invoice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" />
        <KPICard title="Pending" value={formatCurrency(totalPending)} icon={<CreditCard className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" />
        <KPICard title="Overdue" value={formatCurrency(totalOverdue)} icon={<TrendingDown className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" />
        <KPICard title="Total Invoices" value={invoices.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="p-4 border-b dark:border-gray-800">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="overdue">Overdue</TabsTrigger>
                </TabsList>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </Tabs>
          </div>
          <div className="divide-y dark:divide-gray-800">
            {filtered.map(inv => (
              <div key={inv.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{inv.customer_name}</p>
                </div>
                <div className="hidden md:block text-xs text-gray-500">{formatDate(inv.issue_date)}</div>
                <div className="hidden md:block text-xs text-gray-500">{formatDate(inv.due_date)}</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.total_amount)}</div>
                <StatusBadge status={inv.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                    <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
