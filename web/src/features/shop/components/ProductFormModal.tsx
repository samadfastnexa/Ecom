"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, FileText, DollarSign, ImageIcon, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import type { ProductInput } from "@/lib/api/products";
import { adminProductsApi, categoriesApi } from "@/lib/api";
import { Button, Input, Modal, useToast } from "@/components/ui";
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
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      setImageFile(null);
      setImagePreview(product.image || null);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCategoryId("");
      setIsActive(true);
      setImageFile(null);
      setImagePreview(null);
    }
    setErrors({});
  }, [product, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

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
        image: imageFile,
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

        {/* Image upload */}
        <div>
          <label className="label">Product image (optional)</label>
          {imagePreview ? (
            <div className="relative w-full overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Preview"
                className="h-40 w-full object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-abyss/80 text-mist/80 hover:text-rose-300"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-6 transition hover:bg-white/10">
              <ImageIcon size={24} className="text-mist/30" />
              <span className="text-xs text-mist/50">Click to upload image</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>

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
