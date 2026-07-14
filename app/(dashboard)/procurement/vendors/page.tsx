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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Search, Star, MoreHorizontal, Mail, Phone, Edit, Trash2 } from 'lucide-react';
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
  payment_terms: z.coerce.number().default(30),
});
type VendorForm = z.infer<typeof vendorSchema>;

export default function VendorsPage() {
  const { company } = useAuth();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<VendorForm>({ resolver: zodResolver(vendorSchema), defaultValues: { payment_terms: 30 } });

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('vendors').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    setVendors(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: VendorForm) => {
    if (!company?.id) return;
    const num = `VEN-${String(vendors.length + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('vendors').insert({ ...data, company_id: company.id, vendor_number: num });
    if (error) { toast.error('Failed to create vendor'); return; }
    toast.success('Vendor added');
    reset(); setDialogOpen(false); load();
  };

  const filtered = vendors.filter(v => !search || `${v.name} ${v.email ?? ''} ${v.category ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const active = vendors.filter(v => v.status === 'active').length;
  const categories = Array.from(new Set(vendors.map(v => v.category).filter(Boolean))).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" description="Manage your supplier relationships" breadcrumbs={[{ label: 'Procurement' }, { label: 'Vendors' }]}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Vendor Name *</Label><Input className="mt-1" {...register('name')} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}</div>
                <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                <div><Label>Category</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('category')}>
                    <option value="">Select category</option>
                    <option value="technology">Technology</option>
                    <option value="office_supplies">Office Supplies</option>
                    <option value="logistics">Logistics</option>
                    <option value="professional_services">Professional Services</option>
                    <option value="utilities">Utilities</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Payment Terms (days)</Label><Input className="mt-1" type="number" {...register('payment_terms')} /></div>
                <div className="col-span-2"><Label>Address</Label><Input className="mt-1" {...register('address')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Add Vendor</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Vendors" value={vendors.length} icon={<Building2 className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<Building2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Categories" value={categories} icon={<Building2 className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Avg Payment Terms" value={`${Math.round(vendors.reduce((a, v) => a + (v.payment_terms ?? 0), 0) / Math.max(vendors.length, 1))} days`} icon={<Building2 className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search vendors..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Building2 className="h-12 w-12" />} title="No vendors yet" description="Add your first vendor to get started" action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Vendor</Button>} />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filtered.map(v => (
                <div key={v.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{v.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{v.category?.replace(/_/g, ' ') ?? 'Other'}</p>
                  </div>
                  {v.email && <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400"><Mail className="h-3.5 w-3.5" /><span>{v.email}</span></div>}
                  {v.phone && <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400"><Phone className="h-3.5 w-3.5" /><span>{v.phone}</span></div>}
                  <div className="text-xs text-gray-400 hidden lg:block">{v.payment_terms ?? 30} days</div>
                  <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < (v.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />)}</div>
                  <StatusBadge status={v.status ?? 'active'} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
