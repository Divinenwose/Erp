'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

export default function PerformancePage() {
  const { company } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    supabase
      .from('performance_reviews')
      .select('*, employee:employees!performance_reviews_employee_id_fkey(first_name, last_name), reviewer:employees!performance_reviews_reviewer_id_fkey(first_name, last_name)')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setReviews(data ?? []); setLoading(false); });
  }, [company?.id]);

  const completed = reviews.filter(review => review.status === 'completed');
  const scores = completed.filter(review => review.score != null).map(review => Number(review.score));
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Performance Reviews" description="Track employee performance evaluations and goals" breadcrumbs={[{ label: 'HR' }, { label: 'Performance' }]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Reviews Due" value={reviews.filter(review => review.status !== 'completed').length} icon={<Award className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Completed" value={completed.length} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Average Score" value={`${average.toFixed(2)} / 5`} icon={<TrendingUp className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="In Progress" value={reviews.filter(review => review.status === 'in_progress').length} icon={<Clock className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Review Records</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {reviews.length === 0 && !loading ? <p className="p-8 text-center text-sm text-gray-500">No performance reviews have been created yet.</p> : <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 dark:bg-gray-800/50"><th className="text-left px-4 py-3">Employee</th><th className="text-left px-4 py-3">Reviewer</th><th className="text-left px-4 py-3">Period</th><th className="text-center px-4 py-3">Score</th><th className="text-left px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{reviews.map(review => <tr key={review.id}><td className="px-4 py-3">{review.employee ? `${review.employee.first_name} ${review.employee.last_name}` : '—'}</td><td className="px-4 py-3">{review.reviewer ? `${review.reviewer.first_name} ${review.reviewer.last_name}` : '—'}</td><td className="px-4 py-3">{review.review_period}</td><td className="px-4 py-3 text-center">{review.score ?? '—'}</td><td className="px-4 py-3"><StatusBadge status={review.status} /></td></tr>)}</tbody></table>}
        </CardContent>
      </Card>
    </div>
  );
}
