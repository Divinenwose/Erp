'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials, formatDateRelative } from '@/lib/utils';
import { Bell, Menu, Moon, Sun, Search, ChevronDown, Settings, LogOut, User, Building2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

const mockNotifications = [
  { id: '1', title: 'Leave request pending', message: 'John Smith requested 3 days annual leave', time: new Date(Date.now() - 1800000).toISOString(), type: 'warning', read: false },
  { id: '2', title: 'Purchase order approved', message: 'PO-2024-0089 has been approved', time: new Date(Date.now() - 7200000).toISOString(), type: 'success', read: false },
  { id: '3', title: 'Invoice overdue', message: 'Invoice INV-0043 is 5 days overdue', time: new Date(Date.now() - 86400000).toISOString(), type: 'error', read: true },
];

export default function Topbar({ onMenuToggle, sidebarCollapsed }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, profile, company, signOut } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = mockNotifications.filter(n => !n.read).length;
  const displayName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : user?.email ?? '';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 shrink-0 z-40">
      <Button variant="ghost" size="icon" onClick={onMenuToggle} className="shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-lg">
        {searchOpen ? (
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400"
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">⌘K</kbd>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        {/* Quick add */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/hr/employees?action=new">New Employee</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/crm/leads?action=new">New Lead</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/finance/invoices?action=new">New Invoice</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/procurement/requests?action=new">Purchase Request</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/projects/list?action=new">New Project</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {mockNotifications.map(n => (
                <div key={n.id} className={cn('px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0', !n.read && 'bg-blue-50/50 dark:bg-blue-950/20')}>
                  <div className="flex items-start gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full mt-2 shrink-0', n.type === 'error' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500')} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateRelative(n.time)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t">
              <Link href="/notifications" className="text-xs text-blue-600 hover:underline">View all notifications</Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg py-1.5 pr-2 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-blue-600 text-white">
                  {getInitials(displayName || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight capitalize">{profile?.role ?? 'User'}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/settings/profile"><User className="h-4 w-4 mr-2" />My Profile</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings/company"><Building2 className="h-4 w-4 mr-2" />Company</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/settings"><Settings className="h-4 w-4 mr-2" />Settings</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
              <LogOut className="h-4 w-4 mr-2" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
