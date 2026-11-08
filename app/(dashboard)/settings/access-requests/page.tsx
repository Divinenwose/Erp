'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { reviewEmployeeAccessRequest } from '@/app/actions/employee-access';
import { useAuth } from '@/contexts/AuthContext';
import { isCompanyAdminRoleName } from '@/lib/rbac';
import { supabase, Role } from '@/lib/supabase';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmployeeAccessRequest {
  id: string;
  employee_id: string;
  company_id: string;
  request_reason: string | null;
  status: string;
  created_at: string;
  requested_role_id: string | null;
  employees: {
    first_name: string;
    last_name: string;
    email: string | null;
    employee_number: string | null;
    job_title: string | null;
    departments: { name: string } | null;
  } | null;
}

export default function EmployeeAccessRequestsPage() {
  const { company, session, accessLevel, hasPermission } = useAuth();
  const canReview = accessLevel === 'super_admin' || accessLevel === 'company_super_admin';
  const canView = canReview || hasPermission('hr.access_requests.view');
  const [requests, setRequests] = useState<EmployeeAccessRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!company?.id || !canView) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [requestResult, roleResult] = await Promise.all([
      supabase
        .from('employee_access_requests')
        .select('id, employee_id, company_id, request_reason, status, created_at, requested_role_id, employees:employees!employee_access_request_employee_company_fk(first_name, last_name, email, employee_number, job_title, departments(name))')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      canReview
        ? supabase.from('roles').select('*').or(`company_id.eq.${company.id},and(company_id.is.null,is_system.eq.true)`).order('name')
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (requestResult.error) {
      console.error('[ACCESS REQUESTS] Failed to load requests:', requestResult.error);
      toast.error('Unable to load employee access requests');
      setRequests([]);
    } else {
      setRequests((requestResult.data ?? []) as unknown as EmployeeAccessRequest[]);
    }
    if (roleResult.error) {
      console.error('[ACCESS REQUESTS] Failed to load roles:', roleResult.error);
      toast.error('Unable to load roles for approval');
      setRoles([]);
    } else {
      setRoles((roleResult.data ?? []).filter(role =>
        !isCompanyAdminRoleName(role.name)
        && (accessLevel === 'super_admin' || role.name !== 'Super Admin')
      ));
    }
    setLoading(false);
  }, [company?.id, canReview, canView, accessLevel]);

  useEffect(() => { void load(); }, [load]);

  const review = async (request: EmployeeAccessRequest, decision: 'approve' | 'reject') => {
    if (!session?.access_token) {
      toast.error('Your session expired. Sign in again before reviewing requests.');
      return;
    }
    const roleId = selectedRoles[request.id] ?? request.requested_role_id ?? undefined;
    if (decision === 'approve' && !roleId) {
      toast.error('Select a role before approving this request');
      return;
    }
    setProcessingId(request.id);
    const result = await reviewEmployeeAccessRequest({
      access_token: session.access_token,
      request_id: request.id,
      decision,
      role_id: roleId,
    });
    setProcessingId(null);
    if (!result.success) {
      toast.error(result.error || 'Unable to process the access request');
      return;
    }
    toast.success(decision === 'approve' ? 'Invitation sent and employee account linked' : 'Access request rejected');
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Access Requests"
        description="Review requests for ERP accounts linked to existing employee records."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Employee Access Requests' }]}
      >
        <Button variant="outline" asChild><Link href="/hr/employees">Employee Directory</Link></Button>
      </PageHeader>

      {!canView ? (
        <EmptyState title="Access restricted" description="You do not have permission to view employee access requests." />
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading access requests...</p>
      ) : requests.length === 0 ? (
        <EmptyState title="No access requests" description="New requests from HR will appear here." />
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <Card key={request.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">
                    {request.employees?.first_name} {request.employees?.last_name}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.employees?.employee_number || 'Employee ID pending'}
                    {request.employees?.job_title ? ` · ${request.employees.job_title}` : ''}
                    {request.employees?.departments?.name ? ` · ${request.employees.departments.name}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">{request.employees?.email || 'No email address'}</p>
                </div>
                <Badge variant={request.status === 'pending' ? 'secondary' : 'outline'}>
                  {request.status.replace(/_/g, ' ')}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{request.request_reason || 'No justification provided.'}</p>
                <p className="text-xs text-muted-foreground">
                  Requested {new Date(request.created_at).toLocaleString()}
                </p>
                {request.status === 'pending' && canReview && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full space-y-2 sm:max-w-xs">
                      <Label htmlFor={`role-${request.id}`}>Approved system role</Label>
                      <Select
                        value={selectedRoles[request.id] ?? ''}
                        onValueChange={value => setSelectedRoles(previous => ({ ...previous, [request.id]: value }))}
                      >
                        <SelectTrigger id={`role-${request.id}`}><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          {roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => review(request, 'approve')}
                        disabled={processingId === request.id}
                      >
                        <Check className="mr-2 h-4 w-4" />Approve & Invite
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => review(request, 'reject')}
                        disabled={processingId === request.id}
                      >
                        <X className="mr-2 h-4 w-4" />Reject
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
