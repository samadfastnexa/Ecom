/**
 * Placing an actual phone call, as opposed to opening WhatsApp — see
 * lib/whatsapp.ts for that side. Mirrors mobile-app/src/utils/phone.ts so the
 * two admin surfaces agree on what counts as a callable number.
 */

/** Everything a dialler will accept: digits and a leading +. */
export function telHref(phone?: string | null): string {
  return (phone || "").replace(/[^\d+]/g, "");
}

/** Fewer than seven digits is a fragment, not a number worth offering to dial. */
export function canCall(phone?: string | null): boolean {
  return telHref(phone).replace(/\D/g, "").length >= 7;
}
