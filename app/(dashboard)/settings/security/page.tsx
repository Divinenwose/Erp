'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, Lock, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SecuritySettingsPage() {
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    passwordExpiry: 90,
    sessionTimeout: 30,
    ipWhitelist: '',
    requireStrongPassword: true,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Security settings saved');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Configure security settings and access controls"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Security' }]}
      />

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 dark:text-amber-100">Security Notice</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Changes to security settings will affect all users in your organization. Please review carefully before saving.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Authentication
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Require 2FA for all users</p>
            </div>
            <Switch
              checked={settings.twoFactorAuth}
              onCheckedChange={(checked) => setSettings({ ...settings, twoFactorAuth: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Require Strong Passwords</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enforce complex password requirements</p>
            </div>
            <Switch
              checked={settings.requireStrongPassword}
              onCheckedChange={(checked) => setSettings({ ...settings, requireStrongPassword: checked })}
            />
          </div>

          <div>
            <Label>Password Expiry (days)</Label>
            <Input
              type="number"
              value={settings.passwordExpiry}
              onChange={(e) => setSettings({ ...settings, passwordExpiry: parseInt(e.target.value) || 90 })}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Days before password must be changed</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Session Management
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label>Session Timeout (minutes)</Label>
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minutes of inactivity before session expires</p>
          </div>

          <div>
            <Label>IP Whitelist (optional)</Label>
            <Input
              placeholder="192.168.1.1, 10.0.0.1"
              value={settings.ipWhitelist}
              onChange={(e) => setSettings({ ...settings, ipWhitelist: e.target.value })}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Comma-separated list of allowed IP addresses</p>
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
