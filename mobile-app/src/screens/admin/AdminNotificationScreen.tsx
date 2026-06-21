import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/config';
import { getAuthToken } from '../../services/authService';

type RecipientType = 'all' | 'customers' | 'riders';

interface Recipient {
  key: RecipientType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const RECIPIENTS: Recipient[] = [
  {
    key: 'all',
    label: 'Everyone',
    description: 'All customers and delivery staff',
    icon: 'people',
    color: '#007AFF',
  },
  {
    key: 'customers',
    label: 'Customers Only',
    description: 'All registered customers',
    icon: 'person',
    color: '#34C759',
  },
  {
    key: 'riders',
    label: 'Delivery Boys Only',
    description: 'All delivery staff members',
    icon: 'bicycle',
    color: '#FF9500',
  },
];

export const AdminNotificationScreen: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipient, setRecipient] = useState<RecipientType>('all');
  const [sending, setSending] = useState(false);

  const selectedRecipient = RECIPIENTS.find((r) => r.key === recipient)!;

  const handleSend = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      Alert.alert('Missing Title', 'Please enter a notification title.');
      return;
    }
    if (!trimmedBody) {
      Alert.alert('Missing Message', 'Please enter a notification message.');
      return;
    }

    Alert.alert(
      'Send Notification',
      `Send "${trimmedTitle}" to ${selectedRecipient.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              const token = await getAuthToken();
              const res = await fetch(`${API_URL}/auth/admin/notifications/send/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  title: trimmedTitle,
                  body: trimmedBody,
                  recipient_type: recipient,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(JSON.stringify(data));

              const { sent, total_tokens } = data as { sent: number; total_tokens: number };
              Alert.alert(
                'Notification Sent',
                total_tokens === 0
                  ? 'No devices found with push notifications enabled.'
                  : `Sent to ${sent} of ${total_tokens} device${total_tokens !== 1 ? 's' : ''}.`,
                [{ text: 'OK', onPress: () => { setTitle(''); setBody(''); } }],
              );
            } catch (e: any) {
              Alert.alert('Error', 'Failed to send notification. Check your connection.');
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Recipients */}
        <Text style={styles.sectionLabel}>SEND TO</Text>
        <View style={styles.card}>
          {RECIPIENTS.map((r, idx) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.recipientRow,
                idx < RECIPIENTS.length - 1 && styles.rowDivider,
                recipient === r.key && styles.recipientRowActive,
              ]}
              onPress={() => setRecipient(r.key)}
              activeOpacity={0.7}
            >
              <View style={[styles.recipientIcon, { backgroundColor: r.color + '18' }]}>
                <Ionicons name={r.icon} size={20} color={r.color} />
              </View>
              <View style={styles.recipientText}>
                <Text style={styles.recipientLabel}>{r.label}</Text>
                <Text style={styles.recipientDesc}>{r.description}</Text>
              </View>
              <View style={[styles.radio, recipient === r.key && { borderColor: r.color }]}>
                {recipient === r.key && (
                  <View style={[styles.radioDot, { backgroundColor: r.color }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Message composer */}
        <Text style={styles.sectionLabel}>MESSAGE</Text>
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. New offer available!"
              placeholderTextColor="#bbb"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              returnKeyType="next"
            />
            <Text style={styles.charCount}>{title.length}/80</Text>
          </View>
          <View style={styles.inputDivider} />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter notification message…"
              placeholderTextColor="#bbb"
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{body.length}/300</Text>
          </View>
        </View>

        {/* Preview */}
        {(title.trim() || body.trim()) ? (
          <>
            <Text style={styles.sectionLabel}>PREVIEW</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="notifications" size={16} color="#007AFF" />
                <Text style={styles.previewApp}>Century Sip</Text>
                <Text style={styles.previewTime}>now</Text>
              </View>
              {title.trim() ? (
                <Text style={styles.previewTitle}>{title.trim()}</Text>
              ) : null}
              {body.trim() ? (
                <Text style={styles.previewBody} numberOfLines={3}>{body.trim()}</Text>
              ) : null}
            </View>
          </>
        ) : null}

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: selectedRecipient.color },
            sending && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="white" />
              <Text style={styles.sendBtnText}>Send to {selectedRecipient.label}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  recipientRowActive: {
    backgroundColor: '#f8f9ff',
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  recipientIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientText: { flex: 1 },
  recipientLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  recipientDesc: { fontSize: 12, color: '#888', marginTop: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  inputRow: { padding: 14 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.5, marginBottom: 6 },
  input: { fontSize: 15, color: '#1a1a1a', minHeight: 24 },
  textArea: { minHeight: 80 },
  charCount: { fontSize: 11, color: '#ccc', textAlign: 'right', marginTop: 4 },
  inputDivider: { height: 1, backgroundColor: '#f5f5f5', marginHorizontal: 14 },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewApp: { flex: 1, fontSize: 12, fontWeight: '700', color: '#555' },
  previewTime: { fontSize: 11, color: '#bbb' },
  previewTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 3 },
  previewBody: { fontSize: 13, color: '#555', lineHeight: 18 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: 'white' },
});
