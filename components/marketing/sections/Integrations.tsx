import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const integrations = [
  { name: 'Google Workspace', icon: '🔵', category: 'Productivity' },
  { name: 'Microsoft 365', icon: '🟦', category: 'Productivity' },
  { name: 'Slack', icon: '🟣', category: 'Communication' },
  { name: 'Zoom', icon: '🔷', category: 'Communication' },
  { name: 'QuickBooks', icon: '🟢', category: 'Accounting' },
  { name: 'Xero', icon: '🔵', category: 'Accounting' },
  { name: 'Stripe', icon: '🟪', category: 'Payments' },
  { name: 'Paystack', icon: '🟤', category: 'Payments' },
  { name: 'Flutterwave', icon: '🟠', category: 'Payments' },
  { name: 'Zapier', icon: '🔶', category: 'Automation' },
  { name: 'REST API', icon: '⚙️', category: 'Developer' },
  { name: 'Webhooks', icon: '🔗', category: 'Developer' },
];

export default function IntegrationsSection() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">Integrations</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Works with your favorite tools
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
            Connect NexaERP to 50+ tools your team already uses. No API expertise needed.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-10">
          {integrations.map(int => (
            <div key={int.name} className="group flex flex-col items-center p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all cursor-pointer">
              <span className="text-3xl mb-2">{int.icon}</span>
              <span className="text-gray-800 text-xs font-semibold text-center">{int.name}</span>
              <span className="text-gray-400 text-xs mt-0.5">{int.category}</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/integrations" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm">
            View all 50+ integrations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
