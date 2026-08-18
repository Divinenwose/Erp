'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function VendorQuotationsPage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formVendor, setFormVendor] = useState('');
  const [formQuotationNumber, setFormQuotationNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');

  const columns = [
    { key: 'quotationNumber', header: 'Quotation #' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'description', header: 'Description' },
    { key: 'amount', header: 'Amount' },
    { key: 'validUntil', header: 'Valid Until' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadData();
  }, [company?.id, selectedVendor, selectedStatus]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from('vendor_quotations')
      .select('*, vendors(name)')
      .eq('company_id', company.id);

    if (selectedVendor) query = query.eq('vendor_id', selectedVendor);
    if (selectedStatus) query = query.eq('status', selectedStatus);

    const [quotesRes, vendorsRes] = await Promise.all([
      query.order('created_at', { ascending: false }),
      supabase.from('vendors').select('id, name').eq('company_id', company.id),
    ]);

    setQuotations(quotesRes.data ?? []);
    setVendors(vendorsRes.data ?? []);
    setLoading(false);
  };

  const handleSaveQuotation = async () => {
    if (!company?.id) return;
    if (!formVendor || !formDescription.trim() || !formAmount) {
      toast.error('Vendor, description, and amount are required');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('vendor_quotations').insert({
      company_id: company.id,
      vendor_id: formVendor,
      quotation_number: formQuotationNumber.trim() || null,
      description: formDescription.trim(),
      amount: parseFloat(formAmount),
      valid_until: formValidUntil || null,
      status: 'pending',
    });
    setSubmitting(false);

    if (error) {
      toast.error('Failed to save quotation');
      return;
    }

    toast.success('Quotation saved');
    setFormVendor(''); setFormQuotationNumber(''); setFormDescription(''); setFormAmount(''); setFormValidUntil('');
    setDialogOpen(false);
    loadData();
  };

  const updateStatus = async (quotation: any, status: string) => {
    const { error } = await supabase.from('vendor_quotations').update({ status }).eq('id', quotation.id);
    if (error) {
      toast.error('Failed to update quotation');
      return;
    }
    toast.success(`Quotation ${status}`);
    loadData();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    const s = status || 'pending';
    return <Badge className={variants[s] || variants.pending}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const effectiveStatus = (q: any) => (q.status === 'pending' && q.valid_until && q.valid_until < today ? 'expired' : q.status || 'pending');

  const filtered = quotations.filter(q => {
    const matchesSearch = !searchTerm || q.description?.toLowerCase().includes(searchTerm.toLowerCase()) || q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const pendingCount = quotations.filter(q => effectiveStatus(q) === 'pending').length;
  const approvedCount = quotations.filter(q => q.status === 'approved').length;
  const totalValue = quotations.filter(q => q.status === 'approved').reduce((sum, q) => sum + (q.amount || 0), 0);

  const formattedData = filtered.map((item) => ({
    ...item,
    quotationNumber: item.quotation_number || '-',
    vendor: item.vendors?.name || '-',
    description: item.description,
    amount: `$${(item.amount || 0).toFixed(2)}`,
    validUntil: item.valid_until ? format(new Date(item.valid_until), 'MMM dd, yyyy') : '-',
    status: getStatusBadge(effectiveStatus(item)),
    actions: (
      <div className="flex gap-2">
        {effectiveStatus(item) === 'pending' && (
          <>
            <Button size="sm" variant="outline" className="h-8 text-emerald-600" onClick={() => updateStatus(item, 'approved')}>
              Approve
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-red-600" onClick={() => updateStatus(item, 'rejected')}>
              Reject
            </Button>
          </>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Quotations"
        description="Manage vendor quotations and pricing"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Vendor Management', href: '/administration/vendor-management' },
          { label: 'Quotations' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Quotation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vendor Quotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Select value={formVendor} onValueChange={setFormVendor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotationNumber">Quotation Number</Label>
                <Input id="quotationNumber" placeholder="QT-2024-XXX" value={formQuotationNumber} onChange={(e) => setFormQuotationNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" placeholder="Service description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input id="amount" type="number" step="0.01" placeholder="0.00" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input id="validUntil" type="date" value={formValidUntil} onChange={(e) => setFormValidUntil(e.target.value)} />
                </div>
              </div>
              <Button className="w-full" onClick={handleSaveQuotation} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save Quotation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold">{loading ? '—' : pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold">{loading ? '—' : approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved Value</p>
                <p className="text-2xl font-bold">{loading ? '—' : `$${totalValue.toLocaleString()}`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedVendor || 'all'} onValueChange={(v) => setSelectedVendor(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No quotations yet"
          />
        </CardContent>
      </Card>
    </div>
  );
}
