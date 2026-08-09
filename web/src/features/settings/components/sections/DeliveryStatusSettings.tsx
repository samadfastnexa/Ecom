"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Plus, Trash2, Truck } from "lucide-react";
import type { AdminDeliveryStatus } from "@/lib/types";
import { deliveryStatusesApi } from "@/lib/api/orders";
import { Button, Input, Skeleton, useToast } from "@/components/ui";
import { useAsync } from "@/hooks/useAsync";
import { SettingsSection } from "../SettingsSection";

/**
 * The statuses a rider picks from when closing a delivery.
 *
 * Retiring one is `is_active = false`, never a delete: orders record the status
 * by name, so removing the row would leave historic deliveries labelled with
 * something nothing can explain. The server refuses to delete one that any
 * order already uses and says so.
 */

const NEW_STATUS = {
  name: "",
  color: "#0A84FF",
  background_color: "#F0F8FF",
  border_color: "#0A84FF",
  order: 0,
  is_active: true,
};

/** The chip exactly as the rider's app renders it, so colours are picked by eye. */
function StatusPreview({ s }: { s: Pick<AdminDeliveryStatus, "name" | "color" | "background_color" | "border_color"> }) {
  return (
    <span
      className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold"
      style={{ color: s.color, backgroundColor: s.background_color, borderColor: s.border_color }}
    >
      {s.name || "Preview"}
    </span>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="w-[104px]">
      <label className="label">{label}</label>
      <div className="flex items-center gap-1.5">
        {/* The native swatch is the quick way in; the text box is there because
            a brand hex usually arrives as a string to paste. */}
        <input
          type="color"
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
          aria-label={label}
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="text-xs" />
      </div>
    </div>
  );
}

function StatusRow({ status, onChanged }: { status: AdminDeliveryStatus; onChanged: () => void }) {
  const notify = useToast();
  const [draft, setDraft] = useState(status);
  const [busy, setBusy] = useState(false);

  const dirty =
    draft.name.trim() !== status.name ||
    draft.color !== status.color ||
    draft.background_color !== status.background_color ||
    draft.border_color !== status.border_color ||
    Number(draft.order) !== status.order;

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

  const set = <K extends keyof AdminDeliveryStatus>(key: K, value: AdminDeliveryStatus[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="min-w-[150px] flex-1">
        <label className="label">Status name</label>
        <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <ColorField label="Text" value={draft.color} onChange={(v) => set("color", v)} />
      <ColorField label="Background" value={draft.background_color} onChange={(v) => set("background_color", v)} />
      <ColorField label="Border" value={draft.border_color} onChange={(v) => set("border_color", v)} />

      <div className="w-[74px]">
        <label className="label">Order</label>
        <Input
          type="number"
          value={String(draft.order)}
          onChange={(e) => set("order", Number(e.target.value))}
        />
      </div>

      <div className="flex items-center pb-1.5">
        <StatusPreview s={draft} />
      </div>

      {dirty && (
        <Button
          onClick={() =>
            run(
              () =>
                deliveryStatusesApi.update(status.id, {
                  name: draft.name.trim(),
                  color: draft.color,
                  background_color: draft.background_color,
                  border_color: draft.border_color,
                  order: Number(draft.order),
                }),
              "Status saved.",
            )
          }
          loading={busy}
        >
          <Check size={15} /> Save
        </Button>
      )}

      <Button
        variant="ghost"
        onClick={() =>
          run(
            () => deliveryStatusesApi.update(status.id, { is_active: !status.is_active }),
            status.is_active ? "Hidden from riders." : "Available to riders.",
          )
        }
        disabled={busy}
        title={status.is_active ? "Stop offering this to riders" : "Offer this to riders again"}
      >
        {status.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
        {status.is_active ? "Active" : "Retired"}
      </Button>

      <Button
        variant="ghost"
        onClick={() => {
          if (!confirm(`Delete "${status.name}"? Statuses already used by an order cannot be deleted — retire them instead.`)) return;
          run(() => deliveryStatusesApi.remove(status.id), "Status deleted.");
        }}
        disabled={busy}
        title="Delete (only possible if no order uses it)"
      >
        <Trash2 size={15} />
      </Button>
    </div>
  );
}

export function DeliveryStatusSettings() {
  const notify = useToast();
  const list = useAsync(() => deliveryStatusesApi.adminList(), []);
  const [draft, setDraft] = useState(NEW_STATUS);
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!draft.name.trim()) {
      notify("Give the status a name.", "error");
      return;
    }
    setAdding(true);
    try {
      await deliveryStatusesApi.create({ ...draft, name: draft.name.trim(), order: Number(draft.order) });
      setDraft(NEW_STATUS);
      notify("Status added.");
      list.reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to add.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <SettingsSection
      id="delivery-statuses"
      icon={Truck}
      title="Delivery Statuses"
      description="What a rider can mark a delivery as when they close it. Colours are exactly what they see on their phone."
    >
      {list.loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(list.data ?? []).map((s) => (
            <StatusRow key={s.id} status={s} onChanged={list.reload} />
          ))}

          {(list.data ?? []).length === 0 && (
            <p className="text-sm text-mist/50">
              No statuses yet — riders will only be able to leave a delivery as Pending.
            </p>
          )}

          {/* Add new */}
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-white/15 p-3">
            <div className="min-w-[150px] flex-1">
              <label className="label">New status</label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Gate locked"
              />
            </div>
            <ColorField label="Text" value={draft.color} onChange={(v) => setDraft({ ...draft, color: v })} />
            <ColorField label="Background" value={draft.background_color} onChange={(v) => setDraft({ ...draft, background_color: v })} />
            <ColorField label="Border" value={draft.border_color} onChange={(v) => setDraft({ ...draft, border_color: v })} />
            <div className="w-[74px]">
              <label className="label">Order</label>
              <Input
                type="number"
                value={String(draft.order)}
                onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center pb-1.5">
              <StatusPreview s={draft} />
            </div>
            <Button onClick={add} loading={adding}>
              <Plus size={15} /> Add
            </Button>
          </div>

          <p className="text-xs text-mist/50">
            Retiring a status keeps it on past deliveries but takes it off the rider&apos;s
            picker. Deleting is only possible while no order has ever used it.
          </p>
        </div>
      )}
    </SettingsSection>
  );
}
