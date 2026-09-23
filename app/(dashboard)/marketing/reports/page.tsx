'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard, Can } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, TrendingUp, Target, DollarSign, Users, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function MarketingReportsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [reportData, setReportData] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpend: 0,
    totalLeads: 0,
    totalImpressions: 0,
    totalClicks: 0,
    conversionRate: 0,
    totalEvents: 0,
    publishedContent: 0,
    mediaCoverage: 0,
  });

  const loadReportData = async () => {
    if (!company?.id) return;
    setLoading(true);

    const now = new Date();
    let startDate: Date;
    
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const startDateStr = startDate.toISOString().slice(0, 10);

    const [
      campaignsRes,
      leadsRes,
      metricsRes,
      adMetricsRes,
      eventsRes,
      contentRes,
      coverageRes,
    ] = await Promise.all([
      supabase.from('marketing_campaigns').select('*').eq('company_id', company.id).gte('start_date', startDateStr),
      supabase.from('marketing_leads').select('*').eq('company_id', company.id).gte('created_at', startDateStr),
      supabase.from('campaign_metrics').select('*').eq('company_id', company.id).gte('metric_date', startDateStr),
      supabase.from('ad_performance').select('*').eq('company_id', company.id).gte('metric_date', startDateStr),
      supabase.from('marketing_events').select('*').eq('company_id', company.id).gte('start_date', startDateStr),
      supabase.from('marketing_content').select('*').eq('company_id', company.id).gte('publish_date', startDateStr).eq('status', 'published'),
      supabase.from('pr_coverage').select('*').in('press_release_id', 
        supabase.from('press_releases').select('id').eq('company_id', company.id).gte('release_date', startDateStr)
      ),
    ]);

    const campaigns = campaignsRes.data ?? [];
    const leads = leadsRes.data ?? [];
    const metrics = metricsRes.data ?? [];
    const adMetrics = adMetricsRes.data ?? [];
    const events = eventsRes.data ?? [];
    const content = contentRes.data ?? [];
    const coverage = coverageRes.data ?? [];

    const totalSpend = metrics.reduce((sum, m) => sum + (m.spend || 0), 0) + 
                      adMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
    const totalImpressions = metrics.reduce((sum, m) => sum + (m.impressions || 0), 0) + 
                          adMetrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
    const totalClicks = metrics.reduce((sum, m) => sum + (m.clicks || 0), 0) + 
                     adMetrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
    const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0) + 
                          adMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0);

    setReportData({
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalSpend,
      totalLeads: leads.length,
      totalImpressions,
      totalClicks,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      totalEvents: events.length,
      publishedContent: content.length,
      mediaCoverage: coverage.length,
    });

    setLoading(false);
  };

  useEffect(() => { loadReportData(); }, [company?.id, period]);

  const exportReport = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Campaigns', reportData.totalCampaigns],
      ['Active Campaigns', reportData.activeCampaigns],
      ['Total Spend ($)', reportData.totalSpend],
      ['Total Leads', reportData.totalLeads],
      ['Total Impressions', reportData.totalImpressions],
      ['Total Clicks', reportData.totalClicks],
      ['Conversion Rate (%)', reportData.conversionRate.toFixed(2)],
      ['Total Events', reportData.totalEvents],
      ['Published Content', reportData.publishedContent],
      ['Media Coverage', reportData.mediaCoverage],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-report-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing Reports" description="Marketing performance analytics and reports" breadcrumbs={[{ label: 'Marketing', href: '/marketing' }, { label: 'Reports' }]}>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Can do="marketing.reports.export">
            <Button variant="outline" onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </Can>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Campaigns" value={reportData.totalCampaigns} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Campaigns" value={reportData.activeCampaigns} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Spend" value={`$${reportData.totalSpend.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Total Leads" value={reportData.totalLeads} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Impressions" value={reportData.totalImpressions.toLocaleString()} icon={<BarChart3 className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
        <KPICard title="Total Clicks" value={reportData.totalClicks.toLocaleString()} icon={<FileText className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50 dark:bg-cyan-950/50" loading={loading} />
        <KPICard title="Conversion Rate" value={`${reportData.conversionRate.toFixed(2)}%`} icon={<TrendingUp className="h-4 w-4 text-green-600" />} iconBg="bg-green-50 dark:bg-green-950/50" loading={loading} />
        <KPICard title="Total Events" value={reportData.totalEvents} icon={<Calendar className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Published Content" value={reportData.publishedContent} icon={<FileText className="h-4 w-4 text-indigo-600" />} iconBg="bg-indigo-50 dark:bg-indigo-950/50" loading={loading} />
        <KPICard title="Media Coverage" value={reportData.mediaCoverage} icon={<BarChart3 className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Campaigns</span>
                <span className="font-semibold">{reportData.totalCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</span>
                <span className="font-semibold text-emerald-600">{reportData.activeCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed Campaigns</span>
                <span className="font-semibold">{reportData.totalCampaigns - reportData.activeCampaigns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Spend</span>
                <span className="font-semibold">${reportData.totalSpend.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lead Generation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Leads Generated</span>
                <span className="font-semibold">{reportData.totalLeads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Impressions</span>
                <span className="font-semibold">{reportData.totalImpressions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Clicks</span>
                <span className="font-semibold">{reportData.totalClicks.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
                <span className="font-semibold">{reportData.conversionRate.toFixed(2)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content & Events Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Published Content</span>
                <span className="font-semibold">{reportData.publishedContent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Events</span>
                <span className="font-semibold">{reportData.totalEvents}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Media Coverage</span>
                <span className="font-semibold">{reportData.mediaCoverage}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ROI Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cost per Lead</span>
                <span className="font-semibold">
                  {reportData.totalLeads > 0 ? `$${(reportData.totalSpend / reportData.totalLeads).toFixed(2)}` : '$0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Cost per Click</span>
                <span className="font-semibold">
                  {reportData.totalClicks > 0 ? `$${(reportData.totalSpend / reportData.totalClicks).toFixed(2)}` : '$0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Click-Through Rate</span>
                <span className="font-semibold">
                  {reportData.totalImpressions > 0 ? `${((reportData.totalClicks / reportData.totalImpressions) * 100).toFixed(2)}%` : '0.00%'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
