'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Cake, Gift, Bell, Search, Filter, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isThisMonth, isThisWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function BirthdaysPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState<any[]>([]);

  const load = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [empRes, deptRes] = await Promise.all([
      supabase
        .from('employees')
        .select('*, departments(name), branches(name)')
        .eq('company_id', company.id)
        .not('date_of_birth', 'is', null),
      supabase.from('departments').select('*').eq('company_id', company.id),
    ]);

    setEmployees(empRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const sendBirthdayWish = async (employeeId: string) => {
    // This would integrate with email/notification system
    toast.success('Birthday wish sent!');
  };

  const getBirthdayStatus = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (isToday(thisYearBirthday)) return 'today';
    if (isThisWeek(thisYearBirthday)) return 'this_week';
    if (isThisMonth(thisYearBirthday)) return 'this_month';
    return 'upcoming';
  };

  const getDaysUntilBirthday = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = thisYearBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredEmployees = employees.filter(emp => {
    if (!emp.date_of_birth) return false;
    
    const birthMonth = format(new Date(emp.date_of_birth), 'MM');
    const matchesSearch = !search || 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesMonth = selectedMonth === 'all' || birthMonth === selectedMonth;
    const matchesDepartment = selectedDepartment === 'all' || emp.department_id === selectedDepartment;
    
    return matchesSearch && matchesMonth && matchesDepartment;
  });

  const todayBirthdays = employees.filter(emp => emp.date_of_birth && isToday(new Date(emp.date_of_birth))).length;
  const thisWeekBirthdays = employees.filter(emp => emp.date_of_birth && getBirthdayStatus(emp.date_of_birth) === 'this_week').length;
  const thisMonthBirthdays = employees.filter(emp => emp.date_of_birth && isThisMonth(new Date(emp.date_of_birth))).length;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <PermissionGuard permission="birthdays.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view birthdays</div>}>
        <PageHeader
          title="Birthday Management"
          description="Track and celebrate employee birthdays"
          breadcrumbs={[{ label: 'Administration' }, { label: 'Birthdays' }]}
        >
          <div className="flex gap-2">
            <PermissionGuard permission="birthdays.notify">
              <Button size="sm" variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Send Reminders
              </Button>
            </PermissionGuard>
          </div>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Today" value={todayBirthdays} icon={<Cake className="h-4 w-4 text-pink-600" />} iconBg="bg-pink-50 dark:bg-pink-950/50" loading={loading} />
          <KPICard title="This Week" value={thisWeekBirthdays} icon={<Calendar className="h-4 w-4 text-purple-600" />} iconBg="bg-purple-50 dark:bg-purple-950/50" loading={loading} />
          <KPICard title="This Month" value={thisMonthBirthdays} icon={<Gift className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Total" value={employees.length} icon={<Cake className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search employees..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthNames.map((month, index) => (
                    <SelectItem key={month} value={String(index + 1).padStart(2, '0')}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Cake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No birthdays found</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800">
                {filteredEmployees.map(emp => {
                  const status = getBirthdayStatus(emp.date_of_birth);
                  const daysUntil = getDaysUntilBirthday(emp.date_of_birth);
                  const birthdayDate = new Date(emp.date_of_birth);
                  const thisYearBirthday = new Date(new Date().getFullYear(), birthdayDate.getMonth(), birthdayDate.getDate());
                  
                  return (
                    <div key={emp.id} className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className={`p-2 rounded-lg ${
                        status === 'today' ? 'bg-pink-100 dark:bg-pink-900/30' :
                        status === 'this_week' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        status === 'this_month' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        'bg-gray-100 dark:bg-gray-900/30'
                      }`}>
                        <Cake className={`h-4 w-4 ${
                          status === 'today' ? 'text-pink-600 dark:text-pink-400' :
                          status === 'this_week' ? 'text-purple-600 dark:text-purple-400' :
                          status === 'this_month' ? 'text-blue-600 dark:text-blue-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {emp.departments?.name || 'No department'} · {format(thisYearBirthday, 'MMMM dd')}
                        </p>
                      </div>
                      <Badge className={
                        status === 'today' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' :
                        status === 'this_week' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                        status === 'this_month' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }>
                        {status === 'today' ? 'Today!' :
                         status === 'this_week' ? `${daysUntil} days` :
                         status === 'this_month' ? 'This month' :
                         'Upcoming'}
                      </Badge>
                      {status === 'today' && (
                        <PermissionGuard permission="birthdays.notify">
                          <Button size="sm" variant="outline" className="h-8">
                            <Send className="h-4 w-4 mr-2" />
                            Send Wish
                          </Button>
                        </PermissionGuard>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  );
}
