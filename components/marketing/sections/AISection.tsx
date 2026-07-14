import Link from 'next/link';
import { ArrowRight, Sparkles, Bot, TrendingUp, Search, BarChart3, Lightbulb } from 'lucide-react';

const aiFeatures = [
  { icon: Bot, title: 'Natural Language Queries', desc: 'Ask "What was our revenue last quarter?" and get instant charts.', tag: 'Coming Soon' },
  { icon: BarChart3, title: 'Auto-Generated Reports', desc: 'AI summarizes weekly performance and sends to your inbox.', tag: 'Coming Soon' },
  { icon: TrendingUp, title: 'Sales Forecasting', desc: 'ML-powered revenue predictions based on historical trends.', tag: 'Beta' },
  { icon: Search, title: 'Smart Global Search', desc: 'Find any record, document, or person across all modules instantly.', tag: 'Live' },
  { icon: Lightbulb, title: 'Business Insights', desc: 'Proactive alerts for anomalies, bottlenecks, and opportunities.', tag: 'Coming Soon' },
  { icon: Sparkles, title: 'Workflow Suggestions', desc: 'AI recommends process improvements based on your usage patterns.', tag: 'Coming Soon' },
];

export default function AISection() {
  return (
    <section className="bg-gray-50 py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">AI Assistant</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Your intelligent
              <br />
              <span className="text-blue-600">business co-pilot</span>
            </h2>
            <p className="mt-5 text-gray-500 text-lg leading-relaxed">
              NexaERP&apos;s AI layer sits across all your data, turning complex business intelligence into simple conversations and automated actions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/features#ai" className="inline-flex items-center gap-2 text-gray-700 font-medium px-5 py-2.5 rounded-xl text-sm border border-gray-200 hover:border-blue-200 hover:text-blue-600 transition-colors">
                Learn more
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {aiFeatures.map(f => (
              <div key={f.title} className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <f.icon className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    f.tag === 'Live' ? 'bg-emerald-50 text-emerald-600' :
                    f.tag === 'Beta' ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>{f.tag}</span>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
