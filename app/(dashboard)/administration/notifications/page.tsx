'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { PermissionGuard } from '@/components/rbac/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck, Trash2, Filter, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { company, user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadNotifications();
    // Set up real-time subscription
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id, user?.id, selectedType, selectedStatus]);

  const loadNotifications = async () => {
    if (!company?.id || !user?.id) return;
    setLoading(true);

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('company_id', company.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (selectedType !== 'all') {
      query = query.eq('type', selectedType);
    }
    if (selectedStatus !== 'all') {
      query = query.eq('read', selectedStatus === 'read');
    }

    const { data } = await query.limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      loadNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    loadNotifications();
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      approval: <CheckCircle className="h-5 w-5 text-emerald-600" />,
      alert: <AlertCircle className="h-5 w-5 text-red-600" />,
      info: <Info className="h-5 w-5 text-blue-600" />,
      warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      system: <Bell className="h-5 w-5 text-purple-600" />,
    };
    return icons[type] || icons.info;
  };

  const getNotificationBadge = (type: string) => {
    const badges: Record<string, string> = {
      approval: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      alert: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      system: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return badges[type] || badges.info;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <PermissionGuard permission="notifications.view" fallback={<div className="p-6 text-center text-gray-500">You don't have permission to view notifications</div>}>
    <div className="space-y-6">
      <PageHeader
        title="Notification Center"
        description="View and manage your notifications"
        breadcrumbs={[
          { label: 'Administration', href: '/administration' },
          { label: 'Notifications' },
        ]}
      >
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="approval">Approvals</SelectItem>
                  <SelectItem value="alert">Alerts</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warnings</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    !notification.read
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getNotificationBadge(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <Badge className="bg-blue-600 text-white">New</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.created_at && formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.link && (
                          <a
                            href={notification.link}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            View Details
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  );
}
