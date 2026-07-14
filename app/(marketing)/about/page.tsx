import type { Metadata } from "next";
import { Heart, Eye, Zap, Anchor } from "lucide-react";
import TestimonialsSection from "@/components/marketing/sections/Testimonials";
import CTASection from "@/components/marketing/sections/CTA";

export const metadata: Metadata = {
  title: "About Us — NexaERP",
  description: "Learn about the team and mission behind NexaERP.",
};

const values = [
  { icon: Heart, title: "Customer First", desc: "Every product decision starts with a customer problem. We obsess over outcomes, not output." },
  { icon: Eye, title: "Open & Transparent", desc: "Honest pricing, public roadmaps, and clear communication — no surprises, ever." },
  { icon: Zap, title: "Move Fast", desc: "We ship weekly. Speed with quality is a discipline, not a compromise." },
  { icon: Anchor, title: "Built to Last", desc: "We write code we're proud to maintain a decade from now. Reliability is a feature." },
];

const team = [
  { initials: "AC", name: "Alex Chen", role: "Chief Executive Officer", color: "bg-blue-500" },
  { initials: "MS", name: "Maria Santos", role: "Chief Technology Officer", color: "bg-purple-500" },
  { initials: "JW", name: "James Wilson", role: "Head of Product", color: "bg-cyan-500" },
  { initials: "PS", name: "Priya Sharma", role: "Head of Design", color: "bg-pink-500" },
  { initials: "DO", name: "David Osei", role: "Head of Engineering", color: "bg-amber-500" },
  { initials: "EB", name: "Emma Blake", role: "Head of Customer Success", color: "bg-green-500" },
];

const milestones = [
  { year: "2021", title: "NexaERP Founded", desc: "Alex and Maria left enterprise consulting to build the ERP they always wished existed." },
  { year: "2022", title: "Seed Round & First 100 Customers", desc: "Raised $4M seed, shipped v1.0 with 12 core modules. Grew to 100 paying customers by year-end." },
  { year: "2023", title: "Series A & Global Expansion", desc: "Raised $22M Series A. Opened London and Lagos offices. Launched 30 new modules." },
  { year: "2024", title: "15,000 Companies & Counting", desc: "Crossed 15K company milestone, 480K users, and launched the NexaERP Partner Program." },
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Our Story
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Built by enterprise practitioners,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              for modern teams
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
            We spent years wrestling with legacy ERP systems. Then we decided to build something better.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-blue-600 text-sm font-semibold uppercase tracking-widest">Mission</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-3 mb-6">
              Making enterprise software accessible to every business
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-6">
              Legacy ERP systems are expensive, slow to implement, and built for a world that no longer exists.
              We believe every growing company deserves the same operational leverage that Fortune 500s enjoy —
              without the 18-month implementation timelines and seven-figure price tags.
            </p>
            <p className="text-slate-600 leading-relaxed">
              NexaERP is our answer: a modern, cloud-native ERP that any team can be live on in days,
              not years. Transparent pricing. Real support. Software that actually works the way you do.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { num: "15K+", label: "Companies" },
              { num: "480K+", label: "Users worldwide" },
              { num: "12", label: "AWS regions" },
              { num: "4.9★", label: "Average rating" },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-6 text-center">
                <p className="text-3xl font-bold text-slate-900">{s.num}</p>
                <p className="text-slate-500 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">What we stand for</h2>
            <p className="text-slate-600">The principles that guide every decision we make.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Meet the leadership team</h2>
            <p className="text-slate-600">Experienced operators obsessed with making your business run better.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member) => (
              <div key={member.name} className="text-center group">
                <div
                  className={`${member.color} w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 group-hover:scale-105 transition-transform`}
                >
                  {member.initials}
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">{member.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-slate-950 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Our journey</h2>
            <p className="text-slate-400">From zero to 15,000 companies in three years.</p>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-800" />
            <div className="space-y-10">
              {milestones.map((m, i) => (
                <div key={m.year} className="flex gap-6 pl-20 relative">
                  <div className="absolute left-5 top-1 w-6 h-6 rounded-full bg-blue-600 border-4 border-slate-950 flex items-center justify-center" />
                  <div>
                    <span className="text-blue-400 text-sm font-bold">{m.year}</span>
                    <h3 className="text-white font-semibold text-lg mt-0.5">{m.title}</h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSection />
      <CTASection />
    </main>
  );
}
