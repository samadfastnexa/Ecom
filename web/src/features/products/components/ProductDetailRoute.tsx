"use client";

import { useParams } from "next/navigation";
import { ProductDetail } from "./ProductDetail";

/**
 * Client wrapper for the statically-exported /products/[id] route. Reads the
 * real product id from the URL at runtime, so a single exported shell (served
 * via a catch-all rewrite on the static host) works for any product id.
 */
export function ProductDetailRoute() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <ProductDetail id={String(id ?? "")} />;
}
