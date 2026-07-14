import type { Metadata } from "next";
import Link from "next/link";
import FAQSection from "@/components/marketing/sections/FAQ";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ — NexaERP",
  description: "Answers to the most common questions about NexaERP.",
};

const faqCategories = [
  {
    title: "Getting Started",
    color: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
    questions: [
      { q: "How long does it take to go live?", a: "Most customers are live within 48 hours. Enterprise implementations with data migration typically take 2–4 weeks." },
      { q: "Do I need an IT team to set up NexaERP?", a: "No. NexaERP is cloud-based and configured via a guided setup wizard. No servers, no IT tickets." },
      { q: "Can I migrate data from my existing ERP?", a: "Yes. We provide import tools for CSV/Excel and direct connectors for common systems like SAP, QuickBooks, and Sage." },
    ],
  },
  {
    title: "Billing",
    color: "border-green-200 bg-green-50",
    iconColor: "text-green-600",
    questions: [
      { q: "Is there a free trial?", a: "Yes — all plans include a 14-day free trial. No credit card required." },
      { q: "Can I change plans at any time?", a: "Absolutely. You can upgrade or downgrade at any billing cycle. Upgrades take effect immediately; downgrades at renewal." },
      { q: "What payment methods do you accept?", a: "We accept all major credit cards, ACH bank transfer, and invoicing for annual Enterprise plans." },
      { q: "Are there setup fees?", a: "None for Starter and Growth plans. Enterprise plans may include a one-time implementation fee depending on scope." },
    ],
  },
  {
    title: "Security",
    color: "border-purple-200 bg-purple-50",
    iconColor: "text-purple-600",
    questions: [
      { q: "Is my data secure?", a: "NexaERP is SOC 2 Type II certified and ISO 27001 compliant. Data is encrypted at rest (AES-256) and in transit (TLS 1.3)." },
      { q: "Where is my data stored?", a: "Data is stored on AWS. You can choose your region: US, EU, or Africa. Data never leaves your chosen region." },
      { q: "Do you support SSO?", a: "Yes. We support SAML 2.0 and OIDC SSO. Pre-built connectors for Okta, Azure AD, and Google Workspace." },
    ],
  },
  {
    title: "Technical",
    color: "border-amber-200 bg-amber-50",
    iconColor: "text-amber-600",
    questions: [
      { q: "What is your uptime SLA?", a: "We guarantee 99.9% uptime for all plans, with 99.99% available for Enterprise. Status available at status.nexaerp.com." },
      { q: "Does NexaERP have a mobile app?", a: "Yes — iOS and Android apps are included with all plans. Full feature parity with the web app." },
      { q: "Can I access the API?", a: "All plans include REST API access. GraphQL and Webhooks are available on Growth and above. Full docs at docs.nexaerp.com/api." },
      { q: "What browsers are supported?", a: "Chrome, Firefox, Safari, and Edge — all current versions. We recommend Chrome for the best experience." },
    ],
  },
];

export default function FAQPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Help & Support
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Everything you need to know about NexaERP. Can't find the answer? Reach out to our team.
          </p>
        </div>
      </section>

      <FAQSection />

      {/* Categorised FAQ */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">More questions, by topic</h2>
          <div className="space-y-10">
            {faqCategories.map((category) => (
              <div key={category.title} className={`rounded-2xl border p-8 ${category.color}`}>
                <h3 className={`text-xl font-bold mb-6 ${category.iconColor}`}>{category.title}</h3>
                <div className="space-y-6">
                  {category.questions.map((faq) => (
                    <div key={faq.q} className="border-b border-white/60 pb-5 last:border-0 last:pb-0">
                      <p className="font-semibold text-slate-900 mb-2">{faq.q}</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still need help */}
      <section className="bg-gray-50 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Still have questions?</h2>
          <p className="text-slate-600 mb-8">
            Our support team is available Monday to Friday, 8 AM – 8 PM PST and responds within a few hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Contact Support <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 border border-gray-200 hover:border-gray-400 text-slate-700 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Browse Docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
