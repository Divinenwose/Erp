import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — NexaERP",
  description: "Read the NexaERP Terms of Service.",
};

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By accessing or using the NexaERP platform ("Services"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Services on behalf of an organisation, you represent that you have the authority to bind that organisation to these Terms.

If you do not agree to these Terms, do not access or use the Services. We may update these Terms from time to time, and we will notify you of material changes. Continued use of the Services after such changes constitutes acceptance of the updated Terms.`,
  },
  {
    id: "definitions",
    title: "2. Definitions",
    content: `- **"Account"** means your registered account on the NexaERP platform.
- **"Customer Data"** means all data you submit, upload, or generate through use of the Services.
- **"Documentation"** means our help centre, API docs, and other supporting materials.
- **"Services"** means the NexaERP ERP platform, APIs, integrations, and associated services.
- **"Subscription"** means your paid plan granting access to the Services.
- **"User"** means any individual authorised by you to use the Services.`,
  },
  {
    id: "services",
    title: "3. Services",
    content: `NexaERP provides a cloud-based enterprise resource planning platform accessible via web browser and mobile applications. We will use commercially reasonable efforts to make the Services available 99.9% of the time, as set out in our Service Level Agreement (SLA).

We reserve the right to modify, update, or discontinue features of the Services with reasonable notice. We will not materially reduce the core functionality of a paid plan during an active subscription term.`,
  },
  {
    id: "user-obligations",
    title: "4. User Obligations",
    content: `You agree to:

- Provide accurate, current, and complete information when registering and throughout your use of the Services.
- Maintain the security of your account credentials. You are responsible for all activities that occur under your account.
- Use the Services only for lawful business purposes and in compliance with applicable laws and regulations.
- Not attempt to reverse engineer, decompile, or gain unauthorised access to any part of the Services.
- Not use the Services to transmit malicious code, spam, or engage in any activity that could harm NexaERP or other users.
- Ensure all Users you grant access to comply with these Terms.`,
  },
  {
    id: "payment-terms",
    title: "5. Payment Terms",
    content: `**Subscriptions:** NexaERP offers monthly and annual subscription plans. Pricing is available at nexaerp.com/pricing. You agree to pay all fees associated with your chosen plan.

**Billing:** Subscriptions are billed in advance. Monthly subscriptions are billed monthly; annual subscriptions are billed annually. All fees are non-refundable except as expressly set out in these Terms.

**Taxes:** Prices exclude applicable taxes. You are responsible for all taxes associated with your use of the Services.

**Payment failure:** If payment fails, we will notify you and provide a 10-day grace period. If payment is not received, we may suspend or terminate your account.

**Refunds:** If you cancel within 14 days of your initial subscription or annual renewal, we will provide a prorated refund.`,
  },
  {
    id: "intellectual-property",
    title: "6. Intellectual Property",
    content: `**NexaERP IP:** The Services, including all software, designs, algorithms, and content created by NexaERP, are owned by NexaERP and protected by copyright, trademark, and other intellectual property laws.

**Your Data:** You retain all rights to your Customer Data. By using the Services, you grant NexaERP a limited licence to process your Customer Data solely to provide and improve the Services.

**Feedback:** If you provide feedback or suggestions, you grant NexaERP an irrevocable, royalty-free licence to use that feedback without restriction.`,
  },
  {
    id: "limitation-of-liability",
    title: "7. Limitation of Liability",
    content: `To the fullest extent permitted by applicable law:

NexaERP's total liability for any claim arising from or related to these Terms or the Services shall not exceed the amount you paid to NexaERP in the 12 months preceding the claim.

NexaERP shall not be liable for any indirect, incidental, consequential, or punitive damages, including loss of profits, data, or business opportunities.

Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability. In such jurisdictions, our liability is limited to the maximum extent permitted by law.`,
  },
  {
    id: "termination",
    title: "8. Termination",
    content: `**By you:** You may cancel your subscription at any time through account settings or by contacting support. Cancellation takes effect at the end of the current billing period.

**By NexaERP:** We may suspend or terminate your access to the Services if you breach these Terms, fail to pay fees, or if required by law. We will provide reasonable notice unless there is an urgent security concern.

**Effect of termination:** Upon termination, your right to use the Services ceases. Customer Data will be retained for 90 days, during which you may export it. After 90 days, we will delete your data.`,
  },
  {
    id: "governing-law",
    title: "9. Governing Law",
    content: `These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved by binding arbitration in San Francisco, California, except that either party may seek injunctive relief in court.

For customers in the European Union or United Kingdom, mandatory consumer protection laws of your country of residence may also apply.

If you have questions about these Terms, contact us at legal@nexaerp.com.`,
  },
];

export default function TermsPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400">Last updated: December 1, 2024</p>
          <p className="text-slate-400 mt-4 max-w-2xl">
            Please read these Terms of Service carefully before using NexaERP. These Terms constitute a legally
            binding agreement between you and NexaERP, Inc.
          </p>
        </div>
      </section>

      {/* Content with sidebar */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-6xl mx-auto flex gap-12">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-8">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Contents</p>
              <nav className="space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-sm text-slate-600 hover:text-blue-600 py-1.5 border-l-2 border-gray-100 hover:border-blue-600 pl-3 transition-colors"
                  >
                    {s.title.replace(/^\d+\. /, "")}
                  </a>
                ))}
              </nav>
              <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-1">Legal questions?</p>
                <a href="mailto:legal@nexaerp.com" className="text-xs text-blue-600 hover:underline">
                  legal@nexaerp.com
                </a>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 max-w-3xl">
            {sections.map((section) => (
              <div key={section.id} id={section.id} className="mb-12 scroll-mt-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-gray-100">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.content.split("\n\n").map((para, i) => (
                    <p key={i} className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              <Link href="/privacy" className="text-sm text-blue-600 hover:underline">Privacy Policy</Link>
              <Link href="/cookies" className="text-sm text-blue-600 hover:underline">Cookie Policy</Link>
              <Link href="/contact" className="text-sm text-blue-600 hover:underline">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
