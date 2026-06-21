"use client";

import { useState, useEffect } from "react";
import { Tag, FileText, DollarSign } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import type { ProductInput } from "@/lib/api/products";
import { adminProductsApi, categoriesApi } from "@/lib/api";
import { Button, Input, Modal, MultiImagePicker, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";

interface ProductFormModalProps {
  open: boolean;
  product?: Product | null; // null = create mode
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export function ProductFormModal({ open, product, onClose, onSaved }: ProductFormModalProps) {
  const notify = useToast();
  const categories = useAsync(() => categoriesApi.list(), []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!product;

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price);
      setCategoryId(product.category_details?.id ?? "");
      setIsActive(product.is_active);
      setImageFiles([]);
      // Prefer the gallery; fall back to the legacy single image.
      const urls = product.images?.length
        ? product.images.map((img) => img.image)
        : product.image
          ? [product.image]
          : [];
      setExistingImages(urls);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCategoryId("");
      setIsActive(true);
      setImageFiles([]);
      setExistingImages([]);
    }
    setErrors({});
  }, [product, open]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    const p = parseFloat(price);
    if (!price || isNaN(p) || p < 0) errs.price = "Enter a valid price.";
    return errs;
  };

  const submit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload: ProductInput = {
        name: name.trim(),
        description: description.trim(),
        price,
        is_active: isActive,
        category: categoryId || null,
        // Only send images when the user picked new ones; otherwise keep existing.
        images: imageFiles.length ? imageFiles : undefined,
      };
      const saved = isEdit
        ? await adminProductsApi.update(product.id, payload)
        : await adminProductsApi.create(payload);
      notify(`Product ${isEdit ? "updated" : "created"} successfully.`);
      onSaved(saved);
      onClose();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${product?.name}` : "New Product"}
      className="max-w-3xl"
    >
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Name */}
        <Input
          label="Product name"
          placeholder="e.g. 20L Water Bottle"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<Tag size={15} />}
          error={errors.name}
        />

        {/* Description */}
        <div>
          <label className="label">Description (optional)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-mist/40">
              <FileText size={15} />
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short product description…"
              rows={3}
              className="input w-full resize-none pl-11 text-sm"
            />
          </div>
        </div>

        {/* Price + Category row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price (Rs.)"
            placeholder="0.00"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            icon={<DollarSign size={15} />}
            error={errors.price}
          />
          <div>
            <label className="label">Category (optional)</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
              className="input text-sm"
            >
              <option value="">— No category —</option>
              {categories.data?.map((c: Category) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-mist">Active</p>
            <p className="text-xs text-mist/50">Visible to customers in the shop</p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              isActive ? "bg-wave" : "bg-white/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Image upload (gallery, up to 3) */}
        <MultiImagePicker
          label="Product images (optional)"
          value={imageFiles}
          onChange={setImageFiles}
          existing={existingImages}
          onError={(msg) => notify(msg, "error")}
        />

        <div className="flex gap-3 pt-1">
          <Button onClick={submit} loading={saving} fullWidth>
            {isEdit ? "Save changes" : "Create product"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={saving} fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
