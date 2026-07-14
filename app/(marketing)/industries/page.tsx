import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CTASection from "@/components/marketing/sections/CTA";

export const metadata: Metadata = {
  title: "Industries — NexaERP",
  description: "Discover how NexaERP is purpose-built for every industry vertical.",
};

const industries = [
  {
    emoji: "🏭",
    name: "Manufacturing",
    tagline: "From raw material to finished goods",
    desc: "Plan production, track materials, manage quality and compliance — all in one system built for the factory floor.",
    modules: ["Bill of Materials", "Production Orders", "Quality Control", "Shop Floor Control"],
    stat: "32% reduction in production downtime",
    color: "border-orange-200 bg-orange-50",
    statColor: "text-orange-600",
  },
  {
    emoji: "🛒",
    name: "Retail & E-commerce",
    tagline: "Unified commerce from shelf to customer",
    desc: "Sync inventory across channels, automate replenishment, and deliver a seamless customer experience.",
    modules: ["Inventory Management", "POS Integration", "CRM", "Multi-location"],
    stat: "99% inventory accuracy reported",
    color: "border-blue-200 bg-blue-50",
    statColor: "text-blue-600",
  },
  {
    emoji: "🏗️",
    name: "Construction",
    tagline: "Keep projects on time and on budget",
    desc: "Manage projects, subcontractors, equipment, and financials from pre-bid through handover.",
    modules: ["Project Management", "Asset & Fleet", "Cost Tracking", "Subcontractor Portal"],
    stat: "87% of projects delivered on schedule",
    color: "border-amber-200 bg-amber-50",
    statColor: "text-amber-600",
  },
  {
    emoji: "🏥",
    name: "Healthcare",
    tagline: "Operations built around patient care",
    desc: "Streamline HR, finance, and compliance for healthcare organisations with HIPAA-ready controls.",
    modules: ["HR & Scheduling", "Finance & Billing", "Compliance", "Document Management"],
    stat: "40% faster HR processes",
    color: "border-green-200 bg-green-50",
    statColor: "text-green-600",
  },
  {
    emoji: "🎓",
    name: "Education",
    tagline: "Focus on learning, not admin",
    desc: "Manage staff, finances, and campus operations with tools designed for educational institutions.",
    modules: ["HR & Payroll", "Finance", "Asset Management", "Reporting"],
    stat: "50+ educational institutions live",
    color: "border-purple-200 bg-purple-50",
    statColor: "text-purple-600",
  },
  {
    emoji: "🚚",
    name: "Logistics & Distribution",
    tagline: "Visibility across every leg of the journey",
    desc: "Track shipments, manage warehouses, and optimise routes with an integrated logistics platform.",
    modules: ["Warehouse Management", "Fleet & Routes", "Customer Portal", "Analytics"],
    stat: "22% reduction in logistics costs",
    color: "border-cyan-200 bg-cyan-50",
    statColor: "text-cyan-600",
  },
];

export default function IndustriesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Industry Solutions
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Solutions built for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              your industry
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            NexaERP comes pre-configured for the workflows, compliance requirements, and KPIs
            of your specific industry. Less setup, faster value.
          </p>
        </div>
      </section>

      {/* Stat bar */}
      <section className="bg-slate-900 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "20+", label: "Industries covered" },
            { value: "15K+", label: "Companies live" },
            { value: "48h", label: "Average go-live" },
            { value: "97%", label: "Renewal rate" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industry cards */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {industries.map((ind) => (
              <div key={ind.name} className={`rounded-2xl border p-8 ${ind.color} flex flex-col`}>
                <p className="text-4xl mb-4">{ind.emoji}</p>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{ind.name}</h3>
                <p className="text-slate-600 text-sm font-medium mb-3">{ind.tagline}</p>
                <p className="text-slate-600 text-sm leading-relaxed mb-5">{ind.desc}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {ind.modules.map((m) => (
                    <span key={m} className="text-xs bg-white/70 border border-white rounded-full px-2.5 py-0.5 text-slate-700 font-medium">
                      {m}
                    </span>
                  ))}
                </div>
                <div className={`mt-auto pt-4 border-t border-white/50 text-sm font-semibold ${ind.statColor}`}>
                  ✓ {ind.stat}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom industry */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Don't see your industry?</h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            NexaERP is highly configurable. Our team can customise modules, workflows, and reports
            to match your exact operational requirements.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Talk to our team <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
