'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Country, State } from 'country-state-city';
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

const AFRICAN_COUNTRY_CODES = new Set([
  'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'DZ', 'EG', 'ER', 'ET',
  'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG', 'ML', 'MR', 'MU',
  'MW', 'MZ', 'NA', 'NE', 'NG', 'RW', 'SC', 'SD', 'SL', 'SN', 'SO', 'SS', 'ST', 'SZ', 'TD', 'TG',
  'TN', 'TZ', 'UG', 'ZA', 'ZM', 'ZW',
]);

export default function CompanySettingsPage() {
  const { company, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [stateCities, setStateCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      state: '',
      country: '',
      currency: 'NGN',
      timezone: 'Africa/Lagos',
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
        currency: company.currency ?? 'NGN',
        timezone: company.timezone ?? 'Africa/Lagos',
        industry: company.industry ?? '',
      });
      setLogoUrl(company.logo_url ?? '');
    }
  }, [company, reset]);

  const africanCountries = useMemo(
    () => Country.getAllCountries().filter(country => AFRICAN_COUNTRY_CODES.has(country.isoCode)).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const countryValue = watch('country') ?? '';
  const selectedCountry = africanCountries.find(country => country.name === countryValue || country.isoCode === countryValue);
  const countryStates = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
  const stateValue = watch('state') ?? '';
  const selectedState = countryStates.find(state => state.name === stateValue || state.isoCode === stateValue);
  const cityValue = watch('city') ?? '';

  useEffect(() => {
    if (!selectedCountry || !selectedState) {
      setStateCities([]);
      setCitiesLoading(false);
      return;
    }
    const controller = new AbortController();
    setStateCities([]);
    setCitiesLoading(true);
    const params = new URLSearchParams({ country: selectedCountry.isoCode, state: selectedState.isoCode });
    fetch(`/api/locations/cities?${params}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load cities')))
      .then((cities: string[]) => setStateCities(cities))
      .catch(error => { if (error.name !== 'AbortError') setStateCities([]); })
      .finally(() => { if (!controller.signal.aborted) setCitiesLoading(false); });
    return () => controller.abort();
  }, [selectedCountry?.isoCode, selectedState?.isoCode]);

  const uploadLogo = async (file?: File) => {
    if (!file || !company?.id) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast.error('Choose a PNG, JPG or WebP image');
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be 2 MB or smaller');
    setLogoUploading(true);
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `${company.id}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      toast.error(`Logo upload failed: ${uploadError.message}`);
      setLogoUploading(false);
      return;
    }
    const { data: publicUrl } = supabase.storage.from('company-logos').getPublicUrl(path);
    const nextLogoUrl = `${publicUrl.publicUrl}?updated=${Date.now()}`;
    const { error: updateError } = await supabase.from('companies').update({ logo_url: nextLogoUrl, updated_at: new Date().toISOString() }).eq('id', company.id);
    if (updateError) toast.error(`Logo uploaded but company settings could not be updated: ${updateError.message}`);
    else {
      setLogoUrl(nextLogoUrl);
      toast.success('Company logo updated');
      await refreshProfile();
    }
    setLogoUploading(false);
  };

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
                      <div>
                        <Label>Country</Label>
                        <select value={selectedCountry?.name || countryValue} className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" {...register('country', { onChange: () => { setValue('state', '', { shouldDirty: true }); setValue('city', '', { shouldDirty: true }); } })}>
                          <option value="">Select an African country</option>
                          {countryValue && !selectedCountry && <option value={countryValue}>Current: {countryValue}</option>}
                          {africanCountries.map(country => <option key={country.isoCode} value={country.name}>{country.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label>State / Region</Label>
                        {selectedCountry && countryStates.length > 0 ? <select value={selectedState?.name || stateValue} className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950" {...register('state', { onChange: () => setValue('city', '', { shouldDirty: true }) })}>
                          <option value="">Select a state or region</option>
                          {stateValue && !countryStates.some(state => state.name === stateValue || state.isoCode === stateValue) && <option value={stateValue}>Current: {stateValue}</option>}
                          {countryStates.map(state => <option key={state.isoCode} value={state.name}>{state.name}</option>)}
                        </select> : <Input className="mt-1" {...register('state')} />}
                      </div>
                      <div>
                        <Label>City</Label>
                        {selectedState && (stateCities.length > 0 || citiesLoading) ? <select disabled={citiesLoading} className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950" {...register('city')}>
                          <option value="">{citiesLoading ? 'Loading cities...' : 'Select a city'}</option>
                          {cityValue && !stateCities.includes(cityValue) && <option value={cityValue}>Current: {cityValue}</option>}
                          {stateCities.map((city, index) => <option key={`${city}-${index}`} value={city}>{city}</option>)}
                        </select> : <Input className="mt-1" {...register('city')} />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="dark:bg-gray-900 dark:border-gray-800">
                  <CardHeader><CardTitle className="text-sm font-semibold">Company Logo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                        {logoUrl ? <img src={logoUrl} alt={`${company?.name ?? 'Company'} logo`} className="h-full w-full object-contain" /> : <span className="text-2xl font-bold text-gray-500">{company?.name?.charAt(0) ?? 'N'}</span>}
                      </div>
                      <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => { void uploadLogo(event.target.files?.[0]); event.target.value = ''; }} />
                      <Button type="button" variant="outline" size="sm" disabled={logoUploading} onClick={() => logoInput.current?.click()}><Upload className="h-4 w-4 mr-2" />{logoUploading ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}</Button>
                      <p className="text-xs text-gray-500">PNG, JPG or WebP · up to 2 MB</p>
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
                    <option value="NGN">NGN - Nigerian Naira</option>
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
                    <option value="Africa/Lagos">West Africa Time (WAT, GMT+1)</option>
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
