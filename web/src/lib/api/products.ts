import { apiFetch, unwrapList } from "./client";
import type { Category, Paginated, Product } from "../types";

export interface ProductQuery {
  category?: number | null;
  search?: string;
}

export const productsApi = {
  list(query: ProductQuery = {}): Promise<Product[]> {
    const sp = new URLSearchParams();
    if (query.category) sp.set("category", String(query.category));
    if (query.search) sp.set("search", query.search);
    sp.set("is_active", "true");
    const qs = sp.toString();
    return apiFetch<Product[] | Paginated<Product>>(
      `/products/${qs ? `?${qs}` : ""}`
    ).then(unwrapList);
  },

  get(id: string | number): Promise<Product> {
    return apiFetch<Product>(`/products/${id}/`);
  },
};

export const categoriesApi = {
  list(): Promise<Category[]> {
    return apiFetch<Category[] | Paginated<Category>>("/categories/").then(
      unwrapList
    );
  },
};
