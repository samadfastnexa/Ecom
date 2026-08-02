/* ---------- Domain models ---------- */

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface ImageRef {
  id: number;
  image: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  is_active: boolean;
  image: string | null;
  images: ImageRef[];
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

/** Cash on delivery only — the business does not accept mobile wallets. */
export type PaymentMethod = "COD";

export interface Order {
  id: number;
  user?: string | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  items: OrderItem[];
  total_price: string;
  status: OrderStatus;
  shipping_address: string;
  payment_method: PaymentMethod;
  payment_number?: string | null;
  is_paid: boolean;
  is_hidden?: boolean;
  created_at: string;
  assigned_delivery_boy?: number | null;
  assigned_delivery_boy_name?: string | null;
  delivery_notes?: string | null;
  number_of_bottles?: number;
  delivery_status?: string;
  delivery_status_updated_at?: string | null;
  delivery_assigned_at?: string | null;
  delivery_completed_at?: string | null;
  cash_received?: boolean;
  cash_amount?: string;
}

export type ComplaintStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED";

export interface Complaint {
  id: number;
  subject: string;
  description: string;
  status: ComplaintStatus;
  admin_reply?: string | null;
  admin_reply_at?: string | null;
  created_at: string;
  images?: ImageRef[];
}

export interface AdminComplaint extends Complaint {
  user_name: string;
  user_email: string;
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
  account_balance: string; // decimal string from API, positive = credit, negative = owes
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
  phone_number: string;
  /** Structured delivery address — the backend composes these into `address`. */
  house_number: string;
  portion?: string;
  block_area: string;
}

export interface UpdateProfilePayload {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string | null;
  address?: string | null;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
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
  images?: File[];
}

/* ---------- Admin order management ---------- */

export interface AdminOrder extends Order {
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_balance: number | null; // account balance of linked user, null for guests
}

export interface AdminOrderSummary {
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

export interface AdminOrderFilters {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  is_paid?: boolean | "";
  show_hidden?: boolean;
}

export interface AdminOrderUpdatePayload {
  status?: OrderStatus;
  is_paid?: boolean;
  is_hidden?: boolean;
  assigned_delivery_boy?: number | null;
  delivery_notes?: string;
  cash_amount?: string | number;
  cash_received?: boolean;
  delivery_status?: string;
}

export interface DeliveryStatusOption {
  id: number;
  name: string;
  color: string;
  background_color: string;
  border_color: string;
  order: number;
}

export interface CreateAdminOrderPayload {
  user_id?: number | null;
  guest_name?: string;
  guest_phone?: string;
  shipping_address: string;
  payment_method: PaymentMethod;
  payment_number?: string;
  assigned_delivery_boy?: number | null;
  delivery_notes?: string;
  status?: OrderStatus;
  items: { product_id: number; quantity: number }[];
}

export interface DeliveryBoy {
  id: number;
  name: string;
  is_available: boolean;
}

export interface CustomerOrderStats {
  total_orders: number;
  delivered_count: number;
  total_bottles: number;
  last_order_date: string | null;
  account_balance: number | null;
}

export interface AdminCustomer {
  id: number;
  username: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  date_joined: string;
  is_active: boolean;
}

export interface CreateCustomerPayload {
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
}

export type WorkingStatus = 'Active' | 'Inactive' | 'Resigned' | 'Terminated' | 'On Leave';

export interface StaffProfile {
  id: number;          // UserProfile.id
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  phone_number: string | null;
  address: string | null;
  is_available: boolean;
  // Rider
  is_rider: boolean;
  vehicle_type: string | null;
  vehicle_number: string | null;
  // HR
  employee_id: string | null;
  cnic_number: string | null;
  date_of_birth: string | null;
  age: number | null;
  date_of_joining: string | null;
  working_status: WorkingStatus;
  emergency_contact: string | null;
  department: string | null;
  designation: string | null;
  salary: string | null;
  remarks: string | null;
  // Media URLs
  profile_picture_url: string | null;
  cnic_front_url: string | null;
  cnic_back_url: string | null;
  driving_license_url: string | null;
  // Stats (riders only)
  total_deliveries: number | null;
  delivered_count: number | null;
}

export interface CreateStaffPayload {
  username: string;
  email?: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address?: string;
  is_rider?: boolean;
  vehicle_type?: string;
  vehicle_number?: string;
  employee_id?: string;
  cnic_number?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  working_status?: WorkingStatus;
  emergency_contact?: string;
  department?: string;
  designation?: string;
  salary?: number;
  remarks?: string;
}

export interface UpdateStaffPayload {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_active?: boolean;
  phone_number?: string | null;
  address?: string | null;
  is_rider?: boolean;
  is_available?: boolean;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  employee_id?: string | null;
  cnic_number?: string | null;
  date_of_birth?: string | null;
  date_of_joining?: string | null;
  working_status?: WorkingStatus;
  emergency_contact?: string | null;
  department?: string | null;
  designation?: string | null;
  salary?: number | null;
  remarks?: string | null;
}

export interface MobileProfileFieldConfig {
  visible: boolean;
  editable: boolean;
  label: string;
}

export type MobileProfileConfig = Record<string, MobileProfileFieldConfig>;

// Legacy alias
export type RiderProfile = StaffProfile;
export type CreateRiderPayload = CreateStaffPayload;
export type UpdateRiderPayload = UpdateStaffPayload;

/* ---------- Customer ledger ---------- */

export type LedgerEntryType =
  | "opening"
  | "order_charge"
  | "order_payment"
  | "plant_charge"
  | "plant_payment"
  | "payment"
  | "adjustment"
  | "refund";

/** Cash only. */
export type LedgerPaymentMethod = "Cash";

export interface LedgerEntry {
  id: number;
  entry_date: string;
  entry_type: LedgerEntryType;
  entry_type_display: string;
  description: string;
  item_label: string;
  quantity: string | null;
  unit_price: string | null;
  document_number: string;
  document_label: string;
  /** Stored sign: positive = credit to the customer. */
  amount: string;
  debit: string | null;
  credit: string | null;
  /** Statement rows only — recomputed, owed-positive. */
  running_balance?: string;
  /** Frozen at insert time, stored credit-positive. Negate for "owed". */
  balance_after: string | null;
  bottles_out: number;
  bottles_in: number;
  stock_after?: number;
  payment_method: string;
  reference: string;
  receipt_number: string | null;
  source: "shop" | "plant" | "manual";
  is_reversal: boolean;
  is_reversed: boolean;
  can_void: boolean;
  void_reason: string;
  customer: number;
  customer_name: string;
  created_by_name: string | null;
  created_at: string;
  notes: string;
}

export interface LedgerStatement {
  customer: {
    id: number;
    name: string;
    username: string;
    customer_code: string | null;
    phone: string | null;
    address: string | null;
  };
  period: { start: string | null; end: string | null };
  /** All balances below are owed-positive. */
  opening_balance: string;
  closing_balance: string;
  opening_stock: number;
  closing_stock: number;
  totals: {
    debit: string;
    credit: string;
    quantity: string;
    bottles_out: number;
    bottles_in: number;
  };
  count: number;
  limit: number;
  offset: number;
  results: LedgerEntry[];
}

export interface LedgerSummary {
  customer_id: number;
  customer_name: string;
  customer_code: string | null;
  phone: string | null;
  address: string | null;
  balance: string;
  bottles_held: number;
  total_charged: string;
  total_paid: string;
  entry_count: number;
  last_entry_date: string | null;
  last_payment: {
    date: string;
    amount: string;
    receipt_number: string | null;
  } | null;
}

export interface Receivable {
  id: number;
  username: string;
  name: string;
  customer_code: string | null;
  phone: string | null;
  address: string | null;
  balance: string;
  bottles_held: number;
  last_entry_date: string | null;
  last_payment_date: string | null;
}

export interface StatementFilters {
  start?: string;
  end?: string;
  source?: "shop" | "plant" | "manual";
  entry_type?: LedgerEntryType;
}

export interface RecordPaymentInput {
  customer_id: number;
  amount: string;
  payment_method?: LedgerPaymentMethod;
  entry_date?: string;
  reference?: string;
  notes?: string;
}

export interface ManualEntryInput {
  customer_id: number;
  entry_type: "opening" | "adjustment" | "refund";
  amount: string;
  description: string;
  entry_date?: string;
  bottles_out?: number;
  bottles_in?: number;
  notes?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
