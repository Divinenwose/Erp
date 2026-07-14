import type { Metadata } from "next";
import Link from "next/link";
import { Book, Settings, Users, DollarSign, Code, Puzzle, Shield, GitBranch, BarChart3, ArrowRight, Search, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation — NexaERP",
  description: "Everything you need to set up, configure, and get the most from NexaERP.",
};

const gettingStarted = [
  {
    title: "Quickstart Guide",
    desc: "Go from signup to live in under an hour. Covers initial setup, inviting your team, and configuring your first module.",
    time: "~45 min",
    gradient: "from-blue-600 to-cyan-500",
    href: "/docs/quickstart",
  },
  {
    title: "Data Migration",
    desc: "Import your existing data from spreadsheets or other ERP systems. Step-by-step with field mapping templates.",
    time: "~2 hours",
    gradient: "from-purple-600 to-pink-500",
    href: "/docs/migration",
  },
  {
    title: "User Management & Roles",
    desc: "Invite team members, set up roles and permissions, and configure single sign-on (SSO).",
    time: "~30 min",
    gradient: "from-green-600 to-emerald-400",
    href: "/docs/users",
  },
];

const docCategories = [
  { icon: Settings, title: "Setup & Configuration", desc: "Company settings, modules, currencies, and initial configuration.", href: "/docs/setup" },
  { icon: Users, title: "HR & People", desc: "Employees, payroll, leave management, and performance reviews.", href: "/docs/hr" },
  { icon: DollarSign, title: "Finance & Accounting", desc: "General ledger, invoicing, bank reconciliation, and reporting.", href: "/docs/finance" },
  { icon: Code, title: "API Reference", desc: "Full REST and GraphQL API documentation with code examples.", href: "/docs/api" },
  { icon: Puzzle, title: "Integrations", desc: "Connect NexaERP to your existing tools and third-party services.", href: "/docs/integrations" },
  { icon: Shield, title: "Security & Compliance", desc: "SSO, 2FA, audit logs, data residency, and compliance guides.", href: "/docs/security" },
  { icon: GitBranch, title: "Workflows & Automation", desc: "Build no-code automation workflows and approval chains.", href: "/docs/workflows" },
  { icon: BarChart3, title: "Reports & Analytics", desc: "Create custom dashboards, schedule reports, and export data.", href: "/docs/reports" },
];

const popularTopics = [
  "How to run payroll", "Setting up multi-currency", "Creating approval workflows",
  "Connecting Slack", "API authentication", "Import employees via CSV",
  "Custom fields", "Month-end close checklist",
];

export default function DocsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Documentation
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            NexaERP{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Documentation
            </span>
          </h1>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Everything you need to set up, configure, and get the most from NexaERP.
          </p>
          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search documentation…"
              className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
              ⌘K
            </kbd>
          </div>
        </div>
      </section>

      {/* Getting started */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Zap className="w-5 h-5 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">Getting started</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {gettingStarted.map((guide) => (
              <Link
                key={guide.title}
                href={guide.href}
                className="group block bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-xl overflow-hidden transition-all"
              >
                <div className={`h-24 bg-gradient-to-r ${guide.gradient} p-4 flex items-end`}>
                  <span className="text-white/80 text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                    {guide.time}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                    {guide.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{guide.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Documentation categories */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Browse by topic</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {docCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group block bg-white rounded-xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center mb-3 transition-colors">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm mb-1">
                    {cat.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{cat.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular topics */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Popular topics</h2>
          <div className="flex flex-wrap gap-3">
            {popularTopics.map((topic) => (
              <Link
                key={topic}
                href={`/docs/search?q=${encodeURIComponent(topic)}`}
                className="flex items-center gap-2 text-sm text-slate-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 px-4 py-2 rounded-full transition-colors"
              >
                <Book className="w-3.5 h-3.5" /> {topic}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Support banner */}
      <section className="bg-slate-950 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Can't find what you need?</h2>
          <p className="text-slate-400 mb-8">Our support team is standing by to help.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Contact Support <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Browse FAQ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
