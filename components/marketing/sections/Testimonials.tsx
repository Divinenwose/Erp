import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'CFO',
    company: 'TechVision Ltd',
    avatar: 'SM',
    color: 'bg-blue-600',
    quote: 'NexaERP replaced three separate systems for us — our accounting software, HR tool, and project tracker. The consolidation alone saved us $4,200 per month.',
    rating: 5,
  },
  {
    name: 'James Okonkwo',
    role: 'Operations Director',
    company: 'AfriRetail Group',
    avatar: 'JO',
    color: 'bg-emerald-600',
    quote: 'We manage 12 retail locations across 3 countries through NexaERP. The multi-branch features and real-time inventory visibility transformed how we operate.',
    rating: 5,
  },
  {
    name: 'Dr. Priya Sharma',
    role: 'Hospital Administrator',
    company: 'MediCare Network',
    avatar: 'PS',
    color: 'bg-violet-600',
    quote: 'The compliance management and HR modules are exactly what healthcare organizations need. Implementation took 2 weeks instead of the 6 months our previous vendor quoted.',
    rating: 5,
  },
  {
    name: 'Carlos Rivera',
    role: 'CEO',
    company: 'BuildRight Construction',
    avatar: 'CR',
    color: 'bg-amber-600',
    quote: 'Project budgeting, procurement, and payroll all in one place. Our project managers love the Kanban boards and resource tracking. Customer support is exceptional.',
    rating: 5,
  },
  {
    name: 'Emma Blackwood',
    role: 'HR Manager',
    company: 'LogiCore Freight',
    avatar: 'EB',
    color: 'bg-pink-600',
    quote: 'Managing 300+ drivers and logistics staff is now effortless. Leave management, attendance, and payroll processing that used to take 3 days now takes 20 minutes.',
    rating: 5,
  },
  {
    name: 'Wei Zhang',
    role: 'IT Director',
    company: 'Sunrise Manufacturing',
    avatar: 'WZ',
    color: 'bg-teal-600',
    quote: 'The API integrations and role-based access control met our strict security requirements. The team was responsive and the deployment was smooth.',
    rating: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section className="bg-slate-950 py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Customer Stories</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            Loved by teams worldwide
          </h2>
          <p className="mt-4 text-white/50 text-lg max-w-xl mx-auto">
            Join thousands of organizations that run their entire business on NexaERP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map(t => (
            <div key={t.name} className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:border-white/15 hover:bg-white/8 transition-all duration-300">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <svg key={i} className="h-4 w-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-white/70 text-sm leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>

              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${t.color} rounded-full flex items-center justify-center shrink-0`}>
                  <span className="text-white text-xs font-bold">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/40 text-xs">{t.role} · {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/customers" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors">
            Read all case studies <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
