import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createCompanyAccount } from '@/app/actions/users';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  let companyRegistration = false;

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[AUTH CALLBACK] Code exchange failed:', error);
      return NextResponse.redirect(new URL('/login?auth_error=1', requestUrl.origin));
    }

    const metadata = data.user?.user_metadata ?? {};
    if (
      data.session?.access_token
      && typeof metadata.first_name === 'string'
      && typeof metadata.last_name === 'string'
      && typeof metadata.company_name === 'string'
    ) {
      const setup = await createCompanyAccount({
        access_token: data.session.access_token,
        first_name: metadata.first_name,
        last_name: metadata.last_name,
        company_name: metadata.company_name,
      });
      if (!setup.success && !setup.error?.includes('already assigned to a company')) {
        console.error('[AUTH CALLBACK] Company setup failed:', setup.error);
        return NextResponse.redirect(new URL('/login?setup_error=1', requestUrl.origin));
      }
      companyRegistration = true;
    }
  }

  return NextResponse.redirect(new URL(companyRegistration ? '/login?registered=1' : '/setup-password', requestUrl.origin));
}
