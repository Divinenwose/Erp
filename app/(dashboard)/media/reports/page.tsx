'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Megaphone, Video, Target, Users, Calendar, FileText, AlertTriangle, Shield, TrendingUp, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function MediaReportsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [reportData, setReportData] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalBudget: 0,
    publishedContent: 0,
    totalAssets: 0,
    mediaCoverage: 0,
    pressReleases: 0,
    totalReach: 0,
    totalEngagement: 0,
    openIssues: 0,
    upcomingEvents: 0,
    avgSentiment: 0,
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
      contentRes,
      assetsRes,
      coverageRes,
      pressReleasesRes,
      analyticsRes,
      issuesRes,
      eventsRes,
    ] = await Promise.all([
      supabase.from('media_campaigns').select('*').eq('company_id', company.id).gte('start_date', startDateStr),
      supabase.from('media_content').select('*').eq('company_id', company.id).gte('publish_date', startDateStr).eq('status', 'published'),
      supabase.from('media_assets').select('*').eq('company_id', company.id).gte('created_at', startDateStr).eq('status', 'active'),
      supabase.from('media_coverage').select('*').eq('company_id', company.id).gte('publication_date', startDateStr),
      supabase.from('media_press_releases').select('*').eq('company_id', company.id).gte('release_date', startDateStr).eq('status', 'published'),
      supabase.from('audience_analytics').select('*').eq('company_id', company.id).gte('metric_date', startDateStr),
      supabase.from('media_issues').select('*').eq('company_id', company.id).gte('detected_date', startDateStr).in('status', ['open', 'investigating', 'responding']),
      supabase.from('event_coverage_requests').select('*').eq('company_id', company.id).gte('event_date', startDateStr).in('status', ['approved', 'assigned', 'in_progress']),
    ]);

    const campaigns = campaignsRes.data ?? [];
    const content = contentRes.data ?? [];
    const assets = assetsRes.data ?? [];
    const coverage = coverageRes.data ?? [];
    const pressReleases = pressReleasesRes.data ?? [];
    const analytics = analyticsRes.data ?? [];
    const issues = issuesRes.data ?? [];
    const events = eventsRes.data ?? [];

    const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const totalReach = analytics.reduce((sum, a) => sum + (a.reach || 0), 0);
    const totalEngagement = analytics.reduce((sum, a) => sum + (a.engagement_rate || 0), 0);
    const avgSentiment = coverage.length 
      ? coverage.reduce((sum, c) => sum + (c.sentiment === 'positive' ? 1 : c.sentiment === 'negative' ? -1 : 0), 0) / coverage.length 
      : 0;

    setReportData({
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalBudget,
      publishedContent: content.length,
      totalAssets: assets.length,
      mediaCoverage: coverage.length,
      pressReleases: pressReleases.length,
      totalReach,
      totalEngagement: analytics.length ? totalEngagement / analytics.length : 0,
      openIssues: issues.length,
      upcomingEvents: events.length,
      avgSentiment,
    });

    setLoading(false);
  };

  useEffect(() => { loadReportData(); }, [company?.id, period]);

  const exportReport = () => {
    const fileName = `media-report-${period}-${format(new Date(), 'yyyy-MM-dd')}`;
    // Simplified export - just download as CSV for now
    const csvContent = [
      ['Metric', 'Value'],
      ['Total Campaigns', reportData.totalCampaigns],
      ['Active Campaigns', reportData.activeCampaigns],
      ['Total Budget', reportData.totalBudget],
      ['Published Content', reportData.publishedContent],
      ['Total Assets', reportData.totalAssets],
      ['Media Coverage', reportData.mediaCoverage],
      ['Press Releases', reportData.pressReleases],
      ['Total Reach', reportData.totalReach],
      ['Avg Engagement Rate', reportData.totalEngagement.toFixed(2)],
      ['Open Issues', reportData.openIssues],
      ['Upcoming Events', reportData.upcomingEvents],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reportCards = [
    { title: 'Press Coverage', icon: Megaphone, color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600' },
    { title: 'Advertising Performance', icon: Target, color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600' },
    { title: 'Social Media Analytics', icon: Video, color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600' },
    { title: 'Audience Engagement', icon: Users, color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600' },
    { title: 'Event Coverage', icon: Calendar, color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600' },
    { title: 'Compliance Audit', icon: Shield, color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600' },
    { title: 'Campaign ROI', icon: TrendingUp, color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600' },
    { title: 'Monthly Dashboard', icon: BarChart3, color: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Media Reports" description="View comprehensive media analytics and reports" breadcrumbs={[{ label: 'Media', href: '/media' }, { label: 'Reports' }]}>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Campaigns" value={reportData.totalCampaigns} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Active Campaigns" value={reportData.activeCampaigns} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Total Budget" value={`$${reportData.totalBudget.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Published Content" value={reportData.publishedContent} icon={<FileText className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
        <KPICard title="Total Assets" value={reportData.totalAssets} icon={<Video className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Media Coverage" value={reportData.mediaCoverage} icon={<Megaphone className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50 dark:bg-cyan-950/50" loading={loading} />
        <KPICard title="Press Releases" value={reportData.pressReleases} icon={<FileText className="h-4 w-4 text-indigo-600" />} iconBg="bg-indigo-50 dark:bg-indigo-950/50" loading={loading} />
        <KPICard title="Total Reach" value={reportData.totalReach.toLocaleString()} icon={<Users className="h-4 w-4 text-rose-600" />} iconBg="bg-rose-50 dark:bg-rose-950/50" loading={loading} />
        <KPICard title="Avg Engagement Rate" value={`${reportData.totalEngagement.toFixed(2)}%`} icon={<TrendingUp className="h-4 w-4 text-lime-600" />} iconBg="bg-lime-50 dark:bg-lime-950/50" loading={loading} />
        <KPICard title="Open Issues" value={reportData.openIssues} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Upcoming Events" value={reportData.upcomingEvents} icon={<Calendar className="h-4 w-4 text-teal-600" />} iconBg="bg-teal-50 dark:bg-teal-950/50" loading={loading} />
        <KPICard title="Avg Sentiment" value={reportData.avgSentiment > 0 ? 'Positive' : reportData.avgSentiment < 0 ? 'Negative' : 'Neutral'} icon={<Shield className="h-4 w-4 text-slate-600" />} iconBg="bg-slate-50 dark:bg-slate-950/50" loading={loading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportCards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">View detailed report</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
