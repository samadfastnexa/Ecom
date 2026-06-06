/* ---------- Domain models ---------- */

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  image: string | null;
  category_details: Category | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id?: number;
  product_id?: number;
  product_details?: Product;
  quantity: number;
  price: string;
}

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type PaymentMethod = "COD" | "JazzCash" | "EasyPaisa";

export interface Order {
  id: number;
  user: string;
  items: OrderItem[];
  total_price: string;
  status: OrderStatus;
  shipping_address: string;
  payment_method: PaymentMethod;
  payment_number?: string | null;
  is_paid: boolean;
  created_at: string;
  assigned_delivery_boy_name?: string | null;
  number_of_bottles?: number;
  delivery_status?: string;
}

export type ComplaintStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export interface Complaint {
  id: number;
  subject: string;
  description: string;
  status: ComplaintStatus;
  created_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: "customer" | "delivery_boy" | "admin";
  phone_number: string | null;
  address: string | null;
  is_available: boolean;
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_staff: boolean;
  can_manage_plant: boolean;
}

/* ---------- Plant management ---------- */

/** A named, optionally-priced lookup (customer types and bottle types). */
export interface PricedType {
  id: number;
  name: string;
  default_price: string | null;
  order: number;
  is_active: boolean;
}
export type CustomerType = PricedType;
export type BottleType = PricedType;

export interface PlantRecord {
  id: number;
  date: string;
  customer_id?: number | null;
  customer_name: string | null;
  customer_type_id?: number | null;
  customer_type_name: string | null;
  bottle_type_id?: number | null;
  bottle_type_name: string | null;
  house: string;
  bottles: number;
  unit_price: string;
  amount: string;
  paid: boolean;
  paid_amount: string;
  pending: string;
  payment_status: "paid" | "partial" | "unpaid";
  notes: string;
  created_at: string;
}

export interface PlantSummary {
  records: number;
  bottles: number;
  amount: number;
  paid_amount: number;
  pending: number;
  unpaid_amount?: number;
  houses: number;
}

export interface PlantCustomer {
  id: number;
  username: string;
  name: string;
  address: string | null;
  phone: string | null;
  price: number;
  has_custom_price: boolean;
}

export interface PlantSettings {
  standard_unit_price: number;
}

export interface PlantDaily {
  date: string;
  bottles: number;
  amount: number;
  paid_amount?: number;
  records: number;
}

export interface PlantTopHouse {
  house: string;
  bottles: number;
  amount: number;
}

export interface PlantAnalytics {
  totals: {
    records: number;
    bottles: number;
    amount: number;
    paid_amount: number;
    pending: number;
    unpaid_amount?: number;
  };
  daily: PlantDaily[];
  top_houses: PlantTopHouse[];
}

export interface PlantDateRange {
  date?: string;
  start?: string;
  end?: string;
}

export interface PlantFilters extends PlantDateRange {
  payment_status?: "paid" | "partial" | "unpaid" | "";
  customer_type?: number | "";
  bottle_type?: number | "";
}

export interface CreatePlantRecordInput {
  date?: string;
  customer_id?: number | null;
  customer_type_id?: number | null;
  bottle_type_id?: number | null;
  house: string;
  bottles: number;
  unit_price?: number | string;
  paid_amount?: number | string;
  notes?: string;
}

export interface PricedTypeInput {
  name: string;
  default_price?: number | null;
  order?: number;
  is_active?: boolean;
}
export type CustomerTypeInput = PricedTypeInput;
export type BottleTypeInput = PricedTypeInput;

/* ---------- API payloads ---------- */

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface CreateOrderItemInput {
  product_id: number;
  quantity: number;
  price: string;
}

export interface CreateOrderPayload {
  items: CreateOrderItemInput[];
  total_price: string;
  shipping_address: string;
  payment_method: PaymentMethod;
  payment_number?: string | null;
}

export interface ComplaintInput {
  subject: string;
  description: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
