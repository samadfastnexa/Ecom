"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Calendar, EyeOff } from "lucide-react";
import type { AdminOrderFilters } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

interface AdminOrdersFiltersProps {
  filters: AdminOrderFilters;
  onChange: (filters: AdminOrderFilters) => void;
}

export function AdminOrdersFilters({ filters, onChange }: AdminOrdersFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 350);

  useEffect(() => {
    onChange({ ...filters, search: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="glass flex flex-wrap items-center gap-3 p-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
        <input
          type="text"
          placeholder="Customer, email, address…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="input w-full py-1.5 pl-9 pr-3 text-sm"
        />
      </div>

      {/* Status */}
      <span className="flex items-center gap-1.5 text-sm text-mist/50">
        <Filter size={14} className="text-wave" />
      </span>
      <select
        value={filters.status ?? ""}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        className="input w-auto py-1.5 text-sm"
      >
        <option value="">All Statuses</option>
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Paid */}
      <select
        value={filters.is_paid === true ? "true" : filters.is_paid === false ? "false" : ""}
        onChange={(e) =>
          onChange({
            ...filters,
            is_paid: e.target.value === "" ? "" : e.target.value === "true",
          })
        }
        className="input w-auto py-1.5 text-sm"
      >
        <option value="">All Payments</option>
        <option value="true">Paid</option>
        <option value="false">Unpaid</option>
      </select>

      {/* Date range */}
      <span className="flex items-center gap-1 text-sm text-mist/50">
        <Calendar size={14} className="text-wave" />
      </span>
      <input
        type="date"
        value={filters.date_from ?? ""}
        onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
        className="input w-auto px-3 py-1.5 text-sm"
      />
      <span className="text-mist/30 text-sm">→</span>
      <input
        type="date"
        value={filters.date_to ?? ""}
        onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
        className="input w-auto px-3 py-1.5 text-sm"
      />

      {/* Show hidden toggle */}
      <button
        onClick={() => onChange({ ...filters, show_hidden: !filters.show_hidden })}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
          filters.show_hidden
            ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
            : "border-white/10 bg-white/5 text-mist/60 hover:bg-white/10"
        )}
      >
        <EyeOff size={14} /> {filters.show_hidden ? "Showing hidden" : "Show hidden"}
      </button>
    </div>
  );
}
