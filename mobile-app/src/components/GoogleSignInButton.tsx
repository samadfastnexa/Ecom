import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, StyleProp, StyleSheet, Text, TextStyle,
  TouchableOpacity, ViewStyle,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../context/AuthContext';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  IS_GOOGLE_SIGNIN_CONFIGURED,
} from '../constants/googleConfig';

WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInButtonProps {
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Message shown in the failure alert — lets Login and Sign-up differ. */
  failureTitle?: string;
}

/**
 * "Continue with Google" for the auth screens.
 *
 * Renders nothing when no client ID is baked into the build, so a release built
 * without the env vars simply omits the button rather than showing one that
 * fails on tap. The OAuth hook lives in the inner component so it is never
 * constructed in that case.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = (props) => {
  if (!IS_GOOGLE_SIGNIN_CONFIGURED) return null;
  return <GoogleSignInButtonInner {...props} />;
};

const GoogleSignInButtonInner: React.FC<GoogleSignInButtonProps> = ({
  label = 'Continue with Google',
  disabled,
  style,
  textStyle,
  failureTitle = 'Google Sign-In Failed',
}) => {
  const { loginWithGoogle } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  // Empty strings must become undefined: expo-auth-session falls back to the
  // web clientId when a platform ID is absent, but would send an empty
  // client_id if handed ''.
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const token = response.authentication?.accessToken;
      if (!token) {
        setLoading(false);
        Alert.alert(failureTitle, 'Google did not return an access token. Please try again.');
        return;
      }
      setLoading(true);
      loginWithGoogle(token)
        .catch((e) =>
          Alert.alert(
            failureTitle,
            e instanceof Error ? e.message : 'Could not sign in with Google. Please try again.',
          ),
        )
        .finally(() => setLoading(false));
      return;
    }

    // 'dismiss' / 'cancel' are the user backing out — no alert for those.
    if (response.type === 'error') {
      setLoading(false);
      Alert.alert(failureTitle, response.error?.message || 'Google sign-in failed.');
    } else {
      setLoading(false);
    }
  }, [response]);

  const busy = loading || disabled;

  return (
    <TouchableOpacity
      style={[styles.button, style, busy && styles.disabled]}
      onPress={() => {
        setLoading(true);
        promptAsync().catch(() => setLoading(false));
      }}
      disabled={!request || busy}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#444" />
      ) : (
        <>
          <Text style={styles.icon}>G</Text>
          <Text style={[styles.text, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#fff',
  },
  disabled: { opacity: 0.6 },
  icon: { fontSize: 18, fontWeight: '800', color: '#EA4335' },
  text: { fontSize: 15, fontWeight: '600', color: '#333' },
});
