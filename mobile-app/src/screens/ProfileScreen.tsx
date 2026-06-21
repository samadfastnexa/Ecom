import React, { useContext, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Modal, ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useLanguage } from '../context/LanguageContext';
import { authService } from '../services/authService';
import { API_URL } from '../constants/config';

// ── Field config types ────────────────────────────────────────────────────────

interface FieldConfig {
  visible: boolean;
  editable: boolean;
  label: string;
}

type ProfileConfig = Record<string, FieldConfig>;

// All fields the profile screen can show, in display order
const ALL_FIELDS: { key: string; multiline?: boolean; keyboard?: 'default' | 'phone-pad' | 'numeric' | 'decimal-pad' }[] = [
  { key: 'username' },
  { key: 'first_name' },
  { key: 'last_name' },
  { key: 'phone_number', keyboard: 'phone-pad' },
  { key: 'address', multiline: true },
  { key: 'emergency_contact', keyboard: 'phone-pad' },
  { key: 'employee_id' },
  { key: 'designation' },
  { key: 'department' },
  { key: 'vehicle_type' },
  { key: 'vehicle_number' },
  { key: 'cnic_number' },
  { key: 'date_of_birth' },
  { key: 'date_of_joining' },
  { key: 'salary', keyboard: 'decimal-pad' },
  { key: 'remarks', multiline: true },
];

