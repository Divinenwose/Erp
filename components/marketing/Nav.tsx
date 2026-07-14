'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Zap, Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = [
  {
    label: 'Product',
    children: [
      { label: 'Features', href: '/features', desc: 'All ERP modules and capabilities' },
      { label: 'Modules', href: '/features#modules', desc: 'HR, Finance, CRM & more' },
      { label: 'Analytics', href: '/features#analytics', desc: 'Real-time reporting & dashboards' },
      { label: 'AI Assistant', href: '/features#ai', desc: 'AI-powered business insights' },
    ],
  },
  {
    label: 'Solutions',
    children: [
      { label: 'By Industry', href: '/industries', desc: 'Manufacturing, Retail, Healthcare...' },
      { label: 'By Size', href: '/solutions', desc: 'SME to Enterprise' },
      { label: 'Integrations', href: '/integrations', desc: '50+ app connections' },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Customers', href: '/customers' },
  {
    label: 'Resources',
    children: [
      { label: 'Documentation', href: '/docs', desc: 'Setup & developer guides' },
      { label: 'Blog', href: '/blog', desc: 'News, tips & best practices' },
      { label: 'FAQs', href: '/faq', desc: 'Common questions answered' },
      { label: 'About Us', href: '/about', desc: 'Our story and team' },
    ],
  },
];

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setOpenDropdown(null); }, [pathname]);

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-slate-950/95 backdrop-blur-xl border-b border-white/8 shadow-xl shadow-black/20'
        : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">NexaERP</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.children && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {link.href ? (
                  <Link
                    href={link.href}
                    className={cn(
                      'flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
                      pathname === link.href
                        ? 'text-blue-400'
                        : 'text-white/70 hover:text-white hover:bg-white/8'
                    )}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/8 transition-all">
                    {link.label}
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openDropdown === link.label && 'rotate-180')} />
                  </button>
                )}

                {link.children && openDropdown === link.label && (
                  <div className="absolute top-full left-0 pt-2 w-64">
                    <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-2 backdrop-blur-xl">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex flex-col px-3 py-2.5 rounded-lg hover:bg-white/8 transition-colors group"
                        >
                          <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">{child.label}</span>
                          <span className="text-xs text-white/40 mt-0.5">{child.desc}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link href="/demo" className="text-sm font-medium text-white/70 hover:text-white border border-white/15 hover:border-white/30 px-3.5 py-2 rounded-lg transition-all">
              Book a Demo
            </Link>
            <Link href="/register" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35">
              Start Free Trial
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/8 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-slate-950/98 backdrop-blur-xl border-t border-white/8">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <div key={link.label}>
                {link.href ? (
                  <Link href={link.href} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/8 transition-colors">
                    {link.label}
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === link.label ? null : link.label)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/8 transition-colors"
                    >
                      {link.label}
                      <ChevronDown className={cn('h-4 w-4 transition-transform', openDropdown === link.label && 'rotate-180')} />
                    </button>
                    {openDropdown === link.label && (
                      <div className="pl-4 space-y-1 mt-1">
                        {link.children?.map(c => (
                          <Link key={c.href} href={c.href} className="block px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <div className="pt-3 space-y-2 border-t border-white/8">
              <Link href="/login" className="block text-center px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white border border-white/15 transition-colors">Sign in</Link>
              <Link href="/register" className="block text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors">Start Free Trial</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
