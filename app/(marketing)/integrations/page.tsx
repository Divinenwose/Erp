"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, CheckCircle } from "lucide-react";
import CTASection from "@/components/marketing/sections/CTA";

const integrationCategories = ["All", "Productivity", "Communication", "Accounting", "Payments", "Automation", "Developer"];

const integrations = [
  { emoji: "📊", name: "Google Workspace", cat: "Productivity", desc: "Sync documents, contacts, and calendar events directly from NexaERP." },
  { emoji: "📁", name: "Microsoft 365", cat: "Productivity", desc: "Connect Excel, Outlook, and Teams to your ERP workflows." },
  { emoji: "✅", name: "Notion", cat: "Productivity", desc: "Link project data and create Notion pages from ERP tasks." },
  { emoji: "🗂️", name: "Asana", cat: "Productivity", desc: "Sync NexaERP projects and tasks with your Asana workspace." },
  { emoji: "💬", name: "Slack", cat: "Communication", desc: "Receive alerts, approvals, and reports directly in Slack channels." },
  { emoji: "📹", name: "Zoom", cat: "Communication", desc: "Schedule and launch meetings from customer or project records." },
  { emoji: "📨", name: "Intercom", cat: "Communication", desc: "Enrich customer profiles with ERP order and account data." },
  { emoji: "📣", name: "HubSpot", cat: "Communication", desc: "Two-way sync between NexaERP CRM and HubSpot contacts." },
  { emoji: "📒", name: "QuickBooks", cat: "Accounting", desc: "Keep your books in sync with automated QuickBooks reconciliation." },
  { emoji: "📗", name: "Xero", cat: "Accounting", desc: "Push invoices, bills, and bank transactions to Xero automatically." },
  { emoji: "📘", name: "Sage", cat: "Accounting", desc: "Bi-directional sync for Sage 50, 200, and Intacct." },
  { emoji: "💰", name: "FreshBooks", cat: "Accounting", desc: "Seamless invoicing and expense tracking between platforms." },
  { emoji: "💳", name: "Stripe", cat: "Payments", desc: "Accept payments and reconcile invoices with Stripe integration." },
  { emoji: "🏦", name: "PayPal", cat: "Payments", desc: "Record and reconcile PayPal transactions in real time." },
  { emoji: "💵", name: "Paystack", cat: "Payments", desc: "African payment gateway integration for local and global payments." },
  { emoji: "🪙", name: "Flutterwave", cat: "Payments", desc: "Multi-currency payments across Africa and emerging markets." },
  { emoji: "⚡", name: "Zapier", cat: "Automation", desc: "Connect NexaERP to 5,000+ apps with no-code Zapier automations." },
  { emoji: "🔄", name: "Make (Integromat)", cat: "Automation", desc: "Build complex multi-step automations with visual workflows." },
  { emoji: "🤖", name: "n8n", cat: "Automation", desc: "Open-source automation with full NexaERP API support." },
  { emoji: "📡", name: "Power Automate", cat: "Automation", desc: "Automate approval flows and data sync with Microsoft Power Automate." },
  { emoji: "🔌", name: "REST API", cat: "Developer", desc: "Full REST API with OpenAPI 3.0 spec. Build anything." },
  { emoji: "⚙️", name: "GraphQL API", cat: "Developer", desc: "Query exactly the data you need with our GraphQL endpoint." },
  { emoji: "📦", name: "Webhooks", cat: "Developer", desc: "Real-time event-driven webhooks for any ERP event." },
  { emoji: "🛠️", name: "SDK (Node/Python)", cat: "Developer", desc: "Official SDKs for Node.js and Python with full TypeScript support." },
];

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [requested, setRequested] = useState(false);
  const [reqName, setReqName] = useState("");

  const filtered = activeCategory === "All"
    ? integrations
    : integrations.filter((i) => i.cat === activeCategory);

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequested(true);
  }

  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Integrations
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Connect everything{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              you already use
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            NexaERP integrates natively with the tools your team relies on. 
            Plus a full API for anything custom.
          </p>
          {/* Search bar (static) */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search integrations…"
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Category filter */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-3">
            {integrationCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations grid */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((integration) => (
              <div
                key={integration.name}
                className="border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-xl p-5 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{integration.emoji}</span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{integration.name}</p>
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{integration.cat}</span>
                  </div>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{integration.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request integration */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Don't see your tool?</h2>
          <p className="text-slate-600 mb-8 text-sm">
            Request an integration and our team will add it to the roadmap.
            We ship new integrations every month.
          </p>
          {requested ? (
            <div className="flex flex-col items-center gap-3 py-8 bg-green-50 rounded-xl border border-green-100">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-semibold text-slate-900">Request received!</p>
              <p className="text-slate-600 text-sm">We'll notify you when <strong>{reqName}</strong> integration is available.</p>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="Integration name (e.g. Salesforce)"
                value={reqName}
                onChange={(e) => setReqName(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Request
              </button>
            </form>
          )}
        </div>
      </section>

      <CTASection />
    </main>
  );
}
