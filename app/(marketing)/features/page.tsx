import type { Metadata } from "next";
import Link from "next/link";
import {
  Users, DollarSign, ShoppingCart, Package, Target,
  FolderKanban, Building2, Car, Headphones, BarChart3,
  Shield, BookOpen, CheckSquare, Wrench, ArrowRight,
} from "lucide-react";
import CTASection from "@/components/marketing/sections/CTA";

export const metadata: Metadata = {
  title: "Features — NexaERP",
  description: "Explore all 50+ ERP modules powering modern enterprise teams.",
};

const modules = [
  {
    icon: Users,
    title: "Human Resources",
    description: "Manage your entire workforce lifecycle from hire to retire with smart automation.",
    features: ["Employee records & org chart", "Payroll & tax automation", "Leave & attendance tracking", "Performance reviews"],
  },
  {
    icon: DollarSign,
    title: "Finance & Accounting",
    description: "Real-time financial visibility across every business unit and geography.",
    features: ["General ledger & journals", "Accounts payable / receivable", "Multi-currency support", "Financial reporting"],
  },
  {
    icon: ShoppingCart,
    title: "Sales & CRM",
    description: "Close deals faster with a fully integrated CRM and sales pipeline.",
    features: ["Lead & opportunity tracking", "Quotes & contracts", "Sales forecasting", "Commission management"],
  },
  {
    icon: Package,
    title: "Inventory & Warehouse",
    description: "Full stock visibility across multiple warehouses with real-time sync.",
    features: ["Multi-warehouse management", "Barcode / QR scanning", "Stock alerts & reorders", "Batch & serial tracking"],
  },
  {
    icon: Target,
    title: "Marketing",
    description: "Plan, execute, and measure campaigns without leaving your ERP.",
    features: ["Campaign planning & budgets", "Email & SMS automation", "ROI tracking", "Audience segmentation"],
  },
  {
    icon: FolderKanban,
    title: "Project Management",
    description: "Deliver projects on time and on budget with integrated task management.",
    features: ["Gantt charts & milestones", "Resource allocation", "Time & expense tracking", "Budget vs. actuals"],
  },
  {
    icon: Building2,
    title: "Asset Management",
    description: "Track, depreciate, and maintain every company asset in one place.",
    features: ["Asset register & lifecycle", "Depreciation schedules", "Maintenance scheduling", "Asset transfers"],
  },
  {
    icon: Car,
    title: "Fleet Management",
    description: "Manage vehicles, drivers, and logistics with a dedicated fleet module.",
    features: ["Vehicle tracking & utilization", "Driver assignment", "Fuel & maintenance logs", "Route optimization"],
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description: "Deliver exceptional customer service with a built-in helpdesk.",
    features: ["Ticket management", "SLA tracking", "Customer portal", "Satisfaction surveys"],
  },
  {
    icon: BarChart3,
    title: "Analytics & BI",
    description: "Turn raw data into actionable insights with powerful dashboards.",
    features: ["Custom dashboards", "Scheduled reports", "Data export (CSV, PDF)", "KPI monitoring"],
  },
  {
    icon: Shield,
    title: "Compliance & Risk",
    description: "Stay audit-ready with automated compliance tracking and risk tools.",
    features: ["Audit trail logging", "Role-based access controls", "Policy management", "Risk register"],
  },
  {
    icon: BookOpen,
    title: "Document Management",
    description: "Centralise all business documents with version control and approvals.",
    features: ["Secure file storage", "Version history", "Approval workflows", "E-signatures"],
  },
  {
    icon: CheckSquare,
    title: "Quality Control",
    description: "Enforce quality standards at every stage of your operations.",
    features: ["Inspection checklists", "Non-conformance reports", "Supplier quality scoring", "ISO documentation"],
  },
  {
    icon: Wrench,
    title: "Manufacturing",
    description: "Plan and execute production with precision from raw materials to finished goods.",
    features: ["Bill of materials (BOM)", "Production orders", "Shop floor control", "Capacity planning"],
  },
];

export default function FeaturesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Platform Features
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Every feature your{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              enterprise needs
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            NexaERP ships with 50+ fully integrated modules — no bolt-ons, no hidden costs.
            One platform to run your entire business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Book a Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-slate-900 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "50+", label: "ERP Modules" },
            { value: "15K+", label: "Companies" },
            { value: "480K+", label: "Users" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modules grid */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              All modules, fully integrated
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Every module shares the same data layer — no syncing, no duplication.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 hover:shadow-lg rounded-xl p-6 transition-all duration-200"
                >
                  <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center mb-4 transition-colors">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-lg mb-2">{mod.title}</h3>
                  <p className="text-slate-500 text-sm mb-4">{mod.description}</p>
                  <ul className="space-y-1">
                    {mod.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platform advantages */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Built for scale from day one
          </h2>
          <p className="text-slate-600 mb-12 max-w-xl mx-auto">
            Architecture that grows with you — from 5 users to 50,000.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Cloud-native", desc: "Runs on AWS across 12 regions. Auto-scales under load with zero-downtime deployments." },
              { title: "Open API", desc: "Every module exposed via REST & GraphQL. Build custom integrations in hours, not months." },
              { title: "Enterprise Security", desc: "SOC 2 Type II, ISO 27001, GDPR-ready. Role-based access down to the field level." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
