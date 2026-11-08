'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCompanyAccount } from '@/app/actions/users';
import { activateEmployeeAccess } from '@/app/actions/employee-access';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCompletePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);
  const hasStarted = useRef(false);

  const completeAuthentication = useCallback(async () => {
    setProcessing(true);
    setError('');

    try {
      const callbackParams = new URLSearchParams(window.location.search);
      const code = callbackParams.get('code');
      const isPasswordReset =
        window.location.pathname === '/reset-password'
        || callbackParams.get('next') === '/setup-password';
      const { data, error: authError } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.getSession();

      if (authError || !data.session) {
        throw new Error(
          authError?.message
          || (isPasswordReset
            ? 'The password reset link is invalid or has expired. Request a new one.'
            : 'The invitation link is invalid or has expired.')
        );
      }

      const { user, access_token: accessToken } = data.session;
      const metadata = user.user_metadata ?? {};
      const isCompanyRegistration = !isPasswordReset
        && typeof metadata.first_name === 'string'
        && typeof metadata.last_name === 'string'
        && typeof metadata.company_name === 'string';

      if (isCompanyRegistration) {
        const setup = await createCompanyAccount({
          access_token: accessToken,
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          company_name: metadata.company_name,
        });
        if (!setup.success && !setup.error?.includes('already assigned to a company')) {
          throw new Error(setup.error || 'Unable to finish company setup.');
        }
        await supabase.auth.signOut({ scope: 'local' });
        router.replace('/login?registered=1');
        return;
      }

      if (typeof metadata.employee_id === 'string') {
        const activation = await activateEmployeeAccess(accessToken);
        if (!activation.success) {
          throw new Error(activation.error || 'Unable to activate your employee account.');
        }
      }

      router.replace('/setup-password');
    } catch (completionError) {
      console.error('[AUTH CALLBACK] Authentication completion failed:', completionError);
      setError(completionError instanceof Error ? completionError.message : 'Unable to complete authentication.');
      setProcessing(false);
    }
  }, [router]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    void completeAuthentication();
  }, [completeAuthentication]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{error ? 'Unable to complete sign-in' : 'Verifying your invitation'}</CardTitle>
          <CardDescription>
            {error || 'Please wait while we securely verify your account.'}
          </CardDescription>
        </CardHeader>
        {error && (
          <CardContent>
            <Button className="w-full" onClick={() => void completeAuthentication()} disabled={processing}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Try again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
