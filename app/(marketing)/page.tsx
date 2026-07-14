import type { Metadata } from 'next';
import HeroSection from '@/components/marketing/sections/Hero';
import FeaturesSection from '@/components/marketing/sections/Features';
import BenefitsSection from '@/components/marketing/sections/Benefits';
import IndustriesSection from '@/components/marketing/sections/Industries';
import HowItWorksSection from '@/components/marketing/sections/HowItWorks';
import AISection from '@/components/marketing/sections/AISection';
import TestimonialsSection from '@/components/marketing/sections/Testimonials';
import StatsSection from '@/components/marketing/sections/Stats';
import IntegrationsSection from '@/components/marketing/sections/Integrations';
import SecuritySection from '@/components/marketing/sections/Security';
import PricingSection from '@/components/marketing/sections/Pricing';
import BlogSection from '@/components/marketing/sections/BlogSection';
import FAQSection from '@/components/marketing/sections/FAQ';
import CTASection from '@/components/marketing/sections/CTA';

export const metadata: Metadata = {
  title: 'NexaERP — The Modern Cloud-First ERP Platform for SMEs',
  description: 'Run your entire business from one unified platform. NexaERP brings HR, Finance, CRM, Procurement, Inventory, and Operations together in a beautiful, affordable ERP.',
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <StatsSection />
      <IndustriesSection />
      <HowItWorksSection />
      <AISection />
      <TestimonialsSection />
      <IntegrationsSection />
      <SecuritySection />
      <PricingSection />
      <BlogSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
