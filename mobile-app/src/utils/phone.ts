import { Alert, Linking, Platform } from 'react-native';

/**
 * Placing an actual phone call, as opposed to opening WhatsApp — see
 * utils/whatsapp.ts for that side.
 */

/** Everything a dialler will accept: digits and a leading +. */
export const toDialNumber = (phone?: string | null): string | null => {
  const cleaned = (phone || '').replace(/[^\d+]/g, '');
  // Fewer than seven digits is a fragment, not a number worth dialling.
  return cleaned.replace(/\D/g, '').length >= 7 ? cleaned : null;
};

export const canCall = (phone?: string | null): boolean => toDialNumber(phone) !== null;

/**
 * Open the dialler on the SIM.
 *
 * iOS uses `telprompt:` so the OS asks before dialling — `tel:` there places
 * the call the instant it is tapped, which is not what someone who mis-taps a
 * list row wants. Android has no equivalent and shows the number in the dialler
 * anyway.
 */
export const callNumber = async (phone?: string | null): Promise<boolean> => {
  const number = toDialNumber(phone);
  if (!number) {
    Alert.alert('No phone number', 'This record has no number to call.');
    return false;
  }
  const scheme = Platform.OS === 'ios' ? 'telprompt' : 'tel';
  try {
    await Linking.openURL(`${scheme}:${number}`);
    return true;
  } catch {
    // Tablet or emulator with no dialler.
    Alert.alert('Could not start the call', number);
    return false;
  }
};
