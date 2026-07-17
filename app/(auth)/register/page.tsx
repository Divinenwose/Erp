'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const registerSchema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  companyName: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min. 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type RegisterForm = z.infer<typeof registerSchema>;

const features = ['Full access to all modules', 'No credit card required', 'Setup in under 30 minutes', '14-day free trial'];

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    const { error } = await signUp(data.email, data.password, {
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
    });
    if (error) { toast.error(error.message || 'Registration failed'); setLoading(false); }
    else {
      toast.success('Workspace created! Redirecting...');
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden items-center justify-center p-12 border-r border-white/5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white text-xl">NexaERP</span>
          </Link>

          <h2 className="text-3xl font-bold text-white leading-snug">
            Start your free 14-day trial
          </h2>
          <p className="mt-3 text-white/50 text-sm leading-relaxed">
            Set up your complete enterprise platform in minutes, not months.
          </p>

          <ul className="mt-8 space-y-3">
            {features.map(f => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-white/60 text-sm">{f}</span>
              </li>
            ))}
          </ul>

          {/* Mini dashboard preview */}
          <div className="mt-10 bg-white/5 border border-white/8 rounded-xl p-4">
            <div className="text-white/30 text-xs mb-3">Your workspace includes</div>
            <div className="grid grid-cols-3 gap-2">
              {['HR', 'Finance', 'CRM', 'Inventory', 'Projects', 'Reports'].map(m => (
                <div key={m} className="bg-blue-600/15 border border-blue-500/20 rounded-lg px-2 py-1.5 text-center">
                  <span className="text-blue-400 text-xs font-medium">{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">NexaERP</span>
          </Link>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white">Create your workspace</h1>
            <p className="mt-1 text-white/40 text-sm">Free for 14 days. No credit card required.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70 text-xs">First Name</Label>
                  <Input className="mt-1 bg-white/8 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500 h-10 text-sm" placeholder="John" {...register('firstName')} />
                  {errors.firstName && <p className="text-xs text-red-400 mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Last Name</Label>
                  <Input className="mt-1 bg-white/8 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500 h-10 text-sm" placeholder="Smith" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-red-400 mt-1">{errors.lastName.message}</p>}
                </div>
              </div>

              <div>
                <Label className="text-white/70 text-xs">Company Name</Label>
                <Input className="mt-1 bg-white/8 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500 h-10 text-sm" placeholder="Acme Corporation" {...register('companyName')} />
                {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>}
              </div>

              <div>
                <Label className="text-white/70 text-xs">Work Email</Label>
                <Input type="email" className="mt-1 bg-white/8 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500 h-10 text-sm" placeholder="you@company.com" {...register('email')} />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label className="text-white/70 text-xs">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    className="pr-10 bg-white/8 border-white/10 text-black placeholder:text-white/25 focus:border-blue-500 h-10 text-sm focus:bg-white/10 focus:text-white"
                    placeholder="Min. 8 characters"
                    {...register('password')}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-black">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <Label className="text-white/70 text-xs">Confirm Password</Label>
                <Input type="password" className="mt-1 bg-white/8 border-white/10 text-black placeholder:text-white/25 focus:border-blue-500 focus:bg-white/10 focus:text-white h-10 text-sm" placeholder="Re-enter password" {...register('confirmPassword')} />
                {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-600/25 mt-1"
              >
                {loading ? 'Creating workspace...' : <>Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>

            <p className="mt-5 text-center text-white/30 text-xs">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-white/50 hover:text-white underline">Terms</Link> and{' '}
              <Link href="/privacy" className="text-white/50 hover:text-white underline">Privacy Policy</Link>
            </p>
          </div>

          <p className="mt-4 text-center text-white/30 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
