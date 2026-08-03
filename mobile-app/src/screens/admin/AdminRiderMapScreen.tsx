import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '../../components/LoadingScreen';
import { RiderMapView, RiderMapMarker } from '../../components/RiderMapView';
import { IS_MAPS_CONFIGURED } from '../../constants/mapsConfig';
import {
  adminService,
  RiderLocation,
  RiderTrailPoint,
  TrackingConfig,
} from '../../services/adminService';
import { RootStackParamList } from '../../types/navigation';

// ─── Config ───────────────────────────────────────────────────────────────────

/** Fast enough to feel live, slow enough not to melt a dispatcher's data plan. */
const REFRESH_MS = 20000;
/**
 * Past this a pin is history rather than a position. `stale` comes from the
 * server (stale_after_minutes); only "how far gone is gone" is a client call.
 */
const OFFLINE_AFTER_MINUTES = 60;

type Freshness = 'live' | 'stale' | 'offline';

const FRESHNESS_COLORS: Record<Freshness, string> = {
  live: '#34C759',
  stale: '#FF9500',
  offline: '#8E8E93',
};

const FRESHNESS_LABELS: Record<Freshness, string> = {
  live: 'LIVE',
  stale: 'STALE',
  offline: 'OFFLINE',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Local calendar day — toISOString() would roll over five hours early in PKT. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Riders are judged on freshness, so a pin never shows a wall-clock time. */
function agoLabel(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Numeric detail with a unit; '—' rather than a misleading 0 when unknown. */
function fmt(value: number | null | undefined, unit: string, digits = 0) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${unit}`;
}

function freshnessOf(rider: RiderLocation, staleAfterMinutes: number): Freshness {
  const minutes = Number.isFinite(rider.minutes_ago) ? rider.minutes_ago : Number.MAX_SAFE_INTEGER;
  if (minutes <= staleAfterMinutes) return 'live';
  if (minutes <= OFFLINE_AFTER_MINUTES) return 'stale';
  return 'offline';
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[sc.card, { borderLeftColor: color }]}>
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: 'white', borderRadius: 12,
    padding: 12, borderLeftWidth: 3,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  value: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  label: { fontSize: 11, color: '#888', marginTop: 2 },
});

// ─── Rider row ────────────────────────────────────────────────────────────────

function RiderRow({
  rider,
  freshness,
  selected,
  onPress,
}: {
  rider: RiderLocation;
  freshness: Freshness;
  selected: boolean;
  onPress: () => void;
}) {
  const color = FRESHNESS_COLORS[freshness];
  return (
    <TouchableOpacity style={[row.row, selected && row.rowSelected]} onPress={onPress}>
      <View style={[row.avatar, { backgroundColor: color + '20' }]}>
        <Text style={[row.avatarText, { color }]}>
          {(rider.name || rider.username).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={row.info}>
        <Text style={row.name}>{rider.name || rider.username}</Text>
        <Text style={row.sub}>
          {agoLabel(rider.minutes_ago)}
          {rider.vehicle_number ? ` · ${rider.vehicle_number}` : ''}
        </Text>
        <View style={row.chipRow}>
          <View style={[row.chip, { backgroundColor: color + '20' }]}>
            <Text style={[row.chipText, { color }]}>{FRESHNESS_LABELS[freshness]}</Text>
          </View>
          {rider.active_orders > 0 && (
            <View style={row.chip}>
              <Text style={row.chipText}>
                {rider.active_orders} ORDER{rider.active_orders === 1 ? '' : 'S'}
              </Text>
            </View>
          )}
          {rider.is_moving && (
            <View style={[row.chip, { backgroundColor: '#007AFF20' }]}>
              <Text style={[row.chipText, { color: '#007AFF' }]}>MOVING</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#ccc" />
    </TouchableOpacity>
  );
}

const row = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 13 },
  rowSelected: { backgroundColor: '#F2F8FF' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  sub: { fontSize: 12, color: '#888' },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#f0f0f0' },
  chipText: { fontSize: 10, fontWeight: '700', color: '#777' },
});

// ─── Selected rider card ──────────────────────────────────────────────────────

function RiderCard({
  rider,
  freshness,
  showTrail,
  trailLoading,
  trailCount,
  onToggleTrail,
  onClose,
}: {
  rider: RiderLocation;
  freshness: Freshness;
  showTrail: boolean;
  trailLoading: boolean;
  trailCount: number;
  onToggleTrail: () => void;
  onClose: () => void;
}) {
  const color = FRESHNESS_COLORS[freshness];

  const call = () => {
    if (!rider.phone) {
      Alert.alert('No phone number', 'This rider has no phone number on file.');
      return;
    }
    Linking.openURL(`tel:${rider.phone}`).catch(() =>
      Alert.alert('Error', 'Could not open the dialler.'),
    );
  };

  return (
    <View style={card.card}>
      <View style={card.header}>
        <View style={[card.avatar, { backgroundColor: color + '20' }]}>
          <Text style={[card.avatarText, { color }]}>
            {(rider.name || rider.username).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={card.name}>{rider.name || rider.username}</Text>
          <Text style={card.sub}>
            {rider.vehicle_number || `@${rider.username}`} · {rider.is_available ? 'Available' : 'Busy'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={card.closeBtn}>
          <Ionicons name="close" size={18} color="#aaa" />
        </TouchableOpacity>
      </View>

      <View style={card.statRow}>
        <View style={card.stat}>
          <Text style={[card.statValue, { color }]}>{agoLabel(rider.minutes_ago)}</Text>
          <Text style={card.statLabel}>Last seen</Text>
        </View>
        <View style={card.stat}>
          <Text style={card.statValue}>{rider.active_orders}</Text>
          <Text style={card.statLabel}>Active orders</Text>
        </View>
        <View style={card.stat}>
          <Text style={card.statValue}>{fmt(rider.speed_kmh, ' km/h')}</Text>
          <Text style={card.statLabel}>Speed</Text>
        </View>
        <View style={card.stat}>
          <Text style={card.statValue}>{fmt(rider.battery_level, '%')}</Text>
          <Text style={card.statLabel}>Battery</Text>
        </View>
      </View>

      <Text style={card.meta}>
        Accuracy {fmt(rider.accuracy_m, ' m')} · {rider.latitude.toFixed(5)}, {rider.longitude.toFixed(5)}
      </Text>

      <View style={card.actionBar}>
        <TouchableOpacity style={[card.actionBtn, card.callBtn]} onPress={call}>
          <Ionicons name="call" size={16} color="white" />
          <Text style={card.actionText}>{rider.phone || 'No phone'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[card.actionBtn, showTrail ? card.trailBtnOn : card.trailBtnOff]}
          onPress={onToggleTrail}
          disabled={!IS_MAPS_CONFIGURED}
        >
          {trailLoading ? (
            <ActivityIndicator size="small" color={showTrail ? 'white' : '#007AFF'} />
          ) : (
            <Ionicons name="git-branch" size={16} color={showTrail ? 'white' : '#007AFF'} />
          )}
          <Text style={[card.actionText, !showTrail && { color: '#007AFF' }]}>
            {showTrail ? `Route · ${trailCount} pts` : "Today's route"}
          </Text>
        </TouchableOpacity>
      </View>

      {!IS_MAPS_CONFIGURED && (
        <Text style={card.note}>The route needs a map to draw on — add a Maps key to use it.</Text>
      )}
    </View>
  );
}

const card = StyleSheet.create({
  card: {
    backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee',
    padding: 16, gap: 12,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  sub: { fontSize: 12, color: '#888', marginTop: 2 },
  closeBtn: { padding: 6 },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: '#f7f8fa', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  meta: { fontSize: 11, color: '#aaa' },
  actionBar: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  callBtn: { backgroundColor: '#34C759' },
  trailBtnOn: { backgroundColor: '#007AFF' },
  trailBtnOff: { backgroundColor: '#007AFF15', borderWidth: 1, borderColor: '#007AFF40' },
  actionText: { fontSize: 13, fontWeight: '700', color: 'white' },
  note: { fontSize: 11, color: '#FF9500' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

type Tab = 'map' | 'list';

export const AdminRiderMapScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'AdminRiderMap'>>();

  const [riders, setRiders] = useState<RiderLocation[]>([]);
  const [config, setConfig] = useState<TrackingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Without a key the map tab can only ever show a placeholder, so open on the
  // list instead of a dead end.
  const [tab, setTab] = useState<Tab>(IS_MAPS_CONFIGURED ? 'map' : 'list');
  const [selectedId, setSelectedId] = useState<number | null>(route.params?.riderId ?? null);
  const [showTrail, setShowTrail] = useState(false);
  const [trail, setTrail] = useState<RiderTrailPoint[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);

  const staleAfter = config?.stale_after_minutes ?? 10;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminService.getRiderLocations({ limit: 500 });
      setRiders(data.results || []);
    } catch {
      // Keep whatever is on screen — one dropped poll must not blank the map
      // and lose the dispatcher's place.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // stale_after_minutes is a server constant, not live data, so it is read once
  // rather than on every poll.
  useEffect(() => {
    adminService.getTrackingConfig().then(setConfig).catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(() => load(true), REFRESH_MS);
      // A timer left running on a blurred screen keeps hitting the API from a
      // phone in someone's pocket.
      return () => clearInterval(timer);
    }, [load]),
  );

  useEffect(() => {
    if (!showTrail || selectedId == null) {
      setTrail([]);
      return;
    }
    let cancelled = false;
    setTrailLoading(true);
    // 2000 is the server cap and a whole day is 1,440 points at the 60s default.
    adminService
      .getRiderTrail(selectedId, { date: today(), limit: 2000 })
      .then((data) => { if (!cancelled) setTrail(data.results || []); })
      .catch(() => {
        if (cancelled) return;
        setTrail([]);
        Alert.alert('Error', 'Failed to load the rider trail.');
      })
      .finally(() => { if (!cancelled) setTrailLoading(false); });

    return () => { cancelled = true; };
  }, [showTrail, selectedId]);

  const selected = useMemo(
    () => riders.find((r) => r.rider_id === selectedId) ?? null,
    [riders, selectedId],
  );

  const counts = useMemo(() => {
    const tally = { live: 0, stale: 0, offline: 0 };
    riders.forEach((rider) => { tally[freshnessOf(rider, staleAfter)] += 1; });
    return tally;
  }, [riders, staleAfter]);

  const markers: RiderMapMarker[] = useMemo(
    () => riders.map((rider) => ({
      id: rider.rider_id,
      latitude: rider.latitude,
      longitude: rider.longitude,
      title: rider.name || rider.username,
      description: `${agoLabel(rider.minutes_ago)} · ${rider.active_orders} active`,
      color: FRESHNESS_COLORS[freshnessOf(rider, staleAfter)],
    })),
    [riders, staleAfter],
  );

  const trailPath = useMemo(
    () => trail.map((point) => ({ latitude: point.latitude, longitude: point.longitude })),
    [trail],
  );

  const select = (riderId: number) => {
    if (riderId === selectedId) return;
    setSelectedId(riderId);
    // The drawn trail belongs to the rider being replaced, so it has to go
    // before the new one's fetch lands or the line reads as theirs.
    setShowTrail(false);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setShowTrail(false);
  };

  const renderContent = () => {
    if (loading && riders.length === 0) return <LoadingScreen message="Loading rider positions…" />;

    if (tab === 'map') {
      return (
        <RiderMapView
          style={{ flex: 1 }}
          markers={markers}
          trail={showTrail ? trailPath : []}
          selectedId={selectedId}
          onSelectRider={select}
          onDeselect={clearSelection}
        />
      );
    }

    return (
      <FlatList
        data={riders}
        keyExtractor={(rider) => String(rider.rider_id)}
        renderItem={({ item }) => (
          <RiderRow
            rider={item}
            freshness={freshnessOf(item, staleAfter)}
            selected={item.rider_id === selectedId}
            onPress={() => select(item.rider_id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bicycle-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No rider has reported a position yet</Text>
            <Text style={styles.emptyHint}>
              Riders appear here once they sign in and allow location sharing.
            </Text>
          </View>
        }
        contentContainerStyle={riders.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'map' && styles.tabActive]}
          onPress={() => IS_MAPS_CONFIGURED && setTab('map')}
          disabled={!IS_MAPS_CONFIGURED}
        >
          <Ionicons
            name="map-outline"
            size={15}
            color={tab === 'map' ? '#007AFF' : IS_MAPS_CONFIGURED ? '#aaa' : '#ddd'}
          />
          <Text
            style={[
              styles.tabText,
              tab === 'map' && styles.tabTextActive,
              !IS_MAPS_CONFIGURED && { color: '#ddd' },
            ]}
          >
            Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'list' && styles.tabActive]}
          onPress={() => setTab('list')}
        >
          <Ionicons name="list" size={15} color={tab === 'list' ? '#007AFF' : '#aaa'} />
          <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>List</Text>
        </TouchableOpacity>
      </View>

      {!IS_MAPS_CONFIGURED && (
        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={16} color="#FF9500" />
          <Text style={styles.bannerText}>
            Map key not configured — showing the rider list. Set GOOGLE_MAPS_API_KEY and rebuild.
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <SummaryCard label="Riders" value={String(riders.length)} color="#007AFF" />
        <SummaryCard label="Live" value={String(counts.live)} color={FRESHNESS_COLORS.live} />
        <SummaryCard label="Stale" value={String(counts.stale)} color={FRESHNESS_COLORS.stale} />
        <SummaryCard label="Offline" value={String(counts.offline)} color={FRESHNESS_COLORS.offline} />
      </View>

      <View style={styles.content}>{renderContent()}</View>

      {selected && (
        <RiderCard
          rider={selected}
          freshness={freshnessOf(selected, staleAfter)}
          showTrail={showTrail}
          trailLoading={trailLoading}
          trailCount={trail.length}
          onToggleTrail={() => setShowTrail((on) => !on)}
          onClose={clearSelection}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabBar: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#aaa' },
  tabTextActive: { color: '#007AFF' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF950015', paddingHorizontal: 16, paddingVertical: 10 },
  bannerText: { flex: 1, fontSize: 12, color: '#B36A00', lineHeight: 17 },
  summaryRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginVertical: 12 },
  content: { flex: 1 },
  separator: { height: 1, backgroundColor: '#f5f5f5' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32 },
  emptyText: { fontSize: 15, color: '#aaa' },
  emptyHint: { fontSize: 12, color: '#bbb', textAlign: 'center', lineHeight: 17 },
});
