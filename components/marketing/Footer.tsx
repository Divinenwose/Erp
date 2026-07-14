import Link from 'next/link';
import { Zap, Twitter, Linkedin, Github, Youtube, Mail } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Modules', href: '/features#modules' },
    { label: 'Integrations', href: '/integrations' },
    { label: 'What\'s New', href: '/blog' },
    { label: 'Roadmap', href: '/blog' },
  ],
  Solutions: [
    { label: 'Manufacturing', href: '/industries' },
    { label: 'Retail', href: '/industries' },
    { label: 'Healthcare', href: '/industries' },
    { label: 'Education', href: '/industries' },
    { label: 'Logistics', href: '/industries' },
    { label: 'Construction', href: '/industries' },
  ],
  Resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Case Studies', href: '/customers' },
    { label: 'FAQs', href: '/faq' },
    { label: 'API Reference', href: '/docs' },
    { label: 'Help Center', href: '/docs' },
  ],
  Company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Customers', href: '/customers' },
    { label: 'Partners', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Book a Demo', href: '/demo' },
  ],
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Github, href: '#', label: 'GitHub' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export default function MarketingFooter() {
  return (
    <footer className="bg-slate-950 border-t border-white/8">
      {/* Newsletter */}
      <div className="border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-white font-semibold text-lg">Stay in the loop</h3>
              <p className="text-white/50 text-sm mt-1">Get product updates, tips, and industry insights.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500 transition-colors"
              />
              <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-white text-lg">NexaERP</span>
            </Link>
            <p className="text-white/40 text-sm mt-4 leading-relaxed max-w-xs">
              The modern cloud-first ERP platform built for growing businesses. From startup to enterprise.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-6 text-white/40 text-sm">
              <Mail className="h-4 w-4" />
              <a href="mailto:hello@nexaerp.com" className="hover:text-white transition-colors">hello@nexaerp.com</a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-white/40 hover:text-white text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">© 2024 NexaERP, Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Cookie Policy', href: '/cookies' },
            ].map(link => (
              <Link key={link.label} href={link.href} className="text-white/30 hover:text-white/70 text-sm transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
