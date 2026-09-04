import {
  LayoutDashboard, Users, DollarSign, ShoppingCart, Package, BarChart3,
  Headphones, FolderKanban, Settings, Building2, Truck, UserCheck,
  FileText, Shield, GraduationCap, CheckSquare, Wrench, TrendingUp,
  Globe, Bell, Search, ChevronDown, ChevronRight, LogOut, Moon, Sun,
  Menu, X, Home, Briefcase, CreditCard, Target, Award, BookOpen,
  AlertTriangle, Warehouse, Car, Clipboard, Calendar, Activity, Clock,
  PieChart, Layers, Database, UserPlus, ShieldCheck, Key, WrenchIcon,
  Mail, Inbox, Archive, FileCheck, SprayCan, Zap, MapPin, Monitor,
  Sofa, Cpu, Printer, FileSignature, Factory, Store, Scissors,
  HelpCircle, Megaphone, Palette, MonitorPlay, ClipboardCheck, IdCard, Fuel,
  Scale, ShoppingBag
} from 'lucide-react';

export interface NavItem {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
  roles?: string[];
  permission?: string;
  module?: string;
  companySpecific?: boolean;
}

// Company-specific module configurations
export const companyModules: Record<string, NavItem[]> = {
  targfit: [
    {
      title: 'Manufacturing',
      icon: Factory,
      module: 'manufacturing',
      permission: 'manufacturing.view',
      companySpecific: true,
      children: [
        { title: 'Overview', href: '/manufacturing', icon: LayoutDashboard, permission: 'manufacturing.view' },
        { title: 'Print Factory', href: '/manufacturing/print-factory', icon: Printer, permission: 'manufacturing.print_factory.view' },
        { title: 'Retail Store', href: '/manufacturing/retail-store', icon: Store, permission: 'manufacturing.retail_store.view' },
        { title: 'Sewing Factory', href: '/manufacturing/sewing-factory', icon: Scissors, permission: 'manufacturing.sewing_factory.view' },
      ],
    },
  ],
};

