import { API_URL } from '../constants/config';
import { getAuthToken } from './authService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminOrderItem {
  id: number;
  product_details: { id: number; name: string; price: number; image: string | null };
  quantity: number;
  price: number;
}

export interface AdminOrder {
  id: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_balance: number | null;
  guest_name: string | null;
  guest_phone: string | null;
  items: AdminOrderItem[];
  total_price: number;
  status: string;
  shipping_address: string;
  payment_method: string;
  payment_number: string | null;
  is_paid: boolean;
  is_hidden: boolean;
  created_at: string;
  assigned_delivery_boy: number | null;
  assigned_delivery_boy_name: string | null;
  delivery_notes: string | null;
  number_of_bottles: number;
  delivery_status: string;
  cash_received: boolean;
  cash_amount: number;
}

export interface AdminSummary {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  paid_count: number;
  unpaid_count: number;
  today_orders: number;
  today_revenue: number;
}

export interface DeliveryBoy {
  id: number;
  name: string;
  is_available: boolean;
}

export interface AdminCustomer {
  id: number;
  username: string;
  name: string;
  address: string | null;
  phone: string | null;
  price: number;
}

export interface CustomerStats {
  total_orders: number;
  delivered_count: number;
  total_bottles: number;
  last_order_date: string | null;
  account_balance: number | null;
}

export interface AdminStaff {
  id: number;          // UserProfile pk
  user_id: number;     // User pk
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
  created_by_name: string | null;
  phone_number: string | null;
  address: string | null;
  is_rider: boolean;
  is_available: boolean;
  vehicle_type: string | null;
  vehicle_number: string | null;
  working_status: string;
  department: string | null;
  designation: string | null;
  employee_id: string | null;
  profile_picture_url: string | null;
}

export interface PlantSettings {
  standard_unit_price: number;
}

export interface PricedType {
  id: number;
  name: string;
  default_price: string | null;
  is_active: boolean;
}

export interface PlantRecord {
  id: number;
  date: string;
  house: string;
  bottles: number;
  unit_price: string;
  amount: string;
  paid_amount: string;
  pending: string;
  paid: boolean;
  payment_status: string;
  notes: string;
  customer: number | null;
  customer_name: string | null;
  customer_type: number | null;
  customer_type_name: string | null;
  bottle_type: number | null;
  bottle_type_name: string | null;
}

export interface PlantSummary {
  records: number;
  bottles: number;
  amount: string;
  paid_amount: string;
  pending: string;
  houses: number;
}

export interface PlantAnalytics {
  totals: PlantSummary;
  daily: { date: string; bottles: number; amount: string; paid_amount: string; records: number }[];
  top_houses: { house: string; bottles: number; amount: string }[];
}

export interface PlantRecordInput {
  date: string;
  house: string;
  bottles: number;
  unit_price?: number;
  paid_amount?: number;
  notes?: string;
  customer?: number | null;
  customer_type?: number | null;
  bottle_type?: number | null;
}

export interface AdminProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  image: string | null;
  images?: { id: number; image: string }[];
  category: number | null;
  category_name: string | null;
}

