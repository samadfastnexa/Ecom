import type { PlantDateRange } from "@/lib/types";

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function isoDate(d = new Date()): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export type PresetKey = "today" | "week" | "month" | "custom";

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
