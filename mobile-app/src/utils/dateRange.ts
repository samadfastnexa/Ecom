/**
 * Quick date ranges shared by the admin dashboard and the activity log.
 *
 * Lifted out of AdminActivityScreen so every admin surface offers the same
 * Today / This Week / This Month / Custom choices and computes them identically.
 */

export type RangeKey = 'today' | 'week' | 'month' | 'custom' | 'all';

export type DateRange = { from: string; to: string };

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

/** Local-date safe: toISOString() would shift the day for anyone east of UTC. */
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  // Rejects impossible dates like 2026-02-31, which Date happily rolls over.
  return date.getMonth() === Number(m) - 1 ? date : null;
};

/**
 * Resolve a range key to inclusive from/to dates. `custom` returns whatever the
 * caller already holds, and `all` returns empty strings meaning "no bound".
 */
export function rangeToDates(key: RangeKey, custom?: DateRange): DateRange {
  const now = new Date();
  const today = isoDate(now);
  if (key === 'today') return { from: today, to: today };
  if (key === 'week') {
    const dayFromMonday = (now.getDay() + 6) % 7; // week starts Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayFromMonday);
    return { from: isoDate(monday), to: today };
  }
  if (key === 'month') {
    return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  if (key === 'custom') return custom ?? { from: '', to: '' };
  return { from: '', to: '' };
}

/** Human label for the active range, for headers like "Showing: 1 Aug – 4 Aug". */
export function describeRange(key: RangeKey, custom?: DateRange): string {
  const { from, to } = rangeToDates(key, custom);
  if (!from && !to) return 'All time';
  if (from === to) return from;
  return `${from || '…'} → ${to || '…'}`;
}
