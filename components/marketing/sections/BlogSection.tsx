import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const posts = [
  {
    title: 'How to Choose the Right ERP System for Your SME in 2024',
    excerpt: 'A practical guide to evaluating ERP vendors, understanding total cost of ownership, and avoiding common implementation pitfalls.',
    category: 'ERP Guides',
    readTime: '8 min',
    date: 'Dec 10, 2024',
    color: 'bg-blue-600',
  },
  {
    title: '10 Finance Automation Features Every CFO Needs in Their ERP',
    excerpt: 'From automated reconciliation to AI-generated financial reports — discover the features that save finance teams 20+ hours per week.',
    category: 'Finance',
    readTime: '6 min',
    date: 'Dec 5, 2024',
    color: 'bg-emerald-600',
  },
  {
    title: 'Manufacturing ERP vs Generic ERP: What\'s the Real Difference?',
    excerpt: 'A deep dive into production planning, BOM management, and quality control features that make manufacturing-specific ERPs essential.',
    category: 'Manufacturing',
    readTime: '7 min',
    date: 'Nov 28, 2024',
    color: 'bg-violet-600',
  },
];

export default function BlogSection() {
  return (
    <section className="bg-gray-50 py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-4">
              <span className="text-blue-600 text-xs font-semibold uppercase tracking-wider">From the Blog</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900">Insights & resources</h2>
          </div>
          <Link href="/blog" className="hidden md:flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm">
            View all posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link key={post.title} href="/blog" className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50/50 transition-all">
              <div className={`h-40 ${post.color} relative overflow-hidden flex items-center justify-center`}>
                <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent" />
                <span className="relative z-10 text-white/20 font-black text-7xl select-none">
                  {post.category.charAt(0)}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{post.category}</span>
                  <span className="text-gray-400 text-xs">{post.readTime} read</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2 group-hover:text-blue-600 transition-colors">{post.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{post.excerpt}</p>
                <p className="text-gray-400 text-xs mt-3">{post.date}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 md:hidden">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 font-medium text-sm">
            View all posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
