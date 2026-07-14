'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Search, MoreHorizontal, Mail, Shield, Edit, Trash2, UserCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';

const ROLES = ['admin', 'hr_manager', 'finance_manager', 'sales_manager', 'procurement_manager', 'operations_manager', 'project_manager', 'accountant', 'employee'];

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  hr_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  finance_manager: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  sales_manager: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  procurement_manager: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  operations_manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  project_manager: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  accountant: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  employee: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function UsersSettingsPage() {
  const { company } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');

  const load = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [company?.id]);

  const filtered = users.filter(u => !search || `${u.first_name ?? ''} ${u.last_name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Users & Roles" description="Manage team members and their permissions" breadcrumbs={[{ label: 'Settings' }, { label: 'Users & Roles' }]}>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Invite User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Email Address</Label><Input className="mt-1" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
              <div><Label>Role</Label>
                <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400">An invitation email will be sent to this address. They can create an account and join your workspace.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setInviteOpen(false); }}>Send Invitation</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50' },
          { label: 'Active', value: users.filter(u => u.is_active).length, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: Shield, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/50' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            <div><p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p><p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-4 border-b dark:border-gray-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search users..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Users className="h-12 w-12" />} title="No users found" description="Invite team members to join your workspace" action={<Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4 mr-2" />Invite User</Button>} />
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                      {getInitials(`${u.first_name ?? ''} ${u.last_name ?? ''}` || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{u.display_name || (`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || 'Unnamed User')}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400"><Mail className="h-3 w-3" /><span>{u.email}</span></div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[u.role] ?? roleColors.employee}`}>
                    {u.role?.replace(/_/g, ' ') ?? 'Employee'}
                  </span>
                  <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit Role</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
