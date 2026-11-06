'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/audit';
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
import { ShieldCheck, Plus, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const inspectionSchema = z.object({
  inspection_type: z.enum(['incoming', 'in_process', 'final', 'outgoing', 'other']),
  product_id: z.string().optional(),
  work_order_id: z.string().optional(),
  production_run_id: z.string().optional(),
  inspection_date: z.string().min(1, 'Inspection date is required'),
  inspector_id: z.string().optional(),
  result: z.enum(['pass', 'fail', 'conditional']),
  notes: z.string().optional(),
});
type InspectionForm = z.infer<typeof inspectionSchema>;

export default function QualityPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.quality.create');
  const canEdit = isAdmin || hasPermission('manufacturing.quality.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.quality.delete');
  const canApprove = isAdmin || hasPermission('manufacturing.quality.approve');
  const canReject = isAdmin || hasPermission('manufacturing.quality.reject');

  const [inspections, setInspections] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [productionRuns, setProductionRuns] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInspection, setEditInspection] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ pending: 0, passed: 0, failed: 0, conditional: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InspectionForm>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: { inspection_type: 'in_process', result: 'pass' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [inspRes, prodRes, woRes, prRes, empRes] = await Promise.all([
      supabase
        .from('quality_inspections')
        .select('*, products(name), work_orders(work_order_number), production_runs(run_number), inspector_profile:profiles!quality_inspections_inspector_id_fkey(first_name, last_name), created_profile:profiles!quality_inspections_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name').eq('company_id', company.id),
      supabase.from('work_orders').select('id, work_order_number').eq('company_id', company.id),
      supabase.from('production_runs').select('id, run_number').eq('company_id', company.id),
      supabase.from('employee_directory').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    if (inspRes.error) {
      console.error('Error loading inspections:', inspRes.error);
      toast.error('Failed to load inspections');
    }
    setInspections(inspRes.data ?? []);
    setProducts(prodRes.data ?? []);
    setWorkOrders(woRes.data ?? []);
    setProductionRuns(prRes.data ?? []);
    setEmployees(empRes.data ?? []);

    const pending = inspRes.data?.filter(i => i.status === 'pending').length || 0;
    const passed = inspRes.data?.filter(i => i.result === 'pass').length || 0;
    const failed = inspRes.data?.filter(i => i.result === 'fail').length || 0;
    const conditional = inspRes.data?.filter(i => i.result === 'conditional').length || 0;
    setStats({ pending, passed, failed, conditional });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (insp: any) => {
    setEditInspection(insp);
    reset({
      inspection_type: insp.inspection_type,
      product_id: insp.product_id ?? '',
      work_order_id: insp.work_order_id ?? '',
      production_run_id: insp.production_run_id ?? '',
      inspection_date: insp.inspection_date,
      inspector_id: insp.inspector_id ?? '',
      result: insp.result,
      notes: insp.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: InspectionForm) => {
    if (!company?.id || !currentUser?.id) return;

    const inspectionNumber = `QI-${Date.now()}`;

    if (editInspection) {
      const { error } = await supabase
        .from('quality_inspections')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editInspection.id);

      if (error) {
        toast.error('Failed to update inspection');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'quality_inspections',
          record_id: editInspection.id,
        });
      }

      toast.success('Inspection updated');
    } else {
      const { error } = await supabase.from('quality_inspections').insert({
        company_id: company.id,
        inspection_number: inspectionNumber,
        ...data,
        status: 'pending',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to create inspection');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'quality_inspections',
          new_value: { inspectionNumber },
        });
      }

      toast.success('Inspection created');
    }

    reset();
    setEditInspection(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('quality_inspections').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete inspection');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'quality_inspections',
        record_id: deleteId,
      });
      toast.success('Inspection deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleApprove = async (insp: any) => {
    if (!canApprove || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('quality_inspections')
      .update({
        status: 'completed',
        result: 'pass',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', insp.id);

    if (error) {
      toast.error('Failed to approve inspection');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'approved',
        module: 'manufacturing',
        entity_type: 'quality_inspections',
        record_id: insp.id,
      });
      toast.success('Inspection approved');
      load();
    }
  };

  const handleReject = async (insp: any) => {
    if (!canReject || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('quality_inspections')
      .update({
        status: 'completed',
        result: 'fail',
        approved_by: currentUser.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', insp.id);

    if (error) {
      toast.error('Failed to reject inspection');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'rejected',
        module: 'manufacturing',
        entity_type: 'quality_inspections',
        record_id: insp.id,
      });
      toast.success('Inspection rejected');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'inspection_number', header: 'Inspection #', sortable: true },
    { key: 'inspection_type', header: 'Type', sortable: true },
    { key: 'products', header: 'Product', cell: (v) => v?.name || '-' },
    { key: 'work_orders', header: 'Work Order', cell: (v) => v?.work_order_number || '-' },
    { key: 'inspection_date', header: 'Inspection Date', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy') },
    {
      key: 'result',
      header: 'Result',
      sortable: true,
      cell: (v) => (
        <span className={`font-medium text-xs ${
          v === 'pass' ? 'text-emerald-600' : v === 'fail' ? 'text-red-600' : 'text-amber-600'
        }`}>
          {v?.toUpperCase() || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={() => openEdit(row)}>Edit</DropdownMenuItem>}
            {row.status === 'pending' && canApprove && <DropdownMenuItem onClick={() => handleApprove(row)}>Approve</DropdownMenuItem>}
            {row.status === 'pending' && canReject && <DropdownMenuItem onClick={() => handleReject(row)}>Reject</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Inspections" description="Quality control and inspections" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Quality' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditInspection(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editInspection ? 'Edit Inspection' : 'New Inspection'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Inspection Type *</Label>
                  <Select {...register('inspection_type')} defaultValue="in_process">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="in_process">In Process</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="outgoing">Outgoing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.inspection_type && <p className="text-red-500 text-sm">{errors.inspection_type.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product</Label>
                    <Select {...register('product_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Work Order</Label>
                    <Select {...register('work_order_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work order" />
                      </SelectTrigger>
                      <SelectContent>
                        {workOrders.map(wo => <SelectItem key={wo.id} value={wo.id}>{wo.work_order_number}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Production Run</Label>
                  <Select {...register('production_run_id')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select production run" />
                    </SelectTrigger>
                    <SelectContent>
                      {productionRuns.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.run_number}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Inspection Date *</Label>
                    <Input type="date" {...register('inspection_date')} />
                    {errors.inspection_date && <p className="text-red-500 text-sm">{errors.inspection_date.message}</p>}
                  </div>
                  <div>
                    <Label>Inspector</Label>
                    <Select {...register('inspector_id')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inspector" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Result *</Label>
                  <Select {...register('result')} defaultValue="pass">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                      <SelectItem value="conditional">Conditional</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.result && <p className="text-red-500 text-sm">{errors.result.message}</p>}
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Inspection notes" rows={2} />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Pending" value={stats.pending} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Passed" value={stats.passed} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Failed" value={stats.failed} icon={<XCircle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Conditional" value={stats.conditional} icon={<ShieldCheck className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={inspections}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Inspection"
        description="Are you sure you want to delete this inspection? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
