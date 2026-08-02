"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, MapPin, Plus, Trash2 } from "lucide-react";
import type { Area } from "@/lib/types";
import { areasApi } from "@/lib/api";
import { Button, Input, Skeleton, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { SettingsSection } from "../SettingsSection";

function AreaRow({ area, onChanged }: { area: Area; onChanged: () => void }) {
  const notify = useToast();
  const [name, setName] = useState(area.name);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== area.name;

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
      <div className="flex-1 min-w-[180px]">
        <label className="label">Area name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {dirty && (
        <Button
          onClick={() => run(() => areasApi.update(area.id, { name: name.trim() }), "Area renamed.")}
          loading={busy}
        >
          <Check size={15} /> Save
        </Button>
      )}

      <Button
        variant="ghost"
        onClick={() =>
          run(
            () => areasApi.update(area.id, { is_active: !area.is_active }),
            area.is_active ? "Hidden from signup." : "Shown on signup.",
          )
        }
        disabled={busy}
        title={area.is_active ? "Hide from the signup dropdown" : "Show on signup"}
      >
        {area.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
        {area.is_active ? "Visible" : "Hidden"}
      </Button>

      <Button
        variant="danger"
        onClick={() => {
          if (!window.confirm(`Delete "${area.name}"? Customers who already chose it keep their address.`)) return;
          run(() => areasApi.remove(area.id), "Area deleted.");
        }}
        disabled={busy}
      >
        <Trash2 size={15} />
      </Button>
    </div>
  );
}

export function AreasSettings() {
  const notify = useToast();
  const areas = useAsync(() => areasApi.adminList(), []);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await areasApi.create({ name });
      setNewName("");
      notify(`"${name}" added.`);
      areas.reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not add that area.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <SettingsSection
      id="areas"
      icon={MapPin}
      title="Delivery Areas"
      description="Localities offered on the signup form. Customers can still type an area that is not listed, so this is a shortcut rather than a restriction."
    >
      <div className="flex flex-col gap-3">
        {areas.loading ? (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        ) : areas.error ? (
          <p className="text-sm text-rose-300">{areas.error}</p>
        ) : (
          <>
            {(areas.data ?? []).map((area) => (
              <AreaRow key={area.id} area={area} onChanged={areas.reload} />
            ))}
            {(areas.data ?? []).length === 0 && (
              <p className="text-sm text-mist/40">
                No areas yet — customers will type their own.
              </p>
            )}
          </>
        )}

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-white/15 p-3">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Add an area</label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="e.g. Johar Town"
            />
          </div>
          <Button onClick={add} loading={adding} disabled={!newName.trim()}>
            <Plus size={15} /> Add
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}
