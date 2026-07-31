'use client';

import { useState, useEffect } from 'react';
import { supabase, Permission } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import DataTable, { Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Lock, Shield } from 'lucide-react';

export default function PermissionsSettingsPage() {
  const { company } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    console.log('[Permissions Page] Loading permissions');
    
    // Permissions are global, don't require company
    const { data, error } = await supabase.from('permissions').select('*').order('resource, action');
    
    console.log('[Permissions Page] Permissions query result:', data);
    console.log('[Permissions Page] Permissions data length:', data?.length);
    console.log('[Permissions Page] Permissions error:', error);
    
    setPermissions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const columns: Column<any>[] = [
    {
      key: 'resource',
      header: 'Resource',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
            {row.resource}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.action}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.description || '—'}
        </span>
      ),
    },
    {
      key: 'permission',
      header: 'Permission',
      cell: (row) => (
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {row.resource}.{row.action}
        </code>
      ),
    },
  ];

  const resourceCounts = Object.entries(groupedPermissions).map(([resource, perms]) => ({
    resource,
    count: perms.length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="View all system permissions available for role assignment"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Permissions' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Permissions" value={permissions.length} icon={<Lock className="h-4 w-4 text-blue-600" />} iconBg="bg-blue-50 dark:bg-blue-950/50" loading={loading} />
        <KPICard title="Resources" value={Object.keys(groupedPermissions).length} icon={<Shield className="h-4 w-4 text-violet-600" />} iconBg="bg-violet-50 dark:bg-violet-950/50" loading={loading} />
      </div>

      <DataTable
        data={permissions}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search permissions..."
        searchKeys={['resource', 'action', 'description']}
        pageSize={20}
        emptyTitle="No permissions found"
        emptyDescription="Permissions are defined in the system"
      />
    </div>
  );
}
