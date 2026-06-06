"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui";
import { Chip } from "@/components/ui";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const notify = useToast();

  const handleAdd = () => {
    add(product);
    notify(`Added ${product.name} to cart`);
  };

  return (
    <div className="group glass water-card-glow flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-wave/40">
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-square"
      >
        <ProductImage
          image={product.image}
          alt={product.name}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        {product.category_details && (
          <Chip className="absolute left-3 top-3 bg-abyss/70 text-foam backdrop-blur">
            {product.category_details.name}
          </Chip>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="line-clamp-1 font-semibold text-mist transition group-hover:text-wave">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 flex-1 text-sm text-mist/60">
          {product.description || "No description available."}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-wave">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={handleAdd}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-wave-gradient text-white shadow-glow transition active:scale-90"
            aria-label="Add to cart"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
