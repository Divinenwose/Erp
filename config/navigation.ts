import {
  LayoutDashboard, Users, DollarSign, ShoppingCart, Package, BarChart3,
  Headphones, FolderKanban, Settings, Building2, Truck, UserCheck,
  FileText, Shield, GraduationCap, CheckSquare, Wrench, TrendingUp,
  Globe, Bell, Search, ChevronDown, ChevronRight, LogOut, Moon, Sun,
  Menu, X, Home, Briefcase, CreditCard, Target, Award, BookOpen,
  AlertTriangle, Warehouse, Car, Clipboard, Calendar, Activity,
  PieChart, Layers, Database
} from 'lucide-react';

export interface NavItem {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
  roles?: string[];
  module?: string;
}

export const navigationConfig: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    module: 'dashboard',
  },
  {
    title: 'Human Resources',
    icon: Users,
    module: 'hr',
    children: [
      { title: 'Overview', href: '/hr', icon: LayoutDashboard },
      { title: 'Employees', href: '/hr/employees', icon: Users },
      { title: 'Recruitment', href: '/hr/recruitment', icon: UserCheck },
      { title: 'Leave Management', href: '/hr/leave', icon: Calendar },
      { title: 'Attendance', href: '/hr/attendance', icon: Activity },
      { title: 'Payroll', href: '/hr/payroll', icon: CreditCard },
      { title: 'Performance', href: '/hr/performance', icon: Award },
      { title: 'Training', href: '/hr/training', icon: BookOpen },
      { title: 'Org Chart', href: '/hr/org-chart', icon: Layers },
    ],
  },
  {
    title: 'Finance',
    icon: DollarSign,
    module: 'finance',
    children: [
      { title: 'Overview', href: '/finance', icon: LayoutDashboard },
      { title: 'General Ledger', href: '/finance/ledger', icon: Database },
      { title: 'Invoices', href: '/finance/invoices', icon: FileText },
      { title: 'Expenses', href: '/finance/expenses', icon: CreditCard },
      { title: 'Budgets', href: '/finance/budgets', icon: PieChart },
      { title: 'Accounts Receivable', href: '/finance/receivables', icon: TrendingUp },
      { title: 'Accounts Payable', href: '/finance/payables', icon: DollarSign },
      { title: 'Reports', href: '/finance/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Procurement',
    icon: ShoppingCart,
    module: 'procurement',
    children: [
      { title: 'Overview', href: '/procurement', icon: LayoutDashboard },
      { title: 'Vendors', href: '/procurement/vendors', icon: Building2 },
      { title: 'Purchase Requests', href: '/procurement/requests', icon: Clipboard },
      { title: 'Purchase Orders', href: '/procurement/orders', icon: ShoppingCart },
      { title: 'Contracts', href: '/procurement/contracts', icon: FileText },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    module: 'inventory',
    children: [
      { title: 'Overview', href: '/inventory', icon: LayoutDashboard },
      { title: 'Products', href: '/inventory/products', icon: Package },
      { title: 'Categories', href: '/inventory/categories', icon: Layers },
      { title: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse },
      { title: 'Stock Movements', href: '/inventory/movements', icon: Activity },
    ],
  },
  {
    title: 'CRM & Sales',
    icon: Target,
    module: 'crm',
    children: [
      { title: 'Overview', href: '/crm', icon: LayoutDashboard },
      { title: 'Leads', href: '/crm/leads', icon: Target },
      { title: 'Pipeline', href: '/crm/pipeline', icon: TrendingUp },
      { title: 'Customers', href: '/crm/customers', icon: Users },
      { title: 'Sales Orders', href: '/crm/orders', icon: ShoppingCart },
      { title: 'Contacts', href: '/crm/contacts', icon: UserCheck },
    ],
  },
  {
    title: 'Projects',
    icon: FolderKanban,
    module: 'projects',
    children: [
      { title: 'Overview', href: '/projects', icon: LayoutDashboard },
      { title: 'All Projects', href: '/projects/list', icon: FolderKanban },
      { title: 'Tasks', href: '/projects/tasks', icon: CheckSquare },
      { title: 'Kanban Board', href: '/projects/kanban', icon: Layers },
    ],
  },
  {
    title: 'Administration',
    icon: Building2,
    module: 'admin',
    children: [
      { title: 'Overview', href: '/administration', icon: LayoutDashboard },
      { title: 'Assets', href: '/administration/assets', icon: Briefcase },
      { title: 'Fleet', href: '/administration/fleet', icon: Car },
      { title: 'Visitors', href: '/administration/visitors', icon: UserCheck },
      { title: 'Work Orders', href: '/administration/work-orders', icon: Wrench },
    ],
  },
  {
    title: 'Support',
    icon: Headphones,
    module: 'support',
    children: [
      { title: 'Overview', href: '/support', icon: LayoutDashboard },
      { title: 'Tickets', href: '/support/tickets', icon: Headphones },
      { title: 'Knowledge Base', href: '/support/knowledge-base', icon: BookOpen },
    ],
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    module: 'reports',
  },
  {
    title: 'Settings',
    icon: Settings,
    module: 'settings',
    children: [
      { title: 'Company', href: '/settings/company', icon: Building2 },
      { title: 'Users & Roles', href: '/settings/users', icon: Users },
      { title: 'Departments', href: '/settings/departments', icon: Layers },
      { title: 'Branches', href: '/settings/branches', icon: Globe },
      { title: 'Notifications', href: '/settings/notifications', icon: Bell },
      { title: 'Security', href: '/settings/security', icon: Shield },
      { title: 'Billing', href: '/settings/billing', icon: CreditCard },
    ],
  },
];

export type { NavItem as NavItemType };
