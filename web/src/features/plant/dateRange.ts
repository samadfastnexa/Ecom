import type { PlantDateRange } from "@/lib/types";

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function isoDate(d = new Date()): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/**
 * `week` is a rolling 7-day window (what the plant ledger reports on) while
 * `this_week` is the calendar week so far. Both live here so no screen has to
 * re-derive local-date maths — `toISOString()` shifts the day east of UTC.
 */
export type PresetKey = "today" | "week" | "this_week" | "month" | "custom";

export function presetRange(key: PresetKey): PlantDateRange {
  const today = new Date();
  switch (key) {
    case "today":
      return { date: isoDate(today) };
    case "week": {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { start: isoDate(start), end: isoDate(today) };
    }
    case "this_week": {
      // Weeks start Monday here; getDay() puts Sunday at 0, so rotate it to 6.
      const start = new Date(today);
      start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { start: isoDate(start), end: isoDate(today) };
    }
    case "month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: isoDate(start), end: isoDate(today) };
    }
    case "custom":
      return {};
  }
}

export function rangeLabel(range: PlantDateRange): string {
  if (range.date) return range.date;
  if (range.start || range.end)
    return `${range.start || "…"} → ${range.end || "…"}`;
  return "All time";
}
