import Link from 'next/link';
import { ArrowRight, Users, DollarSign, ShoppingCart, Package, Target, FolderKanban, Building2, Car, Headphones, BarChart3, Sparkles, Wrench, Shield, BookOpen, CheckSquare } from 'lucide-react';

const features = [
  { icon: Users, title: 'Human Resources', desc: 'Complete HRMS with recruitment, attendance, payroll, and performance management.', color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400', border: 'border-blue-500/20' },
  { icon: DollarSign, title: 'Finance & Accounting', desc: 'General ledger, invoicing, budgets, AP/AR, and real-time financial reporting.', color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400', border: 'border-emerald-500/20' },
  { icon: ShoppingCart, title: 'Procurement', desc: 'Streamline purchasing with vendor management, POs, and approval workflows.', color: 'from-violet-500/20 to-violet-600/10', iconColor: 'text-violet-400', border: 'border-violet-500/20' },
  { icon: Target, title: 'CRM & Sales', desc: 'Track leads through your pipeline, manage customers, and forecast revenue.', color: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-400', border: 'border-amber-500/20' },
  { icon: Package, title: 'Inventory & Warehouse', desc: 'Multi-warehouse inventory with barcode support and real-time stock tracking.', color: 'from-orange-500/20 to-orange-600/10', iconColor: 'text-orange-400', border: 'border-orange-500/20' },
  { icon: FolderKanban, title: 'Project Management', desc: 'Kanban, Gantt, task tracking, resource allocation, and time logging.', color: 'from-teal-500/20 to-teal-600/10', iconColor: 'text-teal-400', border: 'border-teal-500/20' },
  { icon: Building2, title: 'Administration', desc: 'Manage office facilities, assets, meeting rooms, and administrative tasks.', color: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-400', border: 'border-cyan-500/20' },
  { icon: Car, title: 'Fleet Management', desc: 'Track vehicles, schedule maintenance, and manage driver assignments.', color: 'from-pink-500/20 to-pink-600/10', iconColor: 'text-pink-400', border: 'border-pink-500/20' },
  { icon: Headphones, title: 'Customer Support', desc: 'Ticket management, SLA tracking, knowledge base, and customer history.', color: 'from-red-500/20 to-red-600/10', iconColor: 'text-red-400', border: 'border-red-500/20' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Interactive dashboards, drill-down analytics, and scheduled exports.', color: 'from-indigo-500/20 to-indigo-600/10', iconColor: 'text-indigo-400', border: 'border-indigo-500/20' },
  { icon: Sparkles, title: 'AI Assistant', desc: 'Natural language queries, automated insights, and intelligent forecasting.', color: 'from-blue-500/20 to-violet-600/10', iconColor: 'text-blue-400', border: 'border-blue-500/20' },
  { icon: Shield, title: 'Security & Compliance', desc: 'Role-based access, audit trails, encryption, and compliance management.', color: 'from-slate-500/20 to-slate-600/10', iconColor: 'text-slate-400', border: 'border-slate-500/20' },
];

export default function FeaturesSection() {
  return (
    <section className="bg-slate-950 py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">All Modules</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Everything your enterprise needs,
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">in one unified platform</span>
          </h2>
          <p className="mt-5 text-white/50 text-lg max-w-2xl mx-auto">
            Stop juggling 10+ separate tools. NexaERP brings every department onto a single platform with real-time data flow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative bg-gradient-to-br ${f.color} rounded-xl p-5 border ${f.border} hover:border-opacity-60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer`}
            >
              <div className={`w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`h-5 w-5 ${f.iconColor}`} />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1.5">{f.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-white/30 group-hover:text-blue-400 transition-colors">
                <span>Learn more</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/features" className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 text-white font-medium px-6 py-3 rounded-xl transition-all text-sm">
            Explore all features
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
