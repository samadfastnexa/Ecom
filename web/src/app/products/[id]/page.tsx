import { ProductDetailRoute } from "@/features/products/components/ProductDetailRoute";

// Static export needs the set of product pages up front. Fetch ids from the
// live API at build time so known products get their own static page. Always
// include a "_" placeholder so the build succeeds even with zero products and
// so a catch-all rewrite can serve arbitrary ids to this client-rendered shell.
export async function generateStaticParams() {
  const params: { id: string }[] = [{ id: "_" }];
  try {
    const base =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api";
    const res = await fetch(`${base}/products/`);
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.results ?? [];
      for (const p of items as { id: number | string }[]) {
        params.push({ id: String(p.id) });
      }
    }
  } catch {
    // API unreachable at build time; the placeholder still produces a shell.
  }
  return params;
}

export default function ProductDetailPage() {
  // The real id is read from the URL on the client (see ProductDetailRoute),
  // so a single shell works for any product when served via the rewrite.
  return <ProductDetailRoute />;
}
