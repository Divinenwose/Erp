'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, BadgeCheck, AlertTriangle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function IDCompliancePage() {
  const { company } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expiryDate, setExpiryDate] = useState('');

  const columns = [
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department' },
    { key: 'idNumber', header: 'ID Number' },
    { key: 'issueDate', header: 'Issue Date' },
    { key: 'expiryDate', header: 'Expiry Date' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
  ];

  useEffect(() => {
    loadData();
  }, [company?.id]);

  const loadData = async () => {
    if (!company?.id) return;
    setLoading(true);

    const [recordsRes, profilesRes, deptRes] = await Promise.all([
      supabase
        .from('id_card_compliance')
        .select('*, profiles(first_name, last_name, department_id, departments(name))')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name, department_id').eq('company_id', company.id),
      supabase.from('departments').select('id, name').eq('company_id', company.id),
    ]);

    setRecords(recordsRes.data ?? []);
    setProfiles(profilesRes.data ?? []);
    setDepartments(deptRes.data ?? []);
    setLoading(false);
  };

  const handleIssueCard = async () => {
    if (!company?.id) return;
    if (!selectedEmployee || !idNumber.trim() || !issueDate) {
      toast.error('Employee, ID number, and issue date are required');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('id_card_compliance').insert({
      company_id: company.id,
      employee_id: selectedEmployee,
      id_number: idNumber.trim(),
      issue_date: issueDate,
      expiry_date: expiryDate || null,
      status: 'active',
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'That ID number is already in use' : 'Failed to issue ID card');
      return;
    }

    toast.success('ID card issued');
    setSelectedEmployee(''); setIdNumber(''); setExpiryDate('');
    setIssueDate(format(new Date(), 'yyyy-MM-dd'));
    setDialogOpen(false);
    loadData();
  };

  const markReplacement = async (record: any) => {
    const { error } = await supabase
      .from('id_card_compliance')
      .update({ status: 'replacement_pending' })
      .eq('id', record.id);

    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success('Marked for replacement');
    loadData();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      lost: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      replacement_pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    const s = status || 'active';
    return (
      <Badge className={variants[s] || variants.active}>
        {s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')}
      </Badge>
    );
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const effectiveStatus = (r: any) => {
    if (r.status === 'active' && r.expiry_date && r.expiry_date < today) return 'expired';
    return r.status || 'active';
  };

  const filtered = records.filter(r => {
    const name = r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : '';
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !selectedDepartment || r.profiles?.department_id === selectedDepartment;
    const matchesStatus = !selectedStatus || effectiveStatus(r) === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const activeCount = records.filter(r => effectiveStatus(r) === 'active').length;
  const expiredCount = records.filter(r => effectiveStatus(r) === 'expired').length;
  const lostCount = records.filter(r => r.status === 'lost').length;
  const complianceRate = records.length > 0 ? Math.round((activeCount / records.length) * 100) : 0;

  const formattedData = filtered.map((item) => ({
    ...item,
    employee: item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : '-',
    department: item.profiles?.departments?.name || '-',
    idNumber: item.id_number || '-',
    issueDate: item.issue_date ? format(new Date(item.issue_date), 'MMM dd, yyyy') : '-',
    expiryDate: item.expiry_date ? format(new Date(item.expiry_date), 'MMM dd, yyyy') : '-',
    status: getStatusBadge(effectiveStatus(item)),
    actions: (
      <div className="flex gap-2">
        {effectiveStatus(item) !== 'active' && item.status !== 'replacement_pending' && (
          <Button size="sm" variant="outline" className="h-8" onClick={() => markReplacement(item)}>
            Replace
          </Button>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="ID Card Compliance"
        description="Manage employee ID cards and compliance"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Attendance', href: '/administration/attendance' },
          { label: 'ID Compliance' },
        ]}
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Issue ID Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue New ID Card</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input id="idNumber" placeholder="ID-2024-XXX" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleIssueCard} disabled={submitting}>
                {submitting ? 'Issuing…' : 'Issue ID Card'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active IDs</p>
                <p className="text-2xl font-bold">{loading ? '—' : activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expired IDs</p>
                <p className="text-2xl font-bold">{loading ? '—' : expiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Lost IDs</p>
                <p className="text-2xl font-bold">{loading ? '—' : lostCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <BadgeCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Compliance Rate</p>
                <p className="text-2xl font-bold">{loading ? '—' : `${complianceRate}%`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedDepartment || 'all'} onValueChange={(v) => setSelectedDepartment(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus || 'all'} onValueChange={(v) => setSelectedStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="replacement_pending">Replacement Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={formattedData}
            loading={loading}
            emptyTitle="No ID card records"
          />
        </CardContent>
      </Card>
    </div>
  );
}
