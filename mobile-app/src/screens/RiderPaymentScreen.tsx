import React, { useCallback, useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Share, Alert, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  PaymentDetails, businessService, formatPaymentDetails,
} from '../services/businessService';

const BRAND_BLUE = '#0A84FF';
const PAGE_BG = '#F4F6F8';

/**
 * What a rider shows a customer who wants to pay by transfer instead of cash.
 *
 * Its own screen rather than a section inside the delivery form: it gets held
 * up for someone else to read and scan, so it has to be reachable in one tap
 * and carry nothing that is none of the customer's business — no order totals,
 * no other stops, no balances.
 */
export const RiderPaymentScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    try {
      setDetails(await businessService.paymentDetails());
      setError(null);
    } catch (e: any) {
      // Keep whatever is already on screen: a rider mid-doorstep would rather
      // read slightly stale account details than a blank error page.
      setError(e?.message || 'Could not load the payment details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-read on focus so an account changed in the office reaches the rider
  // without them restarting the app.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const share = async () => {
    if (!details) return;
    try {
      await Share.share({ message: formatPaymentDetails(details) });
    } catch {
      Alert.alert('Could not share', 'The share sheet did not open.');
    }
  };

  if (loading && !details) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND_BLUE} />
      </View>
    );
  }

  // The QR is square and is meant to be scanned from across a doorstep, so it
  // takes as much width as the page allows rather than a fixed size.
  const qrSize = Math.min(width - 72, 320);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={BRAND_BLUE} />
      }
    >
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={16} color="#8a6100" />
          <Text style={styles.errorText}>{error} Pull down to try again.</Text>
        </View>
      )}

      {details && !details.has_payment_details ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={44} color="#c2c8ce" />
          <Text style={styles.emptyTitle}>No online payment set up</Text>
          <Text style={styles.emptyBody}>
            The office has not added an account yet. Take cash for now, and ask
            them to fill it in under Settings.
          </Text>
        </View>
      ) : details ? (
        <>
          <Text style={styles.pageTitle}>Pay {details.name}</Text>
          <Text style={styles.pageSub}>Show this to the customer to take a transfer.</Text>

          {!!details.payment_qr && (
            <View style={styles.qrCard}>
              <Image
                source={{ uri: details.payment_qr }}
                style={{ width: qrSize, height: qrSize }}
                resizeMode="contain"
                accessibilityLabel="Payment QR code"
              />
              <Text style={styles.qrCaption}>Scan to pay</Text>
            </View>
          )}

          <View style={styles.detailCard}>
            {!!details.payment_bank_name && (
              <Row label="Bank" value={details.payment_bank_name} />
            )}
            {!!details.payment_account_title && (
              <Row label="Account title" value={details.payment_account_title} divided />
            )}
            {!!details.payment_account_number && (
              <Row label="Account number" value={details.payment_account_number} divided mono />
            )}
          </View>

          {!!details.payment_instructions && (
            <View style={styles.noteBox}>
              <Ionicons name="information-circle" size={16} color="#8a6100" />
              <Text style={styles.noteText}>{details.payment_instructions}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.shareBtn} onPress={share} activeOpacity={0.9}>
            <Ionicons name="share-social" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Send details to customer</Text>
          </TouchableOpacity>

          <Text style={styles.footnote}>
            Record the payment on the delivery as an online payment, not as cash —
            only cash has to be handed in at the end of your shift.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
};

const Row = ({ label, value, divided, mono }: {
  label: string; value: string; divided?: boolean; mono?: boolean;
}) => (
  <View style={[styles.row, divided && styles.rowDivided]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, mono && styles.rowValueMono]} selectable>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  content: { padding: 18, paddingBottom: 96 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PAGE_BG },

  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a2530' },
  pageSub: { fontSize: 13.5, color: '#8a929b', marginTop: 4, marginBottom: 18 },

  qrCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#0D1B2A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  qrCaption: { fontSize: 13, color: '#8a929b', marginTop: 12, fontWeight: '600' },

  detailCard: {
    backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16,
    shadowColor: '#0D1B2A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  row: { paddingVertical: 14 },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e9edf1' },
  rowLabel: { fontSize: 12, color: '#8a929b', fontWeight: '600', marginBottom: 4 },
  rowValue: { fontSize: 16, color: '#1a2530', fontWeight: '600' },
  // Account numbers are read aloud and copied digit by digit, so they get
  // tabular figures and a little more tracking.
  rowValueMono: { fontVariant: ['tabular-nums'], letterSpacing: 0.6, fontSize: 17 },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF8E5', borderWidth: 1, borderColor: '#FFE2A8',
    borderRadius: 12, padding: 12, marginTop: 14,
  },
  noteText: { flex: 1, fontSize: 13, color: '#8a6100', lineHeight: 18 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E5', borderWidth: 1, borderColor: '#FFE2A8',
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#8a6100', lineHeight: 18 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND_BLUE, borderRadius: 14, paddingVertical: 15, marginTop: 18,
    shadowColor: BRAND_BLUE, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3, shadowRadius: 9, elevation: 5,
  },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footnote: { fontSize: 12, color: '#8a929b', lineHeight: 17, marginTop: 16, textAlign: 'center' },

  emptyCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 28,
    alignItems: 'center', gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a2530' },
  emptyBody: { fontSize: 13.5, color: '#8a929b', textAlign: 'center', lineHeight: 19 },
});
