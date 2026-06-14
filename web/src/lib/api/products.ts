import { apiFetch, unwrapList } from "./client";
import type { Category, Paginated, Product } from "../types";

export interface ProductQuery {
  category?: number | null;
  search?: string;
}

export interface AdminProductQuery {
  search?: string;
  category?: number | null;
  is_active?: boolean;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: string | number;
  is_active?: boolean;
  category?: number | null;
  image?: File | null;
}

function toFormData(data: ProductInput): FormData {
  const fd = new FormData();
  fd.append("name", data.name);
  if (data.description !== undefined) fd.append("description", data.description);
  fd.append("price", String(data.price));
  fd.append("is_active", String(data.is_active ?? true));
  if (data.category != null) fd.append("category", String(data.category));
  if (data.image instanceof File) fd.append("image", data.image);
  return fd;
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

export const adminProductsApi = {
  list(query: AdminProductQuery = {}): Promise<Product[]> {
    const sp = new URLSearchParams();
    if (query.search) sp.set("search", query.search);
    if (query.category != null) sp.set("category", String(query.category));
    if (query.is_active !== undefined) sp.set("is_active", String(query.is_active));
    const qs = sp.toString();
    return apiFetch<Product[] | Paginated<Product>>(
      `/products/${qs ? `?${qs}` : ""}`,
      { auth: true }
    ).then(unwrapList);
  },

  create(data: ProductInput): Promise<Product> {
    return apiFetch<Product>("/products/", {
      method: "POST",
      auth: true,
      body: toFormData(data),
    });
  },

  update(id: number, data: ProductInput): Promise<Product> {
    return apiFetch<Product>(`/products/${id}/`, {
      method: "PATCH",
      auth: true,
      body: toFormData(data),
    });
  },

  delete(id: number): Promise<void> {
    return apiFetch<void>(`/products/${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export const categoriesApi = {
  list(): Promise<Category[]> {
    return apiFetch<Category[] | Paginated<Category>>("/categories/").then(
      unwrapList
    );
  },
};
