import { Alert, Linking, Platform, Share } from 'react-native';

/**
 * Map pins and the deep links that act on them.
 *
 * Orders carry `shipping_latitude` / `shipping_longitude` as 6dp decimal
 * *strings* (or null) because the API serialises DecimalField that way — never
 * assume a number, and never trust the value to be inside the valid range.
 */

export interface MapPin {
  latitude: number;
  longitude: number;
  /** Shown as the pin's name in the maps app, e.g. the saved address label. */
  title?: string;
}

/** A coordinate is only usable if it parses AND lands on the planet. */
export function parseCoordinate(
  value: string | number | null | undefined,
  max: number,
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n) || Math.abs(n) > max) return null;
  return n;
}

/**
 * Build a pin from whatever the API returned, or null when the order was placed
 * without one. Callers use the null to decide between a map and a plain address.
 */
export function toMapPin(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined,
  title?: string,
): MapPin | null {
  const lat = parseCoordinate(latitude, 90);
  const lng = parseCoordinate(longitude, 180);
  if (lat === null || lng === null) return null;
  // 0,0 is the Gulf of Guinea — always a placeholder rather than a delivery.
  if (lat === 0 && lng === 0) return null;
  return { latitude: lat, longitude: lng, title };
}

/** Coordinates as a human can read them back over the phone. */
export function formatCoordinates(pin: MapPin): string {
  return `${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}`;
}

/**
 * A plain https link to the pin.
 *
 * Unlike the `geo:` / `maps://` deep links below, this opens in any browser on
 * any device, so it is the only form worth sending to someone who does not have
 * this app — or any particular maps app — installed.
 */
export function mapsWebLink(pin: MapPin): string {
  return `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`;
}

/** The same, for a place known only by name. Resolves to a search, not a pin. */
export function mapsSearchWebLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Open the first URL the device accepts.
 *
 * `Linking.canOpenURL` is deliberately not used: on Android 11+ it answers
 * false for any scheme missing from the manifest's <queries>, which would rule
 * out `geo:` on phones that handle it perfectly well. Attempting the open and
 * catching the rejection is the honest test.
 */
async function openFirst(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // Try the next candidate; the last failure is reported by the caller.
    }
  }
  return false;
}

/** Show the pin on a map. Alerts — never fails silently — if nothing opens. */
export async function openInMaps(pin: MapPin): Promise<boolean> {
  const { latitude, longitude, title } = pin;
  const label = encodeURIComponent(title || 'Delivery location');
  const coords = `${latitude},${longitude}`;

  const urls = Platform.select({
    ios: [`maps://?ll=${coords}&q=${label}`, `http://maps.apple.com/?ll=${coords}&q=${label}`],
    android: [`geo:${coords}?q=${coords}(${label})`],
    default: [] as string[],
  });

  // Works in any browser, so it is the last resort on every platform.
  urls.push(mapsWebLink(pin));

  const opened = await openFirst(urls);
  if (!opened) {
    Alert.alert(
      'Could not open maps',
      `No maps app on this device would open the location.\n\n${formatCoordinates(pin)}`,
    );
  }
  return opened;
}

/**
 * Hand a location to whoever the sharer picks — WhatsApp, SMS, email, a group
 * chat. The recipient does not need this app, or an account, or anything but a
 * browser, which is the whole point of sending a link rather than a screenshot.
 *
 * Deliberately RN's `Share` rather than expo-sharing: expo-sharing sends
 * *files* off the device, and what a person outside the app needs is a tappable
 * link. Returns false when the sheet was dismissed without choosing a target,
 * so callers can avoid claiming something was sent when it was not.
 */
export async function shareLocation(options: {
  pin?: MapPin | null;
  address?: string | null;
  /** Names the place in the shared text, e.g. "Century Sip — work place". */
  title?: string;
}): Promise<boolean> {
  const label = options.title?.trim() || 'Location';
  const line = options.address?.trim() || '';

  // A pin is exact; an address is a search that may land on the wrong street.
  // Prefer the pin, but send the text either way — a human reading it can spot
  // a bad hit that a coordinate alone would hide.
  const link = options.pin
    ? mapsWebLink(options.pin)
    : line
      ? mapsSearchWebLink(line)
      : null;

  if (!link) {
    Alert.alert(
      'Nothing to share yet',
      'Add an address first, then you can send it to anyone.',
    );
    return false;
  }

  const message = [label, line, link].filter(Boolean).join('\n');

  try {
    const result = await Share.share(
      // iOS treats `url` as a first-class attachment and offers richer targets
      // for it. Android reads `message` only, so the link must be inside it
      // there or the recipient gets text with nothing to tap.
      Platform.OS === 'ios'
        ? { message, url: link, title: label }
        : { message, title: label },
    );
    return result.action === Share.sharedAction;
  } catch (error: any) {
    Alert.alert('Could not share', error?.message || 'The share sheet did not open.');
    return false;
  }
}

/**
 * Start turn-by-turn directions to the pin. This is what a rider taps, so the
 * first candidate is Google's navigation intent, which skips straight to
 * driving guidance instead of dropping them on a preview screen.
 */
export async function openDirections(pin: MapPin): Promise<boolean> {
  const coords = `${pin.latitude},${pin.longitude}`;

  const urls = Platform.select({
    ios: [`maps://?daddr=${coords}&dirflg=d`, `http://maps.apple.com/?daddr=${coords}&dirflg=d`],
    android: [`google.navigation:q=${coords}`, `geo:${coords}?q=${coords}`],
    default: [] as string[],
  });

  urls.push(`https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=driving`);

  const opened = await openFirst(urls);
  if (!opened) {
    Alert.alert(
      'Could not start navigation',
      `No navigation app on this device would accept the destination.\n\n${formatCoordinates(pin)}`,
    );
  }
  return opened;
}
