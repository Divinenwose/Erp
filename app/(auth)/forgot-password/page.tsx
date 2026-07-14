'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const schema = z.object({ email: z.string().email('Invalid email address') });
type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ForgotForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) { toast.error(error.message); setLoading(false); }
    else setSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">NexaERP</span>
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="mt-2 text-white/50 text-sm">
                We sent a password reset link to <span className="text-white/80">{getValues('email')}</span>
              </p>
              <p className="mt-3 text-white/30 text-xs">Didn&apos;t receive it? Check your spam folder or try again.</p>
              <Button onClick={() => setSent(false)} variant="outline" className="mt-5 border-white/10 text-white/70 hover:border-white/20">
                Try a different email
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">Reset your password</h1>
              <p className="mt-1.5 text-white/40 text-sm">Enter your email and we&apos;ll send a reset link.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div>
                  <Label className="text-white/70 text-sm">Email address</Label>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    className="mt-1.5 bg-white/8 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500"
                    {...register('email')}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 font-semibold h-11 rounded-xl shadow-lg shadow-blue-600/25">
                  {loading ? 'Sending...' : <>Send Reset Link <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
