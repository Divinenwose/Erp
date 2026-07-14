import { Zap, Shield, BarChart3, Smartphone, Globe, Cloud, Bot, GitBranch, DollarSign, Layers } from 'lucide-react';

const benefits = [
  { icon: Zap, title: 'Blazing Fast Setup', desc: 'Get your entire company live in under 30 minutes with guided onboarding and pre-built templates.', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { icon: Shield, title: 'Enterprise-Grade Security', desc: 'Bank-level encryption, SOC 2 compliance, role-based access, and comprehensive audit logs.', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: DollarSign, title: 'Fraction of SAP Cost', desc: 'Get 80% of SAP functionality at 10% of the price. No hidden fees, no expensive consultants.', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: BarChart3, title: 'Real-Time Intelligence', desc: 'Live dashboards, automated reports, and drill-down analytics that update every 30 seconds.', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: Smartphone, title: 'Mobile-First Design', desc: 'Full functionality on any device. Your team stays productive whether in office or in the field.', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: Cloud, title: 'Cloud-Native Infrastructure', desc: '99.9% uptime SLA, automatic backups, instant updates, and global CDN delivery.', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { icon: Bot, title: 'AI-Powered Automation', desc: 'Intelligent workflow automation, predictive analytics, and natural language data queries.', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { icon: GitBranch, title: 'Unlimited Scalability', desc: 'Start with 10 users, scale to 10,000. Add modules, branches, and departments as you grow.', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { icon: Globe, title: 'Multi-Company & Branch', desc: 'Manage multiple subsidiaries, currencies, time zones, and languages from one account.', color: 'text-teal-400', bg: 'bg-teal-500/10' },
];

const stats = [
  { value: '10x', label: 'Faster than legacy ERP', sub: 'deployment time' },
  { value: '89%', label: 'Customer retention rate', sub: 'industry best' },
  { value: '4.9★', label: 'Average user rating', sub: 'across 12K reviews' },
];

export default function BenefitsSection() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
              <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Why NexaERP</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Built for the way
              <br />
              <span className="text-blue-600">modern teams work</span>
            </h2>
            <p className="mt-5 text-gray-500 text-lg leading-relaxed">
              Unlike legacy ERP systems that take 18 months to deploy, NexaERP is designed for speed, simplicity, and exceptional user experience.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {stats.map(s => (
              <div key={s.label} className="text-center p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-3xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map(b => (
            <div key={b.title} className="group flex gap-4 p-5 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md hover:shadow-blue-50 transition-all duration-300 bg-white">
              <div className={`w-10 h-10 rounded-xl ${b.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                <b.icon className={`h-5 w-5 ${b.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{b.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
