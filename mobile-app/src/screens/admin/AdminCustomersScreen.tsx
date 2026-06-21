import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert,
} from 'react-native';
import { LoadingScreen } from '../../components/LoadingScreen';
import { Ionicons } from '@expo/vector-icons';
import { adminService, AdminCustomer, CustomerStats } from '../../services/adminService';

// ─── Styles (declared first so all components below can reference them) ───────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'white', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
  },
  countText: { fontSize: 12, color: '#999', paddingHorizontal: 16, paddingVertical: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#007AFF20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  username: { fontSize: 12, color: '#888' },
  sub: { fontSize: 12, color: '#888', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#f5f5f5' },
  emptyText: { fontSize: 15, color: '#aaa' },
});

const addModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 5, marginTop: 12 },
  required: { color: '#FF3B30' },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 11, fontSize: 14, color: '#333', backgroundColor: '#fafafa',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  errorBox: {
    marginTop: 10, backgroundColor: '#FF3B3010', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: '#FF3B3030',
  },
  errorText: { fontSize: 13, color: '#FF3B30' },
  submitBtn: {
    marginTop: 16, backgroundColor: '#007AFF', borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitText: { color: 'white', fontSize: 15, fontWeight: '700' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 10, maxHeight: '88%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#007AFF20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#007AFF' },
  name: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  username: { fontSize: 13, color: '#888', marginTop: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  editLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginTop: 10, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 10, fontSize: 14, color: '#333', backgroundColor: '#fafafa',
  },
  saveBtn: {
    marginTop: 12, backgroundColor: '#007AFF', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCell: {
    width: '47%', backgroundColor: '#f7f8fa',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 3, textAlign: 'center' },
});

// ─── Add Customer Modal ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  first_name: '', last_name: '', username: '',
  phone_number: '', address: '', password: '',
};

