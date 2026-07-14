'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/common/PageHeader';
import KPICard from '@/components/common/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Globe, Bell, Shield, CreditCard, Save, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function CompanySettingsPage() {
  const { company, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: '',
      currency: 'USD',
      timezone: 'UTC',
      industry: '',
    },
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name ?? '',
        email: company.email ?? '',
        phone: company.phone ?? '',
        website: company.website ?? '',
        address: company.address ?? '',
        city: company.city ?? '',
        state: company.state ?? '',
        country: company.country ?? '',
        currency: company.currency ?? 'USD',
        timezone: company.timezone ?? 'UTC',
        industry: company.industry ?? '',
      });
    }
  }, [company, reset]);

  const onSubmit = async (data: any) => {
    if (!company?.id) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update({ ...data, updated_at: new Date().toISOString() }).eq('id', company.id);
    if (error) { toast.error('Failed to save changes'); } else { toast.success('Company settings saved'); await refreshProfile(); }
    setSaving(false);
  };

  const planFeatures: Record<string, string[]> = {
    starter: ['Up to 10 users', '5 modules', '5GB storage', 'Email support'],
    professional: ['Up to 50 users', 'All modules', '50GB storage', 'Priority support', 'API access'],
    business: ['Up to 200 users', 'All modules', '200GB storage', 'Dedicated support', 'Custom integrations'],
    enterprise: ['Unlimited users', 'All modules', 'Unlimited storage', '24/7 support', 'Custom development', 'SLA guarantee'],
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Settings" description="Configure your workspace and preferences" breadcrumbs={[{ label: 'Settings' }, { label: 'Company' }]} />

      <Tabs defaultValue="company">
        <TabsList className="mb-6">
          <TabsTrigger value="company"><Building2 className="h-4 w-4 mr-2" />Company</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="h-4 w-4 mr-2" />Billing</TabsTrigger>
          <TabsTrigger value="localization"><Globe className="h-4 w-4 mr-2" />Localization</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader><CardTitle className="text-sm font-semibold">Company Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><Label>Company Name</Label><Input className="mt-1" {...register('name')} /></div>
                      <div><Label>Email</Label><Input className="mt-1" type="email" {...register('email')} /></div>
                      <div><Label>Phone</Label><Input className="mt-1" {...register('phone')} /></div>
                      <div><Label>Website</Label><Input className="mt-1" {...register('website')} /></div>
                      <div><Label>Industry</Label>
                        <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('industry')}>
                          <option value="">Select industry</option>
                          <option value="technology">Technology</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="retail">Retail</option>
                          <option value="finance">Finance</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="education">Education</option>
                          <option value="logistics">Logistics</option>
                          <option value="construction">Construction</option>
                          <option value="consulting">Consulting</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader><CardTitle className="text-sm font-semibold">Address</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><Label>Street Address</Label><Input className="mt-1" {...register('address')} /></div>
                      <div><Label>City</Label><Input className="mt-1" {...register('city')} /></div>
                      <div><Label>State / Province</Label><Input className="mt-1" {...register('state')} /></div>
                      <div><Label>Country</Label><Input className="mt-1" {...register('country')} /></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader><CardTitle className="text-sm font-semibold">Company Logo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">{company?.name?.charAt(0) ?? 'N'}</span>
                      </div>
                      <Button type="button" variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Upload Logo</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader><CardTitle className="text-sm font-semibold">Subscription</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm capitalize font-semibold text-gray-900 dark:text-white">{company?.subscription_plan ?? 'Starter'} Plan</span>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-900">Active</Badge>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {(planFeatures[company?.subscription_plan ?? 'starter'] ?? []).map(f => (
                        <li key={f} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button type="button" size="sm" className="w-full bg-blue-600 hover:bg-blue-700">Upgrade Plan</Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving || !isDirty}>
                <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="localization">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="text-sm font-semibold">Localization Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Default Currency</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('currency')}>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="BRL">BRL - Brazilian Real</option>
                  </select>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <select className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-950" {...register('timezone')}>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleSubmit(onSubmit)()}>
                  <Save className="h-4 w-4 mr-2" />Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {['Starter', 'Professional', 'Business', 'Enterprise'].map((plan, i) => (
              <Card key={plan} className={`dark:bg-gray-900 dark:border-gray-800 ${i === 2 ? 'border-blue-500 ring-2 ring-blue-500/20' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{plan}</CardTitle>
                    {i === 2 && <Badge className="bg-blue-600 text-white text-xs">Popular</Badge>}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {['$29', '$79', '$149', 'Custom'][i]}<span className="text-sm font-normal text-gray-500">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button size="sm" className={`w-full ${company?.subscription_plan?.toLowerCase() === plan.toLowerCase() ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {company?.subscription_plan?.toLowerCase() === plan.toLowerCase() ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader><CardTitle className="text-sm font-semibold">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security', enabled: false },
                { label: 'Session Timeout', desc: 'Auto-logout after 30 minutes of inactivity', enabled: true },
                { label: 'IP Whitelist', desc: 'Restrict access to specific IP addresses', enabled: false },
                { label: 'Audit Logging', desc: 'Log all user actions for compliance', enabled: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b dark:border-gray-800 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                  </div>
                  <div className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${item.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${item.enabled ? 'translate-x-5' : ''}`} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
