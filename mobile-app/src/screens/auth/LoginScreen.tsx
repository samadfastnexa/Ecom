import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../../constants/googleConfig';

WebBrowser.maybeCompleteAuthSession();

const { height: SCREEN_H } = Dimensions.get('window');
const BRAND_BLUE = '#0A84FF';
const BRAND_DARK = '#0D1B2A';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle, isLoading, error } = useContext(AuthContext);
  const { t } = useLanguage();
  const navigation = useNavigation<any>();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      if (token) {
        setGoogleLoading(true);
        loginWithGoogle(token)
          .catch(() => Alert.alert('Google Sign-In Failed', 'Could not sign in with Google.'))
          .finally(() => setGoogleLoading(false));
      }
    }
  }, [response]);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(t('error', 'Error'), t('fill_all_fields', 'Please fill in all fields'));
      return;
    }
    try {
      await login({ username, password });
    } catch (e) {
      Alert.alert(t('login_failed', 'Login Failed'), e instanceof Error ? e.message : t('error', 'An error occurred'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand hero ─────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          {/* Logo */}
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Ionicons name="water" size={44} color="#fff" />
            </View>
          </View>

          <Text style={styles.brandName}>
            Century<Text style={{ color: '#60B4FF' }}> Sip</Text>
          </Text>
          <Text style={styles.tagline}>Pure water. Fast delivery.</Text>

          {/* Feature pills */}
          <View style={styles.pills}>
            {['💧 Fresh & Pure', '🚴 Fast Delivery', '📱 Track Orders'].map(p => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Form card ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('welcome_back', 'Welcome Back')}</Text>
          <Text style={styles.cardSub}>{t('sign_in_continue', 'Sign in to your account')}</Text>

          {/* Username */}
          <View style={styles.field}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="person-outline" size={18} color={BRAND_BLUE} />
            </View>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('username_placeholder', 'Username')}
              placeholderTextColor="#aaa"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <View style={styles.fieldIconWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={BRAND_BLUE} />
            </View>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('password_placeholder', 'Password')}
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#aaa" />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>{t('login_btn', 'Sign In')}</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerOr}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => promptAsync()}
            disabled={!request || googleLoading || isLoading}
            activeOpacity={0.85}
          >
            {googleLoading
              ? <ActivityIndicator color="#555" />
              : (
                <>
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.googleText}>Continue with Google</Text>
                </>
              )
            }
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerText}>
              {t('no_account_signup', "Don't have an account?")}{' '}
              <Text style={{ color: BRAND_BLUE, fontWeight: '700' }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND_DARK },
  scroll: { flexGrow: 1 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: BRAND_DARK,
    minHeight: SCREEN_H * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  // Decorative background circles
  decCircle1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: `${BRAND_BLUE}18`,
    top: -60, right: -60,
  },
  decCircle2: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: `${BRAND_BLUE}10`,
    bottom: 0, left: -40,
  },
  logoRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2, borderColor: `${BRAND_BLUE}40`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  logoInner: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 14,
  },
  brandName: {
    fontSize: 34, fontWeight: '900', color: '#fff',
    letterSpacing: -0.5, marginBottom: 6,
  },
  tagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.4, marginBottom: 24,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 16 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  pillText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },

  // ── Form card ─────────────────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#999', marginBottom: 24 },

  // ── Fields ────────────────────────────────────────────────────────────────
  field: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#eee',
    borderRadius: 14, backgroundColor: '#fafafa',
    marginBottom: 14, paddingHorizontal: 4,
  },
  fieldIconWrap: {
    width: 42, height: 52, alignItems: 'center', justifyContent: 'center',
  },
  fieldInput: {
    flex: 1, height: 52, fontSize: 15, color: '#1a1a1a',
    paddingRight: 12,
  },
  eyeBtn: { paddingHorizontal: 12 },

  errorText: {
    color: '#FF3B30', fontSize: 13, textAlign: 'center',
    marginBottom: 10, marginTop: -4,
  },

  // ── Login button ──────────────────────────────────────────────────────────
  loginBtn: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerOr: { fontSize: 12, color: '#bbb', fontWeight: '700' },

  // ── Google ────────────────────────────────────────────────────────────────
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderWidth: 1.5, borderColor: '#eee',
    borderRadius: 14, paddingVertical: 14, backgroundColor: '#fff',
  },
  googleG: { fontSize: 17, fontWeight: '900', color: '#EA4335' },
  googleText: { fontSize: 15, fontWeight: '600', color: '#333' },

  // ── Register link ─────────────────────────────────────────────────────────
  registerLink: { alignItems: 'center', marginTop: 20 },
  registerText: { fontSize: 14, color: '#888' },
});
