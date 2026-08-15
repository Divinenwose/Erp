'use client';

import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Factory, Printer, Store, Scissors } from 'lucide-react';
import Link from 'next/link';

export default function ManufacturingPage() {
  const { hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || isCompanyAdmin();

  // Each card requires the RBAC permission for the page it links to, reusing
  // the same permission strings already defined for Manufacturing in
  // config/navigation.ts.
  const modules = [
    { title: 'Print Factory', description: 'Print production operations', icon: Printer, href: '/manufacturing/print-factory', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', permission: 'manufacturing.print_factory.view' },
    { title: 'Retail Store', description: 'Retail operations & sales floor', icon: Store, href: '/manufacturing/retail-store', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', permission: 'manufacturing.retail_store.view' },
    { title: 'Sewing Factory', description: 'Sewing production operations', icon: Scissors, href: '/manufacturing/sewing-factory', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', permission: 'manufacturing.sewing_factory.view' },
  ].filter(m => isAdmin || hasPermission(m.permission));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturing"
        description="Print factory, retail store, and sewing factory operations"
        breadcrumbs={[{ label: 'Manufacturing' }]}
      />

      {modules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(m => (
            <Link key={m.href} href={m.href} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all group">
              <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <m.icon className={`h-5 w-5 ${m.iconColor}`} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{m.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Factory className="h-4 w-4 text-gray-400" />
              No accessible sections
            </CardTitle>
            <CardDescription>
              You don't currently have permission to view any Manufacturing sections. Contact your administrator if you believe this is incorrect.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
