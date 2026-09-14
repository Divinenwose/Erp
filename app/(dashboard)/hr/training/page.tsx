'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, Award, TrendingUp } from 'lucide-react';

export default function TrainingPage() {
  const { company } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    Promise.all([
      supabase.from('training_courses').select('*').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('training_enrollments').select('course_id, status').eq('company_id', company.id),
    ]).then(([courseRes, enrollmentRes]) => { setCourses(courseRes.data ?? []); setEnrollments(enrollmentRes.data ?? []); setLoading(false); });
  }, [company?.id]);

  const completed = enrollments.filter(enrollment => enrollment.status === 'completed').length;
  const completionRate = enrollments.length ? Math.round((completed / enrollments.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Training & Development" description="Manage employee learning and development programs" breadcrumbs={[{ label: 'HR' }, { label: 'Training' }]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Courses" value={courses.filter(course => course.status === 'active').length} icon={<BookOpen className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Enrolled" value={enrollments.filter(enrollment => enrollment.status === 'enrolled').length} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Completed" value={completed} icon={<Award className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        <KPICard title="Completion Rate" value={`${completionRate}%`} icon={<TrendingUp className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Training Courses</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {courses.length === 0 && !loading ? <p className="p-8 text-center text-sm text-gray-500">No training courses have been created yet.</p> : <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50 dark:bg-gray-800/50"><th className="text-left px-4 py-3">Course</th><th className="text-left px-4 py-3">Category</th><th className="text-right px-4 py-3">Enrolled</th><th className="text-right px-4 py-3">Completed</th><th className="text-right px-4 py-3">Hours</th><th className="text-left px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{courses.map(course => { const courseEnrollments = enrollments.filter(enrollment => enrollment.course_id === course.id); return <tr key={course.id}><td className="px-4 py-3 font-medium">{course.title}</td><td className="px-4 py-3">{course.category ?? '—'}</td><td className="px-4 py-3 text-right">{courseEnrollments.length}</td><td className="px-4 py-3 text-right">{courseEnrollments.filter(enrollment => enrollment.status === 'completed').length}</td><td className="px-4 py-3 text-right">{course.duration_hours ?? '—'}</td><td className="px-4 py-3"><StatusBadge status={course.status} /></td></tr>; })}</tbody></table>}
        </CardContent>
      </Card>
    </div>
  );
}
