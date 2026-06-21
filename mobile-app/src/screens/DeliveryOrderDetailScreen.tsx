import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { updateOrderStatus, getDeliveryStatuses, DeliveryStatus } from '../services/orderService';

interface RouteParams {
  order: any;
}

type PaymentMode = 'none' | 'cash' | 'online';

const PAYMENT_OPTIONS: { key: PaymentMode; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'none',   label: 'No Payment',    icon: 'remove-circle-outline', color: '#999',    bg: '#f5f5f5' },
  { key: 'cash',   label: 'Cash',          icon: 'cash-outline',          color: '#2ecc71', bg: '#eafaf1' },
  { key: 'online', label: 'Online / Transfer', icon: 'phone-portrait-outline', color: '#007AFF', bg: '#e8f0fe' },
];

export const DeliveryOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { order } = route.params as RouteParams;

  const isStatusLocked = !!(order.delivery_status_updated_at);
  const totalBottles = order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);
  const [deliveryStatus, setDeliveryStatus] = useState(order.delivery_status || 'Pending');

  // Payment
  const initPaymentMode = (): PaymentMode => {
    if (order.is_paid && !order.cash_received) return 'online';
    if (order.cash_received) return 'cash';
    return 'none';
  };
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initPaymentMode);
  const [amount, setAmount] = useState(order.cash_amount?.toString() || order.total_price?.toString() || '');

  const [notes, setNotes] = useState(order.delivery_notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDeliveryStatuses()
      .then(setDeliveryStatuses)
      .catch(() => Alert.alert('Error', 'Failed to load delivery statuses'))
      .finally(() => setLoadingStatuses(false));
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let updateData: any;
      if (isStatusLocked) {
        updateData = { delivery_notes: notes };
      } else {
        updateData = {
          number_of_bottles: totalBottles,
          delivery_status: deliveryStatus,
          delivery_notes: notes,
          cash_received: paymentMode === 'cash',
          cash_amount: (paymentMode === 'cash' || paymentMode === 'online') ? (parseFloat(amount) || 0) : 0,
          is_paid: paymentMode === 'online',
        };
      }
      await updateOrderStatus(order.id, order.status, updateData);
      Alert.alert('Success', isStatusLocked ? 'Notes updated' : 'Order updated', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update order');
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* ── Address hero ─────────────────────────────────────────── */}
      <View style={styles.addressCard}>
        <View style={styles.addressIconWrap}>
          <Ionicons name="location" size={22} color="#fff" />
        </View>
        <View style={styles.addressBody}>
          <Text style={styles.addressLabel}>Delivery Address</Text>
          <Text style={styles.addressText}>{order.shipping_address || '—'}</Text>
        </View>
      </View>

      {/* ── Order summary ─────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.orderHeaderRow}>
          <Text style={styles.orderId}>Order #{order.id}</Text>
          <Text style={styles.orderAmount}>PKR {order.total_price}</Text>
        </View>
        <Text style={styles.customerText}>
          <Ionicons name="person-outline" size={13} color="#999" /> {order.user}
        </Text>
      </View>

      {/* ── Products ─────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Products</Text>
        {order.items?.map((item: any, idx: number) => (
          <View key={idx} style={styles.productRow}>
            <Text style={styles.productText}>
              {item.quantity}× {item.product_details?.name || 'Unknown'}
            </Text>
            <Text style={styles.productPrice}>PKR {item.price}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.productRow}>
          <Text style={styles.totalLabel}>Total Bottles</Text>
          <Text style={styles.totalValue}>{totalBottles}</Text>
        </View>
      </View>

      {/* ── Delivery form ─────────────────────────────────────────── */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>

        {/* Locked warning */}
        {isStatusLocked && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Status Locked</Text>
              <Text style={styles.warningText}>
                You can only update notes after the first submission.
              </Text>
            </View>
          </View>
        )}

        {/* Delivery status */}
        {isStatusLocked ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Status</Text>
            <View style={styles.lockedStatus}>
              <Text style={styles.lockedStatusText}>{deliveryStatus}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Delivery Status</Text>
            {loadingStatuses ? (
              <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.buttonGroup}>
                {deliveryStatuses.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.statusButton,
                      { borderColor: s.border_color },
                      deliveryStatus === s.name && { backgroundColor: s.background_color, borderWidth: 2 },
                    ]}
                    onPress={() => setDeliveryStatus(s.name)}
                  >
                    <Text style={[
                      styles.statusButtonText,
                      deliveryStatus === s.name && { color: s.color, fontWeight: 'bold' },
                    ]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Payment mode */}
        {!isStatusLocked && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment Received</Text>
            <View style={styles.paymentRow}>
              {PAYMENT_OPTIONS.map((opt) => {
                const active = paymentMode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.paymentOption,
                      active && { backgroundColor: opt.bg, borderColor: opt.color, borderWidth: 2 },
                    ]}
                    onPress={() => setPaymentMode(opt.key)}
                  >
                    <Ionicons name={opt.icon as any} size={20} color={active ? opt.color : '#aaa'} />
                    <Text style={[styles.paymentLabel, active && { color: opt.color, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Amount — shown for cash or online */}
        {!isStatusLocked && paymentMode !== 'none' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {paymentMode === 'cash' ? 'Cash Amount (PKR)' : 'Transfer Amount (PKR)'}
            </Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
            />
          </View>
        )}

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{isStatusLocked ? 'Notes / Comments' : 'Notes (Optional)'}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder={isStatusLocked ? 'Add comments…' : 'Add any notes…'}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Updating…' : isStatusLocked ? 'Update Notes' : 'Submit Update'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },

  // Address hero
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#007AFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    elevation: 3,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addressIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 2,
  },
  addressBody: { flex: 1 },
  addressLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  addressText: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },

  // Cards
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, elevation: 1 },
  formCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 24, borderRadius: 12, padding: 16, elevation: 1 },

  orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  orderAmount: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71' },
  customerText: { fontSize: 13, color: '#888', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 14 },

  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  productText: { fontSize: 14, color: '#444', flex: 1 },
  productPrice: { fontSize: 14, fontWeight: '600', color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  totalValue: { fontSize: 15, fontWeight: 'bold', color: '#007AFF' },

  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  textArea: { height: 80, textAlignVertical: 'top' },

  // Payment options
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentOption: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', gap: 6,
  },
  paymentLabel: { fontSize: 11, fontWeight: '600', color: '#888', textAlign: 'center' },

  // Status buttons
  buttonGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1, borderColor: '#007AFF', backgroundColor: '#fff',
  },
  statusButtonText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },

  lockedStatus: { backgroundColor: '#e9ecef', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ced4da' },
  lockedStatusText: { fontSize: 15, color: '#495057', fontWeight: '600' },

  warningBox: {
    backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#ffc107',
    borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  warningIcon: { fontSize: 22 },
  warningTitle: { fontSize: 13, fontWeight: 'bold', color: '#856404', marginBottom: 2 },
  warningText: { fontSize: 12, color: '#856404', lineHeight: 17 },

  submitButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  submitButtonDisabled: { backgroundColor: '#a0c4ff' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
