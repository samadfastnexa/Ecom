import { Product } from './product';

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  AdminOrders: { initialStatus?: string; initialPaid?: boolean } | undefined;
  AdminCustomers: undefined;
  AdminManage: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  AdminTabs: { screen?: keyof AdminTabParamList; params?: Record<string, unknown> } | undefined;
  ProductDetail: { product: Product };
  Cart: undefined;
  Checkout: undefined;
  Complaints: undefined;
  OrderSuccess: { orderId: number; total: number; paymentMethod: string };
  DeliveryOrderDetail: { order: any };
  AdminOrderDetail: { order: any; deliveryBoys: any[] };
  AdminCreateOrder: undefined;
  AdminStaff: undefined;
  AdminSettings: undefined;
  AdminActivity: undefined;
  AdminNotification: undefined;
  AdminPlant: undefined;
  AdminShop: undefined;
};
