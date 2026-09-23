'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, Target, FileText, Globe, Calendar, Users, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function MarketingOverviewPage() {
  const { company, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    activeCampaigns: 0, 
    totalLeads: 0, 
    upcomingEvents: 0, 
    monthlySpend: 0,
    publishedContent: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    if (!company?.id) return;

    const loadOverview = async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().slice(0, 10);

      const [
        campaignsRes, 
        leadsRes, 
        eventsRes, 
        contentRes,
        approvalsRes
      ] = await Promise.all([
        supabase.from('marketing_campaigns').select('id').eq('company_id', company.id).eq('status', 'active'),
        supabase.from('marketing_leads').select('id').eq('company_id', company.id),
        supabase.from('marketing_events').select('id').eq('company_id', company.id).gte('start_date', today),
        supabase.from('marketing_content').select('id').eq('company_id', company.id).eq('status', 'published'),
        supabase.from('marketing_approvals').select('id').eq('company_id', company.id).eq('status', 'pending'),
      ]);

      const campaigns = campaignsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const events = eventsRes.data ?? [];
      const content = contentRes.data ?? [];
      const approvals = approvalsRes.data ?? [];

      // Calculate monthly spend from campaigns and advertising
      const [campaignSpendRes, adSpendRes] = await Promise.all([
        supabase.from('campaign_metrics').select('spend').eq('company_id', company.id).gte('metric_date', monthStartStr),
        supabase.from('ad_performance').select('spend').eq('company_id', company.id).gte('metric_date', monthStartStr),
      ]);

      const campaignSpend = campaignSpendRes.data?.reduce((sum, m) => sum + (m.spend || 0), 0) || 0;
      const adSpend = adSpendRes.data?.reduce((sum, m) => sum + (m.spend || 0), 0) || 0;

      setStats({ 
        activeCampaigns: campaigns.length, 
        totalLeads: leads.length, 
        upcomingEvents: events.length, 
        monthlySpend: campaignSpend + adSpend,
        publishedContent: content.length,
        pendingApprovals: approvals.length
      });
      setLoading(false);
    };

    loadOverview();
  }, [company?.id]);

  const modules = [
    { title: 'Campaigns', description: 'Manage marketing campaigns', icon: Target, href: '/marketing/campaigns', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'marketing.campaigns.view' },
    { title: 'Content', description: 'Create and manage content', icon: FileText, href: '/marketing/content', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'marketing.content.view' },
    { title: 'Social Media', description: 'Social media management', icon: Globe, href: '/marketing/social', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'marketing.social.view' },
    { title: 'Advertising', description: 'Advertising campaigns', icon: BarChart3, href: '/marketing/advertising', color: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600', permission: 'marketing.advertising.view' },
    { title: 'Events', description: 'Events and sponsorships', icon: Calendar, href: '/marketing/events', color: 'bg-pink-50 dark:bg-pink-950/30', iconColor: 'text-pink-600', permission: 'marketing.events.view' },
    { title: 'Press Releases', description: 'PR and communications', icon: Megaphone, href: '/marketing/pr', color: 'bg-orange-50 dark:bg-orange-950/30', iconColor: 'text-orange-600', permission: 'marketing.pr.view' },
    { title: 'Vendors', description: 'Marketing vendors', icon: Users, href: '/marketing/vendors', color: 'bg-cyan-50 dark:bg-cyan-950/30', iconColor: 'text-cyan-600', permission: 'marketing.vendors.view' },
    { title: 'Contracts', description: 'Vendor contracts', icon: FileText, href: '/marketing/contracts', color: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600', permission: 'marketing.contracts.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" description="Manage campaigns, content, events, and brand" breadcrumbs={[{ label: 'Marketing' }]}>
        <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/marketing/campaigns">View Campaigns</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Campaigns" value={stats.activeCampaigns} icon={<Target className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Total Leads" value={stats.totalLeads} icon={<Users className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Upcoming Events" value={stats.upcomingEvents} icon={<Calendar className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Monthly Spend" value={`$${stats.monthlySpend.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Published Content" value={stats.publishedContent} icon={<FileText className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
        <KPICard title="Pending Approvals" value={stats.pendingApprovals} icon={<TrendingUp className="h-4 w-4 text-orange-600" />} iconBg="bg-orange-50 dark:bg-orange-950/50" loading={loading} />
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
