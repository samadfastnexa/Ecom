import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';
import { getAuthToken } from './authService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    try {
      // Get the token that uniquely identifies this device
      // In Expo Go, we need to specify the project ID if not configured in app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined // fallback to undefined to let it try default behavior
      })).data;
      console.log('Push Token:', token);
    } catch (error: any) {
      if (error.message.includes('projectId')) {
        console.log('Push Notifications skipped: No EAS Project ID configured.');
      } else {
        console.error('Error getting push token:', error);
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export const sendPushTokenToBackend = async (token: string) => {
  const authToken = await getAuthToken();
  if (!authToken) {
    console.warn('⚠️ Push token NOT saved: no auth token in storage.');
    return;
  }

  try {
    console.log('📤 Saving push token to backend:', `${API_URL}/auth/device/`);
    const res = await fetch(`${API_URL}/auth/device/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log('✅ Push token saved to backend:', res.status, text);
    } else {
      console.warn('❌ Push token save failed:', res.status, text);
    }
  } catch (error) {
    console.error('❌ Error sending push token:', error);
  }
};
