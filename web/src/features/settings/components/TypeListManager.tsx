"use client";

import { useState } from "react";
import { Plus, Trash2, Check, Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PricedType } from "@/lib/types";
import type { TypeResource } from "@/lib/api/plant";
import { Button, Input, Skeleton, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { SettingsSection } from "./SettingsSection";

function TypeRow({
  item,
  resource,
  onChanged,
}: {
  item: PricedType;
  resource: TypeResource;
  onChanged: () => void;
}) {
  const notify = useToast();
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.default_price ?? "");
  const [busy, setBusy] = useState(false);

  const dirty =
    name !== item.name || String(price) !== String(item.default_price ?? "");

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) notify(ok);
      onChanged();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex-1">
        <label className="label">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="w-32">
        <label className="label">Price/bottle</label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="standard"
        />
      </div>
      {dirty && (
        <Button
          onClick={() =>
            run(
              () =>
                resource.update(item.id, {
                  name: name.trim(),
                  default_price: price === "" ? null : Number(price),
                }),
              "Saved."
            )
          }
          loading={busy}
          className="px-3"
        >
          <Check size={16} /> Save
        </Button>
      )}
      <button
        onClick={() =>
          run(() => resource.update(item.id, { is_active: !item.is_active }))
        }
        disabled={busy}
        title={item.is_active ? "Active (click to hide)" : "Hidden (click to show)"}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 transition ${
          item.is_active
            ? "bg-emerald-400/15 text-emerald-300"
            : "bg-white/5 text-mist/40"
        }`}
      >
        {item.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      <button
        onClick={() => run(() => resource.remove(item.id), "Deleted.")}
        disabled={busy}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-mist/50 transition hover:bg-rose-500/20 hover:text-rose-300"
        aria-label="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

interface TypeListManagerProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  resource: TypeResource;
  namePlaceholder: string;
}

/** Generic CRUD UI for a named/priced lookup list (customer & bottle types). */
export function TypeListManager({
  id,
  icon,
  title,
  description,
  resource,
  namePlaceholder,
}: TypeListManagerProps) {
  const { data, loading, reload } = useAsync(() => resource.list(false), [id]);
  const notify = useToast();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await resource.create({
        name: name.trim(),
        default_price: price === "" ? null : Number(price),
      });
      setName("");
      setPrice("");
      notify("Added.");
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to add.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <SettingsSection id={id} icon={icon} title={title} description={description}>
      <form onSubmit={add} className="mb-5 flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="label">New name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePlaceholder}
          />
        </div>
        <div className="w-36">
          <label className="label">Price/bottle (opt.)</label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="standard"
          />
        </div>
        <Button type="submit" loading={adding}>
          <Plus size={16} /> Add
        </Button>
      </form>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-mist/50">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((t) => (
            <TypeRow key={t.id} item={t} resource={resource} onChanged={reload} />
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
