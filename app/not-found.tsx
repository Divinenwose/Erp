"use client";

import Link from "next/link";
import { Home, Mail, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Floating decorative blobs */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-40 h-40 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* 404 */}
        <p className="text-[8rem] md:text-[10rem] font-black leading-none bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent select-none">
          404
        </p>

        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 mb-4">
          Page not found
        </h1>

        {/* Message */}
        <p className="text-slate-400 text-base leading-relaxed mb-10">
          Sorry, we couldn't find the page you're looking for.
          It may have been moved, deleted, or you might have mistyped the URL.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <button
            onClick={() => typeof window !== "undefined" && window.history.back()}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go back
          </button>
        </div>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
