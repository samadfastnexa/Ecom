import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { registerForPushNotificationsAsync, sendPushTokenToBackend } from '../services/notificationService';
import { startRiderTracking, stopRiderTracking, stopRiderTrackingForLogout } from '../services/locationService';

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: 'customer' | 'delivery_boy' | 'staff' | 'admin';
  phone_number?: string;
  address?: string;
  /** This user's own map pin. Numbers, not strings — UserSerializer sets
   *  coerce_to_string=False for both. Null until one has been dropped. */
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  /** What an admin's work place is called when its location is shared. Empty
   *  until set; callers fall back to the business name. */
  work_place_label?: string;
  is_available?: boolean;
  vehicle_type?: string;
  vehicle_number?: string;
  is_staff?: boolean;
  account_balance?: string;
  // Staff / rider HR fields
  employee_id?: string;
  designation?: string;
  department?: string;
  emergency_contact?: string;
  cnic_number?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  salary?: string;
  remarks?: string;
}

/**
 * Error thrown by `register` carrying DRF's per-field validation messages
 * (e.g. { username: 'A user with that username already exists.' }) so the
 * form can show each message against the field that caused it.
 */
export interface AuthError extends Error {
  fieldErrors?: Record<string, string>;
}

/** Flatten a DRF error body into { field: 'first message' }. */
const parseFieldErrors = (raw: string): Record<string, string> | undefined => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;

  const result: Record<string, string> = {};
  Object.entries(data as Record<string, unknown>).forEach(([field, value]) => {
    const message = Array.isArray(value) ? value[0] : value;
    if (message != null) result[field] = String(message);
  });
  return Object.keys(result).length ? result : undefined;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  /** True only while an auth request is in flight — drives inline button spinners. */
  isLoading: boolean;
  /** True only during the initial session restore — drives the splash screen. */
  isBootstrapping: boolean;
  login: (credentials: any) => Promise<void>;
  loginWithGoogle: (googleAccessToken: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: false,
  isBootstrapping: true,
  login: async () => {},
  loginWithGoogle: async () => {},
  register: async () => {},
  updateProfile: async () => {},
  logout: async () => {},
  error: null,
});


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Kept separate on purpose: `isBootstrapping` swaps the whole navigator for the
  // splash screen, so an in-flight login/register must NOT use it — doing so
  // unmounts the auth screens and wipes everything the user typed.
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStorageData();
  }, []);

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then(token => {
        if (token) sendPushTokenToBackend(token);
      });
    }
  }, [user]);

  // Location sharing is rider-only. The else branch matters as much as the if:
  // without it, an admin signing in on a phone a rider used would keep the
  // background service alive under the wrong account. A session restored from
  // storage sets `user` too, so tracking resumes on cold boot for free.
  useEffect(() => {
    if (user?.user_type !== 'delivery_boy') {
      stopRiderTracking();
      return;
    }
    startRiderTracking({ prompt: true });
    return () => { stopRiderTracking(); };
  }, [user?.id, user?.user_type]);

  const loadStorageData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('auth_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load auth data', e);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const login = async (credentials: any) => {
    console.log('🔐 Starting login process...');
    setIsLoading(true);
    setError(null);
    try {
      console.log('📡 Calling authService.login...');
      const data = await authService.login(credentials);
      const accessToken = data.access;
      
      console.log('✅ Login successful, saving token...');
      setToken(accessToken);
      await AsyncStorage.setItem('auth_token', accessToken);
      if (data.refresh) await AsyncStorage.setItem('refresh_token', data.refresh);

      // Fetch user profile
      console.log('👤 Fetching user profile...');
      const userProfile = await authService.getProfile(accessToken);
      console.log('✅ Profile fetched:', userProfile.username, 'Type:', userProfile.user_type);
      setUser(userProfile);
      await AsyncStorage.setItem('auth_user', JSON.stringify(userProfile));
      
      console.log('✅ Login complete!');
    } catch (e: any) {
      console.error('❌ Login error:', e);
      let message = 'Login failed';
      try {
        const errorData = JSON.parse(e.message);
        message = errorData.detail || Object.values(errorData)[0] || message;
      } catch {
        message = e.message;
      }
      setError(message as string);
      throw new Error(message as string);
    } finally {
      console.log('🔓 Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.register(userData);
      // Automatically login after register or ask user to login?
      // For now, let's ask user to login or just auto-login.
      // Implementing auto-login:
      await login({
        email: userData.email, // Assuming username is email or we use email for login
        username: userData.username, // Depending on backend
        password: userData.password
      });
    } catch (e: any) {
      const fieldErrors = parseFieldErrors(e.message);
      const message = fieldErrors
        ? Object.values(fieldErrors)[0]
        : e.message || 'Registration failed';
      setError(message);
      const authError: AuthError = new Error(message);
      authError.fieldErrors = fieldErrors;
      throw authError;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (userData: any) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!token) throw new Error('No token found');
      const updatedUser = await authService.updateProfile(token, userData);
      setUser(updatedUser);
      await AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser));
    } catch (e: any) {
      let message = 'Update failed';
      try {
        const errorData = JSON.parse(e.message);
        message = errorData.detail || Object.values(errorData)[0] || message;
      } catch {
        message = e.message;
      }
      setError(message as string);
      throw new Error(message as string);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleAccessToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.googleLogin(googleAccessToken);
      const accessToken = data.access;
      setToken(accessToken);
      await AsyncStorage.setItem('auth_token', accessToken);
      if (data.refresh) await AsyncStorage.setItem('refresh_token', data.refresh);
      const userProfile = await authService.getProfile(accessToken);
      setUser(userProfile);
      await AsyncStorage.setItem('auth_user', JSON.stringify(userProfile));
    } catch (e: any) {
      let message = 'Google sign-in failed';
      try {
        const errorData = JSON.parse(e.message);
        message = errorData.error || errorData.detail || message;
      } catch {
        message = e.message;
      }
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    // Before the tokens go: the final flush of queued pings still has to
    // authenticate, and leftover fixes would otherwise be filed under whoever
    // signs in next. Kept in its own try so a failure here cannot skip the
    // multiRemove below and leave the user apparently logged in.
    try {
      await stopRiderTrackingForLogout();
    } catch (e) {
      console.error('Stop tracking failed', e);
    }
    try {
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'auth_user']);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isBootstrapping, login, loginWithGoogle, register, updateProfile, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};
