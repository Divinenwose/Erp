'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clipboard, Clock, CheckCircle, DollarSign, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function PurchaseRequestsDashboardPage() {
  const { company } = useAuth();
  const [totalRequests, setTotalRequests] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(0);
  const [approved, setApproved] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [urgentRequests, setUrgentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    loadStats();
  }, [company?.id]);

  const loadStats = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [totalResult, pendingResult, approvedResult, valueResult, urgentResult] = await Promise.all([
      supabase
        .from('purchase_requests')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .gte('created_at', `${currentMonth}-01`)
        .lte('created_at', `${currentMonth}-31`),
      supabase
        .from('purchase_requests')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('status', ['pending', 'submitted', 'under_review', 'md_approval', 'accounts_review']),
      supabase
        .from('purchase_requests')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'approved'),
      supabase
        .from('purchase_requests')
        .select('estimated_cost')
        .eq('company_id', company.id)
        .gte('created_at', `${currentMonth}-01`)
        .lte('created_at', `${currentMonth}-31`),
      supabase
        .from('purchase_requests')
        .select('id, title, priority, required_date, status')
        .eq('company_id', company.id)
        .in('priority', ['urgent', 'high'])
        .in('status', ['pending', 'submitted', 'under_review', 'md_approval', 'accounts_review'])
        .order('required_date', { ascending: true })
        .limit(5),
    ]);

    const totalCount = totalResult.count || 0;
    const pendingCount = pendingResult.count || 0;
    const approvedCount = approvedResult.count || 0;
    const valueSum = (valueResult.data || []).reduce((sum, item) => sum + (item.estimated_cost || 0), 0);

    setTotalRequests(totalCount);
    setPendingApproval(pendingCount);
    setApproved(approvedCount);
    setTotalValue(valueSum);
    setUrgentRequests(urgentResult.data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Requests"
        description="Manage purchase requests with approval workflow"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Purchase Requests' }
        ]}
      >
        <Button size="sm" asChild>
          <Link href="/administration/purchase-requests/my-requests">
          <Plus className="h-4 w-4 mr-2" />
          New Request
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Requests"
          value={loading ? 0 : totalRequests}
          icon={<Clipboard className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
        />
        <KPICard
          title="Pending Approval"
          value={loading ? 0 : pendingApproval}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
        />
        <KPICard
          title="Approved"
          value={loading ? 0 : approved}
          icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <KPICard
          title="Total Value"
          value={loading ? 0 : totalValue}
          prefix="$"
          icon={<DollarSign className="h-4 w-4 text-purple-600" />}
          iconBg="bg-purple-50 dark:bg-purple-950/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/administration/purchase-requests/list">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">All Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">View all purchase requests</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/purchase-requests/pending">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Requests awaiting approval</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/purchase-requests/my-requests">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">My Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">View your purchase requests</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/purchase-requests/approvals">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Review and approve requests</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/administration/purchase-requests/reports">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">Purchase request reports</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Urgent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {urgentRequests.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No high-priority requests are waiting.</p>
          ) : (
            <div className="space-y-3">
              {urgentRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{request.title}</p>
                      <p className="text-xs text-gray-500">{request.priority} priority · {request.status.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild><Link href="/administration/purchase-requests/approvals">Review</Link></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
