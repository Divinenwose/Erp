'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { formatCurrency, formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Download, FileText, TrendingUp, Target, Users, DollarSign, Award, Calendar, MessageSquare, Smile, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function ReportsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance');
  
  // Report data
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [opportunitiesData, setOpportunitiesData] = useState<any[]>([]);
  const [customersData, setCustomersData] = useState<any[]>([]);
  const [activitiesData, setActivitiesData] = useState<any[]>([]);
  const [proposalsData, setProposalsData] = useState<any[]>([]);
  const [contractsData, setContractsData] = useState<any[]>([]);
  const [satisfactionData, setSatisfactionData] = useState<any[]>([]);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);

  const loadReportData = async () => {
    if (!company?.id) return;
    const [leads, opps, customers, activities, proposals, contracts, satisfaction, feedback] = await Promise.all([
      supabase.from('leads').select('id, status, source, created_at').eq('company_id', company.id),
      supabase.from('opportunities').select('id, stage, estimated_value, status, created_at').eq('company_id', company.id),
      supabase.from('customers').select('id, created_at').eq('company_id', company.id),
      supabase.from('sales_activities').select('id, activity_type, status, created_at').eq('company_id', company.id),
      supabase.from('sales_proposals').select('id, status, total_amount, created_at').eq('company_id', company.id),
      supabase.from('sales_contracts').select('id, status, contract_value, created_at').eq('company_id', company.id),
      supabase.from('customer_satisfaction').select('id, rating, survey_date').eq('company_id', company.id),
      supabase.from('customer_feedback').select('id, feedback_type, status, created_at').eq('company_id', company.id),
    ]);
    
    setLeadsData(leads.data ?? []);
    setOpportunitiesData(opps.data ?? []);
    setCustomersData(customers.data ?? []);
    setActivitiesData(activities.data ?? []);
    setProposalsData(proposals.data ?? []);
    setContractsData(contracts.data ?? []);
    setSatisfactionData(satisfaction.data ?? []);
    setFeedbackData(feedback.data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadReportData(); }, [company?.id]);

  // Performance Report
  const performanceColumns: Column<any>[] = [
    { key: 'metric', header: 'Metric', cell: (row) => <span className="text-sm font-medium">{row.metric}</span> },
    { key: 'value', header: 'Value', cell: (row) => <span className="text-sm">{row.value}</span> },
    { key: 'change', header: 'Change', cell: (row) => <span className={`text-sm ${row.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>{row.change}</span> },
  ];

  const performanceData = [
    { metric: 'Total Leads', value: leadsData.length, change: '+12%' },
    { metric: 'Conversion Rate', value: `${opportunitiesData.length > 0 ? ((opportunitiesData.filter(o => o.stage === 'won').length / leadsData.length) * 100).toFixed(1) : 0}%`, change: '+5%' },
    { metric: 'Pipeline Value', value: formatCurrency(opportunitiesData.filter(o => o.status === 'open').reduce((a, o) => a + (o.estimated_value ?? 0), 0)), change: '+18%' },
    { metric: 'Win Rate', value: `${opportunitiesData.length > 0 ? ((opportunitiesData.filter(o => o.stage === 'won').length / opportunitiesData.length) * 100).toFixed(1) : 0}%`, change: '+3%' },
    { metric: 'Avg Deal Size', value: formatCurrency(opportunitiesData.filter(o => o.stage === 'won').reduce((a, o) => a + (o.estimated_value ?? 0), 0) / (opportunitiesData.filter(o => o.stage === 'won').length || 1)), change: '+8%' },
  ];

  // Lead Conversion Report
  const leadConversionColumns: Column<any>[] = [
    { key: 'source', header: 'Source', cell: (row) => <span className="text-sm">{row.source}</span> },
    { key: 'count', header: 'Leads', cell: (row) => <span className="text-sm">{row.count}</span> },
    { key: 'converted', header: 'Converted', cell: (row) => <span className="text-sm">{row.converted}</span> },
    { key: 'rate', header: 'Conversion %', cell: (row) => <span className="text-sm">{row.rate}%</span> },
  ];

  const sourceCounts: Record<string, number> = {};
  const sourceConverted: Record<string, number> = {};
  leadsData.forEach(l => {
    if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] ?? 0) + 1;
  });
  opportunitiesData.forEach(o => {
    if (o.lead_id) sourceConverted['converted'] = (sourceConverted['converted'] ?? 0) + 1;
  });

  const leadConversionData = Object.entries(sourceCounts).map(([source, count]) => ({
    source: source.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
    converted: sourceConverted[source] ?? 0,
    rate: count > 0 ? ((sourceConverted[source] ?? 0) / count * 100).toFixed(1) : 0,
  }));

  // Pipeline Report
  const pipelineColumns: Column<any>[] = [
    { key: 'stage', header: 'Stage', cell: (row) => <span className="text-sm">{row.stage}</span> },
    { key: 'count', header: 'Deals', cell: (row) => <span className="text-sm">{row.count}</span> },
    { key: 'value', header: 'Value', cell: (row) => <span className="text-sm">{formatCurrency(row.value)}</span> },
    { key: 'avg', header: 'Avg Deal', cell: (row) => <span className="text-sm">{formatCurrency(row.avg)}</span> },
  ];

  const stages = ['prospecting', 'qualified', 'proposal', 'negotiation', 'won'];
  const pipelineData = stages.map(stage => {
    const stageOpps = opportunitiesData.filter(o => o.stage === stage);
    const value = stageOpps.reduce((a, o) => a + (o.estimated_value ?? 0), 0);
    return {
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      count: stageOpps.length,
      value,
      avg: stageOpps.length > 0 ? value / stageOpps.length : 0,
    };
  });

  // Activities Report
  const activitiesColumns: Column<any>[] = [
    { key: 'type', header: 'Type', cell: (row) => <span className="text-sm capitalize">{row.type}</span> },
    { key: 'total', header: 'Total', cell: (row) => <span className="text-sm">{row.total}</span> },
    { key: 'completed', header: 'Completed', cell: (row) => <span className="text-sm">{row.completed}</span> },
    { key: 'pending', header: 'Pending', cell: (row) => <span className="text-sm">{row.pending}</span> },
  ];

  const activityTypes: Record<string, number> = {};
  const activityCompleted: Record<string, number> = {};
  activitiesData.forEach(a => {
    if (a.activity_type) {
      activityTypes[a.activity_type] = (activityTypes[a.activity_type] ?? 0) + 1;
      if (a.status === 'completed') activityCompleted[a.activity_type] = (activityCompleted[a.activity_type] ?? 0) + 1;
    }
  });

  const activitiesReportData = Object.entries(activityTypes).map(([type, total]) => ({
    type,
    total,
    completed: activityCompleted[type] ?? 0,
    pending: total - (activityCompleted[type] ?? 0),
  }));

  // Satisfaction Report
  const satisfactionColumns: Column<any>[] = [
    { key: 'rating', header: 'Rating', cell: (row) => <span className="text-sm">{row.rating} Stars</span> },
    { key: 'count', header: 'Count', cell: (row) => <span className="text-sm">{row.count}</span> },
    { key: 'percentage', header: '%', cell: (row) => <span className="text-sm">{row.percentage}%</span> },
  ];

  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  satisfactionData.forEach(s => {
    if (s.rating) ratingCounts[s.rating] = (ratingCounts[s.rating] ?? 0) + 1;
  });

  const totalSatisfaction = satisfactionData.length;
  const satisfactionReportData = Object.entries(ratingCounts).map(([rating, count]) => ({
    rating,
    count,
    percentage: totalSatisfaction > 0 ? (count / totalSatisfaction * 100).toFixed(1) : 0,
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <PermissionGuard permission="crm.reports.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view reports</div>}>
      <div className="space-y-6">
        <PageHeader title="Sales & CRM Reports" description="Analytics and performance reports" breadcrumbs={[{ label: 'CRM' }, { label: 'Reports' }]}>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export All</Button>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 lg:grid-cols-10 w-full">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          </TabsList>

          {/* Performance Report */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Revenue" value={formatCurrency(opportunitiesData.filter(o => o.stage === 'won').reduce((a, o) => a + (o.estimated_value ?? 0), 0))} icon={<DollarSign className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
              <KPICard title="Win Rate" value={`${opportunitiesData.length > 0 ? ((opportunitiesData.filter(o => o.stage === 'won').length / opportunitiesData.length) * 100).toFixed(1) : 0}%`} icon={<Award className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
              <KPICard title="Pipeline Value" value={formatCurrency(opportunitiesData.filter(o => o.status === 'open').reduce((a, o) => a + (o.estimated_value ?? 0), 0))} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
              <KPICard title="Total Activities" value={activitiesData.length} icon={<Calendar className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
            </div>
            <DataTable columns={performanceColumns} data={performanceData} loading={loading} searchable={false} rowKey="metric" />
          </TabsContent>

          {/* Lead Conversion Report */}
          <TabsContent value="leads" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Leads" value={leadsData.length} icon={<Users className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
              <KPICard title="Converted" value={opportunitiesData.length} icon={<Target className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
              <KPICard title="Conversion Rate" value={`${leadsData.length > 0 ? ((opportunitiesData.length / leadsData.length) * 100).toFixed(1) : 0}%`} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
              <KPICard title="Active Leads" value={leadsData.filter(l => l.status === 'new' || l.status === 'contacted' || l.status === 'qualified').length} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
            </div>
            <DataTable columns={leadConversionColumns} data={leadConversionData} loading={loading} searchable={false} rowKey="source" />
          </TabsContent>

          {/* Pipeline Report */}
          <TabsContent value="pipeline" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Deals" value={opportunitiesData.length} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
              <KPICard title="Pipeline Value" value={formatCurrency(opportunitiesData.filter(o => o.status === 'open').reduce((a, o) => a + (o.estimated_value ?? 0), 0))} icon={<DollarSign className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
              <KPICard title="Won Revenue" value={formatCurrency(opportunitiesData.filter(o => o.stage === 'won').reduce((a, o) => a + (o.estimated_value ?? 0), 0))} icon={<Award className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
              <KPICard title="Avg Deal Size" value={formatCurrency(opportunitiesData.filter(o => o.stage === 'won').reduce((a, o) => a + (o.estimated_value ?? 0), 0) / (opportunitiesData.filter(o => o.stage === 'won').length || 1))} icon={<TrendingUp className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
            </div>
            <DataTable columns={pipelineColumns} data={pipelineData} loading={loading} searchable={false} rowKey="stage" />
          </TabsContent>

          {/* Activities Report */}
          <TabsContent value="activities" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Activities" value={activitiesData.length} icon={<Calendar className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
              <KPICard title="Completed" value={activitiesData.filter(a => a.status === 'completed').length} icon={<Award className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
              <KPICard title="Pending" value={activitiesData.filter(a => a.status === 'scheduled').length} icon={<MessageSquare className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
              <KPICard title="Today" value={activitiesData.filter(a => a.activity_date === new Date().toISOString().split('T')[0]).length} icon={<Calendar className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
            </div>
            <DataTable columns={activitiesColumns} data={activitiesReportData} loading={loading} searchable={false} rowKey="type" />
          </TabsContent>

          {/* Satisfaction Report */}
          <TabsContent value="satisfaction" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Surveys" value={satisfactionData.length} icon={<Smile className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
              <KPICard title="Avg Rating" value={`${satisfactionData.length > 0 ? (satisfactionData.reduce((a, s) => a + (s.rating ?? 0), 0) / satisfactionData.length).toFixed(1) : 0}/5`} icon={<Star className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
              <KPICard title="High Satisfaction" value={satisfactionData.filter(s => s.rating >= 4).length} icon={<Award className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
              <KPICard title="Feedback Items" value={feedbackData.length} icon={<MessageSquare className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DataTable columns={satisfactionColumns} data={satisfactionReportData} loading={loading} searchable={false} rowKey="rating" />
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-4">Rating Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={satisfactionReportData} dataKey="count" nameKey="rating" cx="50%" cy="50%" outerRadius={70} label={(entry) => `${entry.rating}★`}>
                      {satisfactionReportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
