import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your network connection');
    }
    throw error;
  }
};

// Helper function to get auth token from AsyncStorage
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const authService = {
  async register(userData: any) {
    console.log('🔵 Registering user to:', `${API_URL}/auth/register/`);
    const response = await fetchWithTimeout(`${API_URL}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
    return data;
  },

  async login(credentials: any) {
    console.log('🔵 Logging in to:', `${API_URL}/auth/login/`);
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      console.log('✅ Login response:', response.status);
      
      if (!response.ok) {
        console.log('❌ Login failed:', data);
        throw new Error(JSON.stringify(data));
      }
      return data;
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  },

  async getProfile(token: string) {
    console.log('🔵 Fetching profile from:', `${API_URL}/auth/profile/`);
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/profile/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('✅ Profile response:', response.status);
      
      if (!response.ok) {
        console.log('❌ Profile fetch failed:', data);
        throw new Error(JSON.stringify(data));
      }
      return data;
    } catch (error: any) {
      console.error('❌ Profile error:', error.message);
      throw error;
    }
  },

  async updateProfile(token: string, userData: any) {
    const response = await fetch(`${API_URL}/auth/profile/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
    return data;
  },

  async googleLogin(googleAccessToken: string) {
    const response = await fetchWithTimeout(`${API_URL}/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: googleAccessToken }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
  },

  async changePassword(token: string, oldPassword: string, newPassword: string) {
    const response = await fetchWithTimeout(`${API_URL}/auth/change-password/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
    return data;
  },
};
