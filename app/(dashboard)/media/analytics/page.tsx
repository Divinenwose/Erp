'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { BarChart3, Users, Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function MediaAnalyticsPage() {
  const { company } = useAuth();
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalImpressions: 0,
    totalReach: 0,
    avgEngagementRate: 0,
    totalConversions: 0
  });

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('audience_analytics')
      .select('*, media_content(title), media_campaigns(campaign_name)')
      .eq('company_id', company.id)
      .order('metric_date', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading analytics:', error);
    }
    setAnalytics(data ?? []);

    const totalImpressions = data?.reduce((sum, a) => sum + (a.impressions || 0), 0) || 0;
    const totalReach = data?.reduce((sum, a) => sum + (a.reach || 0), 0) || 0;
    const avgEngagement = data?.length ? (data.reduce((sum, a) => sum + (a.engagement_rate || 0), 0) / data.length) : 0;
    const totalConversions = data?.reduce((sum, a) => sum + (a.conversions || 0), 0) || 0;
    setStats({
      totalImpressions,
      totalReach,
      avgEngagementRate: avgEngagement,
      totalConversions
    });

    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const columns: Column[] = [
    { 
      key: 'metric_date',
      header: 'Date', 
      cell: (row) => format(new Date(row.metric_date), 'MMM dd, yyyy')
    },
    { 
      key: 'content',
      header: 'Content', 
      cell: (row) => row.media_content?.title || '-'
    },
    { 
      key: 'campaign',
      header: 'Campaign', 
      cell: (row) => row.media_campaigns?.campaign_name || '-'
    },
    { 
      key: 'platform',
      header: 'Platform', 
      cell: (row) => row.platform || '-'
    },
    { 
      key: 'impressions',
      header: 'Impressions', 
      cell: (row) => row.impressions?.toLocaleString() || 0
    },
    { 
      key: 'reach',
      header: 'Reach', 
      cell: (row) => row.reach?.toLocaleString() || 0
    },
    { 
      key: 'engagement_rate',
      header: 'Engagement Rate', 
      cell: (row) => row.engagement_rate != null ? `${row.engagement_rate.toFixed(2)}%` : '-'
    },
    { 
      key: 'conversions',
      header: 'Conversions', 
      cell: (row) => row.conversions || 0
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Audience Analytics" description="View audience engagement and analytics data" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Analytics' }]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Impressions" value={stats.totalImpressions.toLocaleString()} icon={<Eye className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Reach" value={stats.totalReach.toLocaleString()} icon={<Users className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Avg Engagement Rate" value={`${stats.avgEngagementRate.toFixed(2)}%`} icon={<MousePointerClick className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Conversions" value={stats.totalConversions.toLocaleString()} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>

      <DataTable
        columns={columns}
        data={analytics}
        loading={loading}
        searchable
      />
    </div>
  );
}
