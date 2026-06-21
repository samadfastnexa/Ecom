import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Image,
  Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService, AdminProduct, AdminCategory } from '../../services/adminService';
import { API_URL } from '../../constants/config';
import { MultiImagePicker } from '../../components/MultiImagePicker';
import { PickedImage, appendImages } from '../../constants/imageLimits';

// ─── Product form modal ───────────────────────────────────────────────────────

interface FormModalProps {
  visible: boolean;
  product: AdminProduct | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductFormModal({ visible, product, categories, onClose, onSaved }: FormModalProps) {
  const isEdit = !!product;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price);
      setCategoryId(product.category);
      setIsActive(product.is_active);
      const urls = product.images?.length
        ? product.images.map((i) => i.image)
        : product.image
          ? [product.image]
          : [];
      setExistingImages(urls);
    } else {
      setName(''); setDescription(''); setPrice('');
      setCategoryId(null); setIsActive(true);
      setExistingImages([]);
    }
    setImages([]);
  }, [product, visible]);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    const p = parseFloat(price);
    if (!price || isNaN(p) || p < 0) { Alert.alert('Enter a valid price'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('price', price);
      fd.append('is_active', String(isActive));
      if (categoryId !== null) fd.append('category', String(categoryId));
      // Only send images when new ones were picked; otherwise keep existing.
      if (images.length) appendImages(fd, images);

      if (isEdit && product) {
        await adminService.updateProduct(product.id, fd);
      } else {
        await adminService.createProduct(fd);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={fm.container}>
        {/* Header */}
        <View style={fm.header}>
          <Text style={fm.title}>{isEdit ? 'Edit Product' : 'New Product'}</Text>
          <TouchableOpacity onPress={onClose} style={fm.closeBtn}>
            <Ionicons name="close" size={22} color="#555" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={fm.body}>
          <Text style={fm.label}>Product Name *</Text>
          <TextInput style={fm.input} value={name} onChangeText={setName} placeholder="e.g. 20L Water Bottle" placeholderTextColor="#bbb" />

          <Text style={fm.label}>Description</Text>
          <TextInput
            style={[fm.input, { height: 80, textAlignVertical: 'top' }]}
            value={description} onChangeText={setDescription}
            placeholder="Short description…" placeholderTextColor="#bbb" multiline
          />

          <Text style={fm.label}>Price (PKR) *</Text>
          <TextInput style={fm.input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor="#bbb" keyboardType="decimal-pad" />

          <Text style={fm.label}>Category</Text>
          <View style={fm.categoryRow}>
            <TouchableOpacity
              style={[fm.catChip, categoryId === null && fm.catChipActive]}
              onPress={() => setCategoryId(null)}
            >
              <Text style={[fm.catText, categoryId === null && fm.catTextActive]}>None</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[fm.catChip, categoryId === c.id && fm.catChipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[fm.catText, categoryId === c.id && fm.catTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <MultiImagePicker
            label="Product images"
            value={images}
            onChange={setImages}
            existing={existingImages}
          />

          <View style={fm.activeRow}>
            <View>
              <Text style={fm.label}>Active</Text>
              <Text style={fm.hint}>Visible to customers in the shop</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#e0e0e0', true: '#34C75940' }}
              thumbColor={isActive ? '#34C759' : '#ccc'}
            />
          </View>

          <TouchableOpacity
            style={[fm.submitBtn, saving && { opacity: 0.5 }]}
            onPress={submit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="white" />
              : <Text style={fm.submitText}>{isEdit ? 'Save Changes' : 'Create Product'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  closeBtn: { padding: 4 },
  body: { padding: 16, gap: 4, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 11, color: '#aaa' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: 'white' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: 'white' },
  catChipActive: { borderColor: '#007AFF', backgroundColor: '#007AFF15' },
  catText: { fontSize: 13, color: '#555' },
  catTextActive: { color: '#007AFF', fontWeight: '600' },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, padding: 14, marginTop: 12 },
  submitBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitText: { color: 'white', fontWeight: '700', fontSize: 15 },
});

// ─── Product row ──────────────────────────────────────────────────────────────

interface ProductRowProps {
  product: AdminProduct;
  onEdit: (p: AdminProduct) => void;
  onDeleted: () => void;
  onToggled: () => void;
}

function ProductRow({ product, onEdit, onDeleted, onToggled }: ProductRowProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const fd = new FormData();
      fd.append('is_active', String(!product.is_active));
      await adminService.updateProduct(product.id, fd);
      onToggled();
    } catch {
      Alert.alert('Error', 'Failed to update.');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(`Delete "${product.name}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await adminService.deleteProduct(product.id); onDeleted(); }
          catch { Alert.alert('Error', 'Failed to delete.'); }
        },
      },
    ]);
  };

  const imageUri = product.image
    ? (product.image.startsWith('http') ? product.image : `${API_URL}${product.image}`)
    : null;

  return (
    <View style={pr.row}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={pr.image} />
      ) : (
        <View style={pr.imagePlaceholder}>
          <Ionicons name="image-outline" size={20} color="#ccc" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={pr.name} numberOfLines={1}>{product.name}</Text>
        <Text style={pr.price}>PKR {parseFloat(product.price).toLocaleString()}</Text>
        {product.category_name && <Text style={pr.category}>{product.category_name}</Text>}
      </View>
      <Switch
        value={product.is_active}
        onValueChange={handleToggle}
        disabled={toggling}
        trackColor={{ false: '#e0e0e0', true: '#34C75940' }}
        thumbColor={product.is_active ? '#34C759' : '#ccc'}
        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
      />
      <TouchableOpacity onPress={() => onEdit(product)} style={pr.iconBtn}>
        <Ionicons name="create-outline" size={18} color="#007AFF" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDelete} style={pr.iconBtn}>
        <Ionicons name="trash-outline" size={17} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

const pr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  image: { width: 44, height: 44, borderRadius: 8 },
  imagePlaceholder: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  price: { fontSize: 12, color: '#555', marginTop: 1 },
  category: { fontSize: 11, color: '#aaa', marginTop: 1 },
  iconBtn: { padding: 6 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export const AdminShopScreen: React.FC = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);

  const load = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        adminService.getProducts(),
        adminService.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      Alert.alert('Error', 'Failed to load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchActive =
      filterActive === 'all' ||
      (filterActive === 'active' && p.is_active) ||
      (filterActive === 'inactive' && !p.is_active);
    return matchSearch && matchActive;
  });

  const total = products.length;
  const activeCount = products.filter(p => p.is_active).length;

  const openCreate = () => { setEditProduct(null); setModalVisible(true); };
  const openEdit = (p: AdminProduct) => { setEditProduct(p); setModalVisible(true); };

  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statChip}>
          <Text style={styles.statVal}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statChip, { borderLeftWidth: 1, borderLeftColor: '#f0f0f0' }]}>
          <Text style={[styles.statVal, { color: '#34C759' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statChip, { borderLeftWidth: 1, borderLeftColor: '#f0f0f0' }]}>
          <Text style={[styles.statVal, { color: '#FF9500' }]}>{total - activeCount}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color="#aaa" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products…"
            placeholderTextColor="#bbb"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.segmentRow}>
          {(['all', 'active', 'inactive'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.segment, filterActive === v && styles.segmentActive]}
              onPress={() => setFilterActive(v)}
            >
              <Text style={[styles.segmentText, filterActive === v && styles.segmentTextActive]}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <View style={styles.card}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="bag-outline" size={36} color="#ddd" />
                <Text style={styles.emptyText}>No products found.</Text>
                <TouchableOpacity onPress={openCreate}>
                  <Text style={styles.emptyLink}>Add your first product →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filtered.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onEdit={openEdit}
                  onDeleted={load}
                  onToggled={load}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal */}
      <ProductFormModal
        visible={modalVisible}
        product={editProduct}
        categories={categories}
        onClose={() => setModalVisible(false)}
        onSaved={load}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  statChip: { paddingHorizontal: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  statLabel: { fontSize: 10, color: '#aaa', marginTop: 1 },
  addBtn: { marginLeft: 'auto', backgroundColor: '#007AFF', width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterRow: { padding: 12, gap: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#333' },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segment: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f5f5f5' },
  segmentActive: { backgroundColor: '#007AFF15' },
  segmentText: { fontSize: 12, fontWeight: '600', color: '#888' },
  segmentTextActive: { color: '#007AFF' },
  card: { margin: 16, backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { color: '#bbb', fontSize: 14 },
  emptyLink: { color: '#007AFF', fontSize: 13, marginTop: 4 },
});
