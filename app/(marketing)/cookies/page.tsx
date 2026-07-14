import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — NexaERP",
  description: "Learn how NexaERP uses cookies and how to manage your preferences.",
};

const cookieTypes = [
  {
    name: "Essential Cookies",
    badge: "Always Active",
    badgeColor: "bg-green-100 text-green-700",
    desc: "These cookies are strictly necessary for the NexaERP platform to function. Without them, you would not be able to log in, navigate between pages, or use core features. Because they are essential, they cannot be disabled.",
    examples: [
      { name: "nexaerp_session", purpose: "Maintains your authenticated session across page loads", duration: "Session" },
      { name: "nexaerp_csrf", purpose: "Prevents cross-site request forgery attacks", duration: "Session" },
      { name: "nexaerp_prefs", purpose: "Remembers your language and timezone preference", duration: "1 year" },
    ],
  },
  {
    name: "Analytics Cookies",
    badge: "Optional",
    badgeColor: "bg-blue-100 text-blue-700",
    desc: "Analytics cookies help us understand how visitors use NexaERP. The data collected is aggregated and anonymous — we cannot identify individual users. This information helps us improve the platform.",
    examples: [
      { name: "_ga", purpose: "Google Analytics — distinguishes unique users", duration: "2 years" },
      { name: "_ga_*", purpose: "Google Analytics 4 — measures session data", duration: "2 years" },
      { name: "mp_*", purpose: "Mixpanel — tracks in-product usage events", duration: "1 year" },
    ],
  },
  {
    name: "Marketing Cookies",
    badge: "Optional",
    badgeColor: "bg-purple-100 text-purple-700",
    desc: "Marketing cookies are used to show you relevant advertisements and measure the effectiveness of our marketing campaigns. These cookies may be set by our advertising partners.",
    examples: [
      { name: "_fbp", purpose: "Facebook Pixel — tracks conversions from Facebook ads", duration: "3 months" },
      { name: "_gcl_au", purpose: "Google Ads — measures ad conversions", duration: "90 days" },
      { name: "_li_*", purpose: "LinkedIn Insight — tracks LinkedIn campaign performance", duration: "6 months" },
    ],
  },
  {
    name: "Preference Cookies",
    badge: "Optional",
    badgeColor: "bg-amber-100 text-amber-700",
    desc: "Preference cookies allow NexaERP to remember choices you have made — such as your selected dashboard layout, notification settings, or recently viewed records — to provide a more personalised experience.",
    examples: [
      { name: "nexaerp_layout", purpose: "Remembers your preferred dashboard layout", duration: "1 year" },
      { name: "nexaerp_sidebar", purpose: "Stores sidebar open/closed state", duration: "1 year" },
      { name: "nexaerp_theme", purpose: "Remembers your light/dark mode preference", duration: "1 year" },
    ],
  },
];

export default function CookiesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Cookie Policy</h1>
          <p className="text-slate-400">Last updated: December 1, 2024</p>
          <p className="text-slate-400 mt-4 max-w-2xl">
            NexaERP uses cookies and similar technologies to operate our platform, understand usage,
            and improve your experience. This page explains what cookies we use and how to manage them.
          </p>
        </div>
      </section>

      {/* What are cookies */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What are cookies?</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Cookies are small text files stored on your device (computer, tablet, or phone) when you visit a website.
            They help websites remember information about your visit — such as your login status or preferences —
            to make future visits faster and more useful.
          </p>
          <p className="text-slate-600 leading-relaxed mb-4">
            Cookies can be "session" cookies (deleted when you close your browser) or "persistent" cookies
            (stored for a set period or until you delete them). They may be set by NexaERP directly
            ("first-party cookies") or by our trusted partners ("third-party cookies").
          </p>
          <p className="text-slate-600 leading-relaxed">
            We also use similar technologies such as local storage, web beacons, and pixel tags, which function
            in a comparable way to cookies. References to "cookies" in this policy include these technologies.
          </p>
        </div>
      </section>

      {/* Cookie types */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-10">Types of cookies we use</h2>
          <div className="space-y-8">
            {cookieTypes.map((type) => (
              <div key={type.name} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{type.name}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${type.badgeColor}`}>
                      {type.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{type.desc}</p>
                </div>
                <div className="p-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Examples</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left pb-2 text-xs font-semibold text-slate-500 pr-4">Cookie Name</th>
                          <th className="text-left pb-2 text-xs font-semibold text-slate-500 pr-4">Purpose</th>
                          <th className="text-left pb-2 text-xs font-semibold text-slate-500">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {type.examples.map((ex) => (
                          <tr key={ex.name} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-4 font-mono text-xs text-slate-700">{ex.name}</td>
                            <td className="py-2 pr-4 text-slate-600 text-xs">{ex.purpose}</td>
                            <td className="py-2 text-slate-500 text-xs">{ex.duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Managing cookies */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Managing your cookie preferences</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Via NexaERP settings</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                When you first visit NexaERP, a cookie consent banner allows you to accept or decline optional cookies.
                You can change your preferences at any time via Account Settings → Privacy → Cookie Preferences.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Via your browser</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-3">
                Most browsers allow you to manage cookies through their settings. You can usually find these under
                "Privacy", "Security", or "Site Settings". Note that disabling essential cookies will prevent NexaERP
                from functioning correctly.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {["Google Chrome", "Mozilla Firefox", "Apple Safari", "Microsoft Edge"].map((browser) => (
                  <div key={browser} className="flex items-center gap-2 text-sm text-slate-600 bg-gray-50 rounded-lg px-4 py-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    {browser}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Opt-out tools</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                For analytics cookies, you can opt out via the Google Analytics opt-out browser add-on or
                the Digital Advertising Alliance opt-out tool at optout.aboutads.info.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer links */}
      <section className="bg-gray-50 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-600 text-sm mb-4">
            If you have questions about our use of cookies, contact us at{" "}
            <a href="mailto:privacy@nexaerp.com" className="text-blue-600 hover:underline">privacy@nexaerp.com</a>.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="text-sm text-blue-600 hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-blue-600 hover:underline">Terms of Service</Link>
            <Link href="/contact" className="text-sm text-blue-600 hover:underline">Contact Us</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
