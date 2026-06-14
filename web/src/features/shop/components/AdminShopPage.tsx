"use client";

import { useState, useCallback } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Package,
  CheckCircle2,
  EyeOff,
} from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { adminProductsApi, categoriesApi } from "@/lib/api";
import { Button, Card, PageHeader, Skeleton, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { AdminProductRow } from "./AdminProductRow";
import { ProductFormModal } from "./ProductFormModal";

// ─── Summary cards ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-mist/50">{label}</p>
        <p className="text-lg font-bold text-mist">{value}</p>
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminShopPage() {
  const notify = useToast();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | "">("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const categories = useAsync(() => categoriesApi.list(), []);

  const buildQuery = useCallback(() => ({
    search: debouncedSearch || undefined,
    category: filterCategory || undefined,
    is_active: filterActive === "all" ? undefined : filterActive === "active",
  }), [debouncedSearch, filterCategory, filterActive]);

  const products = useAsync(() => adminProductsApi.list(buildQuery()), [debouncedSearch, filterCategory, filterActive]);

  const total = products.data?.length ?? 0;
  const activeCount = products.data?.filter((p) => p.is_active).length ?? 0;
  const inactiveCount = total - activeCount;

  const handleSaved = useCallback((saved: Product) => {
    products.reload();
  }, [products]);

  const handleUpdated = useCallback((updated: Product) => {
    products.setData((prev) =>
      prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev
    );
  }, [products]);

  const handleDeleted = useCallback((id: number) => {
    products.setData((prev) => prev ? prev.filter((p) => p.id !== id) : prev);
  }, [products]);

  const openCreate = () => {
    setEditProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditProduct(product);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          icon={ShoppingBag}
          title="Shop Management"
          subtitle="Add and manage products visible in the store"
        />
        <Button onClick={openCreate}>
          <Plus size={16} /> Add Product
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {products.loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : (
          <>
            <StatCard icon={Package} label="Total Products" value={total} tint="bg-sky-400/15 text-sky-300" />
            <StatCard icon={CheckCircle2} label="Active" value={activeCount} tint="bg-emerald-400/15 text-emerald-300" />
            <StatCard icon={EyeOff} label="Inactive" value={inactiveCount} tint="bg-amber-400/15 text-amber-300" />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full py-2 pl-9 text-sm"
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : "")}
          className="input py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.data?.map((c: Category) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Active filter */}
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
          className="input py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {/* Table */}
      {products.loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : products.error ? (
        <Card className="border-rose-400/30 p-6 text-center text-rose-200">{products.error}</Card>
      ) : !products.data || products.data.length === 0 ? (
        <Card className="p-10 text-center text-mist/50">
          <Package size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No products match the selected filters.</p>
          <button onClick={openCreate} className="mt-3 text-sm text-wave hover:underline">
            Add your first product →
          </button>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left text-xs text-mist/50">
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Image</th>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 font-medium">Price</th>
                <th className="px-3 py-2.5 font-medium">Active</th>
                <th className="px-3 py-2.5 text-center font-medium">Edit</th>
                <th className="px-3 py-2.5 text-center font-medium">Delete</th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((product, idx) => (
                <AdminProductRow
                  key={product.id}
                  product={product}
                  index={idx}
                  onEdit={openEdit}
                  onDeleted={handleDeleted}
                  onUpdated={handleUpdated}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <ProductFormModal
        open={formOpen}
        product={editProduct}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
