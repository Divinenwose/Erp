import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 29, annual: 24 },
    description: 'Perfect for small businesses getting started.',
    users: '1–10 users',
    modules: ['HR Management', 'Finance Basics', 'CRM', 'Inventory', '5GB Storage', 'Email Support'],
    cta: 'Start Free Trial',
    href: '/register',
    popular: false,
    gradient: '',
  },
  {
    name: 'Professional',
    price: { monthly: 79, annual: 65 },
    description: 'For growing businesses with advanced needs.',
    users: '11–50 users',
    modules: ['All Starter Features', 'Procurement', 'Projects', 'Analytics', 'Fleet', 'API Access', '50GB Storage', 'Priority Support'],
    cta: 'Start Free Trial',
    href: '/register',
    popular: true,
    gradient: 'from-blue-600 to-blue-700',
  },
  {
    name: 'Business',
    price: { monthly: 149, annual: 124 },
    description: 'Full-featured ERP for medium-sized organizations.',
    users: '51–200 users',
    modules: ['All Professional Features', 'Manufacturing', 'Legal & Compliance', 'Quality Assurance', 'LMS', 'Custom Reports', '200GB Storage', 'Dedicated Support'],
    cta: 'Start Free Trial',
    href: '/register',
    popular: false,
    gradient: '',
  },
  {
    name: 'Enterprise',
    price: null,
    description: 'Custom solution for large-scale operations.',
    users: 'Unlimited users',
    modules: ['All Business Features', 'Custom Modules', 'SSO / SAML', 'SLA Guarantee', 'On-Premise Option', 'Unlimited Storage', '24/7 Support', 'Implementation Team'],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
    gradient: '',
  },
];

export default function PricingSection({ annual = false }: { annual?: boolean }) {
  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Pricing</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
            No hidden fees, no surprise charges. Start free, scale as you grow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 flex flex-col ${
                plan.popular
                  ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/25 scale-[1.02]'
                  : 'bg-white border border-gray-200 text-gray-900 hover:border-blue-200 hover:shadow-lg transition-all'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                </div>
              )}

              <div className="mb-5">
                <h3 className={`font-bold text-lg ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                <p className={`text-sm mt-1 ${plan.popular ? 'text-white/70' : 'text-gray-500'}`}>{plan.description}</p>
              </div>

              <div className="mb-5">
                {plan.price ? (
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                      ${annual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className={`text-sm mb-1.5 ${plan.popular ? 'text-white/60' : 'text-gray-400'}`}>/mo</span>
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-gray-900">Custom</div>
                )}
                <p className={`text-xs mt-1 ${plan.popular ? 'text-white/50' : 'text-gray-400'}`}>{plan.users}</p>
              </div>

              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.modules.map(m => (
                  <li key={m} className="flex items-start gap-2.5 text-sm">
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.popular ? 'text-blue-200' : 'text-emerald-500'}`} />
                    <span className={plan.popular ? 'text-white/80' : 'text-gray-600'}>{m}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block text-center py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center mt-8 text-gray-400 text-sm">
          All plans include 14-day free trial · No credit card required ·{' '}
          <Link href="/pricing" className="text-blue-600 hover:underline">Compare all features</Link>
        </p>
      </div>
    </section>
  );
}