// Default navigation for non-Targfit companies
export const defaultNavigationConfig: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
    permission: 'dashboard.view',
  },
  {
    title: 'Human Resources',
    icon: Users,
    module: 'hr',
    permission: 'hr.view',
    children: [
      { title: 'Overview', href: '/hr', icon: LayoutDashboard, permission: 'hr.view' },
      { title: 'Employees', href: '/hr/employees', icon: Users, permission: 'hr.employees.view' },
      { title: 'Employee Requests', href: '/hr/employee-requests', icon: UserPlus, permission: 'hr.employee_requests.view' },
      { title: 'Departments', href: '/hr/departments', icon: Layers, permission: 'hr.departments.view' },
      { title: 'Attendance', href: '/hr/attendance', icon: Activity, permission: 'hr.attendance.view' },
      { title: 'Leave', href: '/hr/leave', icon: Calendar, permission: 'hr.leave.view' },
      { title: 'Recruitment', href: '/hr/recruitment', icon: Briefcase, permission: 'hr.recruitment.view' },
      { title: 'Onboarding', href: '/hr/onboarding', icon: ClipboardCheck, permission: 'hr.onboarding.view' },
      { title: 'Payroll', href: '/hr/payroll', icon: CreditCard, permission: 'hr.payroll.view' },
    ],
  },
  {
    title: 'Finance & Accounts',
    icon: DollarSign,
    module: 'finance',
    permission: 'finance.view',
    children: [
      { title: 'Overview', href: '/finance', icon: LayoutDashboard, permission: 'finance.view' },
      { title: 'Accounts', href: '/finance/accounts', icon: Database, permission: 'finance.accounts.view' },
      { title: 'Expenses', href: '/finance/expenses', icon: CreditCard, permission: 'finance.expenses.view' },
      { title: 'Budgets', href: '/finance/budgets', icon: PieChart, permission: 'finance.budgets.view' },
      { title: 'Journal Entries', href: '/finance/journal', icon: FileText, permission: 'finance.journal.view' },
      { title: 'Payroll', href: '/finance/payroll', icon: CreditCard, permission: 'finance.payroll.view' },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    module: 'inventory',
    permission: 'inventory.view',
    children: [
      { title: 'Overview', href: '/inventory', icon: LayoutDashboard, permission: 'inventory.view' },
      { title: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse, permission: 'inventory.warehouses.view' },
      { title: 'Products', href: '/inventory/products', icon: Package, permission: 'inventory.products.view' },
      { title: 'Stock', href: '/inventory/stock', icon: Activity, permission: 'inventory.stock.view' },
      { title: 'Categories', href: '/inventory/categories', icon: Layers, permission: 'inventory.categories.view' },
      { title: 'Stock Movement', href: '/inventory/movements', icon: TrendingUp, permission: 'inventory.movements.view' },
    ],
  },
  {
    title: 'Procurement',
    icon: ShoppingCart,
    module: 'procurement',
    permission: 'procurement.view',
    children: [
      { title: 'Overview', href: '/procurement', icon: LayoutDashboard, permission: 'procurement.view' },
      { title: 'Vendors', href: '/procurement/vendors', icon: Building2, permission: 'procurement.vendors.view' },
      { title: 'Purchase Requests', href: '/procurement/requests', icon: Clipboard, permission: 'procurement.requests.view' },
      { title: 'Purchase Orders', href: '/procurement/orders', icon: ShoppingCart, permission: 'procurement.orders.view' },
    ],
  },
  {
    title: 'Sales & CRM',
    icon: Target,
    module: 'crm',
    permission: 'crm.view',
    children: [
      { title: 'Overview', href: '/crm', icon: LayoutDashboard, permission: 'crm.view' },
      { title: 'Leads', href: '/crm/leads', icon: Target, permission: 'crm.leads.view' },
      { title: 'Opportunities', href: '/crm/opportunities', icon: TrendingUp, permission: 'crm.opportunities.view' },
      { title: 'Customers', href: '/crm/customers', icon: Users, permission: 'crm.customers.view' },
      { title: 'Sales Orders', href: '/crm/orders', icon: ShoppingCart, permission: 'crm.orders.view' },
      { title: 'Invoices', href: '/crm/invoices', icon: FileText, permission: 'crm.invoices.view' },
    ],
  },
  {
    title: 'Legal',
    icon: Shield,
    module: 'legal',
    permission: 'legal.view',
    children: [
      { title: 'Overview', href: '/legal', icon: LayoutDashboard, permission: 'legal.view' },
      { title: 'Contracts', href: '/legal/contracts', icon: FileText, permission: 'legal.contracts.view' },
      { title: 'Compliance', href: '/legal/compliance', icon: ShieldCheck, permission: 'legal.compliance.view' },
      { title: 'Legal Documents', href: '/legal/documents', icon: FileSignature, permission: 'legal.documents.view' },
    ],
  },
  {
    title: 'Administration',
    icon: Building2,
    module: 'admin',
    permission: 'facilities.view',
    children: [
      { 
        title: 'Facilities', 
        icon: Building2,
        permission: 'facilities.view',
        children: [
          { title: 'Maintenance', href: '/administration/facilities/maintenance', icon: WrenchIcon, permission: 'facilities.maintenance.view' },
          { title: 'Utilities', href: '/administration/facilities/utilities', icon: Zap, permission: 'facilities.utilities.view' },
          { title: 'Cleaning', href: '/administration/facilities/cleaning', icon: SprayCan, permission: 'facilities.cleaning.view' },
          { title: 'Relocation', href: '/administration/facilities/relocation', icon: MapPin, permission: 'facilities.relocation.view' },
          { title: 'Meeting Rooms', href: '/administration/facilities/meeting-rooms', icon: Monitor, permission: 'facilities.meeting_rooms.view' },
        ]
      },
      { 
        title: 'Assets', 
        icon: Briefcase,
        permission: 'assets.view',
        children: [
          { title: 'Overview', href: '/administration/assets', icon: Briefcase, permission: 'assets.view' },
          { title: 'Furniture', href: '/administration/assets/furniture', icon: Sofa, permission: 'assets.furniture.view' },
          { title: 'Equipment', href: '/administration/assets/equipment', icon: Cpu, permission: 'assets.equipment.view' },
          { title: 'Vehicles', href: '/administration/assets/vehicles', icon: Car, permission: 'assets.vehicles.view' },
          { title: 'Assignments', href: '/administration/assets/assignments', icon: UserCheck, permission: 'assets.assignment.view' },
          { title: 'Maintenance', href: '/administration/assets/maintenance', icon: Wrench, permission: 'assets.maintenance.view' },
          { title: 'Movement History', href: '/administration/assets/movement-history', icon: TrendingUp, permission: 'assets.movement.view' },
        ]
      },
      { 
        title: 'Reception', 
        icon: UserCheck,
        permission: 'reception.view',
        children: [
          { title: 'Visitors', href: '/administration/reception/visitors', icon: UserCheck, permission: 'reception.visitors.view' },
          { title: 'Courier', href: '/administration/reception/courier', icon: Truck, permission: 'reception.courier.view' },
          { title: 'Incoming Mail', href: '/administration/reception/incoming-mail', icon: Inbox, permission: 'reception.incoming_mail.view' },
          { title: 'Outgoing Mail', href: '/administration/reception/outgoing-mail', icon: Mail, permission: 'reception.outgoing_mail.view' },
        ]
      },
      { 
        title: 'Office Supplies', 
        icon: Package,
        permission: 'supplies.view',
        children: [
          { title: 'Inventory', href: '/administration/office-supplies/inventory', icon: Package, permission: 'supplies.inventory.view' },
          { title: 'Requests', href: '/administration/office-supplies/requests', icon: Clipboard, permission: 'supplies.requests.view' },
          { title: 'Issuance', href: '/administration/office-supplies/issuance', icon: Printer, permission: 'supplies.issuance.view' },
          { title: 'Low Stock', href: '/administration/office-supplies/low-stock', icon: AlertTriangle, permission: 'supplies.low_stock.view' },
        ]
      },
      { 
        title: 'Vendors', 
        icon: Building2,
        permission: 'vendors.view',
        children: [
          { title: 'Cleaning', href: '/administration/vendor-management/cleaning-vendors', icon: SprayCan, permission: 'vendors.cleaning.view' },
          { title: 'Maintenance', href: '/administration/vendor-management/maintenance-vendors', icon: Wrench, permission: 'vendors.maintenance.view' },
          { title: 'Internet', href: '/administration/vendor-management/internet-providers', icon: Globe, permission: 'vendors.internet.view' },
          { title: 'Electricity', href: '/administration/vendor-management/electricity-providers', icon: Zap, permission: 'vendors.electricity.view' },
          { title: 'Quotations', href: '/administration/vendor-management/quotations', icon: FileText, permission: 'vendors.quotations.view' },
          { title: 'Performance', href: '/administration/vendor-management/performance', icon: TrendingUp, permission: 'vendors.performance.view' },
        ]
      },
      { 
        title: 'Documents', 
        icon: FileText,
        permission: 'documents.view',
        children: [
          { title: 'Policies', href: '/administration/documents/company-policies', icon: FileCheck, permission: 'documents.policies.view' },
          { title: 'Letters', href: '/administration/documents/letters', icon: FileSignature, permission: 'documents.letters.view' },
          { title: 'Meeting Minutes', href: '/administration/documents/meeting-minutes', icon: Clipboard, permission: 'documents.minutes.view' },
          { title: 'Archive', href: '/administration/documents/archive', icon: Archive, permission: 'documents.archive.view' },
        ]
      },
      { 
        title: 'Staff Attendance', 
        icon: Activity,
        permission: 'attendance.view',
        children: [
          { title: 'Overview', href: '/administration/attendance', icon: LayoutDashboard, permission: 'attendance.view' },
          { title: 'Daily Attendance', href: '/administration/attendance/daily', icon: Calendar, permission: 'attendance.daily.view' },
          { title: 'Clock In/Out', href: '/administration/attendance/clock-in-out', icon: Clock, permission: 'attendance.clock_in_out.view' },
          { title: 'Lateness', href: '/administration/attendance/lateness', icon: AlertTriangle, permission: 'attendance.lateness.view' },
          { title: 'Absence', href: '/administration/attendance/absence', icon: UserCheck, permission: 'attendance.absence.view' },
          { title: 'ID Compliance', href: '/administration/attendance/id-compliance', icon: IdCard, permission: 'attendance.id_compliance.view' },
          { title: 'Reports', href: '/administration/attendance/reports', icon: FileText, permission: 'attendance.reports.view' },
        ]
      },
      { 
        title: 'Inspections', 
        icon: ClipboardCheck,
        permission: 'inspections.view',
        children: [
          { title: 'Overview', href: '/administration/inspections', icon: LayoutDashboard, permission: 'inspections.view' },
          { title: 'Cleanliness', href: '/administration/inspections/cleanliness', icon: SprayCan, permission: 'inspections.cleanliness.view' },
          { title: 'Restroom', href: '/administration/inspections/restroom', icon: UserCheck, permission: 'inspections.restroom.view' },
          { title: 'Workspace', href: '/administration/inspections/workspace', icon: Monitor, permission: 'inspections.workspace.view' },
          { title: 'Reception', href: '/administration/inspections/reception', icon: Building2, permission: 'inspections.reception.view' },
          { title: 'Meeting Rooms', href: '/administration/inspections/meeting-rooms', icon: Monitor, permission: 'inspections.meeting_rooms.view' },
          { title: 'Issues', href: '/administration/inspections/issues', icon: AlertTriangle, permission: 'inspections.issues.view' },
        ]
      },
      { 
        title: 'Fuel Management', 
        icon: Fuel,
        permission: 'fuel.view',
        children: [
          { title: 'Overview', href: '/administration/fuel', icon: LayoutDashboard, permission: 'fuel.view' },
          { title: 'Fuel Records', href: '/administration/fuel/records', icon: FileText, permission: 'fuel.records.view' },
          { title: 'Driver Usage', href: '/administration/fuel/drivers', icon: UserCheck, permission: 'fuel.drivers.view' },
          { title: 'Vehicle History', href: '/administration/fuel/vehicles', icon: Car, permission: 'fuel.vehicles.view' },
        ]
      },
      { 
        title: 'Drivers', 
        icon: Car,
        permission: 'drivers.view',
        children: [
          { title: 'Overview', href: '/administration/drivers', icon: LayoutDashboard, permission: 'drivers.view' },
          { title: 'Drivers List', href: '/administration/drivers/list', icon: Users, permission: 'drivers.list.view' },
          { title: 'Trips', href: '/administration/drivers/trips', icon: MapPin, permission: 'drivers.trips.view' },
          { title: 'Licenses', href: '/administration/drivers/licenses', icon: IdCard, permission: 'drivers.licenses.view' },
        ]
      },
      { 
        title: 'Purchase Requests', 
        icon: Clipboard,
        permission: 'purchase_requests.view',
        children: [
          { title: 'Overview', href: '/administration/purchase-requests', icon: LayoutDashboard, permission: 'purchase_requests.view' },
          { title: 'All Requests', href: '/administration/purchase-requests/list', icon: FileText, permission: 'purchase_requests.list.view' },
          { title: 'Pending', href: '/administration/purchase-requests/pending', icon: Clock, permission: 'purchase_requests.pending.view' },
          { title: 'My Requests', href: '/administration/purchase-requests/my-requests', icon: UserCheck, permission: 'purchase_requests.my.view' },
          { title: 'Approvals', href: '/administration/purchase-requests/approvals', icon: CheckSquare, permission: 'purchase_requests.approvals.view' },
          { title: 'Reports', href: '/administration/purchase-requests/reports', icon: BarChart3, permission: 'purchase_requests.reports.view' },
        ]
      },
      { 
        title: 'Admin Reports', 
        icon: BarChart3,
        permission: 'admin_reports.view',
        children: [
          { title: 'Overview', href: '/administration/reports', icon: LayoutDashboard, permission: 'admin_reports.view' },
        ]
      },
      { 
        title: 'Approvals', 
        icon: CheckSquare,
        permission: 'approvals.view',
        children: [
          { title: 'Overview', href: '/administration/approvals', icon: LayoutDashboard, permission: 'approvals.view' },
          { title: 'Workflows', href: '/administration/approvals/workflows', icon: Layers, permission: 'approvals.workflows.view' },
        ]
      },
      { 
        title: 'Audit Logs', 
        icon: ShieldCheck,
        permission: 'audit_logs.view',
        children: [
          { title: 'Overview', href: '/administration/audit-logs', icon: LayoutDashboard, permission: 'audit_logs.view' },
        ]
      },
      { 
        title: 'Birthdays', 
        icon: Award,
        permission: 'birthdays.view',
        children: [
          { title: 'Overview', href: '/administration/birthdays', icon: LayoutDashboard, permission: 'birthdays.view' },
        ]
      },
      { 
        title: 'Calendar', 
        icon: Calendar,
        permission: 'calendar.view',
        children: [
          { title: 'Overview', href: '/administration/calendar', icon: LayoutDashboard, permission: 'calendar.view' },
        ]
      },
      { 
        title: 'Fleet', 
        icon: Truck,
        permission: 'assets.vehicles.view',
        children: [
          { title: 'Overview', href: '/administration/fleet', icon: LayoutDashboard, permission: 'assets.vehicles.view' },
        ]
      },
      { 
        title: 'Meetings', 
        icon: Users,
        permission: 'meetings.view',
        children: [
          { title: 'Overview', href: '/administration/meetings', icon: LayoutDashboard, permission: 'meetings.view' },
        ]
      },
      { 
        title: 'Notifications', 
        icon: Bell,
        permission: 'notifications.view',
        children: [
          { title: 'Overview', href: '/administration/notifications', icon: LayoutDashboard, permission: 'notifications.view' },
        ]
      },
      { 
        title: 'Work Orders', 
        icon: Wrench,
        permission: 'facilities.maintenance.view',
        children: [
          { title: 'Overview', href: '/administration/work-orders', icon: LayoutDashboard, permission: 'facilities.maintenance.view' },
        ]
      },
    ],
  },
  {
    title: 'Operations',
    icon: FolderKanban,
    module: 'operations',
    permission: 'operations.view',
    children: [
      { title: 'Overview', href: '/operations', icon: LayoutDashboard, permission: 'operations.view' },
      { title: 'Projects', href: '/operations/projects', icon: FolderKanban, permission: 'operations.projects.view' },
      { title: 'Tasks', href: '/operations/tasks', icon: CheckSquare, permission: 'operations.tasks.view' },
      { title: 'Work Orders', href: '/operations/work-orders', icon: Clipboard, permission: 'operations.work_orders.view' },
    ],
  },
  {
    title: 'Information Technology',
    icon: Cpu,
    module: 'it',
    permission: 'it.view',
    children: [
      { title: 'Overview', href: '/it', icon: LayoutDashboard, permission: 'it.view' },
      { title: 'Users', href: '/it/users', icon: Users, permission: 'it.users.view' },
      { title: 'Roles', href: '/it/roles', icon: ShieldCheck, permission: 'it.roles.view' },
      { title: 'Permissions', href: '/it/permissions', icon: Key, permission: 'it.permissions.view' },
      { title: 'System Settings', href: '/it/settings', icon: Settings, permission: 'it.settings.view' },
    ],
  },
  {
    title: 'Quality Assurance & Quality Control',
    icon: Scale,
    module: 'qa_qc',
    permission: 'qa_qc.view',
    children: [
      { title: 'Overview', href: '/quality', icon: LayoutDashboard, permission: 'qa_qc.view' },
      { title: 'QA Inspections', href: '/quality/inspections', icon: ClipboardCheck, permission: 'qa_qc.inspections.view' },
      { title: 'QC Reports', href: '/quality/reports', icon: FileText, permission: 'qa_qc.reports.view' },
    ],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    module: 'reports',
    permission: 'reports.view',
  },
  {
    title: 'Settings',
    icon: Settings,
    module: 'settings',
    permission: 'settings.view',
    children: [
      { title: 'Company', href: '/settings/company', icon: Building2, permission: 'settings.company.edit' },
      { 
        title: 'Users & Roles', 
        icon: Users, 
        permission: 'settings.users.view',
        children: [
          { title: 'Users', href: '/settings/users', icon: UserPlus, permission: 'settings.users.view' },
          { title: 'Roles', href: '/settings/roles', icon: ShieldCheck, permission: 'roles.view' },
          { title: 'Permissions', href: '/settings/permissions', icon: Key, permission: 'permissions.view' },
        ]
      },
      { title: 'Departments', href: '/settings/departments', icon: Layers, permission: 'settings.departments.view' },
      { title: 'Branches', href: '/settings/branches', icon: Globe, permission: 'settings.branches.view' },
      { title: 'Notifications', href: '/settings/notifications', icon: Bell, permission: 'settings.notifications.edit' },
      { title: 'Security', href: '/settings/security', icon: Shield, permission: 'settings.security.edit' },
      { title: 'Billing', href: '/settings/billing', icon: CreditCard, permission: 'settings.billing.view' },
    ],
  },
];

