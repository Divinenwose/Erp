'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsSettingsPage() {
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    inAppNotifications: true,
    weeklyDigest: false,
    securityAlerts: true,
    systemUpdates: true,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Notification settings saved');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Configure how you receive notifications and alerts"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Notifications' }]}
      />

      <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly Digest</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive a weekly summary of activities</p>
            </div>
            <Switch
              checked={settings.weeklyDigest}
              onCheckedChange={(checked) => setSettings({ ...settings, weeklyDigest: checked })}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4">In-App Notifications</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>In-App Notifications</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Show notifications in the app</p>
            </div>
            <Switch
              checked={settings.inAppNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, inAppNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Security Alerts</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about security events</p>
            </div>
            <Switch
              checked={settings.securityAlerts}
              onCheckedChange={(checked) => setSettings({ ...settings, securityAlerts: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>System Updates</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about system updates</p>
            </div>
            <Switch
              checked={settings.systemUpdates}
              onCheckedChange={(checked) => setSettings({ ...settings, systemUpdates: checked })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
