import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminService, AdminCustomer, DeliveryBoy } from '../../services/adminService';

type CustomerMode = 'existing' | 'guest';

interface CartItem {
  product: { id: number; name: string; price: string };
  quantity: number;
}

const PAYMENT_METHODS = ['COD', 'JazzCash', 'EasyPaisa'];

export const AdminCreateOrderScreen: React.FC = () => {
  const navigation = useNavigation();

  const [mode, setMode] = useState<CustomerMode>('existing');
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string; price: string; is_active: boolean }[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    Promise.all([
      adminService.getCustomers(),
      adminService.getProducts(),
      adminService.getDeliveryBoys(),
    ]).then(([c, p, d]) => {
      setCustomers(c);
      setProducts(p.filter(pr => pr.is_active));
      setDeliveryBoys(d);
    }).catch(() => {
      Alert.alert('Error', 'Failed to load data.');
    }).finally(() => setLoadingData(false));
  }, []);

  // Auto-fill address when customer selected
  useEffect(() => {
    if (selectedCustomerId) {
      const c = customers.find(c => c.id === selectedCustomerId);
      if (c?.address) setAddress(c.address);
    }
  }, [selectedCustomerId, customers]);

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0));
  };

  const total = cart.reduce((sum, c) => sum + parseFloat(c.product.price) * c.quantity, 0);

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(customerSearch)) ||
        (c.address && c.address.toLowerCase().includes(customerSearch.toLowerCase()))
      )
    : customers;

  const submit = async () => {
    if (cart.length === 0) { Alert.alert('Error', 'Add at least one product.'); return; }
    if (!address.trim()) { Alert.alert('Error', 'Delivery address is required.'); return; }
    if (mode === 'guest' && !guestName.trim()) { Alert.alert('Error', 'Guest name is required.'); return; }

    const payload: any = {
      shipping_address: address,
      payment_method: paymentMethod,
      payment_number: paymentNumber || undefined,
      assigned_delivery_boy: selectedRiderId || null,
      delivery_notes: deliveryNotes || undefined,
      status: 'Processing',
      items: cart.map(c => ({ product_id: c.product.id, quantity: c.quantity })),
    };

    if (mode === 'existing' && selectedCustomerId) {
      payload.user_id = selectedCustomerId;
    } else {
      payload.guest_name = guestName;
      payload.guest_phone = guestPhone || undefined;
    }

    setSaving(true);
    try {
      await adminService.createOrder(payload);
      Alert.alert('Success', 'Order created successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create order.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <LoadingScreen message="Loading data…" />
    );
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

      {/* Customer mode toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.modeRow}>
          {(['existing', 'guest'] as CustomerMode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
            >
              <Ionicons name={m === 'existing' ? 'person' : 'call'} size={15} color={mode === m ? 'white' : '#555'} />
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'existing' ? 'Registered User' : 'Guest / Call-in'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'existing' ? (
          <View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, or address…"
              value={customerSearch}
              onChangeText={setCustomerSearch}
              placeholderTextColor="#aaa"
            />
            <ScrollView style={styles.customerList} nestedScrollEnabled>
              {filteredCustomers.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.customerItem, selectedCustomerId === c.id && styles.customerItemSelected]}
                  onPress={() => setSelectedCustomerId(c.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.customerItemName}>{c.name}</Text>
                    {c.phone && <Text style={styles.customerItemSub}>{c.phone}</Text>}
                    {c.address && <Text style={styles.customerItemSub} numberOfLines={1}>{c.address}</Text>}
                  </View>
                  {selectedCustomerId === c.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
              {filteredCustomers.length === 0 && (
                <Text style={styles.emptyText}>No customers found</Text>
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.guestFields}>
            <TextInput
              style={styles.input}
              placeholder="Customer name *"
              value={guestName}
              onChangeText={setGuestName}
              placeholderTextColor="#aaa"
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#aaa"
            />
          </View>
        )}
      </View>

      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address *</Text>
        <TextInput
          style={[styles.input, styles.addressInput]}
          placeholder="House #, Street, Area…"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={2}
          placeholderTextColor="#aaa"
          textAlignVertical="top"
        />
      </View>

      {/* Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Products</Text>
        <View style={styles.productGrid}>
          {products.map(p => {
            const inCart = cart.find(c => c.product.id === p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.productCard, inCart && styles.productCardSelected]}
                onPress={() => addToCart(p)}
              >
                <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.productPrice}>PKR {parseFloat(p.price).toLocaleString()}</Text>
                {inCart && <Text style={styles.inCartLabel}>×{inCart.quantity} added</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {cart.length > 0 && (
          <View style={styles.cart}>
            <Text style={styles.cartTitle}>Cart</Text>
            {cart.map(({ product, quantity }) => (
              <View key={product.id} style={styles.cartRow}>
                <Text style={styles.cartItemName} numberOfLines={1}>{product.name}</Text>
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(product.id, -1)}>
                    <Ionicons name="remove" size={14} color="#333" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQty(product.id, 1)}>
                    <Ionicons name="add" size={14} color="#333" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemPrice}>
                  PKR {(parseFloat(product.price) * quantity).toLocaleString()}
                </Text>
              </View>
            ))}
            <View style={styles.cartTotal}>
              <Text style={styles.cartTotalLabel}>Total</Text>
              <Text style={styles.cartTotalValue}>PKR {total.toLocaleString()}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Payment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_METHODS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.paymentBtn, paymentMethod === m && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod(m)}
            >
              <Text style={[styles.paymentBtnText, paymentMethod === m && styles.paymentBtnTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {paymentMethod !== 'COD' && (
          <TextInput
            style={styles.input}
            placeholder="Payment number"
            value={paymentNumber}
            onChangeText={setPaymentNumber}
            keyboardType="phone-pad"
            placeholderTextColor="#aaa"
          />
        )}
      </View>

      {/* Rider */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assign Rider (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.riderRow}>
            <TouchableOpacity
              style={[styles.riderChip, !selectedRiderId && styles.riderChipActive]}
              onPress={() => setSelectedRiderId(null)}
            >
              <Text style={[styles.riderChipText, !selectedRiderId && styles.riderChipTextActive]}>
                Assign later
              </Text>
            </TouchableOpacity>
            {deliveryBoys.map(db => (
              <TouchableOpacity
                key={db.id}
                style={[styles.riderChip, selectedRiderId === db.id && styles.riderChipActive]}
                onPress={() => setSelectedRiderId(db.id)}
              >
                <Text style={[styles.riderChipText, selectedRiderId === db.id && styles.riderChipTextActive]}>
                  {db.name} {db.is_available ? '🟢' : '🔴'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Notes (optional)</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          placeholder="Special instructions…"
          value={deliveryNotes}
          onChangeText={setDeliveryNotes}
          multiline
          placeholderTextColor="#aaa"
        />
      </View>

      {/* Submit */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.submitBtnText}>Create Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#888' },
  section: {
    backgroundColor: 'white', margin: 12, marginBottom: 0,
    borderRadius: 12, padding: 16,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: 'white',
  },
  modeBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  modeBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
  modeBtnTextActive: { color: 'white' },
  searchInput: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10,
    fontSize: 14, color: '#333', marginBottom: 8,
  },
  customerList: { maxHeight: 200 },
  customerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#eee', marginBottom: 6,
  },
  customerItemSelected: { borderColor: '#007AFF', backgroundColor: '#007AFF08' },
  customerItemName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  customerItemSub: { fontSize: 12, color: '#888', marginTop: 1 },
  guestFields: { gap: 10 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 11, fontSize: 14, color: '#333', backgroundColor: '#fafafa',
  },
  addressInput: { minHeight: 60, textAlignVertical: 'top' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productCard: {
    width: '47%', borderRadius: 10, borderWidth: 1.5,
    borderColor: '#e0e0e0', padding: 10, backgroundColor: 'white',
  },
  productCardSelected: { borderColor: '#007AFF', backgroundColor: '#007AFF08' },
  productName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  productPrice: { fontSize: 12, color: '#555' },
  inCartLabel: { fontSize: 11, color: '#007AFF', fontWeight: '700', marginTop: 4 },
  cart: {
    marginTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12,
  },
  cartTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  cartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  cartItemName: { flex: 1, fontSize: 13, color: '#333' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  qtyText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', width: 20, textAlign: 'center' },
  cartItemPrice: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', width: 80, textAlign: 'right' },
  cartTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 4,
  },
  cartTotalLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
  cartTotalValue: { fontSize: 14, fontWeight: '700', color: '#007AFF' },
  paymentRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  paymentBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  paymentBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  paymentBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
  paymentBtnTextActive: { color: 'white' },
  riderRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  riderChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white',
  },
  riderChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  riderChipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  riderChipTextActive: { color: 'white' },
  submitBtn: {
    backgroundColor: '#007AFF', borderRadius: 12,
    paddingVertical: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnDisabled: { backgroundColor: '#ccc' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#aaa', paddingVertical: 12, fontSize: 14 },
});
