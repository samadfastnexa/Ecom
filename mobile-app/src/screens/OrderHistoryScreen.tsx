import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { LoadingScreen } from '../components/LoadingScreen';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { getOrders, getDeliveryOrders, getDeliveryStatuses, Order, DeliveryStatus } from '../services/orderService';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

type Props = BottomTabScreenProps<MainTabParamList, 'Orders'>;

const STATUS_FILTERS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export const OrderHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useLanguage();
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveryStatuses, setDeliveryStatuses] = useState<DeliveryStatus[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>('All');
  const isDeliveryBoy = user?.user_type === 'delivery_boy';

  const fetchOrders = async () => {
    try {
      const data = isDeliveryBoy ? await getDeliveryOrders() : await getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDeliveryStatuses = async () => {
    if (!isDeliveryBoy) return;
    try {
      const statuses = await getDeliveryStatuses();
      setDeliveryStatuses(statuses);
    } catch (error) {
      console.error('Error fetching delivery statuses:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDeliveryStatuses();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading) {
        fetchOrders();
      }
    }, [isDeliveryBoy, loading])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#f39c12';
      case 'Processing': return '#3498db';
      case 'Shipped': return '#9b59b6';
      case 'Delivered': return '#2ecc71';
      case 'Cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getDeliveryStatusColor = (deliveryStatusName: string) => {
    const status = deliveryStatuses.find(s => s.name === deliveryStatusName);
    if (status) {
      return { bg: status.background_color, text: status.color, border: status.border_color };
    }
    return { bg: '#f0f8ff', text: '#007AFF', border: '#007AFF' };
  };

  const filteredOrders = selectedFilter === 'All'
    ? orders
    : orders.filter(o => o.status === selectedFilter);

  const renderFilterChips = () => {
    if (isDeliveryBoy) return null;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {STATUS_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              selectedFilter === filter && styles.filterChipActive,
              selectedFilter === filter && filter !== 'All' && { backgroundColor: getStatusColor(filter), borderColor: getStatusColor(filter) },
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter}
              {filter !== 'All' && orders.filter(o => o.status === filter).length > 0
                ? ` (${orders.filter(o => o.status === filter).length})`
                : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{t('order_number', 'Order #')}{item.id}</Text>
        <Text style={[styles.orderStatus, { color: getStatusColor(item.status) }]}>
          {t(`status_${item.status.toLowerCase()}`, item.status)}
        </Text>
      </View>

      <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>

      {isDeliveryBoy && item.delivery_status && (
        <View style={[
          styles.deliveryStatusBadge,
          {
            backgroundColor: getDeliveryStatusColor(item.delivery_status).bg,
            borderColor: getDeliveryStatusColor(item.delivery_status).border,
          }
        ]}>
          <Text style={[styles.deliveryStatusText, { color: getDeliveryStatusColor(item.delivery_status).text }]}>
            Delivery: {item.delivery_status}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      {item.items.map((product) => (
        <View key={product.id} style={styles.productRow}>
          <Text style={styles.productText}>
            {product.quantity} x {product.product_details?.name || t('unknown_product', 'Unknown Product')}
          </Text>
          <Text style={styles.productPrice}>PKR {product.price}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('total_amount', 'Total Amount')}</Text>
        <Text style={styles.totalAmount}>PKR {item.total_price}</Text>
      </View>

      {isDeliveryBoy && item.status !== 'Delivered' && item.status !== 'Cancelled' && (
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => (navigation as any).navigate('DeliveryOrderDetail', { order: item })}
        >
          <Text style={styles.updateButtonText}>{t('manage_delivery', 'Manage Delivery')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && orders.length === 0) {
    return <LoadingScreen message="Loading orders…" />;
  }

  const showEmpty = filteredOrders.length === 0;

  return (
    <View style={styles.container}>
      {renderFilterChips()}

      {showEmpty ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />
          }
        >
          <Text style={styles.emptyText}>
            {orders.length === 0
              ? isDeliveryBoy
                ? t('no_delivery_orders', 'No delivery orders assigned')
                : t('no_orders', 'No orders found')
              : `No ${selectedFilter.toLowerCase()} orders`}
          </Text>
          {!isDeliveryBoy && orders.length === 0 && (
            <TouchableOpacity style={styles.shopNowButton} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.shopNowText}>{t('start_shopping', 'Start Shopping')}</Text>
            </TouchableOpacity>
          )}
          {selectedFilter !== 'All' && (
            <TouchableOpacity style={styles.clearFilterButton} onPress={() => setSelectedFilter('All')}>
              <Text style={styles.clearFilterText}>Show all orders</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
              title="Pull to refresh"
              titleColor="#666"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexGrow: 0,
  },
  filterBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  productPrice: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  shopNowButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shopNowText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearFilterButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  clearFilterText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deliveryStatusBadge: {
    backgroundColor: '#f0f8ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  deliveryStatusText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
