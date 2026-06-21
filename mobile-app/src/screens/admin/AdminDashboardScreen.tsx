import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { adminService, AdminSummary } from '../../services/adminService';
import { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  onPress?: () => void;
}

function StatCard({ label, value, icon, color, bg, onPress }: StatCardProps) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: bg }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {onPress && <Ionicons name="chevron-forward" size={12} color={color} style={{ marginTop: 2 }} />}
    </TouchableOpacity>
  );
}

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useContext(AuthContext);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminService.getSummary();
      setSummary(data);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return <LoadingScreen message="Loading dashboard…" />;
  }

  const name = user?.first_name || user?.username || 'Admin';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#007AFF" />
          <Text style={styles.headerBadgeText}>Admin</Text>
        </View>
      </View>

      {/* Today's summary */}
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>Today</Text>
        <View style={styles.todayRow}>
          <View style={styles.todayStat}>
            <Text style={styles.todayValue}>{summary?.today_orders ?? 0}</Text>
            <Text style={styles.todayLabel}>Orders</Text>
          </View>
          <View style={styles.todayDivider} />
          <View style={styles.todayStat}>
            <Text style={styles.todayValue}>
              PKR {(summary?.today_revenue ?? 0).toLocaleString()}
            </Text>
            <Text style={styles.todayLabel}>Revenue</Text>
          </View>
        </View>
      </View>

      {/* Order stats grid */}
      <Text style={styles.sectionTitle}>Order Status</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Total" value={summary?.total ?? 0} icon="list" color="#007AFF" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'All' } })}
        />
        <StatCard
          label="Pending" value={summary?.pending ?? 0} icon="time" color="#FF9500" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'Pending' } })}
        />
        <StatCard
          label="Processing" value={summary?.processing ?? 0} icon="refresh" color="#5856D6" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'Processing' } })}
        />
        <StatCard
          label="Shipped" value={summary?.shipped ?? 0} icon="car" color="#32ADE6" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'Shipped' } })}
        />
        <StatCard
          label="Delivered" value={summary?.delivered ?? 0} icon="checkmark-circle" color="#34C759" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'Delivered' } })}
        />
        <StatCard
          label="Cancelled" value={summary?.cancelled ?? 0} icon="close-circle" color="#FF3B30" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'Cancelled' } })}
        />
      </View>

      {/* Payment stats */}
      <Text style={styles.sectionTitle}>Payments</Text>
      <View style={styles.statsGrid}>
        <StatCard
          label="Paid" value={summary?.paid_count ?? 0} icon="card" color="#34C759" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'All', initialPaid: true } })}
        />
        <StatCard
          label="Unpaid" value={summary?.unpaid_count ?? 0} icon="alert-circle" color="#FF3B30" bg="#fff"
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders', params: { initialStatus: 'All', initialPaid: false } })}
        />
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('AdminCreateOrder')}
        >
          <Ionicons name="add-circle" size={28} color="#007AFF" />
          <Text style={styles.actionLabel}>New Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminOrders' })}
        >
          <Ionicons name="list" size={28} color="#5856D6" />
          <Text style={styles.actionLabel}>All Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => (navigation as any).navigate('AdminTabs', { screen: 'AdminCustomers' })}
        >
          <Ionicons name="people" size={28} color="#FF9500" />
          <Text style={styles.actionLabel}>Customers</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 16,
    marginBottom: 12,
  },
  greeting: { fontSize: 13, color: '#888' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#007AFF15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  todayCard: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  todayTitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayStat: { flex: 1, alignItems: 'center' },
  todayValue: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  todayLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  todayDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    width: '30%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'center' },
});
