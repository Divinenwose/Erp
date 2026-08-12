'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
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
import { Briefcase, Plus, Search, AlertTriangle, CheckCircle2, Package, MoreHorizontal, Edit, MapPin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const assetSchema = z.object({
  name: z.string().min(1, 'Required'),
  asset_type: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  barcode: z.string().optional(),
  purchase_date: z.string().optional(),
  purchase_price: z.coerce.number().min(0).default(0),
  location: z.string().optional(),
  condition: z.string().default('good'),
  warranty_expiry: z.string().optional(),
  department_id: z.string().optional(),
  branch_id: z.string().optional(),
});
type AssetForm = z.infer<typeof assetSchema>;

const lifecycleSchema = z.object({
  event_type: z.string().min(1, 'Required'),
  assigned_to: z.string().optional(),
  new_location: z.string().optional(),
  department_id: z.string().optional(),
  branch_id: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});
type LifecycleForm = z.infer<typeof lifecycleSchema>;

export default function AssetsPage() {
  const { company, user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lifecycleDialogOpen, setLifecycleDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [lifecycleEvents, setLifecycleEvents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AssetForm>({ resolver: zodResolver(assetSchema), defaultValues: { condition: 'good' } });
  const { register: registerLifecycle, handleSubmit: handleLifecycleSubmit, reset: resetLifecycle, formState: { errors: lifecycleErrors, isSubmitting: isLifecycleSubmitting } } = useForm<LifecycleForm>();

  const load = async () => {
    if (!company?.id) return;
    const [assetsData, deptsData, branchesData, employeesData] = await Promise.all([
      supabase.from('assets').select('*, departments(name), employees(first_name, last_name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('company_id', company.id),
      supabase.from('branches').select('*').eq('company_id', company.id),
      supabase.from('profiles').select('id, first_name, last_name').eq('company_id', company.id),
    ]);
    setAssets(assetsData.data ?? []);
    setDepartments(deptsData.data ?? []);
    setBranches(branchesData.data ?? []);
    setEmployees(employeesData.data ?? []);
    setLoading(false);
  };

  const loadLifecycleEvents = async (assetId: string) => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('asset_lifecycle_events')
      .select('*, profiles(first_name, last_name), departments(name), branches(name)')
      .eq('company_id', company.id)
      .eq('asset_id', assetId)
      .order('event_date', { ascending: false });
    setLifecycleEvents(data ?? []);
  };

  useEffect(() => { load(); }, [company?.id]);

  const onSubmit = async (data: AssetForm) => {
    if (!company?.id) return;
    const num = `AST-${String(assets.length + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('assets').insert({ ...data, company_id: company.id, asset_number: num, status: 'active', current_value: data.purchase_price });
    if (error) { toast.error('Failed to register asset'); return; }
    toast.success('Asset registered');
    reset(); setDialogOpen(false); load();
  };

  const onLifecycleSubmit = async (data: LifecycleForm) => {
    if (!company?.id || !selectedAsset) return;
    
    const previous_status = selectedAsset.status;
    const new_status = data.event_type === 'retired' ? 'retired' : data.event_type === 'disposed' ? 'disposed' : selectedAsset.status;
    
    const { error } = await supabase.from('asset_lifecycle_events').insert({
      company_id: company.id,
      asset_id: selectedAsset.id,
      event_type: data.event_type,
      previous_status,
      new_status,
      assigned_to: data.assigned_to,
      previous_location: selectedAsset.location,
      new_location: data.new_location,
      department_id: data.department_id,
      branch_id: data.branch_id,
      cost: data.cost,
      notes: data.notes,
      performed_by: user?.id,
    });

    if (error) { toast.error('Failed to record lifecycle event'); return; }

    // Update asset if status changed
    if (new_status !== previous_status) {
      await supabase.from('assets').update({ 
        status: new_status,
        location: data.new_location || selectedAsset.location,
        department_id: data.department_id,
        branch_id: data.branch_id,
      }).eq('id', selectedAsset.id);
    }

    toast.success('Lifecycle event recorded');
    resetLifecycle();
    setLifecycleDialogOpen(false);
    load();
    if (selectedAsset) loadLifecycleEvents(selectedAsset.id);
  };

  const openLifecycleDialog = (asset: any) => {
    setSelectedAsset(asset);
    loadLifecycleEvents(asset.id);
    setLifecycleDialogOpen(true);
  };

  const filtered = assets.filter(a => !search || `${a.name} ${a.asset_type ?? ''} ${a.brand ?? ''} ${a.serial_number ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const active = assets.filter(a => a.status === 'active').length;
  const totalValue = assets.reduce((a, asset) => a + (asset.current_value ?? 0), 0);
  const expiringSoon = assets.filter(a => a.warranty_expiry && new Date(a.warranty_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

  const conditionColors: Record<string, string> = {
    excellent: 'text-emerald-600',
    good: 'text-blue-600',
    fair: 'text-amber-600',
    poor: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <PermissionGuard permission="assets.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view assets</div>}>
        <PageHeader title="Asset Management" description="Track and manage company assets" breadcrumbs={[{ label: 'Administration' }, { label: 'Assets' }]}>
          <PermissionGuard permission="assets.create">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Register Asset</Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Asset Name *</Label><Input className="mt-1" {...register('name')} /></div>
                <div><Label>Asset Type</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('asset_type')}>
                    <option value="">Select type</option>
                    <option value="computer">Computer</option>
                    <option value="furniture">Furniture</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="machinery">Machinery</option>
                    <option value="equipment">Equipment</option>
                    <option value="software">Software License</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><Label>Condition</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('condition')}>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div><Label>Brand</Label><Input className="mt-1" {...register('brand')} /></div>
                <div><Label>Model</Label><Input className="mt-1" {...register('model')} /></div>
                <div><Label>Serial Number</Label><Input className="mt-1" {...register('serial_number')} /></div>
                <div><Label>Barcode</Label><Input className="mt-1" {...register('barcode')} placeholder="Scan or enter barcode" /></div>
                <div><Label>Purchase Date</Label><Input className="mt-1" type="date" {...register('purchase_date')} /></div>
                <div><Label>Purchase Price</Label><Input className="mt-1" type="number" step="0.01" {...register('purchase_price')} /></div>
                <div><Label>Warranty Expiry</Label><Input className="mt-1" type="date" {...register('warranty_expiry')} /></div>
                <div className="col-span-2"><Label>Location</Label><Input className="mt-1" placeholder="e.g. Office Floor 2, Room 203" {...register('location')} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>Register Asset</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </PermissionGuard>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Assets" value={assets.length} icon={<Briefcase className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active" value={active} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Value" value={formatCurrency(totalValue)} icon={<Package className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Warranty Expiring" value={expiringSoon} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search assets..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Briefcase className="h-12 w-12" />} title="No assets registered" description="Register your first company asset" action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Register Asset</Button>} />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filtered.map(a => (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.asset_number} · {a.brand ?? ''} {a.model ?? ''} · {a.asset_type ?? 'Other'}</p>
                  </div>
                  {a.location && <div className="hidden md:flex items-center gap-1 text-xs text-gray-400"><MapPin className="h-3.5 w-3.5" />{a.location}</div>}
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden lg:block">{formatCurrency(a.current_value ?? 0)}</div>
                  <span className={`text-xs font-medium ${conditionColors[a.condition] ?? 'text-gray-500'} hidden sm:inline`}>{a.condition}</span>
                  <StatusBadge status={a.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openLifecycleDialog(a)}><Briefcase className="h-4 w-4 mr-2" />View Lifecycle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openLifecycleDialog(a)}><Edit className="h-4 w-4 mr-2" />Update Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openLifecycleDialog(a)}><MapPin className="h-4 w-4 mr-2" />Transfer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Dialog */}
      <Dialog open={lifecycleDialogOpen} onOpenChange={setLifecycleDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Lifecycle - {selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Lifecycle Events History */}
            <div>
              <h3 className="text-sm font-medium mb-3">Lifecycle History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lifecycleEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No lifecycle events recorded</p>
                ) : (
                  lifecycleEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">{event.event_type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(event.event_date)} · {event.profiles ? `${event.profiles.first_name} ${event.profiles.last_name}` : 'System'}
                        </p>
                        {event.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{event.notes}</p>}
                        {(event.previous_status || event.new_status) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Status: {event.previous_status || 'N/A'} → {event.new_status || 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Lifecycle Event Form */}
            <div className="border-t dark:border-gray-800 pt-4">
              <h3 className="text-sm font-medium mb-3">Record New Event</h3>
              <form onSubmit={handleLifecycleSubmit(onLifecycleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Event Type *</Label>
                    <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...registerLifecycle('event_type')}>
                      <option value="">Select event type</option>
                      <option value="assigned">Assign</option>
                      <option value="transferred">Transfer</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="repair">Repair</option>
                      <option value="retired">Retire</option>
                      <option value="disposed">Dispose</option>
                      <option value="upgraded">Upgrade</option>
                    </select>
                  </div>
                  <div>
                    <Label>Assign To</Label>
                    <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...registerLifecycle('assigned_to')}>
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>New Location</Label>
                    <Input className="mt-1" placeholder="e.g. Office Floor 3" {...registerLifecycle('new_location')} />
                  </div>
                  <div>
                    <Label>Cost</Label>
                    <Input className="mt-1" type="number" step="0.01" placeholder="0.00" {...registerLifecycle('cost')} />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...registerLifecycle('department_id')}>
                      <option value="">Select department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...registerLifecycle('branch_id')}>
                      <option value="">Select branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Input className="mt-1" placeholder="Additional details..." {...registerLifecycle('notes')} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setLifecycleDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLifecycleSubmitting}>Record Event</Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </PermissionGuard>
    </div>
  );
}
