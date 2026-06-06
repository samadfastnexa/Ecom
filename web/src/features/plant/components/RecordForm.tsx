"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusCircle, Droplet } from "lucide-react";
import type {
  CreatePlantRecordInput,
  CustomerType,
  BottleType,
  PlantCustomer,
} from "@/lib/types";
import { plantApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Button, Input, useToast } from "@/components/ui";
import { isoDate } from "../dateRange";

interface RecordFormProps {
  standardPrice: number;
  customers: PlantCustomer[];
  customerTypes: CustomerType[];
  bottleTypes: BottleType[];
  onCreated: () => void;
}

export function RecordForm({
  standardPrice,
  customers,
  customerTypes,
  bottleTypes,
  onCreated,
}: RecordFormProps) {
  const notify = useToast();

  const [date, setDate] = useState(isoDate());
  const [customerId, setCustomerId] = useState<number | "">("");
  const [typeId, setTypeId] = useState<number | "">("");
  const [bottleTypeId, setBottleTypeId] = useState<number | "">("");
  const [house, setHouse] = useState("");
  const [bottles, setBottles] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [received, setReceived] = useState("");
  const [receivedTouched, setReceivedTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedType = customerTypes.find((t) => t.id === typeId);
  const selectedBottleType = bottleTypes.find((b) => b.id === bottleTypeId);

  // Price priority: customer override → bottle-type → customer-type → standard.
  const autoPrice = useMemo(() => {
    if (selectedCustomer?.has_custom_price) return selectedCustomer.price;
    if (selectedBottleType?.default_price != null)
      return Number(selectedBottleType.default_price);
    if (selectedType?.default_price != null)
      return Number(selectedType.default_price);
    return standardPrice;
  }, [selectedCustomer, selectedBottleType, selectedType, standardPrice]);

  // Keep the price field in sync with the resolved auto price until the user
  // edits it manually.
  useEffect(() => {
    if (!priceTouched) setUnitPrice(autoPrice > 0 ? String(autoPrice) : "");
  }, [autoPrice, priceTouched]);

  const amount = useMemo(
    () => (Number(bottles) || 0) * (Number(unitPrice) || 0),
    [bottles, unitPrice]
  );

  // Default the received amount to the full total until the user edits it.
  useEffect(() => {
    if (!receivedTouched) setReceived(amount > 0 ? String(amount) : "");
  }, [amount, receivedTouched]);

  const pending = Math.max(0, amount - (Number(received) || 0));

  const onSelectCustomer = (idStr: string) => {
    const id = idStr ? Number(idStr) : "";
    setCustomerId(id);
    if (id) {
      const c = customers.find((x) => x.id === id);
      if (c && !house.trim()) setHouse(c.address || c.name);
    }
  };

  const reset = () => {
    setCustomerId("");
    setTypeId("");
    setBottleTypeId("");
    setHouse("");
    setBottles("1");
    setPriceTouched(false);
    setReceivedTouched(false);
    setNotes("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!house.trim() && !customerId) {
      notify("Enter a house/address or pick a customer.", "error");
      return;
    }
    setSaving(true);
    try {
      const body: CreatePlantRecordInput = {
        date,
        customer_id: customerId || null,
        customer_type_id: typeId || null,
        bottle_type_id: bottleTypeId || null,
        house: house.trim(),
        bottles: Number(bottles) || 0,
        unit_price: Number(unitPrice) || 0,
        paid_amount: Number(received) || 0,
        notes: notes.trim(),
      };
      await plantApi.create(body);
      notify("Delivery record added.");
      reset();
      onCreated();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const priceSource = priceTouched
    ? "Custom (edited)"
    : selectedCustomer?.has_custom_price
      ? `${selectedCustomer.name}'s custom price`
      : selectedBottleType?.default_price != null
        ? `${selectedBottleType.name} bottle price`
        : selectedType?.default_price != null
          ? `${selectedType.name} type price`
          : `Standard price (Settings): ${formatPrice(standardPrice)}`;

  return (
    <form onSubmit={submit} className="glass-strong space-y-4 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-mist">
        <PlusCircle size={18} className="text-wave" /> Add Delivery
      </h2>

      <Input
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div>
        <label className="label">Customer type</label>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : "")}
          className="input"
        >
          <option value="">— None —</option>
          {customerTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.default_price != null
                ? ` · ${formatPrice(t.default_price)}/btl`
                : ""}
            </option>
          ))}
        </select>
        {customerTypes.length === 0 && (
          <p className="mt-1 text-xs text-mist/40">
            No types yet — add them in Settings → Customer Types.
          </p>
        )}
      </div>

      <div>
        <label className="label">Bottle type</label>
        <select
          value={bottleTypeId}
          onChange={(e) =>
            setBottleTypeId(e.target.value ? Number(e.target.value) : "")
          }
          className="input"
        >
          <option value="">— None —</option>
          {bottleTypes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.default_price != null
                ? ` · ${formatPrice(b.default_price)}/btl`
                : ""}
            </option>
          ))}
        </select>
        {bottleTypes.length === 0 && (
          <p className="mt-1 text-xs text-mist/40">
            No bottle types yet — add them in Settings → Bottle Types.
          </p>
        )}
      </div>

      <div>
        <label className="label">Customer (optional)</label>
        <select
          value={customerId}
          onChange={(e) => onSelectCustomer(e.target.value)}
          className="input"
        >
          <option value="">— Walk-in / free-text house —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.has_custom_price ? ` · ${formatPrice(c.price)}/btl` : ""}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="House / address"
        value={house}
        onChange={(e) => setHouse(e.target.value)}
        placeholder="House 12, Block A"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Bottles"
          type="number"
          min={0}
          value={bottles}
          onChange={(e) => setBottles(e.target.value)}
        />
        <Input
          label="Price / bottle"
          type="number"
          min={0}
          step="0.01"
          value={unitPrice}
          onChange={(e) => {
            setUnitPrice(e.target.value);
            setPriceTouched(true);
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-mist/50">{priceSource}</span>
        {priceTouched && (
          <button
            type="button"
            onClick={() => setPriceTouched(false)}
            className="font-medium text-wave hover:underline"
          >
            Reset
          </button>
        )}
      </div>

      <Input
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything to remember…"
      />

      <div>
        <div className="flex items-center justify-between">
          <label className="label">Received amount (Rs)</label>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setReceived(String(amount));
                setReceivedTouched(true);
              }}
              className="font-medium text-wave hover:underline"
            >
              Full
            </button>
            <button
              type="button"
              onClick={() => {
                setReceived("0");
                setReceivedTouched(true);
              }}
              className="font-medium text-mist/50 hover:underline"
            >
              None
            </button>
          </div>
        </div>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={received}
          onChange={(e) => {
            setReceived(e.target.value);
            setReceivedTouched(true);
          }}
        />
      </div>

      <div className="rounded-xl bg-white/5 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-mist/60">
          <span className="flex items-center gap-1.5">
            <Droplet size={14} className="text-wave" /> Amount
          </span>
          <span>
            {Number(bottles) || 0} × {formatPrice(Number(unitPrice) || 0)}
          </span>
        </div>
        <div className="mt-1 flex items-end justify-between">
          <span className="text-xl font-bold text-wave">
            {formatPrice(amount)}
          </span>
          {pending > 0 ? (
            <span className="text-sm font-semibold text-amber-300">
              Pending {formatPrice(pending)}
            </span>
          ) : (
            <span className="text-sm font-semibold text-emerald-300">
              Fully paid
            </span>
          )}
        </div>
      </div>

      <Button type="submit" loading={saving} fullWidth>
        <PlusCircle size={18} /> Save record
      </Button>
    </form>
  );
}
