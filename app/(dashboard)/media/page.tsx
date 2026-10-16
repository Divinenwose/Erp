'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, FileText, Target, Megaphone, Globe, Calendar, Mail, BarChart3, AlertTriangle, Shield, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function MediaOverviewPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    publishedContent: 0,
    pendingApprovals: 0,
    mediaCoverage: 0,
    totalAssets: 0,
    openIssues: 0,
    upcomingEvents: 0,
    audienceReach: 0
  });

  useEffect(() => {
    if (!company?.id) return;

    const loadOverview = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const [
        campaignsRes,
        contentRes,
        approvalsRes,
        coverageRes,
        assetsRes,
        issuesRes,
        eventsRes,
        analyticsRes
      ] = await Promise.all([
        supabase.from('media_campaigns').select('id').eq('company_id', company.id).eq('status', 'active'),
        supabase.from('media_content').select('id').eq('company_id', company.id).eq('status', 'published'),
        supabase.from('media_approvals').select('id').eq('company_id', company.id).eq('status', 'pending'),
        supabase.from('media_coverage').select('id').eq('company_id', company.id),
        supabase.from('media_assets').select('id').eq('company_id', company.id).eq('status', 'active'),
        supabase.from('media_issues').select('id').eq('company_id', company.id).in('status', ['open', 'investigating', 'responding']),
        supabase.from('event_coverage_requests').select('id').eq('company_id', company.id).gte('event_date', today).in('status', ['approved', 'assigned', 'in_progress']),
        supabase.from('audience_analytics').select('reach').eq('company_id', company.id).gte('metric_date', today)
      ]);

      const campaigns = campaignsRes.data ?? [];
      const content = contentRes.data ?? [];
      const approvals = approvalsRes.data ?? [];
      const coverage = coverageRes.data ?? [];
      const assets = assetsRes.data ?? [];
      const issues = issuesRes.data ?? [];
      const events = eventsRes.data ?? [];
      const analytics = analyticsRes.data ?? [];

      const totalReach = analytics.reduce((sum, a) => sum + (a.reach || 0), 0);

      setStats({
        activeCampaigns: campaigns.length,
        publishedContent: content.length,
        pendingApprovals: approvals.length,
        mediaCoverage: coverage.length,
        totalAssets: assets.length,
        openIssues: issues.length,
        upcomingEvents: events.length,
        audienceReach: totalReach
      });
      setLoading(false);
    };

    loadOverview();
  }, [company?.id]);

  const modules = [
    { title: 'Content Management', description: 'Create and manage media content', icon: FileText, href: '/media/content', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'media.content.view' },
    { title: 'Media Assets', description: 'Media library and file management', icon: Video, href: '/media/assets', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'media.assets.view' },
    { title: 'Campaigns', description: 'Media campaign management', icon: Target, href: '/media/campaigns', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'media.campaigns.view' },
    { title: 'Press Releases', description: 'PR and press release management', icon: Megaphone, href: '/media/press-releases', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600', permission: 'media.press_releases.view' },
    { title: 'Social Media', description: 'Social media planning and tracking', icon: Globe, href: '/media/social', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600', permission: 'marketing.social.view' },
    { title: 'Advertising', description: 'Advertising campaigns and placements', icon: TrendingUp, href: '/media/advertising', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'marketing.advertising.view' },
    { title: 'PR & Media Coverage', description: 'Track media coverage and PR', icon: Megaphone, href: '/media/coverage', color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600', permission: 'media.coverage.view' },
    { title: 'Event Coverage', description: 'Event coverage requests and records', icon: Calendar, href: '/media/event-coverage', color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600', permission: 'media.event_coverage.view' },
    { title: 'Internal Communications', description: 'Company announcements and communications', icon: Mail, href: '/media/communications', color: 'bg-rose-50 dark:bg-rose-950/30', iconColor: 'text-rose-600', permission: 'media.communications.view' },
    { title: 'Newsletters', description: 'Newsletter management and analytics', icon: Mail, href: '/media/newsletters', color: 'bg-teal-50 dark:bg-teal-950/30', iconColor: 'text-teal-600', permission: 'media.newsletters.view' },
    { title: 'Audience Analytics', description: 'Audience engagement and analytics', icon: BarChart3, href: '/media/analytics', color: 'bg-lime-50 dark:bg-lime-950/30', iconColor: 'text-lime-600', permission: 'media.analytics.view' },
    { title: 'Interviews', description: 'Leadership interviews and visibility', icon: Users, href: '/media/interviews', color: 'bg-sky-50 dark:bg-sky-950/30', iconColor: 'text-sky-600', permission: 'media.interviews.view' },
    { title: 'Brand & Messaging', description: 'Brand guidelines and messaging', icon: FileText, href: '/media/brand', color: 'bg-fuchsia-50 dark:bg-fuchsia-950/30', iconColor: 'text-fuchsia-600', permission: 'media.brand.view' },
    { title: 'Copyright & Compliance', description: 'Copyright and licensing management', icon: Shield, href: '/media/copyright', color: 'bg-slate-50 dark:bg-slate-950/30', iconColor: 'text-slate-600', permission: 'media.copyright.view' },
    { title: 'Media Issues', description: 'Track and resolve media issues', icon: AlertTriangle, href: '/media/issues', color: 'bg-red-50 dark:bg-red-950/30', iconColor: 'text-red-600', permission: 'media.issues.view' },
    { title: 'Vendors & Partners', description: 'Media vendors and partnerships', icon: Users, href: '/media/vendors', color: 'bg-yellow-50 dark:bg-yellow-950/30', iconColor: 'text-yellow-600', permission: 'media.vendors.view' },
    { title: 'Policies & Documents', description: 'Media policies and documents', icon: FileText, href: '/media/documents', color: 'bg-purple-50 dark:bg-purple-950/30', iconColor: 'text-purple-600', permission: 'media.documents.view' },
    { title: 'Reports', description: 'Media reports and analytics', icon: BarChart3, href: '/media/reports', color: 'bg-gray-50 dark:bg-gray-950/30', iconColor: 'text-gray-600', permission: 'media.reports.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  return (
    <div className="space-y-6">
      <PageHeader title="Media" description="Manage media campaigns, content, assets, and communications" breadcrumbs={[{ label: 'Media' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/media/content">Create Content</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Campaigns" value={stats.activeCampaigns} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Published Content" value={stats.publishedContent} icon={<FileText className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Pending Approvals" value={stats.pendingApprovals} icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
        <KPICard title="Media Coverage" value={stats.mediaCoverage} icon={<Megaphone className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Total Assets" value={stats.totalAssets} icon={<Video className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
        <KPICard title="Open Issues" value={stats.openIssues} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} iconBg="bg-red-50 dark:bg-red-950/50" loading={loading} />
        <KPICard title="Upcoming Events" value={stats.upcomingEvents} icon={<Calendar className="h-4 w-4 text-cyan-600" />} iconBg="bg-cyan-50 dark:bg-cyan-950/50" loading={loading} />
        <KPICard title="Audience Reach" value={stats.audienceReach.toLocaleString()} icon={<Users className="h-4 w-4 text-indigo-600" />} iconBg="bg-indigo-50 dark:bg-indigo-950/50" loading={loading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <m.icon className={`h-5 w-5 ${m.iconColor}`} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
