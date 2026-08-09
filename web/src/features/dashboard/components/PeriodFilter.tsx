"use client";

import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import { PERIODS, type PeriodKey, type PeriodParams } from "../period";

interface PeriodFilterProps {
  periodKey: PeriodKey;
  params: PeriodParams;
  onSelect: (key: PeriodKey) => void;
  onCustomChange: (params: PeriodParams) => void;
}

export function PeriodFilter({
  periodKey,
  params,
  onSelect,
  onCustomChange,
}: PeriodFilterProps) {
  return (
    <div className="glass flex flex-wrap items-center gap-2 p-3">
      <span className="flex items-center gap-1.5 px-1 text-sm text-mist/60">
        <Calendar size={16} className="text-wave" /> Period
      </span>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Dashboard period">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={periodKey === key}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wave/60",
              periodKey === key
                ? "bg-wave-gradient text-white shadow-glow"
                : "border border-white/10 bg-white/5 text-mist/70 hover:bg-white/10"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {periodKey === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="period-from" className="text-xs text-mist/50">
            From
          </label>
          <input
            id="period-from"
            type="date"
            value={params.date_from}
            onChange={(e) =>
              onCustomChange({ ...params, date_from: e.target.value })
            }
            className="input w-auto px-3 py-1.5 text-sm"
          />
          <label htmlFor="period-to" className="text-xs text-mist/50">
            To
          </label>
          <input
            id="period-to"
            type="date"
            value={params.date_to}
            onChange={(e) =>
              onCustomChange({ ...params, date_to: e.target.value })
            }
            className="input w-auto px-3 py-1.5 text-sm"
          />
        </div>
      )}
    </div>
  );
}
