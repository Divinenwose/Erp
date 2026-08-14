'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NavItem } from '@/config/navigation';
import { getNavigationConfig } from '@/lib/company-modules';
import { isModuleAllowed } from '@/lib/department-access';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, ChevronRight, Building2, Zap, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavItemComponent({ item, collapsed, depth = 0, onMobileClose, departmentName }: { item: NavItem; collapsed: boolean; depth?: number; onMobileClose?: () => void; departmentName: string | null }) {
  const pathname = usePathname();
  const { hasPermission, isSuperAdmin, isCompanyAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const isAdmin = isSuperAdmin() || isCompanyAdmin();

  // Check if user has RBAC permission for this item
  const hasItemPermission = useMemo(() => {
    if (isAdmin) return true;
    if (!item.permission) return true;
    return hasPermission(item.permission);
  }, [item.permission, hasPermission, isAdmin]);

  // Check if user's department allows this module
  const hasDepartmentAccess = useMemo(() => {
    if (isAdmin) return true;
    return isModuleAllowed(item.module, departmentName ?? undefined);
  }, [item.module, departmentName, isAdmin]);

  // Filter children based on permissions and department access
  const visibleChildren = useMemo(() => {
    if (!item.children) return [];
    if (isAdmin) return item.children;
    return item.children.filter(child => {
      if (child.permission && !hasPermission(child.permission)) return false;
      if (child.module && !isModuleAllowed(child.module, departmentName ?? undefined)) return false;
      return true;
    });
  }, [item.children, hasPermission, isAdmin, departmentName]);

  const isActive = item.href ? pathname === item.href || pathname.startsWith(item.href + '/') : false;
  const isParentActive = visibleChildren.some(
    (child) => child.href && (pathname === child.href || pathname.startsWith(child.href + '/'))
  );

  useEffect(() => {
    if (isParentActive) setOpen(true);
  }, [isParentActive]);

  // Department is the outer gate: if this module isn't allowed for the user's
  // department, hide the entire node and its subtree, regardless of whether
  // any individual child's RBAC permission would otherwise pass.
  if (!hasDepartmentAccess) return null;

  // Within an allowed department, RBAC permissions control page/action visibility.
  if (!hasItemPermission && visibleChildren.length === 0) return null;

  const Icon = item.icon;

  if (visibleChildren.length > 0) {
    return (
      <div>
        <button
          onClick={() => !collapsed && setOpen(!open)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            isParentActive
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
            depth > 0 && 'pl-6'
          )}
          title={collapsed ? item.title : undefined}
        >
          {Icon && (
            <Icon className={cn('shrink-0 h-4 w-4', isParentActive ? 'text-blue-600 dark:text-blue-400' : '')} />
          )}
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.title}</span>
              {item.badge && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                  {item.badge}
                </span>
              )}
              {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="mt-1 space-y-0.5 pl-4 border-l border-gray-200 dark:border-gray-700 ml-5">
            {visibleChildren.map((child) => (
              <NavItemComponent key={child.href ?? child.title} item={child} collapsed={false} depth={depth + 1} onMobileClose={onMobileClose} departmentName={departmentName} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href ?? '#'}
      onClick={() => onMobileClose?.()}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        depth > 0 && 'py-1.5'
      )}
      title={collapsed ? item.title : undefined}
    >
      {Icon && <Icon className="shrink-0 h-4 w-4" />}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { company, departmentName } = useAuth();

  // Get navigation config using shared helper
  const navigationItems = useMemo(() => {
    return getNavigationConfig(company?.name);
  }, [company?.name]);

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        onMobileClose();
      }
    };
    
    if (mobileOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out fixed lg:relative z-50',
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          'w-64 -translate-x-full',
          mobileOpen && 'translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shrink-0">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">NexaERP</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {company?.name ?? 'Enterprise Platform'}
              </p>
            </div>
          )}
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="lg:hidden shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="space-y-0.5">
            {navigationItems.map((item) => (
              <NavItemComponent key={item.href ?? item.title} item={item} collapsed={collapsed} onMobileClose={onMobileClose} departmentName={departmentName} />
            ))}
          </nav>
        </ScrollArea>

        {/* Company indicator */}
        {!collapsed && company && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md flex items-center justify-center shrink-0">
                <Building2 className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{company.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{company.subscription_plan} plan</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
