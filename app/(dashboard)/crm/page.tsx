'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import { formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Target, TrendingUp, DollarSign, FileText, Calendar, Phone, Building2, Award } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function CRMOverviewPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    totalLeads: 0,
    activeLeads: 0,
    totalCustomers: 0,
    pipelineValue: 0,
    wonRevenue: 0,
    activeProposals: 0,
    activeContracts: 0,
    pendingActivities: 0,
  });
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [leadSourceData, setLeadSourceData] = useState<any[]>([]);
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canLeads = isAdmin || hasPermission('crm.leads.view');
  const canCustomers = isAdmin || hasPermission('crm.customers.view');
  const canPipeline = isAdmin || hasPermission('crm.pipeline.view');
  const canProposals = isAdmin || hasPermission('crm.proposals.view');
  const canContracts = isAdmin || hasPermission('crm.contracts.view');
  const canActivities = isAdmin || hasPermission('crm.activities.view');

  const loadKPIs = async () => {
    if (!company?.id) return;
    
    const [leadsRes, customersRes, oppsRes, proposalsRes, contractsRes, activitiesRes] = await Promise.all([
      supabase.from('leads').select('id, status, source').eq('company_id', company.id),
      supabase.from('customers').select('id').eq('company_id', company.id).eq('status', 'active'),
      supabase.from('opportunities').select('id, stage, estimated_value, status').eq('company_id', company.id),
      supabase.from('sales_proposals').select('id, status').eq('company_id', company.id).in('status', ['draft', 'pending']),
      supabase.from('sales_contracts').select('id, status').eq('company_id', company.id).eq('status', 'active'),
      supabase.from('sales_activities').select('id, status').eq('company_id', company.id).eq('status', 'scheduled'),
    ]);

    const leads = leadsRes.data ?? [];
    const opps = oppsRes.data ?? [];
    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => l.status === 'new' || l.status === 'contacted' || l.status === 'qualified').length;
    const totalCustomers = customersRes.data?.length ?? 0;
    const pipelineValue = opps.filter(o => o.status === 'open').reduce((a, o) => a + (o.estimated_value ?? 0), 0);
    const wonRevenue = opps.filter(o => o.stage === 'won').reduce((a, o) => a + (o.estimated_value ?? 0), 0);
    const activeProposals = proposalsRes.data?.length ?? 0;
    const activeContracts = contractsRes.data?.length ?? 0;
    const pendingActivities = activitiesRes.data?.length ?? 0;

    setKpiData({
      totalLeads,
      activeLeads,
      totalCustomers,
      pipelineValue,
      wonRevenue,
      activeProposals,
      activeContracts,
      pendingActivities,
    });

    // Pipeline by stage data
    const stages = ['prospecting', 'qualified', 'proposal', 'negotiation', 'won'];
    const pipelineByStage = stages.map(stage => ({
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      value: opps.filter(o => o.stage === stage).reduce((a, o) => a + (o.estimated_value ?? 0), 0),
      count: opps.filter(o => o.stage === stage).length,
    }));
    setPipelineData(pipelineByStage);

    // Lead source distribution
    const sourceCounts: Record<string, number> = {};
    leads.forEach(l => {
      if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] ?? 0) + 1;
    });
    const sourceData = Object.entries(sourceCounts).map(([source, count]) => ({
      name: source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
    }));
    setLeadSourceData(sourceData);

    setLoading(false);
  };

  useEffect(() => {
    loadKPIs();
  }, [company]);

  return (
    <div className="space-y-6">
      <PageHeader title="CRM & Sales" description="Track leads, manage customers, and close deals" breadcrumbs={[{ label: 'CRM' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/crm/leads">Add Lead</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canLeads && <KPICard title="Total Leads" value={kpiData.totalLeads} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />}
        {canLeads && <KPICard title="Active Leads" value={kpiData.activeLeads} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
        {canCustomers && <KPICard title="Customers" value={kpiData.totalCustomers} icon={<Building2 className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />}
        {canPipeline && <KPICard title="Pipeline Value" value={formatCurrency(kpiData.pipelineValue)} icon={<DollarSign className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />}
        {canPipeline && <KPICard title="Won Revenue" value={formatCurrency(kpiData.wonRevenue)} icon={<Award className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />}
        {canProposals && <KPICard title="Active Proposals" value={kpiData.activeProposals} icon={<FileText className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />}
        {canContracts && <KPICard title="Active Contracts" value={kpiData.activeContracts} icon={<Award className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50 dark:bg-cyan-950/50" loading={loading} />}
        {canActivities && <KPICard title="Pending Activities" value={kpiData.pendingActivities} icon={<Calendar className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />}
      </div>

      {canPipeline && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Value">
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4CAF50' : '#3e95cd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {canLeads && <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader><CardTitle className="text-sm font-semibold">Lead Sources</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={leadSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(entry) => entry.name}>
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>}
      </div>}
    </div>
  );
}
