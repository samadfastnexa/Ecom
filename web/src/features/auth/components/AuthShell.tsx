"use client";

import { Droplets, Zap, ShieldCheck, Clock } from "lucide-react";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  maxWidth?: "md" | "lg";
}

const FEATURES = [
  { icon: Droplets, text: "Pure, fresh water delivered to your door" },
  { icon: Zap,      text: "Same-day delivery available" },
  { icon: ShieldCheck, text: "100% quality guaranteed" },
  { icon: Clock,    text: "Order tracking in real time" },
];

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-abyss">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-wave/10 blur-[140px]" />
        <div className="absolute -right-32 top-1/4 h-[400px] w-[400px] rounded-full bg-sky-500/5 blur-[120px]" />
      </div>

      {/* Main area */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl lg:flex">

          {/* ── Left: Branding panel ── */}
          <div className="relative flex flex-col justify-between bg-gradient-to-br from-[#0a4a5c] via-[#063d50] to-abyss p-10 lg:w-[52%]">
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-wave/10 blur-3xl" />
            <div className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-sky-400/5 blur-2xl" />

            {/* Logo */}
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-wave-gradient shadow-glow">
                <Droplets size={22} className="text-white" />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight text-white">Century Sip</p>
                <p className="text-[11px] uppercase tracking-widest text-wave/70">Water Delivery</p>
              </div>
            </div>

            {/* Headline */}
            <div className="relative my-10">
              <h2 className="text-3xl font-bold leading-tight text-white">
                Fresh water,<br />
                delivered fast.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-mist/60">
                The easiest way to get pure, clean water delivered straight to your home or office — on your schedule.
              </p>

              {/* Feature list */}
              <ul className="mt-8 flex flex-col gap-3">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-wave/15">
                      <Icon size={14} className="text-wave" />
                    </span>
                    <span className="text-sm text-mist/70">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom tagline */}
            <p className="relative text-xs text-mist/30">
              © {new Date().getFullYear()} Century Sip. All rights reserved.
            </p>
          </div>

          {/* ── Right: Form panel ── */}
          <div className="flex flex-col justify-center bg-[#0d1a24] px-8 py-10 lg:w-[48%]">
            {/* Form header */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-mist">{title}</h1>
              <p className="mt-1 text-sm text-mist/50">{subtitle}</p>
            </div>

            {/* Form content */}
            {children}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-abyss/40 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1 px-4 py-4 text-center">
          <div className="flex items-center gap-2">
            <Droplets size={14} className="text-wave" />
            <span className="text-sm font-semibold text-mist">Century Sip</span>
          </div>
          <p className="text-xs text-mist/40">Fresh deliveries, straight to your door.</p>
        </div>
      </footer>
    </div>
  );
}
