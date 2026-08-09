import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * "Remember me" — the credentials the login screen pre-fills after a logout.
 *
 * The password goes to SecureStore, never AsyncStorage. SecureStore is backed
 * by the iOS Keychain and Android Keystore, so the value is encrypted at rest;
 * AsyncStorage is plain text on disk and readable from a device backup or any
 * rooted phone. The username is not a secret and stays in AsyncStorage, which
 * keeps the login form useful even if the keychain read fails.
 *
 * Logging out deliberately keeps these — that is the whole point of the
 * option. They are cleared when the user unticks the box.
 */

const USERNAME_KEY = 'remembered_username';
const FLAG_KEY = 'remember_me_enabled';
const PASSWORD_KEY = 'remembered_password';

export type RememberedCredentials = {
  username: string;
  password: string;
  remember: boolean;
};

const EMPTY: RememberedCredentials = { username: '', password: '', remember: false };

export async function loadRememberedCredentials(): Promise<RememberedCredentials> {
  try {
    const [[, flag], [, username]] = await AsyncStorage.multiGet([
      FLAG_KEY,
      USERNAME_KEY,
    ]);
    if (flag !== 'true') return EMPTY;

    let password = '';
    try {
      password = (await SecureStore.getItemAsync(PASSWORD_KEY)) ?? '';
    } catch {
      // Keychain unavailable or the entry was invalidated. Still offer the
      // username — half a saved login beats none.
    }
    return { username: username ?? '', password, remember: true };
  } catch {
    return EMPTY;
  }
}

export async function saveRememberedCredentials(
  username: string,
  password: string,
): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [FLAG_KEY, 'true'],
      [USERNAME_KEY, username],
    ]);
    await SecureStore.setItemAsync(PASSWORD_KEY, password);
  } catch {
    // Never block a successful login because the convenience feature failed.
  }
}

export async function clearRememberedCredentials(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([FLAG_KEY, USERNAME_KEY]);
    await SecureStore.deleteItemAsync(PASSWORD_KEY);
  } catch {
    // Nothing useful to tell the user if the wipe half-failed.
  }
}
