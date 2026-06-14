"use client";

import { useState } from "react";
import { Pencil, Trash2, ImageIcon } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { adminProductsApi } from "@/lib/api";
import { useToast } from "@/components/ui";

interface AdminProductRowProps {
  product: Product;
  index: number;
  onEdit: (product: Product) => void;
  onDeleted: (id: number) => void;
  onUpdated: (product: Product) => void;
}

export function AdminProductRow({
  product,
  index,
  onEdit,
  onDeleted,
  onUpdated,
}: AdminProductRowProps) {
  const notify = useToast();
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleActive = async () => {
    setToggling(true);
    try {
      const updated = await adminProductsApi.update(product.id, {
        name: product.name,
        description: product.description,
        price: product.price,
        is_active: !product.is_active,
        category: product.category_details?.id ?? null,
      });
      onUpdated(updated);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await adminProductsApi.delete(product.id);
      notify("Product deleted.");
      onDeleted(product.id);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <tr
      className={cn(
        "border-b border-white/5 transition hover:bg-white/5",
        !product.is_active && "opacity-50"
      )}
    >
      <td className="px-3 py-2.5 text-sm text-mist/40">{index + 1}</td>

      {/* Image */}
      <td className="px-3 py-2.5">
        <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon size={16} className="text-mist/20" />
          )}
        </div>
      </td>

      {/* Name + description */}
      <td className="px-3 py-2.5">
        <p className="text-sm font-medium leading-tight text-mist">{product.name}</p>
        {product.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-mist/50">{product.description}</p>
        )}
      </td>

      {/* Category */}
      <td className="px-3 py-2.5">
        {product.category_details ? (
          <span className="rounded-full bg-wave/15 px-2 py-0.5 text-xs text-wave">
            {product.category_details.name}
          </span>
        ) : (
          <span className="text-xs text-mist/30">—</span>
        )}
      </td>

      {/* Price */}
      <td className="px-3 py-2.5 text-sm font-medium text-mist">
        {formatPrice(parseFloat(product.price))}
      </td>

      {/* Active toggle */}
      <td className="px-3 py-2.5">
        <button
          disabled={toggling}
          onClick={toggleActive}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            product.is_active ? "bg-wave" : "bg-white/20",
            toggling && "opacity-50"
          )}
          title={product.is_active ? "Deactivate" : "Activate"}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
              product.is_active ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </td>

      {/* Edit */}
      <td className="px-3 py-2.5 text-center">
        <button
          onClick={() => onEdit(product)}
          className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-mist/50 transition hover:bg-white/10 hover:text-wave"
          title="Edit product"
        >
          <Pencil size={14} />
        </button>
      </td>

      {/* Delete */}
      <td className="px-3 py-2.5 text-center">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="rounded px-2 py-0.5 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
            >
              {deleting ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded px-2 py-0.5 text-xs text-mist/50 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-mist/40 transition hover:bg-rose-400/10 hover:text-rose-300"
            title="Delete product"
          >
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}
