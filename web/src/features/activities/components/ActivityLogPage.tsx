"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Activity, RefreshCw, Filter, ChevronLeft, ChevronRight,
  Search, Calendar,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Button, Card, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityLogEntry {
  id: number;
  timestamp: string;
  actor_name: string;
  category: string;
  action: string;
  target_type: string;
  target_id: number | null;
  target_label: string;
  details: Record<string, unknown>;
}

interface ActivityResponse {
  count: number;
  results: ActivityLogEntry[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  order:    "bg-blue-400/15 text-blue-300",
  rider:    "bg-emerald-400/15 text-emerald-300",
  customer: "bg-purple-400/15 text-purple-300",
  user:     "bg-amber-400/15 text-amber-300",
  plant:    "bg-teal-400/15 text-teal-300",
};

const ACTION_COLORS: Record<string, string> = {
  "Order Created":       "text-emerald-400",
  "Order Delivered":     "text-emerald-400",
  "Order Cancelled":     "text-rose-400",
  "Order Hidden":        "text-mist/50",
  "Order Unhidden":      "text-mist/70",
  "Rider Assigned":      "text-sky-400",
  "Delivery Completed":  "text-emerald-400",
  "Customer Created":    "text-purple-400",
  "Customer Updated":    "text-purple-300",
  "Staff Created":       "text-amber-400",
  "Password Changed":    "text-amber-300",
  "Password Reset by Admin": "text-rose-300",
};

const LIMIT = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(ts: string) {
  return new Date(ts).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? "bg-white/10 text-mist/60";
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", cls)}>
      {category}
    </span>
  );
}

function DetailsBlock({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details);
  if (!entries.length) return null;
  return (
    <span className="ml-2 text-xs text-mist/35">
      {entries.map(([k, v]) => `${k}: ${v}`).join(" · ")}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityLogPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const load = useCallback(
    async (off: number) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
        if (filterCategory) sp.set("category", filterCategory);
        if (filterDateFrom) sp.set("date_from", filterDateFrom);
        if (filterDateTo) sp.set("date_to", filterDateTo);
        if (filterSearch) sp.set("action", filterSearch);
        const data = await apiFetch<ActivityResponse>(`/activities/?${sp}`, { auth: true });
        setEntries(data.results);
        setTotal(data.count);
        setOffset(off);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [filterCategory, filterDateFrom, filterDateTo, filterSearch],
  );

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterDateFrom, filterDateTo]);

  const pages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-mist">
            <Activity size={22} className="text-wave" />
            Activity Log
          </h1>
          <p className="mt-0.5 text-sm text-mist/50">
            {total > 0 ? `${total.toLocaleString()} records` : "All system events"}
          </p>
        </div>
        <Button variant="ghost" onClick={() => load(0)} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist/50">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input py-2 text-sm"
            >
              <option value="">All</option>
              <option value="order">Order</option>
              <option value="rider">Rider</option>
              <option value="customer">Customer</option>
              <option value="user">User</option>
              <option value="plant">Plant</option>
            </select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist/50">From</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="input py-2 pl-8 text-sm"
              />
            </div>
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-mist/50">To</label>
            <div className="relative">
              <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="input py-2 pl-8 text-sm"
              />
            </div>
          </div>

          {/* Action search */}
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label className="text-xs text-mist/50">Search action</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load(0)}
                  placeholder="e.g. Order Created"
                  className="input w-full py-2 pl-8 text-sm"
                />
              </div>
              <Button onClick={() => load(0)}>
                <Filter size={13} /> Search
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-wide text-mist/40">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-mist/30">
                    <Activity size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No activity records found.</p>
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-mist/50">
                      {formatTs(e.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={e.category} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-medium", ACTION_COLORS[e.action] ?? "text-mist")}>
                        {e.action}
                      </span>
                      <DetailsBlock details={e.details} />
                    </td>
                    <td className="px-4 py-3 text-mist/70">
                      {e.target_label || "—"}
                    </td>
                    <td className="px-4 py-3 text-mist/60">
                      {e.actor_name || "System"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
            <span className="text-xs text-mist/40">
              Page {currentPage} of {pages} · {total.toLocaleString()} total
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={offset === 0 || loading}
                onClick={() => load(Math.max(0, offset - LIMIT))}
              >
                <ChevronLeft size={14} /> Prev
              </Button>
              <Button
                variant="ghost"
                disabled={offset + LIMIT >= total || loading}
                onClick={() => load(offset + LIMIT)}
              >
                Next <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
