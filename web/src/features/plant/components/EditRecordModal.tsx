"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import type {
  BottleType,
  CustomerType,
  PlantCustomer,
  PlantRecord,
} from "@/lib/types";
import { plantApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Modal, Button, Input, useToast } from "@/components/ui";

interface EditRecordModalProps {
  record: PlantRecord;
  customers: PlantCustomer[];
  customerTypes: CustomerType[];
  bottleTypes: BottleType[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditRecordModal({
  record,
  customers,
  customerTypes,
  bottleTypes,
  onClose,
  onSaved,
}: EditRecordModalProps) {
  const notify = useToast();

  const [date, setDate] = useState(record.date);
  const [customerId, setCustomerId] = useState<number | "">(
    record.customer_id ?? ""
  );
  const [typeId, setTypeId] = useState<number | "">(
    record.customer_type_id ?? ""
  );
  const [bottleTypeId, setBottleTypeId] = useState<number | "">(
    record.bottle_type_id ?? ""
  );
  const [house, setHouse] = useState(record.house);
  const [bottles, setBottles] = useState(String(record.bottles));
  const [unitPrice, setUnitPrice] = useState(record.unit_price);
  const [received, setReceived] = useState(record.paid_amount);
  const [notes, setNotes] = useState(record.notes);
  const [saving, setSaving] = useState(false);

  const amount = (Number(bottles) || 0) * (Number(unitPrice) || 0);
  const pending = Math.max(0, amount - (Number(received) || 0));

  const save = async () => {
    if (!house.trim() && !customerId) {
      notify("Enter a house/address or pick a customer.", "error");
      return;
    }
    setSaving(true);
    try {
      await plantApi.update(record.id, {
        date,
        customer_id: customerId || null,
        customer_type_id: typeId || null,
        bottle_type_id: bottleTypeId || null,
        house: house.trim(),
        bottles: Number(bottles) || 0,
        unit_price: Number(unitPrice) || 0,
        paid_amount: Number(received) || 0,
        notes: notes.trim(),
      });
      notify("Record updated.");
      onSaved();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Failed to update.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Edit delivery #${record.id}`}>
      <div className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Customer type</label>
            <select
              value={typeId}
              onChange={(e) =>
                setTypeId(e.target.value ? Number(e.target.value) : "")
              }
              className="input"
            >
              <option value="">— None —</option>
              {customerTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{!t.is_active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
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
                  {b.name}{!b.is_active ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Customer (optional)</label>
          <select
            value={customerId}
            onChange={(e) =>
              setCustomerId(e.target.value ? Number(e.target.value) : "")
            }
            className="input"
          >
            <option value="">— Walk-in / free-text house —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="House / address"
          value={house}
          onChange={(e) => setHouse(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Bottles"
            type="number"
            min={0}
            value={bottles}
            onChange={(e) => setBottles(e.target.value)}
          />
          <Input
            label="Price/btl"
            type="number"
            min={0}
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
          <Input
            label="Received"
            type="number"
            min={0}
            step="0.01"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
          />
        </div>

        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm">
          <span className="text-mist/60">
            Amount <span className="font-bold text-mist">{formatPrice(amount)}</span>
          </span>
          {pending > 0 ? (
            <span className="font-semibold text-amber-300">
              Pending {formatPrice(pending)}
            </span>
          ) : (
            <span className="font-semibold text-emerald-300">Fully paid</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            <Save size={16} /> Save changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}