function AddCustomerModal({
  visible, onClose, onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof EMPTY_FORM) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const reset = () => { setForm(EMPTY_FORM); setError(''); setShowPassword(false); };

  const submit = async () => {
    setError('');
    if (!form.username.trim()) { setError('Username is required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSaving(true);
    try {
      await adminService.createCustomer({
        username: form.username.trim(),
        password: form.password,
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        phone_number: form.phone_number.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      let msg = 'Failed to create customer.';
      try { const parsed = JSON.parse(e.message); msg = Object.values(parsed).flat().join(' '); } catch {}
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={addModal.overlay}>
        <View style={addModal.sheet}>
          <View style={addModal.header}>
            <Text style={addModal.title}>Add Customer</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={addModal.closeBtn}>
              <Ionicons name="close" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={addModal.row}>
              <View style={{ flex: 1 }}>
                <Text style={addModal.label}>First Name</Text>
                <TextInput
                  style={addModal.input} value={form.first_name} onChangeText={set('first_name')}
                  placeholder="Ali" placeholderTextColor="#bbb"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={addModal.label}>Last Name</Text>
                <TextInput
                  style={addModal.input} value={form.last_name} onChangeText={set('last_name')}
                  placeholder="Hassan" placeholderTextColor="#bbb"
                />
              </View>
            </View>

            <Text style={addModal.label}>
              Username <Text style={addModal.required}>*</Text>
            </Text>
            <TextInput
              style={addModal.input} value={form.username} onChangeText={set('username')}
              placeholder="alihassan" placeholderTextColor="#bbb"
              autoCapitalize="none" autoCorrect={false}
            />

            <Text style={addModal.label}>Phone</Text>
            <TextInput
              style={addModal.input} value={form.phone_number} onChangeText={set('phone_number')}
              placeholder="03xx-xxxxxxx" placeholderTextColor="#bbb" keyboardType="phone-pad"
            />

            <Text style={addModal.label}>Address</Text>
            <TextInput
              style={[addModal.input, { height: 60, textAlignVertical: 'top' }]}
              value={form.address} onChangeText={set('address')}
              placeholder="House #, Street, Area" placeholderTextColor="#bbb"
              multiline
            />

            <Text style={addModal.label}>
              Password <Text style={addModal.required}>*</Text>
            </Text>
            <View style={addModal.passwordRow}>
              <TextInput
                style={[addModal.input, { flex: 1 }]}
                value={form.password} onChangeText={set('password')}
                placeholder="Min. 6 characters" placeholderTextColor="#bbb"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={addModal.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#888" />
              </TouchableOpacity>
            </View>

            {error !== '' && (
              <View style={addModal.errorBox}>
                <Text style={addModal.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[addModal.submitBtn, saving && { opacity: 0.6 }]}
              onPress={submit}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="white" />
                : (
                  <>
                    <Ionicons name="person-add" size={18} color="white" />
                    <Text style={addModal.submitText}>Create Account</Text>
                  </>
                )
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Customer Detail / Edit Modal ────────────────────────────────────────────

function CustomerStatsModal({
  customer, onClose, onUpdated,
}: {
  customer: AdminCustomer | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setLoading(true);
    adminService.getCustomerStats(customer.id)
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [customer]);

  if (!customer) return null;

  const changed = phone !== (customer.phone || '') || address !== (customer.address || '');

  const save = async () => {
    setSaving(true);
    try {
      await adminService.updateCustomer(customer.id, {
        phone_number: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      onUpdated?.();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update.');
    } finally { setSaving(false); }
  };

  const lastDate = stats?.last_order_date
    ? new Date(stats.last_order_date).toLocaleDateString('en-PK', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  const balanceNum = stats?.account_balance ?? null;
  const balanceColor = balanceNum === null
    ? '#888'
    : balanceNum < 0 ? '#FF3B30' : balanceNum > 0 ? '#34C759' : '#888';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          {/* Header */}
          <View style={modal.header}>
            <View style={modal.avatar}>
              <Text style={modal.avatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.name}>{customer.name}</Text>
              <Text style={modal.username}>@{customer.username}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
              <Ionicons name="close" size={20} color="#555" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Editable contact fields */}
            <Text style={modal.editLabel}>Phone</Text>
            <View style={modal.inputRow}>
              <Ionicons name="call-outline" size={15} color="#888" style={{ marginTop: 12 }} />
              <TextInput
                style={modal.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="03xx-xxxxxxx"
                placeholderTextColor="#bbb"
                keyboardType="phone-pad"
              />
            </View>

            <Text style={modal.editLabel}>Address</Text>
            <View style={modal.inputRow}>
              <Ionicons name="location-outline" size={15} color="#888" style={{ marginTop: 12 }} />
              <TextInput
                style={[modal.input, { height: 56, textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="House #, Street, Area"
                placeholderTextColor="#bbb"
                multiline
              />
            </View>

            {changed && (
              <TouchableOpacity
                style={[modal.saveBtn, saving && { opacity: 0.5 }]}
                onPress={save}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="white" />
                  : <Text style={modal.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            )}

            <View style={modal.divider} />

            {/* Order stats */}
            {loading ? (
              <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 20 }} />
            ) : stats ? (
              <View style={modal.statsGrid}>
                <View style={modal.statCell}>
                  <Text style={modal.statValue}>{stats.total_orders}</Text>
                  <Text style={modal.statLabel}>Total Orders</Text>
                </View>
                <View style={modal.statCell}>
                  <Text style={modal.statValue}>{stats.delivered_count}</Text>
                  <Text style={modal.statLabel}>Delivered</Text>
                </View>
                <View style={modal.statCell}>
                  <Text style={modal.statValue}>{stats.total_bottles}</Text>
                  <Text style={modal.statLabel}>Bottles</Text>
                </View>
                <View style={modal.statCell}>
                  <Text style={modal.statValue}>{lastDate}</Text>
                  <Text style={modal.statLabel}>Last Order</Text>
                </View>
                <View style={[modal.statCell, { width: '100%' }]}>
                  <Text style={[modal.statValue, { color: balanceColor }]}>
                    {balanceNum === null
                      ? '—'
                      : `${balanceNum >= 0 ? '+' : ''}PKR ${Math.abs(balanceNum).toLocaleString()}`}
                  </Text>
                  <Text style={modal.statLabel}>
                    {balanceNum === null ? 'Balance' : balanceNum < 0 ? 'Owes' : 'Credit'}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export const AdminCustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminCustomer | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await adminService.getCustomers();
      setCustomers(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
      )
    : customers;

  return (
    <View style={styles.container}>
      {/* Search + Add button */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, address…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#aaa"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#888" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Ionicons name="person-add" size={18} color="white" />
        </TouchableOpacity>
      </View>

      <Text style={styles.countText}>{filtered.length} customers</Text>

      {loading ? (
        <LoadingScreen message="Loading customers…" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => String(c.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => setSelected(item)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.username}>@{item.username}</Text>
                {item.phone && (
                  <Text style={styles.sub}>📞 {item.phone}</Text>
                )}
                {item.address && (
                  <Text style={styles.sub} numberOfLines={1}>📍 {item.address}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          }
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
        />
      )}

      <CustomerStatsModal
        customer={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { setSelected(null); load(true); }}
      />

      <AddCustomerModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => load(true)}
      />
    </View>
  );
};
