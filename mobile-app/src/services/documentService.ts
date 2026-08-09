import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { API_URL } from '../constants/config';
import { getAuthToken } from './authService';

/**
 * Downloads a PDF from the API and hands it to the OS share sheet, which is how
 * a statement or receipt reaches WhatsApp.
 *
 * A `wa.me` deep link can only carry text — WhatsApp does not accept file
 * attachments from a URL — so sending the actual document has to go through the
 * native share sheet. The user picks WhatsApp (or email, or Drive) from there.
 */
export async function downloadAndShare(
  path: string,
  filename: string,
  dialogTitle = 'Share document',
): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing unavailable', 'This device cannot share files.');
      return false;
    }

    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again.');
      return false;
    }

    // Cache, not documents: these are disposable copies the OS may reclaim.
    const destination = new File(Paths.cache, filename);
    if (destination.exists) {
      destination.delete(); // stale copy from an earlier share
    }

    const downloaded = await File.downloadFileAsync(
      `${API_URL}${path}`,
      destination,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await Sharing.shareAsync(downloaded.uri, {
      mimeType: 'application/pdf',
      // iOS needs the uniform type identifier to offer the right apps.
      UTI: 'com.adobe.pdf',
      dialogTitle,
    });
    return true;
  } catch (e: any) {
    console.error('Share failed:', e);
    Alert.alert(
      'Could not share',
      e?.message || 'The document could not be downloaded. Please try again.',
    );
    return false;
  }
}

/** Statement PDF for one customer, optionally limited to a date range. */
export function shareCustomerStatement(
  userId: number,
  customerName: string,
  range?: { start?: string; end?: string },
): Promise<boolean> {
  const params = new URLSearchParams();
  if (range?.start) params.set('start', range.start);
  if (range?.end) params.set('end', range.end);
  const query = params.toString();
  const safeName = customerName
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'customer';
  // Dated, because the recipient keeps the file: two statements for the same
  // customer must not collide in a WhatsApp thread or a downloads folder.
  const asOf = range?.end || new Date().toISOString().slice(0, 10);

  return downloadAndShare(
    `/ledger/customers/${userId}/statement.pdf${query ? `?${query}` : ''}`,
    `statement-${safeName}-${asOf}.pdf`,
    `Statement — ${customerName}`,
  );
}

/** Receipt PDF for one payment entry. */
export function sharePaymentReceipt(
  entryId: number,
  receiptNumber?: string | null,
): Promise<boolean> {
  const name = (receiptNumber || `entry-${entryId}`).replace(/[^a-zA-Z0-9-]/g, '');
  return downloadAndShare(
    `/ledger/entries/${entryId}/receipt/`,
    `receipt-${name}.pdf`,
    'Send receipt',
  );
}

export const isSharingSupported = Platform.OS !== 'web';
