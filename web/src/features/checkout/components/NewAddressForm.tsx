"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { addressesApi } from "@/lib/api";
import { coordToString, type Coords } from "@/lib/geo";
import type { AddressLabel, CustomerAddress, CustomerAddressInput } from "@/lib/types";
import {
  AddressFields,
  Button,
  EMPTY_ADDRESS,
  FieldLabel,
  Input,
  validateAddress,
  type AddressErrors,
  type AddressParts,
} from "@/components/ui";
import { ADDRESS_LABEL_OPTIONS } from "../labels";
import { LocationSection } from "./LocationSection";

interface NewAddressFormProps {
  /**
   * True when the customer has nothing saved yet. The backend makes the first
   * address the default regardless, so the toggle is pointless here — and the
   * form is the only way forward, so there is nothing to cancel back to.
   */
  firstAddress: boolean;
  onSaved: (address: CustomerAddress) => void;
  onCancel?: () => void;
}

export function NewAddressForm({ firstAddress, onSaved, onCancel }: NewAddressFormProps) {
  const [label, setLabel] = useState<AddressLabel>("home");
  const [customLabel, setCustomLabel] = useState("");
  const [parts, setParts] = useState<AddressParts>(EMPTY_ADDRESS);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [labelError, setLabelError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const addressErrors = validateAddress(parts);
    // A nameless "Other" would show up as literally "Other" in the picker and
    // on the rider's order — useless the moment there are two of them.
    const missingName = label === "other" && !customLabel.trim();
    setErrors(addressErrors);
    setLabelError(missingName ? "Name this address." : null);
    if (Object.keys(addressErrors).length > 0 || missingName) return;

    const payload: CustomerAddressInput = {
      label,
      custom_label: label === "other" ? customLabel.trim() : "",
      house_number: parts.house_number.trim(),
      portion: parts.portion,
      block: parts.block.trim(),
      area: parts.area.trim(),
      is_default: firstAddress || makeDefault,
    };
    // Half a pin is a 400, so the pair is sent together or left out entirely.
    if (coords) {
      payload.latitude = coordToString(coords.lat);
      payload.longitude = coordToString(coords.lng);
    }

    setSaving(true);
    setError(null);
    try {
      onSaved(await addressesApi.create(payload));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div>
        <FieldLabel requirement="required">Label</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ADDRESS_LABEL_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = label === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setLabel(option.value);
                  setLabelError(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                  active
                    ? "border-wave bg-wave/20 text-wave"
                    : "border-white/10 text-mist/60 hover:text-mist"
                )}
              >
                <Icon size={13} /> {option.label}
              </button>
            );
          })}
        </div>
        {label === "other" && (
          <Input
            className="mt-2"
            value={customLabel}
            onChange={(e) => {
              setCustomLabel(e.target.value);
              setLabelError(null);
            }}
            placeholder="e.g. Mum's place"
            maxLength={50}
            error={labelError ?? undefined}
          />
        )}
        {label !== "other" && labelError && (
          <p className="mt-1 text-sm text-rose-300">{labelError}</p>
        )}
      </div>

      <AddressFields value={parts} onChange={setParts} errors={errors} />

      <LocationSection coords={coords} onChange={setCoords} recenterKey="new-address" />

      {!firstAddress && (
        <button
          type="button"
          onClick={() => setMakeDefault((v) => !v)}
          aria-pressed={makeDefault}
          className={cn(
            "inline-flex items-center gap-2 self-start rounded-xl border px-3 py-2 text-sm transition",
            makeDefault
              ? "border-wave/50 bg-wave/10 text-wave"
              : "border-white/10 bg-white/5 text-mist/60 hover:text-mist"
          )}
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded border",
              makeDefault ? "border-wave bg-wave/30" : "border-white/25"
            )}
          >
            {makeDefault && <Check size={11} />}
          </span>
          <Star size={13} /> Set as my default address
        </button>
      )}

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} loading={saving} className="px-4 py-2 text-sm">
          {firstAddress ? "Save address & continue" : "Save address"}
        </Button>
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
