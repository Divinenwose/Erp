'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users } from 'lucide-react';

export default function HRDepartmentsPage() {
  const { company } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const load = async () => {
      setLoading(true);
      const [departmentsRes, employeesRes] = await Promise.all([
        supabase.from('departments').select('id, name, code, description, parent_id, is_active').eq('company_id', company.id).order('name'),
        supabase.from('employees').select('department_id').eq('company_id', company.id).eq('employment_status', 'active'),
      ]);
      const counts = (employeesRes.data ?? []).reduce<Record<string, number>>((result, employee) => {
        if (employee.department_id) result[employee.department_id] = (result[employee.department_id] ?? 0) + 1;
        return result;
      }, {});
      setDepartments(departmentsRes.data ?? []);
      setEmployeeCounts(counts);
      setLoading(false);
    };
    load();
  }, [company?.id]);

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="View your company departments and active headcount" breadcrumbs={[{ label: 'HR' }, { label: 'Departments' }]} />
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Department Directory</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="py-8 text-center text-sm text-gray-500">Loading departments...</p> : departments.length === 0 ? <EmptyState icon={<Building2 className="h-10 w-10" />} title="No departments found" description="Departments will appear here once they are configured for your company." /> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{departments.map(department => <div key={department.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-gray-900 dark:text-white">{department.name}</h3><p className="text-xs text-gray-500 mt-1">{department.code ?? 'No code'}</p></div><Users className="h-4 w-4 text-blue-600 shrink-0" /></div><p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{department.description ?? 'No description'}</p><p className="text-xs font-medium text-gray-500 mt-4">{employeeCounts[department.id] ?? 0} active employees</p></div>)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
