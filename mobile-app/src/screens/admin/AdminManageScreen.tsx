import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  description: string;
  onPress: () => void;
}

function MenuItem({ icon, color, label, description, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemDesc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export const AdminManageScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <SectionHeader title="PEOPLE" />
      <View style={styles.card}>
        <MenuItem
          icon="people"
          color="#5856D6"
          label="Staff Management"
          description="View, add, and update staff & riders"
          onPress={() => navigation.navigate('AdminStaff')}
        />
      </View>

      <SectionHeader title="OPERATIONS" />
      <View style={styles.card}>
        <MenuItem
          icon="water"
          color="#32ADE6"
          label="Plant / Deliveries"
          description="Ledger, daily records, and analytics"
          onPress={() => navigation.navigate('AdminPlant')}
        />
        <MenuItem
          icon="bag"
          color="#30D158"
          label="Shop Management"
          description="Add, edit, and manage products"
          onPress={() => navigation.navigate('AdminShop')}
        />
      </View>

      <SectionHeader title="CONFIGURATION" />
      <View style={styles.card}>
        <MenuItem
          icon="settings"
          color="#FF9500"
          label="Settings"
          description="Pricing, bottle types, customer types"
          onPress={() => navigation.navigate('AdminSettings')}
        />
      </View>

      <SectionHeader title="COMMUNICATIONS" />
      <View style={styles.card}>
        <MenuItem
          icon="notifications"
          color="#007AFF"
          label="Push Notifications"
          description="Send alerts to customers or delivery staff"
          onPress={() => navigation.navigate('AdminNotification')}
        />
      </View>

      <SectionHeader title="MONITORING" />
      <View style={styles.card}>
        <MenuItem
          icon="pulse"
          color="#FF2D55"
          label="Activity Log"
          description="Track every important action in the system"
          onPress={() => navigation.navigate('AdminActivity')}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  itemDesc: { fontSize: 12, color: '#888', marginTop: 2 },
});