// Full navigation for Targfit companies (includes all modules)
export const navigationConfig: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
    permission: 'dashboard.view',
  },
  {
    title: 'Human Resources',
    icon: Users,
    module: 'hr',
    permission: 'hr.view',
    children: [
      { title: 'Overview', href: '/hr', icon: LayoutDashboard, permission: 'hr.view' },
      { title: 'Employees', href: '/hr/employees', icon: Users, permission: 'hr.employees.view' },
      { title: 'Employee Requests', href: '/hr/employee-requests', icon: UserPlus, permission: 'hr.employee_requests.view' },
      { title: 'Departments', href: '/hr/departments', icon: Layers, permission: 'hr.departments.view' },
      { title: 'Attendance', href: '/hr/attendance', icon: Activity, permission: 'hr.attendance.view' },
      { title: 'Leave', href: '/hr/leave', icon: Calendar, permission: 'hr.leave.view' },
      { title: 'Recruitment', href: '/hr/recruitment', icon: Briefcase, permission: 'hr.recruitment.view' },
      { title: 'Onboarding', href: '/hr/onboarding', icon: ClipboardCheck, permission: 'hr.onboarding.view' },
      { title: 'Payroll', href: '/hr/payroll', icon: CreditCard, permission: 'hr.payroll.view' },
    ],
  },
  {
    title: 'Finance & Accounts',
    icon: DollarSign,
    module: 'finance',
    permission: 'finance.view',
    children: [
      { title: 'Overview', href: '/finance', icon: LayoutDashboard, permission: 'finance.view' },
      { title: 'Accounts', href: '/finance/accounts', icon: Database, permission: 'finance.accounts.view' },
      { title: 'Expenses', href: '/finance/expenses', icon: CreditCard, permission: 'finance.expenses.view' },
      { title: 'Budgets', href: '/finance/budgets', icon: PieChart, permission: 'finance.budgets.view' },
      { title: 'Journal Entries', href: '/finance/journal', icon: FileText, permission: 'finance.journal.view' },
      { title: 'Payroll', href: '/finance/payroll', icon: CreditCard, permission: 'finance.payroll.view' },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    module: 'inventory',
    permission: 'inventory.view',
    children: [
      { title: 'Overview', href: '/inventory', icon: LayoutDashboard, permission: 'inventory.view' },
      { title: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse, permission: 'inventory.warehouses.view' },
      { title: 'Products', href: '/inventory/products', icon: Package, permission: 'inventory.products.view' },
      { title: 'Stock', href: '/inventory/stock', icon: Activity, permission: 'inventory.stock.view' },
      { title: 'Categories', href: '/inventory/categories', icon: Layers, permission: 'inventory.categories.view' },
      { title: 'Stock Movement', href: '/inventory/movements', icon: TrendingUp, permission: 'inventory.movements.view' },
    ],
  },
  {
    title: 'Procurement',
    icon: ShoppingCart,
    module: 'procurement',
    permission: 'procurement.view',
    children: [
      { title: 'Overview', href: '/procurement', icon: LayoutDashboard, permission: 'procurement.view' },
      { title: 'Vendors', href: '/procurement/vendors', icon: Building2, permission: 'procurement.vendors.view' },
      { title: 'Purchase Requests', href: '/procurement/requests', icon: Clipboard, permission: 'procurement.requests.view' },
      { title: 'Purchase Orders', href: '/procurement/orders', icon: ShoppingCart, permission: 'procurement.orders.view' },
    ],
  },
  {
    title: 'Sales & CRM',
    icon: Target,
    module: 'crm',
    permission: 'crm.view',
    children: [
      { title: 'Overview', href: '/crm', icon: LayoutDashboard, permission: 'crm.view' },
      { title: 'Leads', href: '/crm/leads', icon: Target, permission: 'crm.leads.view' },
      { title: 'Opportunities', href: '/crm/opportunities', icon: TrendingUp, permission: 'crm.opportunities.view' },
      { title: 'Customers', href: '/crm/customers', icon: Users, permission: 'crm.customers.view' },
      { title: 'Sales Orders', href: '/crm/orders', icon: ShoppingCart, permission: 'crm.orders.view' },
      { title: 'Invoices', href: '/crm/invoices', icon: FileText, permission: 'crm.invoices.view' },
    ],
  },
  {
    title: 'Client Servicing',
    icon: HelpCircle,
    module: 'client_servicing',
    permission: 'client_servicing.view',
    children: [
      { title: 'Overview', href: '/client-servicing', icon: LayoutDashboard, permission: 'client_servicing.view' },
      { title: 'Tickets', href: '/client-servicing/tickets', icon: Headphones, permission: 'client_servicing.tickets.view' },
      { title: 'Customer Support', href: '/client-servicing/support', icon: UserCheck, permission: 'client_servicing.support.view' },
      { title: 'SLA Tracking', href: '/client-servicing/sla', icon: ClipboardCheck, permission: 'client_servicing.sla.view' },
    ],
  },
  {
    title: 'Client Marketing',
    icon: Megaphone,
    module: 'client_marketing',
    permission: 'client_marketing.view',
    children: [
      { title: 'Overview', href: '/client-marketing', icon: LayoutDashboard, permission: 'client_marketing.view' },
      { title: 'Campaigns', href: '/client-marketing/campaigns', icon: Megaphone, permission: 'client_marketing.campaigns.view' },
      { title: 'Promotions', href: '/client-marketing/promotions', icon: Target, permission: 'client_marketing.promotions.view' },
      { title: 'Marketing Analytics', href: '/client-marketing/analytics', icon: BarChart3, permission: 'client_marketing.analytics.view' },
    ],
  },
  {
    title: 'Legal',
    icon: Shield,
    module: 'legal',
    permission: 'legal.view',
    children: [
      { title: 'Overview', href: '/legal', icon: LayoutDashboard, permission: 'legal.view' },
      { title: 'Contracts', href: '/legal/contracts', icon: FileText, permission: 'legal.contracts.view' },
      { title: 'Compliance', href: '/legal/compliance', icon: ShieldCheck, permission: 'legal.compliance.view' },
      { title: 'Legal Documents', href: '/legal/documents', icon: FileSignature, permission: 'legal.documents.view' },
    ],
  },
  {
    title: 'Graphics',
    icon: Palette,
    module: 'graphics',
    permission: 'graphics.view',
    children: [
      { title: 'Overview', href: '/graphics', icon: LayoutDashboard, permission: 'graphics.view' },
      { title: 'Design Requests', href: '/graphics/requests', icon: Clipboard, permission: 'graphics.requests.view' },
      { title: 'Creative Assets', href: '/graphics/assets', icon: Palette, permission: 'graphics.assets.view' },
    ],
  },
  {
    title: 'Administration',
    icon: Building2,
    module: 'admin',
    permission: 'facilities.view',
    children: [
      { 
        title: 'Facilities', 
        icon: Building2,
        permission: 'facilities.view',
        children: [
          { title: 'Maintenance', href: '/administration/facilities/maintenance', icon: WrenchIcon, permission: 'facilities.maintenance.view' },
          { title: 'Utilities', href: '/administration/facilities/utilities', icon: Zap, permission: 'facilities.utilities.view' },
          { title: 'Cleaning', href: '/administration/facilities/cleaning', icon: SprayCan, permission: 'facilities.cleaning.view' },
          { title: 'Relocation', href: '/administration/facilities/relocation', icon: MapPin, permission: 'facilities.relocation.view' },
          { title: 'Meeting Rooms', href: '/administration/facilities/meeting-rooms', icon: Monitor, permission: 'facilities.meeting_rooms.view' },
        ]
      },
      { 
        title: 'Assets', 
        icon: Briefcase,
        permission: 'assets.view',
        children: [
          { title: 'Overview', href: '/administration/assets', icon: Briefcase, permission: 'assets.view' },
          { title: 'Furniture', href: '/administration/assets/furniture', icon: Sofa, permission: 'assets.furniture.view' },
          { title: 'Equipment', href: '/administration/assets/equipment', icon: Cpu, permission: 'assets.equipment.view' },
          { title: 'Vehicles', href: '/administration/assets/vehicles', icon: Car, permission: 'assets.vehicles.view' },
          { title: 'Assignments', href: '/administration/assets/assignments', icon: UserCheck, permission: 'assets.assignment.view' },
          { title: 'Maintenance', href: '/administration/assets/maintenance', icon: Wrench, permission: 'assets.maintenance.view' },
          { title: 'Movement History', href: '/administration/assets/movement-history', icon: TrendingUp, permission: 'assets.movement.view' },
        ]
      },
      { 
        title: 'Reception', 
        icon: UserCheck,
        permission: 'reception.view',
        children: [
          { title: 'Visitors', href: '/administration/reception/visitors', icon: UserCheck, permission: 'reception.visitors.view' },
          { title: 'Courier', href: '/administration/reception/courier', icon: Truck, permission: 'reception.courier.view' },
          { title: 'Incoming Mail', href: '/administration/reception/incoming-mail', icon: Inbox, permission: 'reception.incoming_mail.view' },
          { title: 'Outgoing Mail', href: '/administration/reception/outgoing-mail', icon: Mail, permission: 'reception.outgoing_mail.view' },
        ]
      },
      { 
        title: 'Office Supplies', 
        icon: Package,
        permission: 'supplies.view',
        children: [
          { title: 'Inventory', href: '/administration/office-supplies/inventory', icon: Package, permission: 'supplies.inventory.view' },
          { title: 'Requests', href: '/administration/office-supplies/requests', icon: Clipboard, permission: 'supplies.requests.view' },
          { title: 'Issuance', href: '/administration/office-supplies/issuance', icon: Printer, permission: 'supplies.issuance.view' },
          { title: 'Low Stock', href: '/administration/office-supplies/low-stock', icon: AlertTriangle, permission: 'supplies.low_stock.view' },
        ]
      },
      { 
        title: 'Vendors', 
        icon: Building2,
        permission: 'vendors.view',
        children: [
          { title: 'Cleaning', href: '/administration/vendor-management/cleaning-vendors', icon: SprayCan, permission: 'vendors.cleaning.view' },
          { title: 'Maintenance', href: '/administration/vendor-management/maintenance-vendors', icon: Wrench, permission: 'vendors.maintenance.view' },
          { title: 'Internet', href: '/administration/vendor-management/internet-providers', icon: Globe, permission: 'vendors.internet.view' },
          { title: 'Electricity', href: '/administration/vendor-management/electricity-providers', icon: Zap, permission: 'vendors.electricity.view' },
          { title: 'Quotations', href: '/administration/vendor-management/quotations', icon: FileText, permission: 'vendors.quotations.view' },
          { title: 'Performance', href: '/administration/vendor-management/performance', icon: TrendingUp, permission: 'vendors.performance.view' },
        ]
      },
      { 
        title: 'Documents', 
        icon: FileText,
        permission: 'documents.view',
        children: [
          { title: 'Policies', href: '/administration/documents/company-policies', icon: FileCheck, permission: 'documents.policies.view' },
          { title: 'Letters', href: '/administration/documents/letters', icon: FileSignature, permission: 'documents.letters.view' },
          { title: 'Meeting Minutes', href: '/administration/documents/meeting-minutes', icon: Clipboard, permission: 'documents.minutes.view' },
          { title: 'Archive', href: '/administration/documents/archive', icon: Archive, permission: 'documents.archive.view' },
        ]
      },
      { 
        title: 'Staff Attendance', 
        icon: Activity,
        permission: 'attendance.view',
        children: [
          { title: 'Overview', href: '/administration/attendance', icon: LayoutDashboard, permission: 'attendance.view' },
          { title: 'Daily Attendance', href: '/administration/attendance/daily', icon: Calendar, permission: 'attendance.daily.view' },
          { title: 'Clock In/Out', href: '/administration/attendance/clock-in-out', icon: Clock, permission: 'attendance.clock_in_out.view' },
          { title: 'Lateness', href: '/administration/attendance/lateness', icon: AlertTriangle, permission: 'attendance.lateness.view' },
          { title: 'Absence', href: '/administration/attendance/absence', icon: UserCheck, permission: 'attendance.absence.view' },
          { title: 'ID Compliance', href: '/administration/attendance/id-compliance', icon: IdCard, permission: 'attendance.id_compliance.view' },
          { title: 'Reports', href: '/administration/attendance/reports', icon: FileText, permission: 'attendance.reports.view' },
        ]
      },
      { 
        title: 'Inspections', 
        icon: ClipboardCheck,
        permission: 'inspections.view',
        children: [
          { title: 'Overview', href: '/administration/inspections', icon: LayoutDashboard, permission: 'inspections.view' },
          { title: 'Cleanliness', href: '/administration/inspections/cleanliness', icon: SprayCan, permission: 'inspections.cleanliness.view' },
          { title: 'Restroom', href: '/administration/inspections/restroom', icon: UserCheck, permission: 'inspections.restroom.view' },
          { title: 'Workspace', href: '/administration/inspections/workspace', icon: Monitor, permission: 'inspections.workspace.view' },
          { title: 'Reception', href: '/administration/inspections/reception', icon: Building2, permission: 'inspections.reception.view' },
          { title: 'Meeting Rooms', href: '/administration/inspections/meeting-rooms', icon: Monitor, permission: 'inspections.meeting_rooms.view' },
          { title: 'Issues', href: '/administration/inspections/issues', icon: AlertTriangle, permission: 'inspections.issues.view' },
        ]
      },
      { 
        title: 'Fuel Management', 
        icon: Fuel,
        permission: 'fuel.view',
        children: [
          { title: 'Overview', href: '/administration/fuel', icon: LayoutDashboard, permission: 'fuel.view' },
          { title: 'Fuel Records', href: '/administration/fuel/records', icon: FileText, permission: 'fuel.records.view' },
          { title: 'Driver Usage', href: '/administration/fuel/drivers', icon: UserCheck, permission: 'fuel.drivers.view' },
          { title: 'Vehicle History', href: '/administration/fuel/vehicles', icon: Car, permission: 'fuel.vehicles.view' },
        ]
      },
      { 
        title: 'Drivers', 
        icon: Car,
        permission: 'drivers.view',
        children: [
          { title: 'Overview', href: '/administration/drivers', icon: LayoutDashboard, permission: 'drivers.view' },
          { title: 'Drivers List', href: '/administration/drivers/list', icon: Users, permission: 'drivers.list.view' },
          { title: 'Trips', href: '/administration/drivers/trips', icon: MapPin, permission: 'drivers.trips.view' },
          { title: 'Licenses', href: '/administration/drivers/licenses', icon: IdCard, permission: 'drivers.licenses.view' },
        ]
      },
      { 
        title: 'Purchase Requests', 
        icon: Clipboard,
        permission: 'purchase_requests.view',
        children: [
          { title: 'Overview', href: '/administration/purchase-requests', icon: LayoutDashboard, permission: 'purchase_requests.view' },
          { title: 'All Requests', href: '/administration/purchase-requests/list', icon: FileText, permission: 'purchase_requests.list.view' },
          { title: 'Pending', href: '/administration/purchase-requests/pending', icon: Clock, permission: 'purchase_requests.pending.view' },
          { title: 'My Requests', href: '/administration/purchase-requests/my-requests', icon: UserCheck, permission: 'purchase_requests.my.view' },
          { title: 'Approvals', href: '/administration/purchase-requests/approvals', icon: CheckSquare, permission: 'purchase_requests.approvals.view' },
          { title: 'Reports', href: '/administration/purchase-requests/reports', icon: BarChart3, permission: 'purchase_requests.reports.view' },
        ]
      },
      { 
        title: 'Admin Reports', 
        icon: BarChart3,
        permission: 'admin_reports.view',
        children: [
          { title: 'Overview', href: '/administration/reports', icon: LayoutDashboard, permission: 'admin_reports.view' },
        ]
      },
      { 
        title: 'Approvals', 
        icon: CheckSquare,
        permission: 'approvals.view',
        children: [
          { title: 'Overview', href: '/administration/approvals', icon: LayoutDashboard, permission: 'approvals.view' },
          { title: 'Workflows', href: '/administration/approvals/workflows', icon: Layers, permission: 'approvals.workflows.view' },
        ]
      },
      { 
        title: 'Audit Logs', 
        icon: ShieldCheck,
        permission: 'audit_logs.view',
        children: [
          { title: 'Overview', href: '/administration/audit-logs', icon: LayoutDashboard, permission: 'audit_logs.view' },
        ]
      },
      { 
        title: 'Birthdays', 
        icon: Award,
        permission: 'birthdays.view',
        children: [
          { title: 'Overview', href: '/administration/birthdays', icon: LayoutDashboard, permission: 'birthdays.view' },
        ]
      },
      { 
        title: 'Calendar', 
        icon: Calendar,
        permission: 'calendar.view',
        children: [
          { title: 'Overview', href: '/administration/calendar', icon: LayoutDashboard, permission: 'calendar.view' },
        ]
      },
      { 
        title: 'Fleet', 
        icon: Truck,
        permission: 'assets.vehicles.view',
        children: [
          { title: 'Overview', href: '/administration/fleet', icon: LayoutDashboard, permission: 'assets.vehicles.view' },
        ]
      },
      { 
        title: 'Meetings', 
        icon: Users,
        permission: 'meetings.view',
        children: [
          { title: 'Overview', href: '/administration/meetings', icon: LayoutDashboard, permission: 'meetings.view' },
        ]
      },
      { 
        title: 'Notifications', 
        icon: Bell,
        permission: 'notifications.view',
        children: [
          { title: 'Overview', href: '/administration/notifications', icon: LayoutDashboard, permission: 'notifications.view' },
        ]
      },
      { 
        title: 'Work Orders', 
        icon: Wrench,
        permission: 'facilities.maintenance.view',
        children: [
          { title: 'Overview', href: '/administration/work-orders', icon: LayoutDashboard, permission: 'facilities.maintenance.view' },
        ]
      },
    ],
  },
  {
    title: 'Operations',
    icon: FolderKanban,
    module: 'operations',
    permission: 'operations.view',
    children: [
      { title: 'Overview', href: '/operations', icon: LayoutDashboard, permission: 'operations.view' },
      { title: 'Projects', href: '/operations/projects', icon: FolderKanban, permission: 'operations.projects.view' },
      { title: 'Tasks', href: '/operations/tasks', icon: CheckSquare, permission: 'operations.tasks.view' },
      { title: 'Work Orders', href: '/operations/work-orders', icon: Clipboard, permission: 'operations.work_orders.view' },
    ],
  },
  {
    title: 'Logistics',
    icon: Truck,
    module: 'logistics',
    permission: 'logistics.view',
    children: [
      { title: 'Overview', href: '/logistics', icon: LayoutDashboard, permission: 'logistics.view' },
      { title: 'Deliveries', href: '/logistics/deliveries', icon: Truck, permission: 'logistics.deliveries.view' },
      { title: 'Fleet', href: '/logistics/fleet', icon: Car, permission: 'logistics.fleet.view' },
      { title: 'Dispatch', href: '/logistics/dispatch', icon: ShoppingCart, permission: 'logistics.dispatch.view' },
    ],
  },
  {
    title: 'Information Technology',
    icon: Cpu,
    module: 'it',
    permission: 'it.view',
    children: [
      { title: 'Overview', href: '/it', icon: LayoutDashboard, permission: 'it.view' },
      { title: 'Users', href: '/it/users', icon: Users, permission: 'it.users.view' },
      { title: 'Roles', href: '/it/roles', icon: ShieldCheck, permission: 'it.roles.view' },
      { title: 'Permissions', href: '/it/permissions', icon: Key, permission: 'it.permissions.view' },
      { title: 'System Settings', href: '/it/settings', icon: Settings, permission: 'it.settings.view' },
    ],
  },
  {
    title: 'Media',
    icon: MonitorPlay,
    module: 'media',
    permission: 'media.view',
    children: [
      { title: 'Overview', href: '/media', icon: LayoutDashboard, permission: 'media.view' },
      { title: 'Campaigns', href: '/media/campaigns', icon: Megaphone, permission: 'media.campaigns.view' },
      { title: 'Media Library', href: '/media/library', icon: MonitorPlay, permission: 'media.library.view' },
    ],
  },
  {
    title: 'Internal Control',
    icon: ClipboardCheck,
    module: 'internal_control',
    permission: 'internal_control.view',
    children: [
      { title: 'Overview', href: '/internal-control', icon: LayoutDashboard, permission: 'internal_control.view' },
      { title: 'Audits', href: '/internal-control/audits', icon: ClipboardCheck, permission: 'internal_control.audits.view' },
      { title: 'Risk Management', href: '/internal-control/risk', icon: AlertTriangle, permission: 'internal_control.risk.view' },
    ],
  },
  {
    title: 'Quality Assurance & Quality Control',
    icon: Scale,
    module: 'qa_qc',
    permission: 'qa_qc.view',
    children: [
      { title: 'Overview', href: '/quality', icon: LayoutDashboard, permission: 'qa_qc.view' },
      { title: 'QA Inspections', href: '/quality/inspections', icon: ClipboardCheck, permission: 'qa_qc.inspections.view' },
      { title: 'QC Reports', href: '/quality/reports', icon: FileText, permission: 'qa_qc.reports.view' },
    ],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    module: 'reports',
    permission: 'reports.view',
  },
  {
    title: 'Settings',
    icon: Settings,
    module: 'settings',
    permission: 'settings.view',
    children: [
      { title: 'Company', href: '/settings/company', icon: Building2, permission: 'settings.company.edit' },
      { 
        title: 'Users & Roles', 
        icon: Users, 
        permission: 'settings.users.view',
        children: [
          { title: 'Users', href: '/settings/users', icon: UserPlus, permission: 'settings.users.view' },
          { title: 'Roles', href: '/settings/roles', icon: ShieldCheck, permission: 'roles.view' },
          { title: 'Permissions', href: '/settings/permissions', icon: Key, permission: 'permissions.view' },
        ]
      },
      { title: 'Departments', href: '/settings/departments', icon: Layers, permission: 'settings.departments.view' },
      { title: 'Branches', href: '/settings/branches', icon: Globe, permission: 'settings.branches.view' },
      { title: 'Notifications', href: '/settings/notifications', icon: Bell, permission: 'settings.notifications.edit' },
      { title: 'Security', href: '/settings/security', icon: Shield, permission: 'settings.security.edit' },
      { title: 'Billing', href: '/settings/billing', icon: CreditCard, permission: 'settings.billing.view' },
    ],
  },
];

export type { NavItem as NavItemType };
