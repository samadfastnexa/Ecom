import { Alert, Linking } from 'react-native';

/**
 * WhatsApp deep links.
 *
 * Numbers are stored locally as `03001234567`; wa.me needs full international
 * form with no plus sign, i.e. `923001234567`.
 */

const PK_COUNTRY_CODE = '92';

/** Strip formatting and convert a local Pakistani number to wa.me form. */
export function toWhatsAppNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');

  if (/^0\d{10}$/.test(digits)) {
    // 03001234567 -> 923001234567
    return PK_COUNTRY_CODE + digits.slice(1);
  }
  if (/^92\d{10}$/.test(digits)) {
    return digits;
  }
  // Already international for some other country — pass through if plausible.
  if (/^\d{10,15}$/.test(digits)) {
    return digits;
  }
  return null;
}

export function canWhatsApp(phone?: string | null): boolean {
  return toWhatsAppNumber(phone) !== null;
}

/**
 * Open a WhatsApp chat, optionally pre-filling a message.
 *
 * Note WhatsApp only accepts text this way — a PDF has to go through the OS
 * share sheet instead (see services/documentService.ts).
 */
export async function openWhatsApp(
  phone?: string | null,
  message?: string,
): Promise<boolean> {
  const number = toWhatsAppNumber(phone);
  if (!number) {
    Alert.alert(
      'No WhatsApp number',
      phone
        ? `"${phone}" is not a valid mobile number.`
        : 'This contact has no phone number saved.',
    );
    return false;
  }

  const url = `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp on this device.');
    return false;
  }
}

/** Money as it should appear inside a WhatsApp message. */
function pkr(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  return `PKR ${Math.abs(n).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

/**
 * Balance reminder text. `balance` is the owed-positive figure the ledger API
 * returns, so a positive number means the customer owes money.
 */
export function balanceReminderMessage(opts: {
  businessName?: string;
  customerName: string;
  balance: number;
  bottlesHeld?: number;
}): string {
  const { businessName = 'Century Sip', customerName, balance, bottlesHeld } = opts;
  const lines = [`*${businessName}*`, '', `Dear ${customerName},`];

  if (balance > 0) {
    lines.push('', `Your outstanding balance is *${pkr(balance)}*.`);
  } else if (balance < 0) {
    lines.push('', `You have a credit of *${pkr(balance)}* with us.`);
  } else {
    lines.push('', 'Your account is fully settled. Thank you!');
  }

  if (bottlesHeld) {
    lines.push(`Bottles with you: *${bottlesHeld}*`);
  }
  lines.push('', 'Thank you for your business.');
  return lines.join('\n');
}

/** Confirmation text sent right after recording a payment. */
export function paymentReceivedMessage(opts: {
  businessName?: string;
  customerName: string;
  amount: number | string;
  receiptNumber?: string | null;
  balanceAfter: number;
}): string {
  const { businessName = 'Century Sip', customerName, amount, receiptNumber, balanceAfter } = opts;
  const lines = [
    `*${businessName}*`,
    '',
    `Dear ${customerName},`,
    '',
    `We have received your payment of *${pkr(amount)}*.`,
  ];
  if (receiptNumber) lines.push(`Receipt No: *${receiptNumber}*`);
  lines.push(
    balanceAfter > 0
      ? `Remaining balance: *${pkr(balanceAfter)}*`
      : 'Your account is now fully settled.',
    '',
    'Thank you!',
  );
  return lines.join('\n');
}
