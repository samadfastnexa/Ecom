"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Tag, Sparkles, Eye, EyeOff } from "lucide-react";
import type { Category } from "@/lib/types";
import { adminCategoriesApi, categoriesApi } from "@/lib/api";
import { Button, Chip, Input, Modal, Skeleton, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";

interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after any create/update/delete so the parent can refresh its own
   *  category list and product table (deleting a category clears it on products). */
  onChanged: () => void;
}

export function CategoryManagerModal({ open, onClose, onChanged }: CategoryManagerModalProps) {
  const notify = useToast();
  // Refetch each time the modal opens so the list is always current. No
  // `active` filter on purpose: staff get every category, hidden ones
  // included, which is the only way to reach one and switch it back on.
  const cats = useAsync(() => categoriesApi.list(), [open]);

  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [adding, setAdding] = useState(false);

  const afterMutation = () => {
    cats.reload();
    onChanged();
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      notify("Category name is required.", "error");
      return;
    }
    setAdding(true);
    try {
      await adminCategoriesApi.create({ name, icon: newIcon.trim() || undefined });
      notify("Category created.");
      setNewName("");
      setNewIcon("");
      afterMutation();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to create category.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Categories" className="max-w-xl">
      <div className="flex flex-col gap-4">
        {/* Add new category */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-mist/50">
            Add category
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[150px] flex-1">
              <Input
                label="Name"
                requirement="required"
                placeholder="e.g. Water Bottles"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                icon={<Tag size={15} />}
              />
            </div>
            <div className="w-36">
              <Input
                label="Icon"
                requirement="optional"
                placeholder="e.g. water"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                icon={<Sparkles size={15} />}
              />
            </div>
            <Button onClick={handleAdd} loading={adding}>
              <Plus size={16} /> Add
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-mist/40">
            The icon is an Expo Vector Icons name, used by the mobile app.
          </p>
        </div>

        {/* Existing categories */}
        {cats.loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : cats.error ? (
          <p className="rounded-xl border border-rose-400/30 p-4 text-center text-sm text-rose-200">
            {cats.error}
          </p>
        ) : !cats.data || cats.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-mist/50">
            No categories yet — add your first one above.
          </p>
        ) : (
          <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
            {cats.data.map((c) => (
              <CategoryRow key={c.id} category={c} onChanged={afterMutation} notify={notify} />
            ))}
          </div>
        )}

        <p className="text-[11px] text-mist/40">
          Hiding a category takes it off the shop and out of the product form, but
          products already filed under it keep it. Deleting is permanent and leaves
          those products uncategorised.
        </p>

        <div className="pt-1">
          <Button variant="ghost" onClick={onClose} fullWidth>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Single category row (own edit / delete state) ──────────────────────────────

function CategoryRow({
  category,
  onChanged,
  notify,
}: {
  category: Category;
  onChanged: () => void;
  notify: ReturnType<typeof useToast>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const startEdit = () => {
    setName(category.name);
    setIcon(category.icon || "");
    setEditing(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notify("Name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      await adminCategoriesApi.update(category.id, { name: trimmed, icon: icon.trim() });
      notify("Category updated.");
      setEditing(false);
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  /** Retire / restore a category without touching the products filed under it. */
  const toggleActive = async (next: boolean) => {
    setToggling(true);
    try {
      await adminCategoriesApi.update(category.id, { is_active: next });
      notify(
        next
          ? `"${category.name}" is visible to customers again.`
          : `"${category.name}" is hidden — its products keep it.`
      );
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not change visibility.", "error");
    } finally {
      setToggling(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await adminCategoriesApi.delete(category.id);
      notify("Category deleted.");
      onChanged();
    } catch (e) {
      // Keep the confirmation open so the choice (delete vs. hide) is still there.
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-wave/30 bg-wave/5 p-2.5">
        <div className="min-w-[140px] flex-1">
          <Input
            label="Name"
            requirement="required"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>
        <div className="w-36">
          <Input
            label="Icon"
            requirement="optional"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
        </div>
        <Button onClick={save} loading={saving} title="Save">
          <Check size={16} />
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving} title="Cancel">
          <X size={16} />
        </Button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-3">
        <p className="text-sm font-medium text-mist">
          Delete &ldquo;{category.name}&rdquo;?
        </p>
        <p className="mt-1 text-xs text-mist/60">
          Every product filed under it loses its category — that cannot be undone.
          To retire it without touching the products, hide it instead: a hidden
          category disappears from the shop and the product form but stays on the
          products that already use it.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button variant="danger" onClick={remove} loading={deleting}>
            <Trash2 size={14} /> Delete anyway
          </Button>
          {category.is_active && (
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmDelete(false);
                toggleActive(false);
              }}
              disabled={deleting}
            >
              <EyeOff size={14} /> Hide instead
            </Button>
          )}
          <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        category.is_active
          ? "border-white/10 bg-white/5"
          : "border-white/5 bg-white/[0.02] opacity-60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-mist">{category.name}</p>
          {!category.is_active && <Chip className="shrink-0">Hidden</Chip>}
        </div>
        <p className="truncate text-xs text-mist/40">
          {category.icon ? `icon: ${category.icon} · ` : ""}
          /{category.slug}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => toggleActive(!category.is_active)}
          disabled={toggling}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition disabled:opacity-50 ${
            category.is_active
              ? "text-emerald-300 hover:bg-emerald-400/10"
              : "text-amber-300 hover:bg-amber-400/10"
          }`}
          title={
            category.is_active
              ? "Visible to customers — click to hide"
              : "Hidden from customers — click to show"
          }
        >
          {category.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button
          onClick={startEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-mist/50 transition hover:bg-white/10 hover:text-wave"
          title="Edit category"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-mist/40 transition hover:bg-rose-400/10 hover:text-rose-300"
          title="Delete category"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
