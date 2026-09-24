'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileSignature, Plus, Edit, Trash2, CheckCircle, DollarSign, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const contractSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required'),
  contract_number: z.string().optional(),
  contract_type: z.enum(['retainer', 'project', 'service', 'licensing', 'sponsorship', 'other']),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  contract_value: z.string().optional(),
  payment_terms: z.string().optional(),
  deliverables: z.string().optional(),
  contract_document_url: z.string().optional(),
});
type ContractForm = z.infer<typeof contractSchema>;

export default function MarketingContractsPage() {
  const { company, user: currentUser } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContract, setEditContract] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ active: 0, pending: 0, expired: 0, totalValue: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: { contract_type: 'service' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [contractRes, vendorRes] = await Promise.all([
      supabase
        .from('marketing_contracts')
        .select('*, vendors(vendor_name), created_by_profile:profiles!marketing_contracts_created_by_fkey(first_name, last_name), approved_by_profile:profiles!marketing_contracts_approved_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('marketing_vendors').select('id, vendor_name').eq('company_id', company.id).eq('status', 'active'),
    ]);

    if (contractRes.error) {
      console.error('Error loading contracts:', contractRes.error);
      toast.error('Failed to load contracts');
    }
    setContracts(contractRes.data ?? []);
    setVendors(vendorRes.data ?? []);

    // Calculate stats
    const active = contractRes.data?.filter(c => c.status === 'active').length || 0;
    const pending = contractRes.data?.filter(c => c.status === 'pending').length || 0;
    const expired = contractRes.data?.filter(c => c.status === 'expired').length || 0;
    const totalValue = contractRes.data?.reduce((sum, c) => sum + (c.contract_value || 0), 0) || 0;
    setStats({ active, pending, expired, totalValue });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (contract: any) => {
    setEditContract(contract);
    reset({
      vendor_id: contract.vendor_id,
      contract_number: contract.contract_number ?? '',
      contract_type: contract.contract_type,
      description: contract.description ?? '',
      start_date: contract.start_date,
      end_date: contract.end_date ?? '',
      contract_value: contract.contract_value?.toString() ?? '',
      payment_terms: contract.payment_terms ?? '',
      deliverables: contract.deliverables?.join(', ') ?? '',
      contract_document_url: contract.contract_document_url ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ContractForm) => {
    if (!company?.id) return;

    const deliverables = data.deliverables ? data.deliverables.split(',').map(d => d.trim()).filter(d => d) : [];

    if (editContract) {
      const { error } = await supabase
        .from('marketing_contracts')
        .update({
          vendor_id: data.vendor_id,
          contract_number: data.contract_number,
          contract_type: data.contract_type,
          description: data.description,
          start_date: data.start_date,
          end_date: data.end_date || null,
          contract_value: data.contract_value ? parseFloat(data.contract_value) : null,
          payment_terms: data.payment_terms,
          deliverables,
          contract_document_url: data.contract_document_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editContract.id);

      if (error) {
        toast.error('Failed to update contract');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_contract_updated',
        module: 'marketing',
        record_id: editContract.id,
        new_values: { contract_number: data.contract_number },
      });

      toast.success('Contract updated');
    } else {
      const { error } = await supabase.from('marketing_contracts').insert({
        company_id: company.id,
        vendor_id: data.vendor_id,
        contract_number: data.contract_number,
        contract_type: data.contract_type,
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date || null,
        contract_value: data.contract_value ? parseFloat(data.contract_value) : null,
        payment_terms: data.payment_terms,
        deliverables,
        contract_document_url: data.contract_document_url,
        created_by: currentUser?.id,
        status: 'pending',
        approval_status: 'pending',
      });

      if (error) {
        toast.error('Failed to create contract');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_contract_created',
        module: 'marketing',
        new_values: { contract_number: data.contract_number },
      });

      toast.success('Contract created');
    }

    reset();
    setEditContract(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('marketing_contracts')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete contract');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_contract_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Contract deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === 'active') {
      updateData.approved_by = currentUser?.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('marketing_contracts')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'marketing_contract_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'contract_number', header: 'Contract Number', cell: (row) => row.contract_number || '-' },
    { 
      key: 'vendor',
      header: 'Vendor', 
      cell: (row) => row.vendors?.vendor_name || '-'
    },
    { 
      key: 'contract_type',
      header: 'Type', 
      cell: (row) => <Badge variant="outline">{row.contract_type}</Badge>
    },
    { 
      key: 'status',
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status} />
    },
    { 
      key: 'start_date',
      header: 'Start Date', 
      cell: (row) => row.start_date ? format(new Date(row.start_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'end_date',
      header: 'End Date', 
      cell: (row) => row.end_date ? format(new Date(row.end_date), 'MMM dd, yyyy') : '-'
    },
    { 
      key: 'contract_value',
      header: 'Value', 
      cell: (row) => row.contract_value ? `$${row.contract_value.toLocaleString()}` : '-'
    },
    { 
      key: 'approved_by',
      header: 'Approved By', 
      cell: (row) => row.approved_by_profile 
        ? `${row.approved_by_profile.first_name} ${row.approved_by_profile.last_name}` 
        : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="contracts" action="edit">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => openEdit(row)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              {row.status === 'pending' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'active')}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Approve Contract
                </DropdownMenuItem>
              )}
              {row.status === 'active' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'expired')}>
                  <Calendar className="h-4 w-4 mr-2" /> Mark Expired
                </DropdownMenuItem>
              )}
              <Can resource="contracts" action="delete">
                <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </Can>
              {row.contract_document_url && (
                <DropdownMenuItem onClick={() => window.open(row.contract_document_url, '_blank')}>
                  <FileSignature className="h-4 w-4 mr-2" /> View Document
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Contracts" description="Manage vendor contracts and agreements" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Contracts' }]}>
        <Can resource="contracts" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditContract(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Contract
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editContract ? 'Edit Contract' : 'New Contract'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Vendor *</Label>
                  <Controller
                    name="vendor_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.vendor_id && <p className="text-red-500 text-sm mt-1">{errors.vendor_id.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contract Number</Label>
                    <Input {...register('contract_number')} placeholder="CTR-001" />
                  </div>
                  <div>
                    <Label>Contract Type *</Label>
                    <Controller
                      name="contract_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="retainer">Retainer</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="licensing">Licensing</SelectItem>
                            <SelectItem value="sponsorship">Sponsorship</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Contract description" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input type="date" {...register('start_date')} />
                    {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>}
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" {...register('end_date')} />
                  </div>
                </div>
                <div>
                  <Label>Contract Value ($)</Label>
                  <Input type="number" {...register('contract_value')} placeholder="0.00" />
                </div>
                <div>
                  <Label>Payment Terms</Label>
                  <Input {...register('payment_terms')} placeholder="Net 30, etc." />
                </div>
                <div>
                  <Label>Deliverables (comma-separated)</Label>
                  <Input {...register('deliverables')} placeholder="Deliverable 1, Deliverable 2, etc." />
                </div>
                <div>
                  <Label>Contract Document URL</Label>
                  <Input {...register('contract_document_url')} placeholder="https://..." />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editContract ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Contracts" value={stats.active} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Pending Approval" value={stats.pending} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Expired Contracts" value={stats.expired} icon={<FileSignature className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Total Value" value={`$${stats.totalValue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Contract"
        description="Are you sure you want to delete this contract? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
