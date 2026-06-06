"use client";

import type { PlantFilters, PlantSummary } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Card, Skeleton } from "@/components/ui";
import { usePlantAnalytics } from "../hooks/usePlant";
import { SummaryCards } from "./SummaryCards";
import { DailyBarChart } from "./DailyBarChart";
import { TopHousesList } from "./TopHousesList";

export function AnalyticsPanel({ range }: { range: PlantFilters }) {
  const { data, loading, error } = usePlantAnalytics(range);

  if (error) {
    return (
      <Card className="border-rose-400/30 p-6 text-center text-rose-200">
        {error}
      </Card>
    );
  }

  // Reuse the SummaryCards layout for headline totals.
  const summary: PlantSummary | null = data
    ? { ...data.totals, houses: data.top_houses.length }
    : null;

  const paid = data?.totals.paid_amount ?? 0;
  const total = data?.totals.amount ?? 0;
  const paidPct = total > 0 ? (paid / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      <SummaryCards summary={summary} loading={loading} />

      {loading || !data ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Received vs pending split */}
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-mist">
                Received vs pending
              </span>
              <span className="text-mist/60">
                {formatPrice(paid)} / {formatPrice(total)}
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-amber-400/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-mist/50">
              <span>Received {paidPct.toFixed(0)}%</span>
              <span>Pending {formatPrice(data.totals.pending)}</span>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <DailyBarChart daily={data.daily} />
            <TopHousesList houses={data.top_houses} />
          </div>
        </>
      )}
    </div>
  );
}
