"use client";

import { useState } from "react";
import { Calendar, Filter } from "lucide-react";
import type { CustomerType, BottleType, PlantFilters } from "@/lib/types";
import { cn } from "@/lib/cn";
import { presetRange, type PresetKey } from "../dateRange";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

interface ExportFiltersPanelProps {
  filters: PlantFilters;
  onChange: (filters: PlantFilters) => void;
  customerTypes: CustomerType[];
  bottleTypes: BottleType[];
}

export function ExportFiltersPanel({
  filters,
  onChange,
  customerTypes,
  bottleTypes,
}: ExportFiltersPanelProps) {
  const [preset, setPreset] = useState<PresetKey>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const choosePreset = (key: PresetKey) => {
    setPreset(key);
    if (key !== "custom") {
      const { date, start, end } = presetRange(key);
      onChange({ ...filters, date, start, end });
    } else {
      onChange({
        ...filters,
        date: undefined,
        start: customStart || undefined,
        end: customEnd || undefined,
      });
    }
  };

  const applyCustom = (s: string, e: string) => {
    setCustomStart(s);
    setCustomEnd(e);
    onChange({
      ...filters,
      date: undefined,
      start: s || undefined,
      end: e || undefined,
    });
  };

  return (
    <div className="glass flex flex-col gap-4 p-4">
      {/* Date range row */}
      <div className="flex flex-wrap items-center gap-2">
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
              value={customStart}
              onChange={(e) => applyCustom(e.target.value, customEnd)}
              className="input w-auto px-3 py-1.5 text-sm"
            />
            <span className="text-mist/40">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => applyCustom(customStart, e.target.value)}
              className="input w-auto px-3 py-1.5 text-sm"
            />
          </div>
        )}
      </div>

      {/* Extra filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 px-1 text-sm text-mist/60">
          <Filter size={16} className="text-wave" /> Filters
        </span>

        <select
          value={filters.payment_status ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              payment_status: e.target.value as PlantFilters["payment_status"],
            })
          }
          className="input w-auto py-1.5 text-sm"
        >
          <option value="">All Payments</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>

        {customerTypes.length > 0 && (
          <select
            value={filters.customer_type ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                customer_type: e.target.value ? Number(e.target.value) : "",
              })
            }
            className="input w-auto py-1.5 text-sm"
          >
            <option value="">All Customer Types</option>
            {customerTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name}
              </option>
            ))}
          </select>
        )}

        {bottleTypes.length > 0 && (
          <select
            value={filters.bottle_type ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                bottle_type: e.target.value ? Number(e.target.value) : "",
              })
            }
            className="input w-auto py-1.5 text-sm"
          >
            <option value="">All Bottle Types</option>
            {bottleTypes.map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
