import { ArrowRight, Check } from 'lucide-react';

const steps = [
  { num: '01', title: 'Register Your Company', desc: 'Create your workspace in 2 minutes. Set up your company profile, industry, and team size.' },
  { num: '02', title: 'Configure Organization', desc: 'Add branches, departments, and cost centers. Import your chart of accounts and product catalog.' },
  { num: '03', title: 'Invite Your Team', desc: 'Send invitations to employees. Each person gets access only to the modules relevant to their role.' },
  { num: '04', title: 'Assign Roles', desc: 'Choose from 20+ pre-built roles or create custom permission sets. No code required.' },
  { num: '05', title: 'Automate Workflows', desc: 'Set up approval chains, notification rules, and automated reports tailored to your processes.' },
  { num: '06', title: 'Go Live & Scale', desc: 'Your business is running on a unified ERP. Add modules and users as you grow — no reinstalls needed.' },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-slate-950 py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">How It Works</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            From signup to production
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">in under 30 minutes</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((step, i) => (
            <div key={step.num} className="relative group">
              {/* Connector line for non-last items in row */}
              <div className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:border-blue-500/30 hover:bg-white/8 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                    <span className="text-blue-400 text-sm font-bold">{step.num}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-white/20 hidden lg:block" />
                  )}
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Outcome */}
        <div className="mt-10 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/20 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-white text-xl font-bold">Result: A fully operational enterprise ERP</h3>
            <p className="text-white/50 text-sm mt-2">All departments connected, all data centralized, all processes automated.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {['Real-time data', 'Zero manual errors', 'Complete visibility'].map(r => (
              <div key={r} className="flex items-center gap-1.5 text-white/70 text-sm">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
