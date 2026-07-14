import type { Metadata } from 'next';
import PricingSection from '@/components/marketing/sections/Pricing';
import FAQSection from '@/components/marketing/sections/FAQ';
import CTASection from '@/components/marketing/sections/CTA';
import { Check, X } from 'lucide-react';

export const metadata: Metadata = { title: 'Pricing — NexaERP', description: 'Simple, transparent pricing for teams of all sizes.' };

const comparison = [
  { feature: 'Users', starter: '1–10', pro: '11–50', business: '51–200', enterprise: 'Unlimited' },
  { feature: 'Storage', starter: '5 GB', pro: '50 GB', business: '200 GB', enterprise: 'Unlimited' },
  { feature: 'HR Management', starter: true, pro: true, business: true, enterprise: true },
  { feature: 'Finance & Accounting', starter: true, pro: true, business: true, enterprise: true },
  { feature: 'CRM & Sales', starter: true, pro: true, business: true, enterprise: true },
  { feature: 'Inventory', starter: true, pro: true, business: true, enterprise: true },
  { feature: 'Procurement', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Project Management', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Fleet Management', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Manufacturing', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'Legal & Compliance', starter: false, pro: false, business: true, enterprise: true },
  { feature: 'API Access', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Custom Modules', starter: false, pro: false, business: false, enterprise: true },
  { feature: 'SSO / SAML', starter: false, pro: false, business: false, enterprise: true },
  { feature: 'Priority Support', starter: false, pro: true, business: true, enterprise: true },
  { feature: 'Dedicated Manager', starter: false, pro: false, business: false, enterprise: true },
];

export default function PricingPage() {
  return (
    <>
      <div className="bg-slate-950 pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-white">Simple, transparent pricing</h1>
          <p className="mt-4 text-white/50 text-xl">No hidden fees. No surprise charges. Cancel anytime.</p>
        </div>
      </div>
      <PricingSection />
      {/* Feature comparison */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Compare all features</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-gray-500 font-medium w-48">Feature</th>
                  {['Starter', 'Professional', 'Business', 'Enterprise'].map(p => (
                    <th key={p} className="text-center px-4 py-4 text-gray-900 font-semibold">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <td className="px-6 py-3 text-gray-700">{row.feature}</td>
                    {(['starter', 'pro', 'business', 'enterprise'] as const).map(plan => (
                      <td key={plan} className="text-center px-4 py-3">
                        {typeof row[plan] === 'boolean' ? (
                          row[plan] ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-gray-300 mx-auto" />
                        ) : (
                          <span className="text-gray-700 text-xs font-medium">{row[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <FAQSection />
      <CTASection />
    </>
  );
}
