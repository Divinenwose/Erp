import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp, Users, Clock } from "lucide-react";
import TestimonialsSection from "@/components/marketing/sections/Testimonials";
import CTASection from "@/components/marketing/sections/CTA";

export const metadata: Metadata = {
  title: "Customers — NexaERP",
  description: "See how 15,000+ companies use NexaERP to streamline their operations.",
};

const caseStudies = [
  {
    company: "TechVision Ltd",
    industry: "Technology",
    logo: "TV",
    logoColor: "bg-blue-500",
    summary: "TechVision reduced operational costs by 45% within six months of deploying NexaERP across all departments.",
    challenge: "TechVision was running 11 disconnected tools — separate systems for HR, finance, CRM, and project tracking. Month-end close took three weeks and involved manual consolidation across spreadsheets.",
    solution: "Deployed NexaERP Finance, HR, CRM, and Projects modules in under two weeks. Automated payroll, unified reporting, and gave every department manager live dashboards.",
    results: [
      { icon: TrendingUp, metric: "45%", label: "Cost reduction" },
      { icon: Clock, metric: "3 days", label: "Month-end close (down from 3 weeks)" },
      { icon: Users, metric: "230", label: "Employees now on one platform" },
    ],
    quote: "NexaERP gave us back control. We can see the health of the entire business from a single screen.",
    author: "Kofi Mensah, CFO",
    gradient: "from-blue-600 to-blue-800",
  },
  {
    company: "AfriRetail Group",
    industry: "Retail",
    logo: "AR",
    logoColor: "bg-green-500",
    summary: "AfriRetail unified 12 store locations under one inventory and finance system, eliminating stock-outs entirely.",
    challenge: "With 12 retail locations across three countries, AfriRetail had no centralised inventory system. Stock-outs were costing them an estimated $400K annually. Each location kept its own books.",
    solution: "Implemented NexaERP Inventory, Multi-Entity Finance, and POS integration. Central warehouse now auto-replenishes all locations based on real-time sales data.",
    results: [
      { icon: TrendingUp, metric: "12", label: "Locations on one system" },
      { icon: Clock, metric: "$400K", label: "Annual savings from zero stock-outs" },
      { icon: Users, metric: "99%", label: "Inventory accuracy" },
    ],
    quote: "We went from flying blind to having perfect visibility. Every store manager sees the same data I see.",
    author: "Amina Diallo, Head of Operations",
    gradient: "from-green-600 to-emerald-700",
  },
  {
    company: "BuildRight Construction",
    industry: "Construction",
    logo: "BR",
    logoColor: "bg-amber-500",
    summary: "BuildRight now delivers 94% of projects on time and on budget, up from 61% before NexaERP.",
    challenge: "Project cost overruns were routine at BuildRight. Subcontractor billing was tracked in spreadsheets, equipment utilisation was unknown, and project managers lacked real-time budget visibility.",
    solution: "Deployed NexaERP Projects, Asset & Fleet, Finance, and Subcontractor Portal modules. Project managers now have live cost-vs-budget dashboards and automated alerts.",
    results: [
      { icon: TrendingUp, metric: "94%", label: "Projects on time (up from 61%)" },
      { icon: Clock, metric: "18%", label: "Reduction in project costs" },
      { icon: Users, metric: "85", label: "Subcontractors on the portal" },
    ],
    quote: "The visibility we have now is night and day. I can see every project's financial health in real time.",
    author: "David Okonkwo, Managing Director",
    gradient: "from-amber-500 to-orange-600",
  },
];

const logos = [
  { name: "TechVision", initials: "TV" },
  { name: "AfriRetail", initials: "AR" },
  { name: "BuildRight", initials: "BR" },
  { name: "MediCare+", initials: "MC" },
  { name: "EduLink", initials: "EL" },
  { name: "LogiCo", initials: "LC" },
  { name: "FinServe", initials: "FS" },
  { name: "GreenOps", initials: "GO" },
];

export default function CustomersPage() {
  return (
    <main>
      {/* Hero with stats */}
      <section className="bg-slate-950 py-24 px-6">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Customer Stories
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              15,000+ companies
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            From startups to enterprises, teams around the world run their operations on NexaERP.
          </p>
        </div>
        {/* Stats bar */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "15K+", label: "Companies" },
            { value: "480K+", label: "Users" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.9★", label: "Average rating" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <TestimonialsSection />

      {/* Case studies */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Deep-dive case studies</h2>
            <p className="text-slate-600">Real numbers, real outcomes.</p>
          </div>
          <div className="space-y-12">
            {caseStudies.map((cs) => (
              <div key={cs.company} className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                <div className={`bg-gradient-to-r ${cs.gradient} p-8 text-white flex items-center gap-4`}>
                  <div className={`${cs.logoColor} w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                    {cs.logo}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{cs.company}</h3>
                    <p className="text-white/70 text-sm">{cs.industry}</p>
                  </div>
                </div>
                <div className="p-8">
                  <p className="text-slate-700 text-lg font-medium mb-6">{cs.summary}</p>
                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">The Challenge</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{cs.challenge}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">The Solution</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{cs.solution}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {cs.results.map((r) => {
                      const Icon = r.icon;
                      return (
                        <div key={r.label} className="text-center bg-white rounded-xl p-4 border border-gray-100">
                          <Icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                          <p className="text-2xl font-bold text-slate-900">{r.metric}</p>
                          <p className="text-slate-500 text-xs mt-1">{r.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <blockquote className="border-l-4 border-blue-600 pl-4 italic text-slate-600 text-sm">
                    "{cs.quote}" — <span className="not-italic font-medium text-slate-700">{cs.author}</span>
                  </blockquote>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold mb-8">
            Join thousands of leading companies
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            {logos.map((l) => (
              <div key={l.name} className="w-20 h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                <span className="font-bold text-slate-400 text-sm">{l.initials}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
