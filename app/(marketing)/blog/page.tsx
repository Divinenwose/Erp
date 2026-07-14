import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Tag } from "lucide-react";
import CTASection from "@/components/marketing/sections/CTA";
import NewsletterForm from "@/components/marketing/NewsletterForm";

export const metadata: Metadata = {
  title: "Blog — NexaERP",
  description: "Insights on ERP, finance, HR, and business operations from the NexaERP team.",
};

const articles = [
  {
    id: 1,
    title: "The Complete Guide to ERP Implementation in 2024",
    excerpt: "Everything you need to know about rolling out an ERP system without the usual pain points — from data migration to change management.",
    category: "ERP Guides",
    readTime: "12 min read",
    date: "Dec 5, 2024",
    gradient: "from-blue-600 to-cyan-500",
    featured: true,
  },
  {
    id: 2,
    title: "How Modern CFOs Use Real-Time Dashboards to Close the Books Faster",
    excerpt: "Finance teams using live ERP dashboards are closing monthly books 60% faster. Here's how they do it.",
    category: "Finance",
    readTime: "8 min read",
    date: "Dec 2, 2024",
    gradient: "from-purple-600 to-pink-500",
    featured: true,
  },
  {
    id: 3,
    title: "5 HR Processes You Should Automate Today",
    excerpt: "From onboarding checklists to leave approvals, these automations save HR teams 10+ hours per week.",
    category: "HR",
    readTime: "6 min read",
    date: "Nov 28, 2024",
    gradient: "from-green-600 to-emerald-400",
    featured: false,
  },
  {
    id: 4,
    title: "Choosing Between Custom ERP and Off-the-Shelf: A Framework",
    excerpt: "A practical decision framework to help you weigh build vs. buy — and avoid the most common mistake.",
    category: "ERP Guides",
    readTime: "10 min read",
    date: "Nov 22, 2024",
    gradient: "from-amber-500 to-orange-400",
    featured: false,
  },
  {
    id: 5,
    title: "The Future of AI in Enterprise Software",
    excerpt: "From predictive analytics to automated decision-making — here's how AI is reshaping the ERP landscape.",
    category: "Technology",
    readTime: "9 min read",
    date: "Nov 18, 2024",
    gradient: "from-slate-600 to-blue-600",
    featured: false,
  },
  {
    id: 6,
    title: "Scaling Operations Across Multiple Entities: Lessons from 100 Companies",
    excerpt: "The patterns we observed in 100 companies that successfully scaled multi-entity operations without losing control.",
    category: "Business",
    readTime: "7 min read",
    date: "Nov 12, 2024",
    gradient: "from-red-500 to-rose-400",
    featured: false,
  },
];

const categories = ["All", "ERP Guides", "Finance", "HR", "Technology", "Business"];

export default function BlogPage() {
  const featured = articles.filter((a) => a.featured);
  const rest = articles.filter((a) => !a.featured);

  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            Insights & Guides
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            The{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              NexaERP Blog
            </span>
          </h1>
          <p className="text-slate-400 text-lg">
            Practical guides, product updates, and operational insights from our team of enterprise practitioners.
          </p>
        </div>
      </section>

      {/* Category tabs */}
      <section className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-3 no-scrollbar">
            {categories.map((cat, i) => (
              <span
                key={cat}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-colors ${
                  i === 0
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-gray-100"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured articles */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Featured</h2>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {featured.map((article) => (
              <Link href={`/blog/${article.id}`} key={article.id} className="group block">
                <div className={`h-48 rounded-xl bg-gradient-to-br ${article.gradient} mb-4 flex items-end p-5`}>
                  <span className="text-white/80 text-xs font-semibold uppercase tracking-wide px-2 py-1 bg-white/20 rounded-full">
                    {article.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                  {article.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-3">{article.excerpt}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                  <span>·</span>
                  <span>{article.date}</span>
                </div>
              </Link>
            ))}
          </div>

          <h2 className="text-xl font-semibold text-slate-800 mb-6">Latest articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {rest.map((article) => (
              <Link href={`/blog/${article.id}`} key={article.id} className="group block">
                <div className={`h-32 rounded-xl bg-gradient-to-br ${article.gradient} mb-3 flex items-end p-4`}>
                  <span className="text-white/80 text-xs font-semibold px-2 py-0.5 bg-white/20 rounded-full">
                    {article.category}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm leading-snug mb-2">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />{article.readTime}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-slate-950 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Stay in the loop</h2>
          <p className="text-slate-400 mb-8">
            Get our best articles on ERP, operations, and finance delivered to your inbox every two weeks.
          </p>
          <NewsletterForm />
          <p className="text-slate-500 text-xs mt-3">No spam. Unsubscribe at any time.</p>
        </div>
      </section>

      <CTASection />
    </main>
  );
}
