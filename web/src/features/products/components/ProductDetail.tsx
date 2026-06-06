"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import {
  Button,
  Card,
  Chip,
  QuantityStepper,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useProduct } from "../hooks/useProduct";
import { ProductImage } from "./ProductImage";

export function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const { add } = useCart();
  const notify = useToast();
  const { data: product, loading, error } = useProduct(id);
  const [qty, setQty] = useState(1);

  if (loading) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <Card className="p-10 text-center text-mist/70">
        <p>{error || "Product not found."}</p>
        <Link href="/" className="btn-primary mt-4 inline-flex">
          Back to shop
        </Link>
      </Card>
    );
  }

  const handleAdd = () => {
    add(product, qty);
    notify(`Added ${qty} × ${product.name} to cart`);
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-sm text-mist/60 transition hover:text-wave"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductImage
          image={product.image}
          alt={product.name}
          className="glass aspect-square"
          iconSize={80}
        />

        <div className="flex flex-col">
          {product.category_details && (
            <Chip className="mb-3 w-fit bg-white/10 text-foam">
              {product.category_details.name}
            </Chip>
          )}
          <h1 className="text-3xl font-bold text-mist">{product.name}</h1>
          <p className="mt-2 text-3xl font-bold text-wave">
            {formatPrice(product.price)}
          </p>
          <p className="mt-5 leading-relaxed text-mist/70">
            {product.description || "No description available for this product."}
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
            <CheckCircle2 size={16} /> In stock & ready to ship
          </div>

          <div className="mt-8 flex items-center gap-4">
            <QuantityStepper value={qty} onChange={setQty} />
            <Button onClick={handleAdd} fullWidth className="flex-1">
              <ShoppingCart size={18} /> Add to cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
