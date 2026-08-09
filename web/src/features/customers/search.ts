import type { AdminCustomer } from "@/lib/types";

/**
 * Client-side customer matching, kept deliberately in step with the server's
 * `_customer_search_q` in accounts/views.py.
 *
 * The list is fetched whole and filtered here so typing stays instant, but the
 * *rules* must not drift from the server's: an admin who searches the same
 * words in the mobile app and here should find the same people.
 */

/** Phone numbers get written 0300-1234567, 0300 1234567, +92 300 1234567. */
const digitsOnly = (value: string): string => value.replace(/\D/g, "");

/** Every field one search word may land in. */
function haystack(c: AdminCustomer): string[] {
  return [
    c.name,
    c.username,
    c.email ?? "",
    c.phone ?? "",
    c.address ?? "",
    c.house_number ?? "",
    c.block ?? "",
    c.area ?? "",
  ];
}

function matchesTerm(c: AdminCustomer, term: string): boolean {
  const lower = term.toLowerCase();
  if (haystack(c).some((field) => field.toLowerCase().includes(lower))) return true;

  // Compare phones digit-for-digit so "03001234" finds "0300-1234567".
  // Below three digits this matches almost everyone, so it is not worth doing.
  const termDigits = digitsOnly(term);
  if (termDigits.length >= 3 && c.phone) {
    return digitsOnly(c.phone).includes(termDigits);
  }
  return false;
}

/**
 * True when every word in `query` matches something — not necessarily the same
 * something. "ali johar" finds Ali in Johar Town, which a single substring test
 * over the whole phrase never would. An empty query matches everyone.
 */
export function matchesCustomerSearch(c: AdminCustomer, query: string): boolean {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every((term) => matchesTerm(c, term));
}
