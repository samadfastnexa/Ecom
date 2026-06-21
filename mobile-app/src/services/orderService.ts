import { API_URL } from '../constants/config';
import { getAuthToken } from './authService';
import { CartItem } from '../types/cart';

export interface OrderItem {
  id: number;
  product_details: {
    id: number;
    name: string;
    price: number;
    image: string | null;
  };
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  shipping_address: string;
  payment_method: string;
  created_at: string;
  // Delivery fields
  number_of_bottles?: number;
  delivery_status?: string;
  delivery_status_updated_at?: string | null;
  cash_received?: boolean;
  cash_amount?: number;
  delivery_notes?: string;
}

export interface DeliveryStatus {
  id: number;
  name: string;
  color: string;
  background_color: string;
  border_color: string;
  order: number;
}

export interface CreateOrderPayload {
  items: {
    product_id: number;
    quantity: number;
    price: number;
  }[];
  total_price: number;
  shipping_address: string;
  payment_method: string;
}

export const createOrder = async (orderData: CreateOrderPayload) => {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_URL}/orders/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      let detail = 'Failed to place order';
      try {
        const errorData = await response.json();
        detail = errorData.detail || JSON.stringify(errorData);
      } catch {
        detail = `Server error ${response.status}`;
      }
      throw new Error(detail);
    }

    return await response.json();
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

export const getOrders = async () => {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_URL}/orders/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    return await response.json();
  } catch (error) {
    console.error('Get orders error:', error);
    throw error;
  }
};

// Delivery Boy Functions
export const getDeliveryOrders = async () => {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_URL}/orders/delivery/orders/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch delivery orders');
    }

    const data = await response.json();
    // Backend returns {value: [...], Count: n}, extract the array
    return data.value || data;
  } catch (error) {
    console.error('Get delivery orders error:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: number, status: string, additionalData?: any) => {
  const token = await getAuthToken();
  try {
    const body = { 
      status, 
      ...additionalData
    };
    
    console.log('🔄 Updating order:', orderId);
    console.log('📦 Update payload:', JSON.stringify(body, null, 2));
    
    const response = await fetch(`${API_URL}/orders/delivery/orders/${orderId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Update failed:', errorData);
      throw new Error('Failed to update order status');
    }

    const result = await response.json();
    console.log('✅ Update successful:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Update order status error:', error);
    throw error;
  }
};

export const getDeliveryStats = async () => {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_URL}/orders/delivery/stats/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch delivery stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Get delivery stats error:', error);
    throw error;
  }
};

export const updateAvailability = async (isAvailable: boolean) => {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_URL}/orders/delivery/availability/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ is_available: isAvailable }),
    });

    if (!response.ok) {
      throw new Error('Failed to update availability');
    }

    return await response.json();
  } catch (error) {
    console.error('Update availability error:', error);
    throw error;
  }
};

export const getDeliveryStatuses = async (): Promise<DeliveryStatus[]> => {
  const token = await getAuthToken();
  try {
    const response = await fetch(`${API_URL}/orders/delivery/statuses/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch delivery statuses');
    }

    const data = await response.json();
    // Backend might return {value: [...]} or just [...], handle both
    return Array.isArray(data) ? data : (data.value || []);
  } catch (error) {
    console.error('Get delivery statuses error:', error);
    throw error;
  }
};
