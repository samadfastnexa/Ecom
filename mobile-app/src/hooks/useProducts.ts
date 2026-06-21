import { useState, useEffect } from 'react';
import { Product, Category } from '../types/product';
import { ProductService } from '../services/productService';

export const useProducts = (initialCategoryId?: number) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(initialCategoryId);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        ProductService.getAllProducts(selectedCategory),
        ProductService.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (categoryId?: number) => {
    try {
      setLoading(true);
      const data = await ProductService.getAllProducts(categoryId);
      setProducts(data);
      setError(null);
    } catch (err) {
       // Silent error for filtering
       console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
      fetchProducts(selectedCategory);
  }, [selectedCategory]);

  return { 
      products, 
      categories, 
      selectedCategory, 
      setSelectedCategory, 
      loading, 
      error, 
      refetch: fetchData 
  };
};
