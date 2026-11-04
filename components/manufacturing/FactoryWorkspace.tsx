'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Activity, CheckCircle, Clock, Factory, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DataTable, { Column } from '@/components/common/DataTable';
import KPICard from '@/components/common/KPICard';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';

interface FactoryWorkspaceProps {
  title: string;
  description: string;
}

export default function FactoryWorkspace({ title, description }: FactoryWorkspaceProps) {
  const { company } = useAuth();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRuns = async () => {
      if (!company?.id) {
        setRuns([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('production_runs')
        .select('id, run_number, status, quantity_produced, start_time, work_orders(work_order_number, title)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error loading ${title.toLowerCase()} production runs:`, error);
        toast.error(`Failed to load production runs: ${error.message}`);
        setRuns([]);
      } else {
        setRuns(data ?? []);
      }
      setLoading(false);
    };

    loadRuns();
  }, [company?.id, title]);

  const activeRuns = runs.filter(run => run.status === 'in_progress').length;
  const plannedRuns = runs.filter(run => run.status === 'planned').length;
  const completedRuns = runs.filter(run => run.status === 'completed').length;
  const totalProduced = runs.reduce((total, run) => total + Number(run.quantity_produced || 0), 0);

  const columns: Column[] = [
    { key: 'run_number', header: 'Run Number', sortable: true },
    {
      key: 'work_orders',
      header: 'Work Order',
      cell: row => row.work_orders
        ? `${row.work_orders.work_order_number} - ${row.work_orders.title}`
        : 'No work order details',
    },
    { key: 'quantity_produced', header: 'Units Produced', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'start_time',
      header: 'Started',
      sortable: true,
      cell: row => row.start_time ? format(new Date(row.start_time), 'MMM dd, yyyy HH:mm') : 'Not started',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Manufacturing', href: '/manufacturing' }, { label: title }]}
      >
        <Button asChild variant="outline">
          <Link href="/manufacturing/work-orders">
            <Factory className="mr-2 h-4 w-4" />
            Work Orders
          </Link>
        </Button>
        <Button asChild>
          <Link href="/manufacturing/production-runs">
            <Play className="mr-2 h-4 w-4" />
            Manage Production Runs
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard title="Active Runs" value={activeRuns} icon={<Activity className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Planned Runs" value={plannedRuns} icon={<Clock className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed Runs" value={completedRuns} icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Units Produced" value={totalProduced} icon={<Factory className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        This view uses shared production-run records. Existing records are not assigned to a specific factory.
      </p>

      <DataTable
        columns={columns}
        data={runs}
        loading={loading}
        searchable
        searchKeys={['run_number', 'status']}
        emptyTitle="No production runs"
        emptyDescription="Create a production run to track factory output."
        emptyAction={
          <Button asChild>
            <Link href="/manufacturing/production-runs">Open Production Runs</Link>
          </Button>
        }
      />
    </div>
  );
}
