'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Search, Shield } from 'lucide-react';

export default function AuditLogsPage() {
  const { company } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('audit_logs').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(100);
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const filteredLogs = logs.filter(l => {
    const matchesSearch = !search || l.entity_type?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || l.entity_type === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const columns: Column<any>[] = [
    { key: 'created_at', header: 'Timestamp', cell: (row) => formatDate(row.created_at) },
    { key: 'entity_type', header: 'Entity', cell: (row) => <span className="font-mono text-xs">{row.entity_type}</span> },
    { key: 'action', header: 'Action', cell: (row) => <span className="capitalize">{row.action}</span> },
    { key: 'user_id', header: 'User', cell: (row) => row.user_id || 'System' },
    { key: 'ip_address', header: 'IP Address', cell: (row) => row.ip_address || '-' },
    { key: 'details', header: 'Details', cell: (row) => <span className="text-xs text-gray-500">{JSON.stringify(row.old_values || row.new_values || {}).slice(0, 50)}...</span> },
  ];

  const totalLogs = logs.length;
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <PermissionGuard permission="finance.audit_logs.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view audit logs</div>}>
      <div className="space-y-6">
        <PageHeader title="Audit Logs" description="View finance audit trail and activity history" breadcrumbs={[{ label: 'Finance' }, { label: 'Audit Logs' }]}>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </PageHeader>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Logs" value={totalLogs} icon={<FileText className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
          <KPICard title="Today's Activity" value={todayLogs} icon={<Shield className="h-4 w-4 text-emerald-600" />} iconBg="bg-emerald-50 dark:bg-emerald-950/50" loading={loading} />
        </div>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search logs..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Actions</SelectItem><SelectItem value="created">Created</SelectItem><SelectItem value="updated">Updated</SelectItem><SelectItem value="deleted">Deleted</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Entities</SelectItem><SelectItem value="invoices">Invoices</SelectItem><SelectItem value="expenses">Expenses</SelectItem><SelectItem value="journal_entries">Journal Entries</SelectItem><SelectItem value="budgets">Budgets</SelectItem></SelectContent>
              </Select>
            </div>
            <DataTable
              columns={columns}
              data={filteredLogs}
              loading={loading}
              searchable={false}
              rowKey="id"
            />
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
}
