"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCategories } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import { HeroSection } from "./HeroSection";
import { CategoryFilter } from "./CategoryFilter";
import { ProductGrid, ProductGridSkeleton } from "./ProductGrid";

/** Home storefront: hero + category filter + server-filtered product grid. */
export function ProductCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);

  const { data: categories } = useCategories();
  const {
    data: products,
    loading,
    error,
  } = useProducts({ category, search: debouncedSearch });

  return (
    <div className="flex flex-col gap-10">
      <HeroSection search={search} onSearchChange={setSearch} />

      <CategoryFilter
        categories={categories ?? []}
        active={category}
        onChange={setCategory}
      />

      <section>
        {error ? (
          <Card className="border-rose-400/30 p-6 text-center text-rose-200">
            {error}
            <p className="mt-1 text-sm text-mist/50">
              Make sure the Django backend is running on{" "}
              <code>{process.env.NEXT_PUBLIC_API_URL}</code>.
            </p>
          </Card>
        ) : loading ? (
          <ProductGridSkeleton />
        ) : (
          <ProductGrid products={products ?? []} />
        )}
      </section>
    </div>
  );
}
