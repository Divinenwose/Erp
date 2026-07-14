import type { Metadata } from "next";
import Link from "next/link";
import { Globe, DollarSign, Heart, BookOpen, TrendingUp, Clock, Briefcase, MapPin, ArrowRight } from "lucide-react";
import CTASection from "@/components/marketing/sections/CTA";

export const metadata: Metadata = {
  title: "Careers — NexaERP",
  description: "Join the NexaERP team and help build the future of enterprise software.",
};

const perks = [
  { icon: Globe, title: "Remote-first", desc: "Work from anywhere. We have team members in 18 countries." },
  { icon: DollarSign, title: "Competitive salary", desc: "Top-of-market compensation benchmarked annually." },
  { icon: Heart, title: "Health insurance", desc: "Full medical, dental, and vision for you and your family." },
  { icon: BookOpen, title: "Learning budget", desc: "$2,000/year for courses, books, and conferences." },
  { icon: TrendingUp, title: "Stock options", desc: "Meaningful equity in a fast-growing company." },
  { icon: Clock, title: "Unlimited PTO", desc: "Take the time you need. We mean it — minimum 15 days encouraged." },
];

const jobs = [
  { title: "Senior Software Engineer", dept: "Engineering", location: "Remote", type: "Full-time" },
  { title: "Senior Product Designer", dept: "Design", location: "Remote / San Francisco", type: "Hybrid" },
  { title: "Enterprise Sales Manager", dept: "Sales", location: "San Francisco", type: "Full-time" },
  { title: "Customer Success Manager", dept: "Customer Success", location: "Remote", type: "Full-time" },
  { title: "DevOps / Platform Engineer", dept: "Engineering", location: "Remote", type: "Full-time" },
  { title: "Senior Product Manager", dept: "Product", location: "Remote / London", type: "Hybrid" },
  { title: "Data Engineer", dept: "Data", location: "Remote", type: "Full-time" },
  { title: "Content & SEO Manager", dept: "Marketing", location: "Remote", type: "Full-time" },
];

const deptColors: Record<string, string> = {
  Engineering: "bg-blue-100 text-blue-700",
  Design: "bg-pink-100 text-pink-700",
  Sales: "bg-green-100 text-green-700",
  "Customer Success": "bg-amber-100 text-amber-700",
  Product: "bg-purple-100 text-purple-700",
  Data: "bg-cyan-100 text-cyan-700",
  Marketing: "bg-orange-100 text-orange-700",
};

export default function CareersPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            We're Hiring
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Join us in building the{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              future of ERP
            </span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            We're a remote-first team of builders, thinkers, and operators on a mission to make
            enterprise software feel like a superpower, not a burden.
          </p>
          <a
            href="#open-roles"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            See Open Roles <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Values / culture */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Why NexaERP?</h2>
          <p className="text-slate-600 max-w-xl mx-auto">
            We build software that powers businesses serving millions of people.
            Our team is small, talented, and has the leverage to make a real difference.
          </p>
        </div>
      </section>

      {/* Perks */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Benefits & perks</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map((perk) => {
              const Icon = perk.icon;
              return (
                <div key={perk.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{perk.title}</h3>
                  <p className="text-slate-500 text-sm">{perk.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section className="bg-white py-24 px-6" id="open-roles">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Open positions</h2>
            <p className="text-slate-600">
              {jobs.length} open roles across {new Set(jobs.map((j) => j.dept)).size} departments.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {jobs.map((job) => (
              <div
                key={job.title}
                className="bg-gray-50 hover:bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md rounded-xl p-6 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {job.title}
                    </h3>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full mt-1 inline-block ${deptColors[job.dept] ?? "bg-gray-100 text-gray-600"}`}>
                      {job.dept}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 mt-1 transition-colors" />
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.type}</span>
                </div>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline"
                >
                  Apply now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No role? */}
      <section className="bg-slate-950 py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-3">Don't see your role?</h2>
          <p className="text-slate-400 mb-6 text-sm">
            We're always looking for exceptional people. Send us your CV and tell us how you'd make a difference.
          </p>
          <Link
            href="mailto:hello@nexaerp.com"
            className="inline-flex items-center gap-2 border border-slate-700 hover:border-blue-500 text-slate-300 hover:text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Send open application
          </Link>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
