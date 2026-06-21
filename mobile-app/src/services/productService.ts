import { API_URL } from '../constants/config';
import { Product, Category } from '../types/product';

export const ProductService = {
  getAllProducts: async (categoryId?: number): Promise<Product[]> => {
    try {
      let url = `${API_URL}/products/`;
      if (categoryId) {
        url += `?category=${categoryId}`;
      }
      console.log(`Fetching products from ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(url, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await fetch(`${API_URL}/categories/`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  getProductById: async (id: number): Promise<Product> => {
    try {
      const response = await fetch(`${API_URL}/products/${id}/`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }
};
