import type { PlantDateRange } from "@/lib/types";
import { presetRange, type PresetKey } from "@/features/plant/dateRange";

/** Query params the admin summary endpoint takes; "" leaves that bound open. */
export interface PeriodParams {
  date_from: string;
  date_to: string;
}

/**
 * The dashboard's periods are a subset of the shared plant presets, so the
 * local-time date maths has exactly one implementation. Narrowing `PresetKey`
 * instead of declaring a fresh union means a rename over there breaks the build
 * here rather than leaving a button that silently resolves to nothing.
 */
export type PeriodKey = Extract<
  PresetKey,
  "today" | "this_week" | "month" | "custom"
>;

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

/** Plant presets speak `{date}` for a single day and `{start,end}` otherwise. */
function toParams(range: PlantDateRange): PeriodParams {
  if (range.date) return { date_from: range.date, date_to: range.date };
  return { date_from: range.start ?? "", date_to: range.end ?? "" };
}

export function periodParams(key: PeriodKey): PeriodParams {
  return toParams(presetRange(key));
}

/**
 * `new Date("2026-08-04")` is parsed as UTC midnight and renders as the 3rd for
 * anyone behind UTC, so build the date from its parts instead.
 */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Name of the active period — every figure on the page is scoped to it. */
export function periodLabel(key: PeriodKey): string {
  return PERIODS.find((p) => p.key === key)?.label ?? "Selected period";
}

/** The dates that name resolves to, so "Custom" isn't a mystery. */
export function periodCaption({ date_from, date_to }: PeriodParams): string {
  if (!date_from && !date_to) return "All time";
  if (!date_to) return `From ${formatDay(date_from)}`;
  if (!date_from) return `Up to ${formatDay(date_to)}`;
  if (date_from === date_to) return formatDay(date_from);
  return `${formatDay(date_from)} → ${formatDay(date_to)}`;
}
