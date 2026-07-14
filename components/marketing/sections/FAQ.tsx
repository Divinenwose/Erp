'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'How does the 14-day free trial work?',
    a: 'Sign up with your email and create your company workspace. No credit card required. You get full access to all features for 14 days. At the end of the trial, choose a plan that fits your needs or your data will be retained for 30 days.',
  },
  {
    q: 'Can I migrate data from my existing system?',
    a: 'Yes. We provide data import tools for CSV/Excel files, and our team offers migration assistance for customers on Professional plans and above. We support migration from QuickBooks, SAP, Odoo, and most popular ERPs.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use AES-256 encryption for data at rest and TLS 1.3 for data in transit. Our infrastructure is hosted on SOC 2 Type II certified cloud providers with 99.9% uptime SLA. Regular automated backups ensure your data is always safe.',
  },
  {
    q: 'Can I use NexaERP for multiple companies?',
    a: 'Yes. Our multi-tenant architecture supports multiple companies, branches, and departments from a single account. Each entity has fully isolated data with its own settings, users, and workflows.',
  },
  {
    q: 'What integrations are supported?',
    a: 'NexaERP integrates with Google Workspace, Microsoft 365, Slack, QuickBooks, Xero, Stripe, Paystack, Zapier, and many more. We also provide a full REST API and webhooks for custom integrations.',
  },
  {
    q: 'How does billing work?',
    a: 'We offer monthly and annual billing. Annual plans save up to 20%. Your subscription renews automatically. You can upgrade, downgrade, or cancel at any time. For Enterprise plans, we also offer custom invoicing.',
  },
  {
    q: 'Do you offer implementation support?',
    a: 'Yes. All plans include our self-service onboarding wizard and documentation. Professional and above plans include priority support. Business and Enterprise plans include dedicated implementation assistance.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: 'If you cancel your subscription, your data remains accessible in read-only mode for 30 days. You can export all your data during this period. After 30 days, data is securely deleted from our servers.',
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="bg-white py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">FAQs</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900">Frequently asked questions</h2>
          <p className="mt-4 text-gray-500">Everything you need to know about NexaERP.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={cn(
                'border rounded-xl overflow-hidden transition-all duration-200',
                openIdx === i ? 'border-blue-200 shadow-md shadow-blue-50' : 'border-gray-200 hover:border-blue-100'
              )}
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</span>
                <ChevronDown className={cn('h-4 w-4 text-gray-400 shrink-0 transition-transform', openIdx === i && 'rotate-180 text-blue-600')} />
              </button>
              {openIdx === i && (
                <div className="px-5 pb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
