"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Monitor, Layers, Settings, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const demoHighlights = [
  { icon: Monitor, title: "Live dashboard walkthrough", desc: "See real-time data across all modules in action." },
  { icon: Layers, title: "Module deep-dive", desc: "We'll walk through the modules most relevant to your business." },
  { icon: Settings, title: "Custom configuration", desc: "Watch us configure NexaERP live for a company like yours." },
  { icon: MessageSquare, title: "Open Q&A session", desc: "Ask anything — our solutions engineers know the platform inside out." },
];

const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const dates = [16, 17, 18, 19, 20];

export default function DemoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", company: "", size: "1-20", phone: "", source: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <section className="bg-slate-950 pt-16 pb-8 px-6 text-center border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Book a Demo
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            See{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              NexaERP in action
            </span>
          </h1>
          <p className="text-slate-400">A personalised 30-minute demo tailored to your business.</p>
        </div>
      </section>

      {/* Two column */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          {/* Left */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">What you'll see</h2>
            <div className="space-y-5 mb-10">
              {demoHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-600/20 border border-blue-600/30 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-slate-400 text-sm mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Social proof */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400">★</span>
                ))}
              </div>
              <p className="text-slate-300 text-sm italic mb-2">
                "The demo was incredibly helpful. The team answered every question and had us live within two days."
              </p>
              <p className="text-slate-500 text-xs">— Sarah T., COO at BuildRight Construction</p>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-8">
                <CheckCircle className="w-14 h-14 text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Demo booked!</h3>
                <p className="text-slate-600 mb-1">
                  {selectedDate && selectedTime
                    ? `Confirmed for ${days[dates.indexOf(selectedDate)]}, Dec ${selectedDate} at ${selectedTime} PST.`
                    : "We'll confirm your slot shortly."}
                </p>
                <p className="text-slate-500 text-sm">Check your email for a calendar invite.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Your details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" name="name" required placeholder="Jane Smith" value={form.name} onChange={handleChange} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Work Email *</Label>
                    <Input id="email" name="email" type="email" required placeholder="jane@company.com" value={form.email} onChange={handleChange} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company *</Label>
                  <Input id="company" name="company" required placeholder="Acme Corp" value={form.company} onChange={handleChange} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="size">Company Size *</Label>
                    <select id="size" name="size" required value={form.size} onChange={handleChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="1-20">1–20 employees</option>
                      <option value="21-100">21–100 employees</option>
                      <option value="101-500">101–500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+1 555 000 0000" value={form.phone} onChange={handleChange} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="source">How did you hear about us?</Label>
                  <select id="source" name="source" value={form.source} onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="">Select an option</option>
                    <option value="google">Google Search</option>
                    <option value="social">Social Media</option>
                    <option value="referral">Referral</option>
                    <option value="event">Event / Conference</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date picker */}
                <div className="space-y-2">
                  <Label>Pick a date (December 2024)</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {days.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDate(dates[i])}
                        className={`flex flex-col items-center py-2 rounded-lg border text-sm transition-colors ${
                          selectedDate === dates[i]
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-200 text-slate-600 hover:border-blue-400"
                        }`}
                      >
                        <span className="text-xs font-medium">{day}</span>
                        <span className="font-bold">{dates[i]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slots */}
                <div className="space-y-2">
                  <Label>Pick a time (PST)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 rounded-lg border text-sm font-medium transition-colors ${
                          selectedTime === slot
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-200 text-slate-600 hover:border-blue-400"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                  Confirm Demo
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  By booking, you agree to our{" "}
                  <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
