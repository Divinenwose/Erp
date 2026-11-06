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
import { AlertTriangle, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const incidentSchema = z.object({
  incident_type: z.enum(['injury', 'near_miss', 'property_damage', 'equipment_failure', 'fire', 'chemical_spill', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1, 'Description is required'),
  location: z.string().optional(),
  occurred_at: z.string().min(1, 'Incident date is required'),
  reported_by: z.string().optional(),
  notes: z.string().optional(),
});
type IncidentForm = z.infer<typeof incidentSchema>;

export default function IncidentsPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canCreate = isAdmin || hasPermission('manufacturing.incidents.create');
  const canEdit = isAdmin || hasPermission('manufacturing.incidents.edit');
  const canDelete = isAdmin || hasPermission('manufacturing.incidents.delete');
  const canResolve = isAdmin || hasPermission('manufacturing.incidents.resolve');

  const [incidents, setIncidents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ open: 0, investigating: 0, resolved: 0, critical: 0 });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { severity: 'medium', incident_type: 'other' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [incRes, empRes] = await Promise.all([
      supabase
        .from('manufacturing_incidents')
        .select('*, reported_profile:profiles!manufacturing_incidents_reported_by_fkey(first_name, last_name), resolved_profile:profiles!manufacturing_incidents_resolved_by_fkey(first_name, last_name), created_profile:profiles!manufacturing_incidents_created_by_fkey(first_name, last_name)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('employee_directory').select('id, first_name, last_name').eq('company_id', company.id),
    ]);

    if (incRes.error) {
      console.error('Error loading incidents:', incRes.error);
      toast.error('Failed to load incidents');
    }
    setIncidents(incRes.data ?? []);
    setEmployees(empRes.data ?? []);

    const open = incRes.data?.filter(i => i.status === 'open').length || 0;
    const investigating = incRes.data?.filter(i => i.status === 'investigating').length || 0;
    const resolved = incRes.data?.filter(i => i.status === 'resolved').length || 0;
    const critical = incRes.data?.filter(i => i.severity === 'critical' && i.status !== 'resolved').length || 0;
    setStats({ open, investigating, resolved, critical });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (i: any) => {
    setEditIncident(i);
    reset({
      incident_type: i.incident_type,
      severity: i.severity,
      description: i.description,
      location: i.location ?? '',
      occurred_at: i.occurred_at,
      reported_by: i.reported_by ?? '',
      notes: i.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: IncidentForm) => {
    if (!company?.id || !currentUser?.id) return;

    const incidentNumber = `INC-${Date.now()}`;

    if (editIncident) {
      const { error } = await supabase
        .from('manufacturing_incidents')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', editIncident.id);

      if (error) {
        toast.error('Failed to update incident');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'updated',
          module: 'manufacturing',
          entity_type: 'manufacturing_incidents',
          record_id: editIncident.id,
        });
      }

      toast.success('Incident updated');
    } else {
      const { error } = await supabase.from('manufacturing_incidents').insert({
        company_id: company.id,
        incident_number: incidentNumber,
        ...data,
        status: 'open',
        created_by: currentUser.id,
      });

      if (error) {
        toast.error('Failed to report incident');
        return;
      }

      if (company?.id && currentUser?.id) {
        await logAuditEvent(company.id, currentUser.id, {
          action: 'created',
          module: 'manufacturing',
          entity_type: 'manufacturing_incidents',
          new_value: { incidentNumber },
        });
      }

      toast.success('Incident reported');
    }

    reset();
    setEditIncident(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id || !currentUser?.id) return;
    setDeleting(true);

    const { error } = await supabase.from('manufacturing_incidents').delete().eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete incident');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'deleted',
        module: 'manufacturing',
        entity_type: 'manufacturing_incidents',
        record_id: deleteId,
      });
      toast.success('Incident deleted');
    }

    setDeleting(false);
    setDeleteId(null);
    load();
  };

  const handleResolve = async (i: any) => {
    if (!canResolve || !company?.id || !currentUser?.id) return;

    const { error } = await supabase
      .from('manufacturing_incidents')
      .update({
        status: 'resolved',
        resolved_by: currentUser.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', i.id);

    if (error) {
      toast.error('Failed to resolve incident');
    } else {
      await logAuditEvent(company.id, currentUser.id, {
        action: 'resolved',
        module: 'manufacturing',
        entity_type: 'manufacturing_incidents',
        record_id: i.id,
      });
      toast.success('Incident resolved');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'incident_number', header: 'Incident #', sortable: true },
    { key: 'incident_type', header: 'Type', sortable: true },
    { key: 'severity', header: 'Severity', sortable: true },
    { key: 'location', header: 'Location', sortable: true },
    { key: 'occurred_at', header: 'Occurred', sortable: true, cell: (v) => format(new Date(v), 'MMM dd, yyyy HH:mm') },
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
            {row.status !== 'resolved' && canResolve && <DropdownMenuItem onClick={() => handleResolve(row)}>Resolve</DropdownMenuItem>}
            {canDelete && <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Incidents" description="Track and manage incidents" breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: 'Incidents' }]}>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditIncident(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> Report Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editIncident ? 'Edit Incident' : 'Report Incident'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select {...register('incident_type')} defaultValue="other">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="injury">Injury</SelectItem>
                        <SelectItem value="near_miss">Near Miss</SelectItem>
                        <SelectItem value="property_damage">Property Damage</SelectItem>
                        <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                        <SelectItem value="fire">Fire</SelectItem>
                        <SelectItem value="chemical_spill">Chemical Spill</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.incident_type && <p className="text-red-500 text-sm">{errors.incident_type.message}</p>}
                  </div>
                  <div>
                    <Label>Severity *</Label>
                    <Select {...register('severity')} defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.severity && <p className="text-red-500 text-sm">{errors.severity.message}</p>}
                  </div>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea {...register('description')} placeholder="Describe the incident" rows={3} />
                  {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Input {...register('location')} placeholder="Location" />
                  </div>
                  <div>
                    <Label>Occurred At *</Label>
                    <Input type="datetime-local" {...register('occurred_at')} />
                    {errors.occurred_at && <p className="text-red-500 text-sm">{errors.occurred_at.message}</p>}
                  </div>
                </div>
                <div>
                  <Label>Reported By</Label>
                  <Select {...register('reported_by')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} placeholder="Additional notes" rows={2} />
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
        <KPICard title="Open" value={stats.open} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Investigating" value={stats.investigating} icon={<Clock className="h-4 w-4 text-yellow-600" />} iconBg="bg-yellow-50 dark:bg-yellow-950/50" loading={loading} />
        <KPICard title="Resolved" value={stats.resolved} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Critical" value={stats.critical} icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={incidents}
        loading={loading}
        searchable
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Incident"
        description="Are you sure you want to delete this incident? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
