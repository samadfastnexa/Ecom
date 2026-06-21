import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useCart } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { createOrder, getOrders } from '../services/orderService';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export const CheckoutScreen: React.FC<Props> = ({ navigation }) => {
  const { items, getCartTotal, clearCart } = useCart();
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();

  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const total = getCartTotal();

  // Collect unique saved addresses: profile address + up to 3 recent order addresses
  useEffect(() => {
    const loadAddresses = async () => {
      const addresses: string[] = [];

      if (user?.address?.trim()) {
        addresses.push(user.address.trim());
      }

      try {
        const orders = await getOrders();
        for (const order of orders) {
          const addr = order.shipping_address?.trim();
          if (addr && !addresses.includes(addr)) {
            addresses.push(addr);
            if (addresses.length >= 4) break;
          }
        }
      } catch {
        // ignore — order history is optional
      }

      setSavedAddresses(addresses);

      // Auto-fill profile address if the field is still empty
      if (!shippingAddress && addresses.length > 0) {
        setShippingAddress(addresses[0]);
      }
    };

    loadAddresses();
  }, [user]);

  const handlePlaceOrder = async () => {
    if (!shippingAddress.trim()) {
      Alert.alert(t('error', 'Error'), t('error_address', 'Please enter a shipping address'));
      return;
    }

    if ((paymentMethod === 'JazzCash' || paymentMethod === 'EasyPaisa') && !mobileNumber.trim()) {
      Alert.alert(t('error', 'Error'), `Please enter your ${paymentMethod} mobile number`);
      return;
    }

    if (items.length === 0) {
      Alert.alert(t('error', 'Error'), t('error_cart_empty', 'Your cart is empty'));
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })),
        total_price: total,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        payment_number: mobileNumber,
      };

      const createdOrder = await createOrder(orderPayload);
      clearCart();

      navigation.replace('OrderSuccess', {
        orderId: createdOrder.id,
        total,
        paymentMethod,
      });
    } catch (error: any) {
      Alert.alert(t('error', 'Error'), error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentOption = (id: string, label: string, color: string) => (
    <TouchableOpacity
      key={id}
      style={[
        styles.paymentOption,
        paymentMethod === id && styles.selectedPaymentOption,
        { borderColor: paymentMethod === id ? color : '#e0e0e0' },
      ]}
      onPress={() => setPaymentMethod(id)}
    >
      <View style={[styles.radio, paymentMethod === id && { borderColor: color }]}>
        {paymentMethod === id && <View style={[styles.radioInner, { backgroundColor: color }]} />}
      </View>
      <Text style={[styles.paymentLabel, paymentMethod === id && { color, fontWeight: 'bold' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('order_summary', 'Order Summary')}</Text>
        {items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemText}>{item.quantity} × {item.name}</Text>
            <Text style={styles.itemPrice}>PKR {(parseFloat(item.price) * item.quantity).toFixed(2)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('cart_total', 'Total')}</Text>
          <Text style={styles.totalAmount}>PKR {total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('shipping_address', 'Shipping Address')}</Text>

        {/* Saved address chips */}
        {savedAddresses.length > 0 && (
          <View style={styles.addressChipsWrapper}>
            <TouchableOpacity
              style={styles.addressPickerToggle}
              onPress={() => setShowAddressPicker(v => !v)}
            >
              <Ionicons name="bookmark-outline" size={16} color="#007AFF" />
              <Text style={styles.addressPickerToggleText}>
                {showAddressPicker ? 'Hide saved addresses' : 'Use a saved address'}
              </Text>
              <Ionicons
                name={showAddressPicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#007AFF"
              />
            </TouchableOpacity>

            {showAddressPicker && (
              <View style={styles.addressChipsList}>
                {savedAddresses.map((addr, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.addressChip,
                      shippingAddress === addr && styles.addressChipSelected,
                    ]}
                    onPress={() => {
                      setShippingAddress(addr);
                      setShowAddressPicker(false);
                    }}
                  >
                    <Ionicons
                      name={i === 0 && user?.address?.trim() === addr ? 'person-outline' : 'time-outline'}
                      size={14}
                      color={shippingAddress === addr ? '#007AFF' : '#666'}
                    />
                    <Text
                      style={[
                        styles.addressChipText,
                        shippingAddress === addr && styles.addressChipTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {addr}
                    </Text>
                    {shippingAddress === addr && (
                      <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <TextInput
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholder={t('enter_address_placeholder', 'Enter your full delivery address')}
          value={shippingAddress}
          onChangeText={setShippingAddress}
        />
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('payment_method', 'Payment Method')}</Text>

        {renderPaymentOption('COD', t('cod_label', 'Cash on Delivery'), '#2ecc71')}
        {renderPaymentOption('JazzCash', 'JazzCash', '#e74c3c')}
        {renderPaymentOption('EasyPaisa', 'EasyPaisa', '#27ae60')}

        {(paymentMethod === 'JazzCash' || paymentMethod === 'EasyPaisa') && (
          <View style={styles.mobileInputContainer}>
            <Text style={styles.inputLabel}>{t('mobile_number_label', 'Mobile Number')}</Text>
            <TextInput
              style={styles.mobileInput}
              placeholder={t('mobile_placeholder', '03XXXXXXXXX')}
              keyboardType="phone-pad"
              value={mobileNumber}
              onChangeText={setMobileNumber}
              maxLength={11}
            />
            <Text style={styles.helperText}>
              Enter your {paymentMethod} account number. You will receive a payment prompt on your phone.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.placeOrderButton, loading && styles.disabledButton]}
        onPress={handlePlaceOrder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.placeOrderText}>
            {paymentMethod === 'COD'
              ? t('place_order', 'Place Order')
              : `${t('pay_via', 'Pay via')} ${paymentMethod}`}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  addressChipsWrapper: {
    marginBottom: 12,
  },
  addressPickerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  addressPickerToggleText: {
    flex: 1,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addressChipsList: {
    marginTop: 4,
    gap: 8,
  },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    gap: 8,
  },
  addressChipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#EBF4FF',
  },
  addressChipText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  addressChipTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
    color: '#333',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  selectedPaymentOption: {
    backgroundColor: '#fff',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#aaa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentLabel: {
    fontSize: 16,
    color: '#333',
  },
  mobileInputContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  mobileInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    lineHeight: 17,
  },
  placeOrderButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#a0c4ff',
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  spacer: {
    height: 40,
  },
});
