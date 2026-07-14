"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const offices = [
  { city: "San Francisco", address: "447 Market Street, Suite 800\nSan Francisco, CA 94105", flag: "🇺🇸" },
  { city: "London", address: "30 St Mary Axe (The Gherkin)\nLondon, EC3A 8BF", flag: "🇬🇧" },
  { city: "Lagos", address: "6 Broad Street, 3rd Floor\nIsland, Lagos 101001", flag: "🇳🇬" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", company: "", subject: "Sales", message: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main>
      {/* Hero */}
      <section className="bg-slate-950 py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Get in{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">touch</span>
          </h1>
          <p className="text-slate-400 text-lg">
            Sales, support, or just a general question — we're here and we respond fast.
          </p>
        </div>
      </section>

      {/* Two-column layout */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
          {/* Left: contact info */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact information</h2>
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Email</p>
                  <a href="mailto:hello@nexaerp.com" className="text-blue-600 hover:underline">hello@nexaerp.com</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Phone</p>
                  <a href="tel:+15552345678" className="text-slate-600 hover:text-blue-600">+1 555 234 5678</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Headquarters</p>
                  <p className="text-slate-600">447 Market Street, San Francisco, CA 94105</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Support Hours</p>
                  <p className="text-slate-600">Mon – Fri, 8 AM – 8 PM PST</p>
                  <p className="text-slate-500 text-sm">Enterprise plans: 24/7 support</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
              <p className="font-semibold text-slate-900 mb-1">Looking for product support?</p>
              <p className="text-slate-600 text-sm mb-3">
                Existing customers get faster help via the in-app support portal.
              </p>
              <Link href="/docs" className="text-blue-600 text-sm font-medium hover:underline">
                Go to Help Center →
              </Link>
            </div>
          </div>

          {/* Right: form */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Send us a message</h2>
            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center py-16 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Message sent!</h3>
                <p className="text-slate-600">We'll respond within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" required placeholder="Jane Smith" value={form.name} onChange={handleChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" required placeholder="jane@company.com" value={form.email} onChange={handleChange} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" placeholder="Acme Corp" value={form.company} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject *</Label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Sales">Sales enquiry</option>
                    <option value="Support">Technical support</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message *</Label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    placeholder="Tell us how we can help…"
                    value={form.message}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Our offices</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {offices.map((o) => (
              <div key={o.city} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <p className="text-3xl mb-3">{o.flag}</p>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{o.city}</h3>
                <p className="text-slate-500 text-sm whitespace-pre-line">{o.address}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
