'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    if (error) { toast.error(error.message || 'Invalid credentials'); setLoading(false); }
    else router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/15 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-sm">
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-xl">NexaERP</span>
          </Link>

          <h2 className="text-3xl font-bold text-white leading-tight">
            Your business command center awaits
          </h2>
          <p className="mt-4 text-white/50 leading-relaxed">
            Sign in to access your unified ERP dashboard with real-time insights across every department.
          </p>

          <div className="mt-10 space-y-4">
            {[
              'All your data in one place',
              'Real-time analytics & reporting',
              'Automated workflows',
              'Enterprise-grade security',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-white/60 text-sm">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-12 border-t border-white/8">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['#2563EB', '#059669', '#7C3AED', '#D97706'].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-950 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-sm">Join 15,000+ companies worldwide</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">NexaERP</span>
          </Link>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-white/40 text-sm">Sign in to your workspace</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
              <div>
                <Label className="text-white/70 text-sm">Email address</Label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  className="mt-1.5 bg-white/8 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500 focus:bg-white/10"
                  {...register('email')}
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-white/70 text-sm">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</Link>
                </div>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pr-10 bg-white/8 border-white/10 text-black placeholder:text-white/25 focus:border-blue-500 focus:bg-white/10 focus:text-white"
                    {...register('password')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-600/25 mt-2"
              >
                {loading ? 'Signing in...' : <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>

            <p className="mt-6 text-center text-white/30 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">Create one free</Link>
            </p>
          </div>

          <p className="mt-6 text-center text-white/20 text-xs">
            Protected by enterprise-grade security. By signing in you agree to our{' '}
            <Link href="/terms" className="underline hover:text-white/40">Terms</Link> and{' '}
            <Link href="/privacy" className="underline hover:text-white/40">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
