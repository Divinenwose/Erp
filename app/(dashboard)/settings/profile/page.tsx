'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
}

export default function ProfileSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ProfileForm>({
    defaultValues: { first_name: '', last_name: '', phone: '' },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone: profile.phone ?? '',
    });
  }, [profile, reset]);

  const onSubmit = async (values: ProfileForm) => {
    if (!user?.id) {
      toast.error('Your session expired. Sign in again to update your profile.');
      return;
    }
    setSaving(true);
    const displayName = `${values.first_name.trim()} ${values.last_name.trim()}`.trim();
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        display_name: displayName,
        phone: values.phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) {
      console.error('[PROFILE] Profile update failed:', error);
      toast.error('Unable to save profile changes');
    } else {
      await refreshProfile();
      toast.success('Profile updated');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="My Profile"
        description="Manage your personal account details"
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'My Profile' }]}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" autoComplete="given-name" {...register('first_name', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" autoComplete="family-name" {...register('last_name', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile_email">Email</Label>
            <Input id="profile_email" type="email" value={profile?.email ?? user?.email ?? ''} readOnly disabled />
            <p className="text-xs text-gray-500">Contact an administrator to change your sign-in email.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" autoComplete="tel" {...register('phone')} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !isDirty} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
