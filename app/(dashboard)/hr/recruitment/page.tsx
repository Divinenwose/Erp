'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import DataTable, { Column } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Briefcase, Users, Calendar, UserCheck, Plus, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const PIPELINE_STAGES = ['application', 'screening', 'shortlisted', 'interview', 'evaluation', 'selected', 'offer', 'hired', 'rejected'];

export default function RecruitmentPage() {
  const { company, user: currentUser, hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();
  const canView = isAdmin || hasPermission('hr.recruitment.view');
  const canManage = isAdmin || hasPermission('hr.recruitment.manage');

  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [reqDialog, setReqDialog] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDept, setReqDept] = useState('');
  const [reqCount, setReqCount] = useState('1');
  const [reqReason, setReqReason] = useState('');

  const [vacDialog, setVacDialog] = useState(false);
  const [vacTitle, setVacTitle] = useState('');
  const [vacDept, setVacDept] = useState('');
  const [vacOpenings, setVacOpenings] = useState('1');
  const [vacDesc, setVacDesc] = useState('');

  const [candDialog, setCandDialog] = useState(false);
  const [candFirst, setCandFirst] = useState('');
  const [candLast, setCandLast] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candVacancy, setCandVacancy] = useState('');
  const [candSource, setCandSource] = useState('');

  useEffect(() => {
    if (!company?.id || !canView) { setLoading(false); return; }
    loadAll();
  }, [company?.id, canView]);

  const loadAll = async () => {
    if (!company?.id) return;
    setLoading(true);
    const [req, vac, cand, dept] = await Promise.all([
      supabase.from('job_requisitions').select('*, departments(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('vacancies').select('*, departments(name), branches(name)').eq('company_id', company.id).order('created_at', { ascending: false }),
      supabase.from('candidates').select('*, vacancies(position_title)').eq('company_id', company.id).order('application_date', { ascending: false }),
      supabase.from('departments').select('id, name').eq('company_id', company.id),
    ]);
    setRequisitions(req.data ?? []);
    setVacancies(vac.data ?? []);
    setCandidates(cand.data ?? []);
    setDepartments(dept.data ?? []);
    setLoading(false);
  };

  const resolveCurrentEmployeeId = async (): Promise<string | null> => {
    if (!currentUser?.id || !company?.id) return null;
    const { data } = await supabase.from('employees').select('id').eq('user_id', currentUser.id).eq('company_id', company.id).maybeSingle();
    return data?.id ?? null;
  };

  const submitRequisition = async () => {
    if (!company?.id || !reqTitle.trim()) { toast.error('Position title is required'); return; }
    const requestedBy = await resolveCurrentEmployeeId();
    const { error } = await supabase.from('job_requisitions').insert({
      company_id: company.id, position_title: reqTitle.trim(), department_id: reqDept || null,
      number_required: parseInt(reqCount) || 1, reason: reqReason.trim() || null, requested_by: requestedBy, status: 'pending',
    });
    if (error) { toast.error('Failed to submit requisition'); return; }
    toast.success('Requisition submitted');
    setReqTitle(''); setReqDept(''); setReqCount('1'); setReqReason(''); setReqDialog(false);
    loadAll();
  };

  const decideRequisition = async (req: any, approve: boolean) => {
    const decidedBy = await resolveCurrentEmployeeId();
    const { error } = await supabase.from('job_requisitions').update({
      status: approve ? 'approved' : 'rejected', decided_by: decidedBy, decided_at: new Date().toISOString(),
    }).eq('id', req.id);
    if (error) { toast.error('Failed to update requisition'); return; }
    toast.success(approve ? 'Requisition approved' : 'Requisition rejected');
    loadAll();
  };

  const createVacancy = async () => {
    if (!company?.id || !vacTitle.trim()) { toast.error('Position title is required'); return; }
    const { error } = await supabase.from('vacancies').insert({
      company_id: company.id, position_title: vacTitle.trim(), department_id: vacDept || null,
      openings_count: parseInt(vacOpenings) || 1, description: vacDesc.trim() || null,
      status: 'open', opening_date: new Date().toISOString().slice(0, 10),
    });
    if (error) { toast.error('Failed to create vacancy'); return; }
    toast.success('Vacancy created');
    setVacTitle(''); setVacDept(''); setVacOpenings('1'); setVacDesc(''); setVacDialog(false);
    loadAll();
  };

  const addCandidate = async () => {
    if (!company?.id || !candFirst.trim() || !candLast.trim()) { toast.error('Candidate name is required'); return; }
    const { error } = await supabase.from('candidates').insert({
      company_id: company.id, first_name: candFirst.trim(), last_name: candLast.trim(),
      email: candEmail.trim() || null, vacancy_id: candVacancy || null, source: candSource.trim() || null, status: 'application',
    });
    if (error) { toast.error('Failed to add candidate'); return; }
    toast.success('Candidate added');
    setCandFirst(''); setCandLast(''); setCandEmail(''); setCandVacancy(''); setCandSource(''); setCandDialog(false);
    loadAll();
  };

  const advanceCandidate = async (candidate: any, newStatus: string) => {
    const { error } = await supabase.from('candidates').update({ status: newStatus }).eq('id', candidate.id);
    if (error) { toast.error('Failed to update candidate'); return; }
    toast.success(`Moved to ${newStatus.replace('_', ' ')}`);
    loadAll();
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Recruitment" breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Recruitment' }]} />
        <EmptyState title="No access" description="You don't have permission to view recruitment." />
      </div>
    );
  }

  const reqColumns: Column[] = [
    { key: 'position_title', header: 'Position' },
    { key: 'department', header: 'Department', cell: (r: any) => r.departments?.name ?? '-' },
    { key: 'number_required', header: 'Openings' },
    { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: 'Actions', cell: (r: any) => canManage && r.status === 'pending' ? (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="h-7 text-emerald-600" onClick={() => decideRequisition(r, true)}><CheckCircle className="h-3 w-3 mr-1" />Approve</Button>
        <Button size="sm" variant="outline" className="h-7 text-red-600" onClick={() => decideRequisition(r, false)}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
      </div>
    ) : null },
  ];

  const vacColumns: Column[] = [
    { key: 'position_title', header: 'Position' },
    { key: 'department', header: 'Department', cell: (r: any) => r.departments?.name ?? '-' },
    { key: 'openings_count', header: 'Openings' },
    { key: 'opening_date', header: 'Opened', cell: (r: any) => r.opening_date ? formatDate(r.opening_date) : '-' },
    { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Recruitment" description="Job requisitions, vacancies, and candidate pipeline" breadcrumbs={[{ label: 'HR', href: '/hr' }, { label: 'Recruitment' }]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Open Vacancies" value={loading ? 0 : vacancies.filter(v => v.status === 'open').length} icon={<Briefcase className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Candidates in Pipeline" value={loading ? 0 : candidates.filter(c => !['hired', 'rejected'].includes(c.status)).length} icon={<Users className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
        <KPICard title="Pending Requisitions" value={loading ? 0 : requisitions.filter(r => r.status === 'pending').length} icon={<Calendar className="h-4 w-4 text-amber-600" />} iconBg="bg-amber-50 dark:bg-amber-950/50" loading={loading} />
        <KPICard title="Hired" value={loading ? 0 : candidates.filter(c => c.status === 'hired').length} icon={<UserCheck className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
      </div>

      <Tabs defaultValue="requisitions">
        <TabsList>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="vacancies">Vacancies</TabsTrigger>
          <TabsTrigger value="candidates">Candidates & Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="requisitions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Job Requisitions</CardTitle>
              {canManage && (
                <Dialog open={reqDialog} onOpenChange={setReqDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />New Requisition</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Job Requisition</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Position Title *</Label><Input value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} /></div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={reqDept || 'none'} onValueChange={(v) => setReqDept(v === 'none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Number Required</Label><Input type="number" min="1" value={reqCount} onChange={(e) => setReqCount(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Reason</Label><Textarea value={reqReason} onChange={(e) => setReqReason(e.target.value)} /></div>
                      <Button className="w-full" onClick={submitRequisition}>Submit</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent><DataTable columns={reqColumns} data={requisitions} loading={loading} emptyTitle="No requisitions yet" /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacancies" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Vacancies</CardTitle>
              {canManage && (
                <Dialog open={vacDialog} onOpenChange={setVacDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />New Vacancy</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Vacancy</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Position Title *</Label><Input value={vacTitle} onChange={(e) => setVacTitle(e.target.value)} /></div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={vacDept || 'none'} onValueChange={(v) => setVacDept(v === 'none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Openings</Label><Input type="number" min="1" value={vacOpenings} onChange={(e) => setVacOpenings(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Description</Label><Textarea value={vacDesc} onChange={(e) => setVacDesc(e.target.value)} /></div>
                      <Button className="w-full" onClick={createVacancy}>Create (Open)</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent><DataTable columns={vacColumns} data={vacancies} loading={loading} emptyTitle="No vacancies yet" /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-medium">Candidates</CardTitle>
              {canManage && (
                <Dialog open={candDialog} onOpenChange={setCandDialog}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Candidate</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Candidate</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>First Name *</Label><Input value={candFirst} onChange={(e) => setCandFirst(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Last Name *</Label><Input value={candLast} onChange={(e) => setCandLast(e.target.value)} /></div>
                      </div>
                      <div className="space-y-2"><Label>Email</Label><Input type="email" value={candEmail} onChange={(e) => setCandEmail(e.target.value)} /></div>
                      <div className="space-y-2">
                        <Label>Applying For</Label>
                        <Select value={candVacancy || 'none'} onValueChange={(v) => setCandVacancy(v === 'none' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Select vacancy" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {vacancies.map(v => <SelectItem key={v.id} value={v.id}>{v.position_title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Source</Label><Input value={candSource} onChange={(e) => setCandSource(e.target.value)} placeholder="e.g. LinkedIn, referral" /></div>
                      <Button className="w-full" onClick={addCandidate}>Add Candidate</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {candidates.length === 0 ? (
                <EmptyState icon={<Users className="h-10 w-10" />} title="No candidates yet" description="Candidates will appear here as they apply." />
              ) : (
                <div className="divide-y dark:divide-gray-800">
                  {candidates.map(c => (
                    <div key={c.id} className="flex items-center gap-4 px-4 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.vacancies?.position_title ?? 'No vacancy'} {c.source ? `· via ${c.source}` : ''}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{c.status.replace('_', ' ')}</Badge>
                      {canManage && !['hired', 'rejected'].includes(c.status) && (
                        <Select value={c.status} onValueChange={(v) => advanceCandidate(c, v)}>
                          <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
