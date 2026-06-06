"use client";

import { Search, Waves, Sparkles } from "lucide-react";
import { Chip } from "@/components/ui";

interface HeroSectionProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function HeroSection({ search, onSearchChange }: HeroSectionProps) {
  return (
    <section className="glass-strong relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
      <div className="absolute -right-10 -top-10 text-wave/10">
        <Waves size={220} />
      </div>
      <div className="relative max-w-2xl">
        <Chip className="mb-4 bg-white/10 text-foam">
          <Sparkles size={14} /> Fresh stock daily
        </Chip>
        <h1 className="text-3xl font-bold leading-tight text-mist sm:text-5xl">
          Dive into a smoother way to{" "}
          <span className="bg-gradient-to-r from-wave to-aqua bg-clip-text text-transparent">
            shop
          </span>
        </h1>
        <p className="mt-4 text-mist/70 sm:text-lg">
          Crisp products, fluid checkout, and delivery that flows right to your
          door.
        </p>
        <div className="relative mt-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-mist/40"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products…"
            className="input pl-11"
          />
        </div>
      </div>
    </section>
  );
}
