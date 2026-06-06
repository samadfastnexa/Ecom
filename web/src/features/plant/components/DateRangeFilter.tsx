"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import type { PlantDateRange } from "@/lib/types";
import { cn } from "@/lib/cn";
import { presetRange, type PresetKey } from "../dateRange";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

interface DateRangeFilterProps {
  range: PlantDateRange;
  onChange: (range: PlantDateRange) => void;
}

export function DateRangeFilter({ range, onChange }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<PresetKey>("today");
  const [start, setStart] = useState(range.start || "");
  const [end, setEnd] = useState(range.end || "");

  const choosePreset = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") onChange(presetRange(key));
    else onChange({ start: start || undefined, end: end || undefined });
  };

  const applyCustom = (s: string, e: string) => {
    setStart(s);
    setEnd(e);
    onChange({ start: s || undefined, end: e || undefined });
  };

  return (
    <div className="glass flex flex-wrap items-center gap-2 p-3">
      <span className="flex items-center gap-1.5 px-1 text-sm text-mist/60">
        <Calendar size={16} className="text-wave" /> Period
      </span>
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => choosePreset(p.key)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            preset === p.key
              ? "bg-wave-gradient text-white shadow-glow"
              : "border border-white/10 bg-white/5 text-mist/70 hover:bg-white/10"
          )}
        >
          {p.label}
        </button>
      ))}

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={start}
            onChange={(e) => applyCustom(e.target.value, end)}
            className="input w-auto px-3 py-1.5 text-sm"
          />
          <span className="text-mist/40">→</span>
          <input
            type="date"
            value={end}
            onChange={(e) => applyCustom(start, e.target.value)}
            className="input w-auto px-3 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}