// Editable fields the profile PATCH endpoint accepts
const EDITABLE_KEYS = new Set(['username', 'first_name', 'last_name', 'phone_number', 'address', 'emergency_contact']);

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchProfileConfig(token: string): Promise<ProfileConfig | null> {
  try {
    const res = await fetch(`${API_URL}/auth/mobile-profile-config/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.fields ?? null;
  } catch {
    return null;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ProfileScreen = () => {
  const { user, token, updateProfile, logout } = useContext(AuthContext);
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [form, setForm] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const isStaff = user?.user_type === 'delivery_boy' || user?.user_type === 'staff';

  // Populate form from user
  useEffect(() => {
    if (!user) return;
    const initial: Record<string, string> = {};
    ALL_FIELDS.forEach(({ key }) => {
      initial[key] = String((user as any)[key] ?? '');
    });
    setForm(initial);
  }, [user]);

  // Fetch config for staff/riders only
  useEffect(() => {
    if (!isStaff || !token) return;
    setConfigLoading(true);
    fetchProfileConfig(token)
      .then(setConfig)
      .finally(() => setConfigLoading(false));
  }, [isStaff, token]);

  const getFieldConfig = (key: string): FieldConfig | null => {
    if (!isStaff) {
      // Customers: show first_name, last_name, phone_number, address
      const customerFields: Record<string, FieldConfig> = {
        username:     { visible: true, editable: true, label: 'Username' },
        first_name:   { visible: true, editable: true, label: t('first_name', 'First Name') },
        last_name:    { visible: true, editable: true, label: t('last_name', 'Last Name') },
        phone_number: { visible: true, editable: true, label: 'Phone Number' },
        address:      { visible: true, editable: true, label: 'Delivery Address' },
      };
      return customerFields[key] ?? null;
    }
    return config?.[key] ?? null;
  };

  const visibleFields = ALL_FIELDS.filter(({ key }) => {
    const cfg = getFieldConfig(key);
    return cfg?.visible === true;
  });

  const handleUpdate = async () => {
    const payload: Record<string, string> = {};
    visibleFields.forEach(({ key }) => {
      const cfg = getFieldConfig(key);
      if (cfg?.editable && EDITABLE_KEYS.has(key)) {
        payload[key] = form[key] ?? '';
      }
    });
    try {
      await updateProfile(payload);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleCancelEdit = () => {
    if (!user) return;
    const reset: Record<string, string> = {};
    ALL_FIELDS.forEach(({ key }) => { reset[key] = String((user as any)[key] ?? ''); });
    setForm(reset);
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields'); return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match'); return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters'); return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword(token!, oldPassword, newPassword);
      setShowPasswordModal(false);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (e: any) {
      let message = 'Failed to change password';
      try {
        const err = JSON.parse(e.message);
        message = err.detail || err.old_password?.[0] || err.new_password?.[0] || message;
      } catch { message = e.message; }
      Alert.alert('Error', message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const hasAnyEditable = visibleFields.some(({ key }) => {
    const cfg = getFieldConfig(key);
    return cfg?.editable && EDITABLE_KEYS.has(key);
  });

  if (configLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {(user?.first_name || user?.username)?.charAt(0).toUpperCase()}
          </Text>
        </View>
        {(user?.first_name || user?.last_name) ? (
          <>
            <Text style={styles.fullName}>
              {[user.first_name, user.last_name].filter(Boolean).join(' ')}
            </Text>
            <Text style={styles.usernameSubtitle}>@{user.username}</Text>
          </>
        ) : (
          <Text style={styles.fullName}>{user?.username}</Text>
        )}
        <Text style={styles.email}>{user?.email}</Text>
        {isStaff && user?.user_type && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {user.user_type === 'delivery_boy' ? 'Rider' : 'Staff'}
            </Text>
          </View>
        )}
      </View>

      {/* Profile fields */}
      {visibleFields.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('personal_info', 'Personal Information')}</Text>
            {hasAnyEditable && (
              <TouchableOpacity onPress={isEditing ? handleCancelEdit : () => setIsEditing(true)}>
                <Ionicons name={isEditing ? 'close' : 'create-outline'} size={24} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>

          {visibleFields.map(({ key, multiline, keyboard }) => {
            const cfg = getFieldConfig(key)!;
            const isFieldEditable = isEditing && cfg.editable && EDITABLE_KEYS.has(key);
            return (
              <View key={key} style={styles.formGroup}>
                <Text style={styles.label}>{cfg.label}</Text>
                <TextInput
                  style={[
                    styles.input,
                    multiline && styles.multilineInput,
                    !isFieldEditable && styles.disabledInput,
                  ]}
                  value={form[key] ?? ''}
                  onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                  editable={isFieldEditable}
                  placeholder={isFieldEditable ? cfg.label : '—'}
                  multiline={multiline}
                  numberOfLines={multiline ? 2 : 1}
                  keyboardType={keyboard ?? 'default'}
                />
              </View>
            );
          })}

          {isEditing && (
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
              <Text style={styles.saveButtonText}>{t('save_changes', 'Save Changes')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Language */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('language_settings', 'Language Settings')}</Text>
        </View>
        <View style={styles.languageContainer}>
          {(['en', 'ur'] as const).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langButton, language === lang && styles.activeLang]}
              onPress={() => setLanguage(lang)}
            >
              <Text style={[styles.langText, language === lang && styles.activeLangText]}>
                {lang === 'en' ? 'English' : 'اردو'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Complaints')}>
          <Ionicons name="chatbubbles-outline" size={24} color="#333" />
          <Text style={styles.menuItemText}>{t('support_complaints', 'Support & Complaints')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)}>
          <Ionicons name="lock-closed-outline" size={24} color="#333" />
          <Text style={styles.menuItemText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>{t('logout', 'Logout')}</Text>
        </TouchableOpacity>
      </View>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => { setShowPasswordModal(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {[
              { label: 'Current Password', val: oldPassword, set: setOldPassword },
              { label: 'New Password', val: newPassword, set: setNewPassword },
              { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword },
            ].map(({ label, val, set }) => (
              <View key={label} style={styles.formGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={val}
                  onChangeText={set}
                  secureTextEntry
                  placeholder={label}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.saveButton, passwordLoading && styles.disabledButton]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              <Text style={styles.saveButtonText}>
                {passwordLoading ? 'Updating…' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', padding: 20, backgroundColor: '#fff', marginBottom: 10 },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  fullName: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  usernameSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  email: { color: '#666', marginTop: 4 },
  typeBadge: {
    marginTop: 8, backgroundColor: '#e8f0fe', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  typeBadgeText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },
  section: { backgroundColor: '#fff', padding: 20, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  formGroup: { marginBottom: 15 },
  label: { color: '#666', marginBottom: 5, fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 16, color: '#000', backgroundColor: '#fff',
  },
  multilineInput: { minHeight: 60, textAlignVertical: 'top' },
  disabledInput: { backgroundColor: '#f9f9f9', color: '#333', borderColor: 'transparent' },
  saveButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledButton: { backgroundColor: '#a0c4ff' },
  languageContainer: { flexDirection: 'row', marginTop: 10, backgroundColor: '#eee', borderRadius: 8, padding: 4 },
  langButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  activeLang: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
  langText: { fontSize: 14, color: '#666', fontWeight: '500' },
  activeLangText: { color: '#007AFF', fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 },
  menuItemText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333' },
  logoutButton: { padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FF3B30', marginTop: 10 },
  logoutButtonText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
});
