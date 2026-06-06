"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { CartItem } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { QuantityStepper } from "@/components/ui";
import { ProductImage } from "@/features/products/components/ProductImage";

export function CartLineItem({ item }: { item: CartItem }) {
  const { product, quantity } = item;
  const { setQuantity, remove } = useCart();

  return (
    <div className="glass flex items-center gap-4 p-3">
      <Link
        href={`/products/${product.id}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-xl"
      >
        <ProductImage
          image={product.image}
          alt={product.name}
          className="h-full w-full"
          iconSize={28}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-1 font-semibold text-mist hover:text-wave"
        >
          {product.name}
        </Link>
        <p className="text-sm text-wave">{formatPrice(product.price)}</p>
        <div className="mt-2">
          <QuantityStepper
            size="sm"
            value={quantity}
            onChange={(q) => setQuantity(product.id, q)}
            min={0}
          />
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className="font-bold text-mist">
          {formatPrice(parseFloat(product.price) * quantity)}
        </span>
        <button
          onClick={() => remove(product.id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-mist/50 transition hover:bg-rose-500/20 hover:text-rose-300"
          aria-label="Remove"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