export interface AdminCategory {
  id: number;
  name: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const adminService = {
  getSummary(): Promise<AdminSummary> {
    return adminFetch('/orders/admin/summary/');
  },

  getOrders(params: {
    status?: string;
    search?: string;
    is_paid?: boolean;
    show_hidden?: boolean;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<AdminOrder[]> {
    const sp = new URLSearchParams();
    if (params.status) sp.set('status', params.status);
    if (params.search) sp.set('search', params.search);
    if (params.is_paid !== undefined) sp.set('is_paid', String(params.is_paid));
    if (params.show_hidden) sp.set('show_hidden', 'true');
    if (params.date_from) sp.set('date_from', params.date_from);
    if (params.date_to) sp.set('date_to', params.date_to);
    const qs = sp.toString();
    return adminFetch(`/orders/admin/${qs ? `?${qs}` : ''}`);
  },

  createOrder(payload: {
    user_id?: number | null;
    guest_name?: string;
    guest_phone?: string;
    shipping_address: string;
    payment_method: string;
    payment_number?: string;
    assigned_delivery_boy?: number | null;
    delivery_notes?: string;
    status?: string;
    items: { product_id: number; quantity: number }[];
  }): Promise<AdminOrder> {
    return adminFetch('/orders/admin/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateOrder(id: number, data: Partial<{
    status: string;
    is_paid: boolean;
    is_hidden: boolean;
    assigned_delivery_boy: number | null;
    delivery_notes: string;
    cash_amount: number;
    cash_received: boolean;
    delivery_status: string;
  }>): Promise<AdminOrder> {
    return adminFetch(`/orders/admin/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getDeliveryBoys(): Promise<DeliveryBoy[]> {
    return adminFetch('/orders/admin/delivery-boys/');
  },

  getCustomers(): Promise<AdminCustomer[]> {
    return adminFetch('/plant/customers/');
  },

  getCustomerStats(userId: number): Promise<CustomerStats> {
    return adminFetch(`/orders/admin/customer-stats/${userId}/`);
  },

  getStaff(): Promise<AdminStaff[]> {
    return adminFetch('/auth/admin/staff/');
  },

  updateCustomer(userId: number, data: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    address?: string;
  }): Promise<{ id: number; username: string; name: string; first_name: string; last_name: string; phone: string | null; address: string | null }> {
    return adminFetch(`/auth/admin/customers/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  createCustomer(payload: {
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    address?: string;
  }): Promise<{ id: number; username: string; name: string; phone: string | null; address: string | null }> {
    return adminFetch('/auth/admin/customers/create/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ─── Staff ────────────────────────────────────────────────────────────────

  createStaff(payload: {
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    is_rider: boolean;
    vehicle_type?: string;
    vehicle_number?: string;
    working_status?: string;
    department?: string;
    designation?: string;
  }): Promise<AdminStaff> {
    return adminFetch('/auth/admin/staff/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStaff(id: number, data: Partial<{
    first_name: string;
    last_name: string;
    phone_number: string;
    department: string;
    designation: string;
    working_status: string;
    is_active: boolean;
    is_rider: boolean;
    vehicle_type: string;
    vehicle_number: string;
  }>): Promise<AdminStaff> {
    return adminFetch(`/auth/admin/staff/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  resetPassword(userId: number, newPassword: string): Promise<{ detail: string }> {
    return adminFetch(`/auth/admin/reset-password/${userId}/`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });
  },

  generateTempPassword(userId: number): Promise<{ detail: string; new_password: string }> {
    return adminFetch(`/auth/admin/reset-password/${userId}/`, {
      method: 'POST',
      body: JSON.stringify({ generate: true }),
    });
  },

  uploadStaffPhoto(id: number, formData: FormData): Promise<AdminStaff> {
    return getAuthToken().then((token) =>
      fetch(`${API_URL}/auth/admin/staff/${id}/documents/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        return res.json();
      }),
    );
  },

  // ─── Plant settings ───────────────────────────────────────────────────────

  getPlantSettings(): Promise<PlantSettings> {
    return adminFetch('/plant/settings/');
  },

  updatePlantSettings(standard_unit_price: number): Promise<PlantSettings> {
    return adminFetch('/plant/settings/', {
      method: 'PATCH',
      body: JSON.stringify({ standard_unit_price }),
    });
  },

  // ─── Bottle types ─────────────────────────────────────────────────────────

  getBottleTypes(): Promise<PricedType[]> {
    return adminFetch('/plant/bottle-types/');
  },

  createBottleType(name: string, default_price?: number | null): Promise<PricedType> {
    return adminFetch('/plant/bottle-types/', {
      method: 'POST',
      body: JSON.stringify({ name, default_price: default_price ?? null }),
    });
  },

  updateBottleType(id: number, data: { name?: string; default_price?: number | null; is_active?: boolean }): Promise<PricedType> {
    return adminFetch(`/plant/bottle-types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteBottleType(id: number): Promise<void> {
    return adminFetch(`/plant/bottle-types/${id}/`, { method: 'DELETE' });
  },

  // ─── Customer types ───────────────────────────────────────────────────────

  getCustomerTypes(): Promise<PricedType[]> {
    return adminFetch('/plant/customer-types/');
  },

  createCustomerType(name: string, default_price?: number | null): Promise<PricedType> {
    return adminFetch('/plant/customer-types/', {
      method: 'POST',
      body: JSON.stringify({ name, default_price: default_price ?? null }),
    });
  },

  updateCustomerType(id: number, data: { name?: string; default_price?: number | null; is_active?: boolean }): Promise<PricedType> {
    return adminFetch(`/plant/customer-types/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteCustomerType(id: number): Promise<void> {
    return adminFetch(`/plant/customer-types/${id}/`, { method: 'DELETE' });
  },

  // ─── Mobile profile field config ─────────────────────────────────────────

  getMobileProfileConfig(): Promise<Record<string, Record<string, { visible: boolean; editable: boolean; label: string }>>> {
    return adminFetch('/auth/admin/mobile-profile-config/');
  },

  updateMobileProfileConfig(
    userType: string,
    fields: Record<string, { visible?: boolean; editable?: boolean }>,
  ): Promise<{ user_type: string; fields: Record<string, { visible: boolean; editable: boolean; label: string }> }> {
    return adminFetch(`/auth/admin/mobile-profile-config/${userType}/`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });
  },

  // ─── Plant records ────────────────────────────────────────────────────────

  getPlantRecords(params: { date?: string; start?: string; end?: string } = {}): Promise<PlantRecord[]> {
    const sp = new URLSearchParams();
    if (params.date) sp.set('date', params.date);
    if (params.start) sp.set('start', params.start);
    if (params.end) sp.set('end', params.end);
    const qs = sp.toString();
    return adminFetch(`/plant/records/${qs ? `?${qs}` : ''}`);
  },

  createPlantRecord(data: PlantRecordInput): Promise<PlantRecord> {
    return adminFetch('/plant/records/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePlantRecord(id: number, data: Partial<PlantRecordInput>): Promise<PlantRecord> {
    return adminFetch(`/plant/records/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deletePlantRecord(id: number): Promise<void> {
    return adminFetch(`/plant/records/${id}/`, { method: 'DELETE' });
  },

  getPlantSummary(params: { date?: string; start?: string; end?: string } = {}): Promise<PlantSummary> {
    const sp = new URLSearchParams();
    if (params.date) sp.set('date', params.date);
    if (params.start) sp.set('start', params.start);
    if (params.end) sp.set('end', params.end);
    const qs = sp.toString();
    return adminFetch(`/plant/summary/${qs ? `?${qs}` : ''}`);
  },

  getPlantAnalytics(): Promise<PlantAnalytics> {
    return adminFetch('/plant/analytics/');
  },

  // ─── Shop / Products ──────────────────────────────────────────────────────

  getProducts(): Promise<AdminProduct[]> {
    return adminFetch('/products/');
  },

  createProduct(formData: FormData): Promise<AdminProduct> {
    return getAuthToken().then((token) =>
      fetch(`${API_URL}/products/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error(`Failed to create product: ${res.status}`);
        return res.json();
      }),
    );
  },

  updateProduct(id: number, formData: FormData): Promise<AdminProduct> {
    return getAuthToken().then((token) =>
      fetch(`${API_URL}/products/${id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error(`Failed to update product: ${res.status}`);
        return res.json();
      }),
    );
  },

  deleteProduct(id: number): Promise<void> {
    return adminFetch(`/products/${id}/`, { method: 'DELETE' });
  },

  getCategories(): Promise<AdminCategory[]> {
    return adminFetch('/categories/');
  },
};
