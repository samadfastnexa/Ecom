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
  category: number | null;
  category_details?: Category;
  created_at: string;
  updated_at: string;
}
