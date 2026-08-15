'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { isRouteAllowedForDepartment } from '@/lib/department-access';

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
  '/administration/visitors': 'reception.visitors.view',
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
  // Administration routes — kept in sync with config/navigation.ts's
  // Administration section; every href defined there has a matching entry
  // here so the sidebar and direct-URL route protection never diverge.
  '/administration/facilities/maintenance': 'facilities.maintenance.view',
  '/administration/facilities/utilities': 'facilities.utilities.view',
  '/administration/facilities/cleaning': 'facilities.cleaning.view',
  '/administration/facilities/relocation': 'facilities.relocation.view',
  '/administration/facilities/meeting-rooms': 'facilities.meeting_rooms.view',
  '/administration/assets': 'assets.view',
  '/administration/assets/furniture': 'assets.furniture.view',
  '/administration/assets/equipment': 'assets.equipment.view',
  '/administration/assets/vehicles': 'assets.vehicles.view',
  '/administration/assets/assignments': 'assets.assignment.view',
  '/administration/assets/maintenance': 'assets.maintenance.view',
  '/administration/assets/movement-history': 'assets.movement.view',
  '/administration/reception/visitors': 'reception.visitors.view',
  '/administration/reception/courier': 'reception.courier.view',
  '/administration/reception/incoming-mail': 'reception.incoming_mail.view',
  '/administration/reception/outgoing-mail': 'reception.outgoing_mail.view',
  '/administration/office-supplies/inventory': 'supplies.inventory.view',
  '/administration/office-supplies/requests': 'supplies.requests.view',
  '/administration/office-supplies/issuance': 'supplies.issuance.view',
  '/administration/office-supplies/low-stock': 'supplies.low_stock.view',
  '/administration/vendor-management/cleaning-vendors': 'vendors.cleaning.view',
  '/administration/vendor-management/maintenance-vendors': 'vendors.maintenance.view',
  '/administration/vendor-management/internet-providers': 'vendors.internet.view',
  '/administration/vendor-management/electricity-providers': 'vendors.electricity.view',
  '/administration/vendor-management/quotations': 'vendors.quotations.view',
  '/administration/vendor-management/performance': 'vendors.performance.view',
  '/administration/documents/company-policies': 'documents.policies.view',
  '/administration/documents/letters': 'documents.letters.view',
  '/administration/documents/meeting-minutes': 'documents.minutes.view',
  '/administration/documents/archive': 'documents.archive.view',
  '/administration/attendance': 'attendance.view',
  '/administration/attendance/daily': 'attendance.daily.view',
  '/administration/attendance/clock-in-out': 'attendance.clock_in_out.view',
  '/administration/attendance/lateness': 'attendance.lateness.view',
  '/administration/attendance/absence': 'attendance.absence.view',
  '/administration/attendance/id-compliance': 'attendance.id_compliance.view',
  '/administration/attendance/reports': 'attendance.reports.view',
  '/administration/inspections': 'inspections.view',
  '/administration/inspections/cleanliness': 'inspections.cleanliness.view',
  '/administration/inspections/restroom': 'inspections.restroom.view',
  '/administration/inspections/workspace': 'inspections.workspace.view',
  '/administration/inspections/reception': 'inspections.reception.view',
  '/administration/inspections/meeting-rooms': 'inspections.meeting_rooms.view',
  '/administration/inspections/issues': 'inspections.issues.view',
  '/administration/fuel': 'fuel.view',
  '/administration/fuel/records': 'fuel.records.view',
  '/administration/fuel/drivers': 'fuel.drivers.view',
  '/administration/fuel/vehicles': 'fuel.vehicles.view',
  '/administration/drivers': 'drivers.view',
  '/administration/drivers/list': 'drivers.list.view',
  '/administration/drivers/trips': 'drivers.trips.view',
  '/administration/drivers/licenses': 'drivers.licenses.view',
  '/administration/purchase-requests': 'purchase_requests.view',
  '/administration/purchase-requests/list': 'purchase_requests.list.view',
  '/administration/purchase-requests/pending': 'purchase_requests.pending.view',
  '/administration/purchase-requests/my-requests': 'purchase_requests.my.view',
  '/administration/purchase-requests/approvals': 'purchase_requests.approvals.view',
  '/administration/purchase-requests/reports': 'purchase_requests.reports.view',
  '/administration/reports': 'admin_reports.view',
  '/administration/approvals': 'approvals.view',
  '/administration/approvals/workflows': 'approvals.workflows.view',
  '/administration/audit-logs': 'audit_logs.view',
  '/administration/birthdays': 'birthdays.view',
  '/administration/calendar': 'calendar.view',
  '/administration/fleet': 'assets.vehicles.view',
  '/administration/meetings': 'meetings.view',
  '/administration/notifications': 'notifications.view',
  '/administration/work-orders': 'facilities.maintenance.view',
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
  const { user, loading, hasPermission, isSuperAdmin, isCompanyAdmin, permissions, departmentName } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    // Only check permissions after loading is complete and user is authenticated
    if (!loading && user && pathname !== '/unauthorized') {
      // Department check: non-admin users can only access routes within their department
      if (!isCompanyAdmin() && permissions.length > 0 && !isRouteAllowedForDepartment(pathname, departmentName ?? undefined)) {
        router.replace('/unauthorized');
        return;
      }

      const requiredPermission = getRequiredPermission(pathname);
      
      // Super Admin and Company Admin bypass all permission checks
      // Also wait for permissions to be loaded before checking
      if (!isCompanyAdmin() && requiredPermission && permissions.length > 0 && !hasPermission(requiredPermission)) {
        router.replace('/unauthorized');
      }
    }
  }, [user, loading, router, pathname, hasPermission, isCompanyAdmin, permissions, departmentName]);

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
