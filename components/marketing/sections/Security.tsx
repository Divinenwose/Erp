import { Shield, Lock, Eye, RefreshCw, FileCheck, Server } from 'lucide-react';

const securityItems = [
  { icon: Lock, title: 'AES-256 Encryption', desc: 'All data encrypted at rest and in transit using bank-grade AES-256 and TLS 1.3.' },
  { icon: Shield, title: 'Role-Based Access', desc: '20+ granular permission roles. Users see only what they need. No exceptions.' },
  { icon: Eye, title: 'Complete Audit Trail', desc: 'Every action logged with user, timestamp, IP, and device. Full GDPR compliance.' },
  { icon: RefreshCw, title: 'Automated Backups', desc: 'Hourly snapshots with 90-day retention. Point-in-time recovery available.' },
  { icon: FileCheck, title: 'SOC 2 Compliance', desc: 'SOC 2 Type II certified infrastructure. GDPR, HIPAA, and ISO 27001 aligned.' },
  { icon: Server, title: 'Redundant Infrastructure', desc: 'Multi-region deployment with 99.9% uptime SLA and automatic failover.' },
];

const certBadges = ['SOC 2 Type II', 'GDPR Ready', 'ISO 27001', 'HIPAA Compliant', 'SSL Secured'];

export default function SecuritySection() {
  return (
    <section className="bg-slate-950 py-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Enterprise Security</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">Security you can trust</h2>
          <p className="mt-4 text-white/50 text-lg max-w-xl mx-auto">
            Enterprise-grade security built into every layer of the platform, not bolted on as an afterthought.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {securityItems.map(item => (
            <div key={item.title} className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:border-blue-500/20 hover:bg-white/8 transition-all group">
              <div className="w-10 h-10 bg-blue-600/15 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600/25 transition-colors">
                <item.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-2">{item.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Compliance badges */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {certBadges.map(badge => (
            <div key={badge} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-white/60 text-sm font-medium">{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
