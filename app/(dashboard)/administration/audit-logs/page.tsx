'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Filter, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogsPage() {
  const { company } = useAuth();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const columns = [
    { key: 'timestamp', header: 'Timestamp' },
    { key: 'user', header: 'User' },
    { key: 'module', header: 'Module' },
    { key: 'action', header: 'Action' },
    { key: 'entity', header: 'Entity' },
    { key: 'changes', header: 'Changes' },
    { key: 'ip', header: 'IP Address' },
  ];

  useEffect(() => {
    loadAuditLogs();
  }, [company?.id, selectedModule, selectedAction, selectedUser, dateFrom, dateTo]);

  const loadAuditLogs = async () => {
    if (!company?.id) return;
    setLoading(true);

    let query = supabase
      .from('audit_logs')
      .select('*, profiles(first_name, last_name)')
      .eq('company_id', company.id);

    if (selectedModule) {
      query = query.eq('module', selectedModule);
    }
    if (selectedAction) {
      query = query.eq('action', selectedAction);
    }
    if (selectedUser) {
      query = query.eq('user_id', selectedUser);
    }
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`);
    }

    const { data } = await query.order('created_at', { ascending: false }).limit(100);
    setAuditLogs(data || []);
    setLoading(false);
  };

  const getModuleBadge = (module: string) => {
    const colors: Record<string, string> = {
      attendance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      fuel: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      inspections: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      drivers: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      purchase_requests: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
      assets: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      vendors: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      maintenance: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      approvals: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
      documents: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      visitors: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
      meetings: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      office_supplies: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
      auth: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      roles: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      permissions: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
    };
    return (
      <Badge className={colors[module] || colors.auth}>
        {module.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    const type = action.split('_')[0];
    const colors: Record<string, string> = {
      created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      submitted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      completed: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      assigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      clock_in: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      clock_out: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      login: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      logout: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return (
      <Badge className={colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}>
        {action.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
      </Badge>
    );
  };

  const formatChanges = (previous: any, newValue: any) => {
    if (!previous && !newValue) return '-';
    const changes = [];
    if (previous && newValue) {
      Object.keys(newValue).forEach(key => {
        if (previous[key] !== newValue[key]) {
          changes.push(`${key}: ${previous[key]} → ${newValue[key]}`);
        }
      });
    } else if (newValue) {
      changes.push(`Created: ${JSON.stringify(newValue).slice(0, 50)}...`);
    } else if (previous) {
      changes.push(`Deleted: ${JSON.stringify(previous).slice(0, 50)}...`);
    }
    return changes.length > 0 ? changes.slice(0, 2).join(', ') : '-';
  };

  const formattedData = auditLogs.map((log) => ({
    ...log,
    timestamp: log.created_at ? format(new Date(log.created_at), 'MMM dd, yyyy HH:mm') : '-',
    user: log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : '-',
    module: getModuleBadge(log.module),
    action: getActionBadge(log.action),
    entity: log.entity_type ? `${log.entity_type} ${log.entity_id?.slice(0, 8)}...` : '-',
    changes: formatChanges(log.previous_value, log.new_value),
    ip: log.ip_address || '-',
  }));

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Module', 'Action', 'Entity', 'Changes', 'IP Address'];
    const rows = auditLogs.map(log => [
      log.created_at,
      log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : '',
      log.module,
      log.action,
      log.entity_type,
      JSON.stringify({ previous: log.previous_value, new: log.new_value }),
      log.ip_address,
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <PermissionGuard permission="audit_logs.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view audit logs</div>}>
        <PageHeader
          title="Audit Logs"
          description="View all system activity and changes"
          breadcrumbs={[
            { label: 'Administration', href: '/administration' },
            { label: 'Audit Logs' },
          ]}
        >
          <PermissionGuard permission="audit_logs.export">
            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </PermissionGuard>
        </PageHeader>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Modules</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="inspections">Inspections</SelectItem>
                  <SelectItem value="drivers">Drivers</SelectItem>
                  <SelectItem value="purchase_requests">Purchase Requests</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                  <SelectItem value="vendors">Vendors</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="approvals">Approvals</SelectItem>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="visitors">Visitors</SelectItem>
                  <SelectItem value="meetings">Meetings</SelectItem>
                  <SelectItem value="office_supplies">Office Supplies</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="roles">Roles</SelectItem>
                  <SelectItem value="permissions">Permissions</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>

          <DataTable columns={columns} data={formattedData} />
        </CardContent>
      </Card>
      </PermissionGuard>
    </div>
  );
}
