import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="bg-blue-600 py-20 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-500/30 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-blue-700/30 rounded-full blur-[60px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 mb-6">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-white/90 text-xs font-semibold">15,000+ companies already running on NexaERP</span>
        </div>

        <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
          Ready to transform
          <br />
          how you run your business?
        </h2>

        <p className="mt-5 text-blue-100/80 text-lg max-w-xl mx-auto">
          Join thousands of organizations that have replaced their fragmented tools with a single, powerful ERP platform.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-white text-blue-600 font-bold px-7 py-3.5 rounded-xl transition-all hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-0.5 text-sm"
          >
            Start Free Trial — No Card Needed
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/demo"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all text-sm"
          >
            Book a Live Demo
          </Link>
        </div>

        <p className="mt-4 text-blue-200/50 text-sm">14-day free trial · All features included · Cancel anytime</p>
      </div>
    </section>
  );
}
