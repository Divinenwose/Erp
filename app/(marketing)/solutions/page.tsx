import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import CTASection from "@/components/marketing/sections/CTA";

export const metadata: Metadata = {
  title: "Solutions — NexaERP",
  description: "Find the right ERP solution for your company size and stage of growth.",
};

const tiers = [
  {
    size: "Startup",
    range: "1–20 employees",
    color: "from-blue-500 to-blue-600",
    badge: "bg-blue-100 text-blue-700",
    challenges: [
      "Spreadsheet chaos slowing decisions",
      "No visibility into cash flow",
      "Manual invoicing & payroll",
      "HR paperwork eating up time",
    ],
    solutions: [
      "Set up in under a day — no IT team needed",
      "Real-time P&L and cash flow dashboard",
      "Auto-run payroll & send invoices in one click",
      "Digital onboarding & leave management",
    ],
    modules: ["Finance Lite", "HR Essentials", "Invoicing", "Basic Reporting"],
    cta: "/pricing",
  },
  {
    size: "SME",
    range: "21–100 employees",
    color: "from-purple-500 to-purple-600",
    badge: "bg-purple-100 text-purple-700",
    challenges: [
      "Disconnected tools that don't talk to each other",
      "Inventory going out of stock unnoticed",
      "Sales reps working off separate spreadsheets",
      "Compliance becoming a burden",
    ],
    solutions: [
      "Single platform replacing 8+ point solutions",
      "Live stock tracking with auto-reorder alerts",
      "Integrated CRM sharing data with finance",
      "Automated audit logs & policy controls",
    ],
    modules: ["CRM", "Inventory", "HR", "Finance", "Compliance", "Projects"],
    cta: "/pricing",
  },
  {
    size: "Mid-Market",
    range: "101–500 employees",
    color: "from-cyan-500 to-cyan-600",
    badge: "bg-cyan-100 text-cyan-700",
    challenges: [
      "Multiple departments running on silos",
      "Reporting takes days to compile",
      "Custom workflows needed for processes",
      "Multi-entity & multi-currency complexity",
    ],
    solutions: [
      "Cross-department data in one unified view",
      "Live BI dashboards — reports in seconds",
      "No-code workflow builder for any process",
      "Multi-entity consolidation & FX handling",
    ],
    modules: ["All SME modules", "BI & Analytics", "Workflow Builder", "Multi-Entity", "Asset Management"],
    cta: "/demo",
  },
  {
    size: "Enterprise",
    range: "500+ employees",
    color: "from-amber-500 to-orange-500",
    badge: "bg-amber-100 text-amber-700",
    challenges: [
      "Global operations with inconsistent processes",
      "Security & compliance at scale",
      "Deep ERP customisation requirements",
      "Legacy system migration complexity",
    ],
    solutions: [
      "Centralised governance with local flexibility",
      "SOC 2, ISO 27001, GDPR compliance built-in",
      "Full API access + custom module development",
      "Dedicated migration team & white-glove onboarding",
    ],
    modules: ["All modules", "Custom Modules", "Dedicated Infrastructure", "SLA 99.99%", "Named CSM"],
    cta: "/demo",
  },
];

export default function SolutionsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Solutions by Size
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            The right ERP for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              every stage of growth
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            Whether you're a 5-person startup or a 5,000-person enterprise, NexaERP scales with you.
            Same platform, right-sized for where you are today.
          </p>
        </div>
      </section>

      {/* Tier cards */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {tiers.map((tier) => (
            <div key={tier.size} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
              <div className={`bg-gradient-to-r ${tier.color} p-8 text-white`}>
                <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/20`}>
                  {tier.range}
                </span>
                <h2 className="text-3xl font-bold mt-3">{tier.size}</h2>
              </div>
              <div className="p-8 flex-1 flex flex-col gap-6">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">Common Challenges</h3>
                  <ul className="space-y-2">
                    {tier.challenges.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-slate-600 text-sm">
                        <span className="text-red-400 mt-0.5">✕</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">How NexaERP Helps</h3>
                  <ul className="space-y-2">
                    {tier.solutions.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-slate-600 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">Recommended Modules</h3>
                  <div className="flex flex-wrap gap-2">
                    {tier.modules.map((m) => (
                      <span key={m} className={`text-xs font-medium px-3 py-1 rounded-full ${tier.badge}`}>{m}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-auto">
                  <Link
                    href={tier.cta}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors w-full justify-center"
                  >
                    {tier.cta === "/demo" ? "Book a Demo" : "See Pricing"} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Compare section */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Not sure which plan fits?</h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            Our solutions team will help you find the right configuration for your business — no sales pressure, just honest advice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Talk to a Solutions Expert <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-400 text-slate-700 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Compare Plans
            </Link>
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
