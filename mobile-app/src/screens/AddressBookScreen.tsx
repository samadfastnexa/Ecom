import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AddressFormSheet } from '../components/AddressFormSheet';
import { CustomerAddress, addressService, formatPin, pinOf } from '../services/addressService';

/**
 * The customer's address book, reachable from Profile.
 *
 * Checkout can add an address mid-order, but managing them — renaming,
 * fixing a pin, deleting the flat they moved out of, choosing which one
 * checkout pre-selects — deserves somewhere that is not the middle of a
 * purchase.
 */

/** Icon per address label, matching the checkout picker. */
const LABEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  office: 'business',
  shop: 'storefront',
  warehouse: 'cube',
  other: 'location',
};

export const AddressBookScreen: React.FC = () => {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Id currently being promoted or deleted — disables just that row. */
  const [busyId, setBusyId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      setAddresses(await addressService.list());
    } catch (error: any) {
      // Keeping whatever was already on screen; an empty list here would read
      // as "you have no addresses", which is a very different message.
      setLoadError(error?.message || 'Could not load your addresses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-read on focus: an address added during checkout should be here when the
  // customer comes back, and this screen stays mounted inside the stack.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleSetDefault = async (address: CustomerAddress) => {
    setBusyId(address.id);
    try {
      await addressService.setDefault(address.id);
      // The server demotes the previous default, so re-read rather than
      // guessing which one lost it.
      await load('refresh');
    } catch (error: any) {
      Alert.alert('Could not set default', error?.message || 'Try again in a moment.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (address: CustomerAddress) => {
    Alert.alert(
      'Delete address',
      `Remove “${address.display_label}” from your address book?\n\n`
      + 'Orders already placed to it keep their own copy of the address.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(address.id);
            try {
              await addressService.remove(address.id);
              setAddresses(prev => prev.filter(a => a.id !== address.id));
            } catch (error: any) {
              Alert.alert('Could not delete', error?.message || 'Try again in a moment.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditing(null);
    // A save can move the default around, so take the list from the server
    // rather than splicing the returned row into a list that may now be wrong.
    load('refresh');
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (address: CustomerAddress) => {
    setEditing(address);
    setShowForm(true);
  };

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.centreText}>Loading your addresses…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
        }
      >
        {!!loadError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#D93025" />
            <View style={styles.flex}>
              <Text style={styles.errorText}>{loadError}</Text>
              <TouchableOpacity onPress={() => load('refresh')}>
                <Text style={styles.errorLink}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {addresses.length === 0 && !loadError && (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={44} color="#c8c8c8" />
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptyBody}>
              Add the places you want water delivered to. The first one you save becomes your
              default, and checkout picks it automatically.
            </Text>
          </View>
        )}

        {addresses.map(address => {
          const pin = pinOf(address);
          const busy = busyId === address.id;
          return (
            <View key={address.id} style={[styles.card, address.is_default && styles.cardDefault]}>
              <View style={styles.cardHead}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={LABEL_ICONS[address.label] ?? 'location'}
                    size={19}
                    color="#0A84FF"
                  />
                </View>
                <View style={styles.flex}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle}>{address.display_label}</Text>
                    {address.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardAddress}>{address.address}</Text>
                  <Text style={styles.cardPin}>
                    {pin ? `Pin: ${formatPin(pin)}` : 'No map pin saved'}
                  </Text>
                </View>
                {busy && <ActivityIndicator size="small" color="#0A84FF" />}
              </View>

              <View style={styles.cardActions}>
                {!address.is_default && (
                  <TouchableOpacity
                    style={styles.action}
                    onPress={() => handleSetDefault(address)}
                    disabled={busy}
                  >
                    <Ionicons name="star-outline" size={16} color="#0A84FF" />
                    <Text style={styles.actionText}>Set default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => openEdit(address)}
                  disabled={busy}
                >
                  <Ionicons name="create-outline" size={16} color="#0A84FF" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.action}
                  onPress={() => handleDelete(address)}
                  disabled={busy}
                >
                  <Ionicons name="trash-outline" size={16} color="#D93025" />
                  <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={openNew}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add new address</Text>
      </TouchableOpacity>

      <AddressFormSheet
        visible={showForm}
        address={editing}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centreText: { fontSize: 13, color: '#888' },
  list: { padding: 16, paddingBottom: 24 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#F3C2C2',
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: '#D93025', lineHeight: 18 },
  errorLink: { fontSize: 13, fontWeight: '700', color: '#0A84FF', marginTop: 6 },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#777' },
  emptyBody: { fontSize: 13, color: '#9a9a9a', textAlign: 'center', lineHeight: 19 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eceff2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDefault: { borderColor: '#0A84FF', borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E9F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  defaultBadge: {
    backgroundColor: '#0A84FF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  cardAddress: { fontSize: 13, color: '#444', lineHeight: 19, marginTop: 3 },
  cardPin: { fontSize: 12, color: '#8a8a8a', marginTop: 5, fontVariant: ['tabular-nums'] },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f4',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#F5F8FC',
  },
  actionText: { fontSize: 12, fontWeight: '700', color: '#0A84FF' },
  actionTextDanger: { color: '#D93025' },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0A84FF',
    margin: 16,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
