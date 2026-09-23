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
import { Search, Plus, Edit, Trash2, Users, ClipboardCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';

const researchSchema = z.object({
  research_title: z.string().min(1, 'Title is required'),
  research_type: z.enum(['survey', 'focus_group', 'interview', 'competitor_analysis', 'market_trend', 'customer_feedback', 'other']),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  target_audience: z.string().optional(),
  sample_size: z.string().optional(),
  budget: z.string().optional(),
});
type ResearchForm = z.infer<typeof researchSchema>;

export default function MarketResearchPage() {
  const { company, user: currentUser } = useAuth();
  const [research, setResearch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editResearch, setEditResearch] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0, totalResponses: 0 });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ResearchForm>({
    resolver: zodResolver(researchSchema),
    defaultValues: { research_type: 'survey' },
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('market_research')
      .select('*, conducted_by_profile:profiles!market_research_conducted_by_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading research:', error);
      toast.error('Failed to load research');
    }
    setResearch(data ?? []);

    // Calculate stats
    const total = data?.length || 0;
    const inProgress = data?.filter(r => r.status === 'in_progress').length || 0;
    const completed = data?.filter(r => r.status === 'completed').length || 0;

    // Get total responses
    const researchIds = data?.map(r => r.id) || [];
    const responsesRes = await supabase.from('survey_responses').select('id').in('research_id', researchIds);
    const totalResponses = responsesRes.data?.length || 0;

    setStats({ total, inProgress, completed, totalResponses });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const openEdit = (item: any) => {
    setEditResearch(item);
    reset({
      research_title: item.research_title,
      research_type: item.research_type,
      description: item.description ?? '',
      start_date: item.start_date ?? '',
      end_date: item.end_date ?? '',
      target_audience: item.target_audience ?? '',
      sample_size: item.sample_size?.toString() ?? '',
      budget: item.budget?.toString() ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ResearchForm) => {
    if (!company?.id) return;

    if (editResearch) {
      const { error } = await supabase
        .from('market_research')
        .update({
          research_title: data.research_title,
          research_type: data.research_type,
          description: data.description,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          target_audience: data.target_audience,
          sample_size: data.sample_size ? parseInt(data.sample_size) : null,
          budget: data.budget ? parseFloat(data.budget) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editResearch.id);

      if (error) {
        toast.error('Failed to update research');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'market_research_updated',
        module: 'marketing',
        record_id: editResearch.id,
        new_values: { research_title: data.research_title },
      });

      toast.success('Research updated');
    } else {
      const { error } = await supabase.from('market_research').insert({
        company_id: company.id,
        research_title: data.research_title,
        research_type: data.research_type,
        description: data.description,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        target_audience: data.target_audience,
        sample_size: data.sample_size ? parseInt(data.sample_size) : null,
        budget: data.budget ? parseFloat(data.budget) : null,
        conducted_by: currentUser?.id,
        status: 'planned',
      });

      if (error) {
        toast.error('Failed to create research');
        return;
      }

      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'market_research_created',
        module: 'marketing',
        new_values: { research_title: data.research_title },
      });

      toast.success('Research created');
    }

    reset();
    setEditResearch(null);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId || !company?.id) return;
    setDeleting(true);

    const { error } = await supabase
      .from('market_research')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Failed to delete research');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'market_research_deleted',
        module: 'marketing',
        record_id: deleteId,
      });
      toast.success('Research deleted');
    }

    setDeleteId(null);
    setDeleting(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    if (!company?.id) return;

    const { error } = await supabase
      .from('market_research')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      await logAuditEvent(company.id, currentUser?.id || '', {
        action: 'market_research_status_updated',
        module: 'marketing',
        record_id: id,
        new_values: { status },
      });
      toast.success('Status updated');
      load();
    }
  };

  const columns: Column[] = [
    { key: 'research_title', header: 'Title' },
    { 
      key: 'research_type',
      header: 'Type', 
      cell: (row) => row.research_type?.replace('_', ' ') || '-'
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
      key: 'sample_size',
      header: 'Sample Size', 
      cell: (row) => row.sample_size || '-'
    },
    { 
      key: 'budget',
      header: 'Budget', 
      cell: (row) => row.budget ? `$${row.budget.toLocaleString()}` : '-'
    },
    { 
      key: 'conducted_by',
      header: 'Conducted By', 
      cell: (row) => row.conducted_by_profile 
        ? `${row.conducted_by_profile.first_name} ${row.conducted_by_profile.last_name}` 
        : '-'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Can resource="research" action="edit">
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
              {row.status === 'planned' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'in_progress')}>
                  <Search className="h-4 w-4 mr-2" /> Start Research
                </DropdownMenuItem>
              )}
              {row.status === 'in_progress' && (
                <DropdownMenuItem onClick={() => updateStatus(row.id, 'completed')}>
                  <ClipboardCheck className="h-4 w-4 mr-2" /> Complete Research
                </DropdownMenuItem>
              )}
              <Can resource="research" action="delete">
                <DropdownMenuItem onClick={() => setDeleteId(row.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </Can>
            </DropdownMenuContent>
          </DropdownMenu>
        </Can>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Market Research" description="Manage market research and surveys" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Research' }]}>
        <Can resource="research" action="create">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditResearch(null); reset(); }}>
                <Plus className="h-4 w-4 mr-2" /> New Research
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editResearch ? 'Edit Research' : 'New Research'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input {...register('research_title')} placeholder="Research title" />
                  {errors.research_title && <p className="text-red-500 text-sm mt-1">{errors.research_title.message}</p>}
                </div>
                <div>
                  <Label>Research Type *</Label>
                  <Controller
                    name="research_type"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="survey">Survey</SelectItem>
                          <SelectItem value="focus_group">Focus Group</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="competitor_analysis">Competitor Analysis</SelectItem>
                          <SelectItem value="market_trend">Market Trend</SelectItem>
                          <SelectItem value="customer_feedback">Customer Feedback</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea {...register('description')} placeholder="Research description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" {...register('start_date')} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" {...register('end_date')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Audience</Label>
                    <Input {...register('target_audience')} placeholder="Describe target audience" />
                  </div>
                  <div>
                    <Label>Sample Size</Label>
                    <Input type="number" {...register('sample_size')} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Label>Budget ($)</Label>
                  <Input type="number" {...register('budget')} placeholder="0.00" />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editResearch ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Research" value={stats.total} icon={<Search className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Progress" value={stats.inProgress} icon={<Users className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={stats.completed} icon={<ClipboardCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Responses" value={stats.totalResponses} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={research}
        loading={loading}
        searchable
        filterable
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Research"
        description="Are you sure you want to delete this research? This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}
