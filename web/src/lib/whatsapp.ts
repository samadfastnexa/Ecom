/**
 * WhatsApp deep links. Mirrors mobile-app/src/utils/whatsapp.ts.
 *
 * Numbers are stored locally as `03001234567`; wa.me needs the full
 * international form with no plus sign, i.e. `923001234567`.
 *
 * Note a wa.me link can only carry text — WhatsApp does not accept file
 * attachments this way, so statements and receipts are downloaded as PDFs and
 * attached by hand (or shared from the mobile app's share sheet).
 */

const PK_COUNTRY_CODE = "92";

export function toWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");

  if (/^0\d{10}$/.test(digits)) return PK_COUNTRY_CODE + digits.slice(1);
  if (/^92\d{10}$/.test(digits)) return digits;
  if (/^\d{10,15}$/.test(digits)) return digits;
  return null;
}

export function canWhatsApp(phone?: string | null): boolean {
  return toWhatsAppNumber(phone) !== null;
}

export function whatsAppUrl(phone: string, message?: string): string {
  const number = toWhatsAppNumber(phone);
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function openWhatsApp(phone?: string | null, message?: string): boolean {
  const number = toWhatsAppNumber(phone);
  if (!number) return false;
  window.open(whatsAppUrl(number, message), "_blank", "noopener,noreferrer");
  return true;
}

function pkr(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  return `PKR ${Math.abs(n).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

/** `balance` is the owed-positive figure: positive means the customer owes. */
export function balanceReminderMessage(opts: {
  businessName?: string;
  customerName: string;
  balance: number;
  bottlesHeld?: number;
}): string {
  const { businessName = "Century Sip", customerName, balance, bottlesHeld } = opts;
  const lines = [`*${businessName}*`, "", `Dear ${customerName},`];

  if (balance > 0) {
    lines.push("", `Your outstanding balance is *${pkr(balance)}*.`);
  } else if (balance < 0) {
    lines.push("", `You have a credit of *${pkr(balance)}* with us.`);
  } else {
    lines.push("", "Your account is fully settled. Thank you!");
  }
  if (bottlesHeld) lines.push(`Bottles with you: *${bottlesHeld}*`);
  lines.push("", "Thank you for your business.");
  return lines.join("\n");
}

export function paymentReceivedMessage(opts: {
  businessName?: string;
  customerName: string;
  amount: number | string;
  receiptNumber?: string | null;
  balanceAfter: number;
}): string {
  const { businessName = "Century Sip", customerName, amount, receiptNumber, balanceAfter } = opts;
  const lines = [
    `*${businessName}*`, "", `Dear ${customerName},`, "",
    `We have received your payment of *${pkr(amount)}*.`,
  ];
  if (receiptNumber) lines.push(`Receipt No: *${receiptNumber}*`);
  lines.push(
    balanceAfter > 0
      ? `Remaining balance: *${pkr(balanceAfter)}*`
      : "Your account is now fully settled.",
    "", "Thank you!",
  );
  return lines.join("\n");
}
