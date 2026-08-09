import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';
import type { Pin } from '../services/addressService';

/**
 * One-shot "where am I right now" for the address pin.
 *
 * Deliberately separate from services/locationService.ts: that module is the
 * rider's *background* tracking service and defines a TaskManager task at
 * module scope. Customers must never pull that in — importing it would
 * register the background task on their device too.
 *
 * Every failure path returns a message the UI can show. A GPS button that
 * quietly does nothing when permission is denied is the single most confusing
 * thing a map screen can do, so there is no silent path out of here.
 */

export type PinResult =
  | { ok: true; pin: Pin }
  | { ok: false; message: string; canOpenSettings?: boolean };

/** Deep-links to the OS settings page for this app, for a permanent denial. */
export const openAppSettings = (): void => {
  // Android has no per-app URL; the generic scheme resolves to app info.
  Linking.openSettings().catch(() => {
    if (Platform.OS === 'ios') Linking.openURL('app-settings:');
  });
};

export const getCurrentPin = async (): Promise<PinResult> => {
  try {
    // Ask only for foreground: dropping a pin needs one fix while the customer
    // is looking at the screen, and requesting background here would show a
    // scary "all the time" prompt for no reason.
    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      // canAskAgain === false means the OS will no longer show the prompt, so
      // telling them to "try again" would be a lie — send them to Settings.
      return permission.canAskAgain
        ? {
            ok: false,
            message:
              'Location permission was declined, so we could not read your position. '
              + 'Tap the button again to allow it, or drag the map pin instead.',
          }
        : {
            ok: false,
            message:
              'Location permission is turned off for this app. Open Settings to allow it, '
              + 'or drag the map pin to your door instead.',
            canOpenSettings: true,
          };
    }

    // A device with location services switched off grants permission happily
    // and then never produces a fix, so check before waiting on one.
    if (!(await Location.hasServicesEnabledAsync())) {
      return {
        ok: false,
        message: 'Location services are switched off on this device. Turn them on and try again.',
      };
    }

    const fix = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      ok: true,
      pin: { latitude: fix.coords.latitude, longitude: fix.coords.longitude },
    };
  } catch (error: any) {
    // Usually a timeout indoors with no GPS lock. Surface it rather than
    // leaving the button looking broken.
    return {
      ok: false,
      message: error?.message
        ? `Could not read your location: ${error.message}`
        : 'Could not read your location. Move somewhere with a clearer sky view and try again.',
    };
  }
};
