import {
  LayoutDashboard, Users, DollarSign, ShoppingCart, Package, BarChart3,
  Headphones, FolderKanban, Settings, Building2, Truck, UserCheck,
  FileText, Shield, GraduationCap, CheckSquare, Wrench, TrendingUp,
  Globe, Bell, Search, ChevronDown, ChevronRight, LogOut, Moon, Sun,
  Menu, X, Home, Briefcase, CreditCard, Target, Award, BookOpen,
  AlertTriangle, Warehouse, Car, Clipboard, Calendar, Activity,
  PieChart, Layers, Database, UserPlus, ShieldCheck, Key, WrenchIcon,
  Mail, Inbox, Archive, FileCheck, SprayCan, Zap, MapPin, Monitor,
  Sofa, Cpu, Printer, FileSignature
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
}

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
      { title: 'Recruitment', href: '/hr/recruitment', icon: UserCheck, permission: 'hr.recruitment.view' },
      { title: 'Leave Management', href: '/hr/leave', icon: Calendar, permission: 'hr.leave.view' },
      { title: 'Attendance', href: '/hr/attendance', icon: Activity, permission: 'hr.attendance.view' },
      { title: 'Payroll', href: '/hr/payroll', icon: CreditCard, permission: 'hr.payroll.view' },
      { title: 'Performance', href: '/hr/performance', icon: Award, permission: 'hr.performance.view' },
      { title: 'Training', href: '/hr/training', icon: BookOpen, permission: 'hr.training.view' },
      { title: 'Org Chart', href: '/hr/org-chart', icon: Layers, permission: 'hr.view' },
    ],
  },
  {
    title: 'Finance',
    icon: DollarSign,
    module: 'finance',
    permission: 'finance.view',
    children: [
      { title: 'Overview', href: '/finance', icon: LayoutDashboard, permission: 'finance.view' },
      { title: 'General Ledger', href: '/finance/ledger', icon: Database, permission: 'finance.ledger.view' },
      { title: 'Invoices', href: '/finance/invoices', icon: FileText, permission: 'finance.invoices.view' },
      { title: 'Expenses', href: '/finance/expenses', icon: CreditCard, permission: 'finance.expenses.view' },
      { title: 'Budgets', href: '/finance/budgets', icon: PieChart, permission: 'finance.budgets.view' },
      { title: 'Accounts Receivable', href: '/finance/receivables', icon: TrendingUp, permission: 'finance.receivables.view' },
      { title: 'Accounts Payable', href: '/finance/payables', icon: DollarSign, permission: 'finance.payables.view' },
      { title: 'Reports', href: '/finance/reports', icon: BarChart3, permission: 'finance.reports.view' },
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
      { title: 'Contracts', href: '/procurement/contracts', icon: FileText, permission: 'procurement.view' },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    module: 'inventory',
    permission: 'inventory.view',
    children: [
      { title: 'Overview', href: '/inventory', icon: LayoutDashboard, permission: 'inventory.view' },
      { title: 'Products', href: '/inventory/products', icon: Package, permission: 'inventory.products.view' },
      { title: 'Categories', href: '/inventory/categories', icon: Layers, permission: 'inventory.categories.view' },
      { title: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse, permission: 'inventory.warehouses.view' },
      { title: 'Stock Movements', href: '/inventory/movements', icon: Activity, permission: 'inventory.movements.view' },
    ],
  },
  {
    title: 'CRM & Sales',
    icon: Target,
    module: 'crm',
    permission: 'crm.view',
    children: [
      { title: 'Overview', href: '/crm', icon: LayoutDashboard, permission: 'crm.view' },
      { title: 'Leads', href: '/crm/leads', icon: Target, permission: 'crm.leads.view' },
      { title: 'Pipeline', href: '/crm/pipeline', icon: TrendingUp, permission: 'crm.pipeline.view' },
      { title: 'Customers', href: '/crm/customers', icon: Users, permission: 'crm.customers.view' },
      { title: 'Sales Orders', href: '/crm/orders', icon: ShoppingCart, permission: 'crm.orders.view' },
      { title: 'Contacts', href: '/crm/contacts', icon: UserCheck, permission: 'crm.contacts.view' },
    ],
  },
  {
    title: 'Projects',
    icon: FolderKanban,
    module: 'projects',
    permission: 'projects.view',
    children: [
      { title: 'Overview', href: '/projects', icon: LayoutDashboard, permission: 'projects.view' },
      { title: 'All Projects', href: '/projects/list', icon: FolderKanban, permission: 'projects.list.view' },
      { title: 'Tasks', href: '/projects/tasks', icon: CheckSquare, permission: 'projects.tasks.view' },
      { title: 'Kanban Board', href: '/projects/kanban', icon: Layers, permission: 'projects.kanban.view' },
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
          { title: 'Furniture', href: '/administration/assets/furniture', icon: Sofa, permission: 'assets.furniture.view' },
          { title: 'Equipment', href: '/administration/assets/equipment', icon: Cpu, permission: 'assets.equipment.view' },
          { title: 'Vehicles', href: '/administration/assets/vehicles', icon: Car, permission: 'assets.vehicles.view' },
          { title: 'Assignments', href: '/administration/assets/assignments', icon: UserCheck, permission: 'assets.assignment.view' },
          { title: 'Maintenance', href: '/administration/assets/maintenance', icon: Wrench, permission: 'assets.maintenance.view' },
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
          { title: 'Inventory', href: '/administration/supplies/inventory', icon: Package, permission: 'supplies.inventory.view' },
          { title: 'Requests', href: '/administration/supplies/requests', icon: Clipboard, permission: 'supplies.requests.view' },
          { title: 'Issuance', href: '/administration/supplies/issuance', icon: Printer, permission: 'supplies.issuance.view' },
        ]
      },
      { 
        title: 'Vendors', 
        icon: Building2,
        permission: 'vendors.view',
        children: [
          { title: 'Cleaning', href: '/administration/vendors/cleaning', icon: SprayCan, permission: 'vendors.cleaning.view' },
          { title: 'Maintenance', href: '/administration/vendors/maintenance', icon: Wrench, permission: 'vendors.maintenance.view' },
          { title: 'Internet', href: '/administration/vendors/internet', icon: Globe, permission: 'vendors.internet.view' },
          { title: 'Electricity', href: '/administration/vendors/electricity', icon: Zap, permission: 'vendors.electricity.view' },
        ]
      },
      { 
        title: 'Documents', 
        icon: FileText,
        permission: 'documents.view',
        children: [
          { title: 'Policies', href: '/administration/documents/policies', icon: FileCheck, permission: 'documents.policies.view' },
          { title: 'Letters', href: '/administration/documents/letters', icon: FileSignature, permission: 'documents.letters.view' },
          { title: 'Meeting Minutes', href: '/administration/documents/minutes', icon: Clipboard, permission: 'documents.minutes.view' },
          { title: 'Archive', href: '/administration/documents/archive', icon: Archive, permission: 'documents.archive.view' },
        ]
      },
    ],
  },
  {
    title: 'Support',
    icon: Headphones,
    module: 'support',
    permission: 'support.view',
    children: [
      { title: 'Overview', href: '/support', icon: LayoutDashboard, permission: 'support.view' },
      { title: 'Tickets', href: '/support/tickets', icon: Headphones, permission: 'support.tickets.view' },
      { title: 'Knowledge Base', href: '/support/knowledge-base', icon: BookOpen, permission: 'support.knowledge.view' },
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
