import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — NexaERP",
  description: "Learn how NexaERP collects, uses, and protects your personal information.",
};

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    content: `We collect information you provide directly, information generated through your use of NexaERP, and information from third parties.

**Information you provide:** When you register for NexaERP, you provide us with information such as your name, email address, company name, and billing information. You may also provide additional information when you contact support or complete your company profile.

**Usage data:** We automatically collect information about how you interact with our services, including log data (IP address, browser type, pages visited, timestamps), device information, and usage patterns within the application.

**Data you input:** NexaERP processes the business data you enter into the platform (e.g., employee records, financial transactions, customer information). This data is stored securely and is not used for any purpose other than providing the services.`,
  },
  {
    id: "how-we-use",
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:

- **Provide and improve our services:** Deliver the NexaERP platform, process transactions, and continuously improve functionality.
- **Customer support:** Respond to enquiries, troubleshoot issues, and provide technical assistance.
- **Communications:** Send service updates, security alerts, and (with your consent) marketing communications.
- **Analytics:** Understand usage patterns to improve product decisions. All analytics data is aggregated and anonymised.
- **Legal compliance:** Meet our legal obligations, enforce our terms, and protect our rights and the rights of users.

We do not sell your personal data to third parties.`,
  },
  {
    id: "data-sharing",
    title: "3. Data Sharing",
    content: `We may share your information with:

**Service providers:** Trusted third-party vendors who assist in operating our platform (e.g., AWS for hosting, Stripe for payments). These providers are bound by strict data processing agreements.

**Legal requirements:** We may disclose information when required by law, court order, or governmental authority.

**Business transfers:** In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction. We will notify you before this occurs.

**With your consent:** We may share your information for any other purpose with your explicit consent.

We never share your business data with other NexaERP customers.`,
  },
  {
    id: "security",
    title: "4. Data Security",
    content: `We implement industry-leading security measures to protect your data:

- **Encryption:** All data is encrypted at rest using AES-256 and in transit using TLS 1.3.
- **Access controls:** Strict role-based access controls. Only authorised personnel can access customer data, and only when necessary to provide support.
- **Certifications:** NexaERP is SOC 2 Type II certified and ISO 27001 compliant.
- **Infrastructure:** Hosted on AWS with multi-region redundancy and automated failover.
- **Penetration testing:** We conduct annual third-party penetration tests and continuous automated vulnerability scanning.

Despite these measures, no system is 100% secure. In the event of a data breach, we will notify affected customers within 72 hours as required by applicable law.`,
  },
  {
    id: "cookies",
    title: "5. Cookies",
    content: `We use cookies and similar tracking technologies to operate and improve NexaERP. These include:

- **Essential cookies:** Required for the platform to function (e.g., session management, authentication).
- **Analytics cookies:** Help us understand how users interact with the platform (e.g., Google Analytics, Mixpanel).
- **Preference cookies:** Remember your settings and preferences.

You can manage cookie preferences through your browser settings. Disabling certain cookies may affect platform functionality. For more detail, see our Cookie Policy.`,
  },
  {
    id: "your-rights",
    title: "6. Your Rights",
    content: `Depending on your location, you may have the following rights regarding your personal data:

- **Access:** Request a copy of the personal data we hold about you.
- **Rectification:** Request correction of inaccurate or incomplete data.
- **Erasure:** Request deletion of your personal data ("right to be forgotten").
- **Portability:** Receive your data in a machine-readable format.
- **Objection:** Object to certain uses of your data, including direct marketing.
- **Restriction:** Request we limit how we use your data.

To exercise any of these rights, contact us at privacy@nexaerp.com. We will respond within 30 days.`,
  },
  {
    id: "data-retention",
    title: "7. Data Retention",
    content: `We retain your personal data for as long as your account is active or as needed to provide services. When you close your account, we delete your personal data within 90 days, except where we are required to retain it for legal, tax, or accounting purposes.

Business data you have entered into NexaERP (e.g., financial records) may be subject to longer retention requirements under applicable law.`,
  },
  {
    id: "contact",
    title: "8. Contact Us",
    content: `If you have questions about this Privacy Policy or how we handle your data, contact us at:

**NexaERP, Inc.**
447 Market Street, Suite 800
San Francisco, CA 94105

Email: privacy@nexaerp.com
Phone: +1 555 234 5678

For EU/UK residents, our Data Protection Officer can be reached at dpo@nexaerp.com.`,
  },
];

export default function PrivacyPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-slate-400">Last updated: December 1, 2024</p>
          <p className="text-slate-400 mt-4 max-w-2xl">
            NexaERP, Inc. ("NexaERP", "we", "us", or "our") is committed to protecting your privacy.
            This policy explains how we collect, use, share, and safeguard your information when you use our platform.
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
                <p className="text-xs font-medium text-blue-700 mb-1">Questions?</p>
                <Link href="/contact" className="text-xs text-blue-600 hover:underline">
                  Contact our Privacy team →
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 max-w-3xl">
            <div className="prose prose-slate max-w-none">
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
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              <Link href="/terms" className="text-sm text-blue-600 hover:underline">Terms of Service</Link>
              <Link href="/cookies" className="text-sm text-blue-600 hover:underline">Cookie Policy</Link>
              <Link href="/contact" className="text-sm text-blue-600 hover:underline">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
