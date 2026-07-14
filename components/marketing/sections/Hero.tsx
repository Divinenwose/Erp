import Link from 'next/link';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

const trustedLogos = [
  'Acme Corp', 'TechVision', 'GlobalRetail', 'BuildRight', 'MediCare',
  'EduTech', 'FleetPro', 'AgriSmart', 'FinServe', 'LogiCore',
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden pt-28 pb-10">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-800/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-cyan-700/8 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-blue-300 text-xs font-medium">Introducing NexaERP 2.0 — AI-Powered ERP</span>
          <ArrowRight className="h-3 w-3 text-blue-400" />
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight max-w-5xl mx-auto">
          Run your entire{' '}
          <span className="relative">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              business
            </span>
            <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 8C50 4 100 2 150 6C200 10 250 8 298 5" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round"/>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="300" y2="0"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#22D3EE"/></linearGradient></defs>
            </svg>
          </span>
          {' '}from one platform
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
          The cloud-first ERP that unifies HR, Finance, Procurement, CRM, Inventory, and Operations — built for modern enterprises and growing SMEs.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-2xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/demo"
            className="flex items-center gap-2.5 bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all backdrop-blur-sm"
          >
            <Play className="h-4 w-4 text-blue-400" />
            Watch Demo
          </Link>
        </div>

        <p className="mt-4 text-white/25 text-sm">No credit card required · 14-day free trial · Cancel anytime</p>

        {/* Dashboard Mockup */}
        <div className="mt-16 relative max-w-5xl mx-auto">
          {/* Outer glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-blue-600/20 rounded-2xl blur-xl" />

          <div className="relative bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/60">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-white/8">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-700/60 rounded-md px-4 py-1 text-white/30 text-xs w-48 text-center">app.nexaerp.com/dashboard</div>
              </div>
            </div>

            {/* Dashboard UI */}
            <div className="flex h-[420px] sm:h-[480px]">
              {/* Sidebar */}
              <div className="w-48 bg-slate-900 border-r border-white/5 p-3 shrink-0 hidden sm:block">
                <div className="flex items-center gap-2 px-2 py-2 mb-4">
                  <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-white rounded-sm" />
                  </div>
                  <span className="text-white text-xs font-bold">NexaERP</span>
                </div>
                {['Dashboard', 'HR', 'Finance', 'CRM', 'Projects', 'Inventory', 'Reports', 'Settings'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 ${i === 0 ? 'bg-blue-600/20 text-blue-400' : 'text-white/30 hover:bg-white/5'}`}>
                    <div className={`w-3.5 h-3.5 rounded-sm ${i === 0 ? 'bg-blue-500' : 'bg-white/20'}`} />
                    <span className="text-xs font-medium">{item}</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 p-4 sm:p-5 overflow-hidden bg-slate-950/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-white text-sm font-semibold">Executive Dashboard</div>
                    <div className="text-white/30 text-xs mt-0.5">Real-time business intelligence</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-blue-600/20 text-blue-400 text-xs px-3 py-1 rounded-lg font-medium">Live</div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 animate-pulse" />
                  </div>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Revenue', value: '$4.8M', change: '+12%', color: 'text-emerald-400' },
                    { label: 'Employees', value: '248', change: '+8', color: 'text-blue-400' },
                    { label: 'Customers', value: '1,432', change: '+24%', color: 'text-violet-400' },
                    { label: 'Projects', value: '64', change: '+5', color: 'text-amber-400' },
                  ].map(card => (
                    <div key={card.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="text-white/40 text-xs mb-1">{card.label}</div>
                      <div className="text-white text-base font-bold">{card.value}</div>
                      <div className={`text-xs mt-0.5 ${card.color}`}>{card.change}</div>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Area chart */}
                  <div className="col-span-2 bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-white/40 text-xs mb-2">Revenue Trend</div>
                    <div className="flex items-end gap-1 h-24">
                      {[40, 65, 50, 72, 85, 60, 90, 78, 95, 88, 100, 92].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end">
                          <div
                            className="rounded-sm transition-all"
                            style={{
                              height: `${h}%`,
                              background: `linear-gradient(to top, #2563EB, #60A5FA)`
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Donut */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-white/40 text-xs mb-2">Pipeline</div>
                    <div className="flex justify-center">
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#1E3A5F" strokeWidth="4"/>
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#2563EB" strokeWidth="4" strokeDasharray="60 40"/>
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#22C55E" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-60"/>
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="15 85" strokeDashoffset="-85"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">65</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {[['Active', '#2563EB'], ['Won', '#22C55E'], ['Pending', '#F59E0B']].map(([l, c]) => (
                        <div key={l} className="flex items-center gap-1.5 text-xs text-white/40">
                          <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted by */}
        <div className="mt-16 pb-8">
          <p className="text-white/25 text-xs font-semibold uppercase tracking-widest mb-6">Trusted by 15,000+ companies worldwide</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {trustedLogos.map(name => (
              <span key={name} className="text-white/20 font-bold text-sm tracking-wide">{name}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
