import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { API_URL } from '../../constants/config';
import { getAuthToken } from '../../services/authService';
import { LoadingScreen } from '../../components/LoadingScreen';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
  id: number;
  timestamp: string;
  actor_name: string;
  category: string;
  action: string;
  target_type: string;
  target_id: number | null;
  target_label: string;
  details: Record<string, unknown>;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  order: '#007AFF',
  rider: '#34C759',
  customer: '#AF52DE',
  user: '#FF9500',
};

const LIMIT = 40;

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'Orders', value: 'order' },
  { label: 'Riders', value: 'rider' },
  { label: 'Customers', value: 'customer' },
  { label: 'Users', value: 'user' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function detailsText(details: Record<string, unknown>): string {
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

// ─── Row component ────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityEntry }) {
  const color = CATEGORY_COLORS[item.category] ?? '#888';
  const extra = detailsText(item.details);
  return (
    <View style={row.container}>
      <View style={[row.dot, { backgroundColor: color }]} />
      <View style={row.body}>
        <View style={row.top}>
          <Text style={row.action}>{item.action}</Text>
          <Text style={row.time}>{formatTs(item.timestamp)}</Text>
        </View>
        {item.target_label ? (
          <Text style={row.target}>{item.target_label}</Text>
        ) : null}
        {extra ? <Text style={row.details}>{extra}</Text> : null}
        <Text style={row.actor}>by {item.actor_name || 'System'}</Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  body: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  action: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: '#aaa', marginTop: 1 },
  target: { fontSize: 12, color: '#555', marginTop: 2 },
  details: { fontSize: 11, color: '#aaa', marginTop: 2 },
  actor: { fontSize: 11, color: '#bbb', marginTop: 3 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export const AdminActivityScreen: React.FC = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(
    async (reset = false) => {
      const off = reset ? 0 : offset;
      if (!reset && !hasMore) return;
      if (reset) {
        setOffset(0);
        setHasMore(true);
      }
      setLoading(true);
      try {
        const token = await getAuthToken();
        const sp = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
        if (category) sp.set('category', category);
        if (search) sp.set('action', search);
        const res = await fetch(`${API_URL}/activities/?${sp}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed');
        const data: { count: number; results: ActivityEntry[] } = await res.json();
        setTotal(data.count);
        if (reset) {
          setEntries(data.results);
        } else {
          setEntries((prev) => [...prev, ...data.results]);
        }
        setHasMore(off + LIMIT < data.count);
        if (!reset) setOffset(off + LIMIT);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [offset, hasMore, category, search],
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  if (loading && entries.length === 0) {
    return <LoadingScreen message="Loading activity log…" />;
  }

  return (
    <View style={styles.container}>
      {/* Category chips */}
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[
              styles.chip,
              category === c.value && {
                backgroundColor: (CATEGORY_COLORS[c.value] ?? '#1a1a1a') + '22',
                borderColor: CATEGORY_COLORS[c.value] ?? '#1a1a1a',
              },
            ]}
            onPress={() => setCategory(c.value)}
          >
            <Text
              style={[
                styles.chipText,
                category === c.value && {
                  color: CATEGORY_COLORS[c.value] ?? '#1a1a1a',
                  fontWeight: '700',
                },
              ]}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search actions..."
          placeholderTextColor="#bbb"
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={() => setSearch(searchInput)}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              setSearchInput('');
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Count */}
      <Text style={styles.countText}>{total.toLocaleString()} records</Text>

      {/* List */}
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ActivityRow item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => load(false)}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={{ padding: 20 }} color="#007AFF" />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No activity records found.</Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'white',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  chipText: { fontSize: 13, color: '#666' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearBtnText: { fontSize: 13, color: '#007AFF' },
  countText: {
    fontSize: 11,
    color: '#aaa',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  empty: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 14,
    paddingTop: 60,
  },
});
