'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';

// Route to permission mapping
const routePermissions: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/hr': 'hr.view',
  '/hr/employees': 'hr.employees.view',
  '/hr/recruitment': 'hr.recruitment.view',
  '/hr/leave': 'hr.leave.view',
  '/hr/attendance': 'hr.attendance.view',
  '/hr/payroll': 'hr.payroll.view',
  '/hr/performance': 'hr.performance.view',
  '/hr/training': 'hr.training.view',
  '/hr/org-chart': 'hr.view',
  '/finance': 'finance.view',
  '/finance/ledger': 'finance.ledger.view',
  '/finance/invoices': 'finance.invoices.view',
  '/finance/expenses': 'finance.expenses.view',
  '/finance/budgets': 'finance.budgets.view',
  '/finance/receivables': 'finance.receivables.view',
  '/finance/payables': 'finance.payables.view',
  '/finance/reports': 'finance.reports.view',
  '/procurement': 'procurement.view',
  '/procurement/vendors': 'procurement.vendors.view',
  '/procurement/requests': 'procurement.requests.view',
  '/procurement/orders': 'procurement.orders.view',
  '/procurement/contracts': 'procurement.view',
  '/inventory': 'inventory.view',
  '/inventory/products': 'inventory.products.view',
  '/inventory/categories': 'inventory.categories.view',
  '/inventory/warehouses': 'inventory.warehouses.view',
  '/inventory/movements': 'inventory.movements.view',
  '/crm': 'crm.view',
  '/crm/leads': 'crm.leads.view',
  '/crm/pipeline': 'crm.pipeline.view',
  '/crm/customers': 'crm.customers.view',
  '/crm/orders': 'crm.orders.view',
  '/crm/contacts': 'crm.contacts.view',
  '/projects': 'projects.view',
  '/projects/list': 'projects.list.view',
  '/projects/tasks': 'projects.tasks.view',
  '/projects/kanban': 'projects.kanban.view',
  '/administration': 'facilities.view',
  '/administration/assets': 'assets.view',
  '/administration/fleet': 'assets.vehicles.view',
  '/administration/visitors': 'reception.visitors.view',
  '/administration/work-orders': 'facilities.maintenance.view',
  '/support': 'support.view',
  '/support/tickets': 'support.tickets.view',
  '/support/knowledge-base': 'support.knowledge.view',
  '/reports': 'reports.view',
  '/settings': 'settings.view',
  '/settings/company': 'settings.company.edit',
  '/settings/users': 'settings.users.view',
  '/settings/roles': 'roles.view',
  '/settings/permissions': 'permissions.view',
  '/settings/departments': 'settings.departments.view',
  '/settings/branches': 'settings.branches.view',
  '/settings/notifications': 'settings.notifications.edit',
  '/settings/security': 'settings.security.edit',
  '/settings/billing': 'settings.billing.view',
  // Administration routes
  '/administration/facilities/maintenance': 'facilities.maintenance.view',
  '/administration/facilities/utilities': 'facilities.utilities.view',
  '/administration/facilities/cleaning': 'facilities.cleaning.view',
  '/administration/facilities/relocation': 'facilities.relocation.view',
  '/administration/facilities/meeting-rooms': 'facilities.meeting_rooms.view',
  '/administration/assets/furniture': 'assets.furniture.view',
  '/administration/assets/equipment': 'assets.equipment.view',
  '/administration/assets/vehicles': 'assets.vehicles.view',
  '/administration/assets/assignments': 'assets.assignment.view',
  '/administration/assets/maintenance': 'assets.maintenance.view',
  '/administration/reception/visitors': 'reception.visitors.view',
  '/administration/reception/courier': 'reception.courier.view',
  '/administration/reception/incoming-mail': 'reception.incoming_mail.view',
  '/administration/reception/outgoing-mail': 'reception.outgoing_mail.view',
  '/administration/supplies/inventory': 'supplies.inventory.view',
  '/administration/supplies/requests': 'supplies.requests.view',
  '/administration/supplies/issuance': 'supplies.issuance.view',
  '/administration/vendors/cleaning': 'vendors.cleaning.view',
  '/administration/vendors/maintenance': 'vendors.maintenance.view',
  '/administration/vendors/internet': 'vendors.internet.view',
  '/administration/vendors/electricity': 'vendors.electricity.view',
  '/administration/documents/policies': 'documents.policies.view',
  '/administration/documents/letters': 'documents.letters.view',
  '/administration/documents/minutes': 'documents.minutes.view',
  '/administration/documents/archive': 'documents.archive.view',
};

function getRequiredPermission(pathname: string): string | null {
  // Check exact match first
  if (routePermissions[pathname]) {
    return routePermissions[pathname];
  }
  
  // Check for partial matches (e.g., /hr/employees/edit should check hr.employees.view)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const basePath = `/${segments[0]}/${segments[1]}`;
    if (routePermissions[basePath]) {
      return routePermissions[basePath];
    }
  }
  
  // Check module-level permission
  if (segments.length >= 1) {
    const modulePath = `/${segments[0]}`;
    if (routePermissions[modulePath]) {
      return routePermissions[modulePath];
    }
  }
  
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, hasPermission, isSuperAdmin, isCompanyAdmin, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    // Only check permissions after loading is complete and user is authenticated
    if (!loading && user && pathname !== '/unauthorized') {
      const requiredPermission = getRequiredPermission(pathname);
      
      // Super Admin and Company Admin bypass all permission checks
      // Also wait for permissions to be loaded before checking
      if (!isCompanyAdmin() && requiredPermission && permissions.length > 0 && !hasPermission(requiredPermission)) {
        router.replace('/unauthorized');
      }
    }
  }, [user, loading, router, pathname, hasPermission, isCompanyAdmin, permissions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <AppLayout>{children}</AppLayout>;
}
