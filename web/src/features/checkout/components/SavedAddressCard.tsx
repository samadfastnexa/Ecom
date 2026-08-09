"use client";

import { Check, MapPinOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { coordsFrom, formatCoords } from "@/lib/geo";
import type { CustomerAddress } from "@/lib/types";
import { Chip } from "@/components/ui";
import { addressLabelIcon } from "../labels";

interface SavedAddressCardProps {
  address: CustomerAddress;
  selected?: boolean;
  /** Omit to render as a static panel rather than a choice. */
  onSelect?: () => void;
  className?: string;
}

/**
 * One address book entry — used both as the chosen address on checkout and as
 * a row in the picker, so the two can never drift into showing different
 * things about the same record.
 */
export function SavedAddressCard({
  address,
  selected = false,
  onSelect,
  className,
}: SavedAddressCardProps) {
  const Icon = addressLabelIcon(address.label);
  const coords = coordsFrom(address.latitude, address.longitude);

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-wave/20 text-wave" : "bg-white/5 text-mist/60"
        )}
      >
        <Icon size={16} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-mist">{address.display_label}</span>
          {address.is_default && (
            <Chip className="border border-wave/30 bg-wave/10 text-wave">Default</Chip>
          )}
        </div>

        <p className="mt-1 text-sm text-mist/70">{address.address}</p>

        {coords ? (
          <p className="mt-1 font-mono text-xs text-mist/40">{formatCoords(coords)}</p>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-mist/35">
            <MapPinOff size={11} /> No map pin
          </p>
        )}
      </div>

      {selected && <Check size={16} className="mt-1 shrink-0 text-wave" />}
    </>
  );

  const shared = cn(
    "flex w-full gap-3 rounded-xl border p-3 text-left transition",
    selected
      ? "border-wave/50 bg-wave/10"
      : "border-white/10 bg-white/5",
    className
  );

  if (!onSelect) return <div className={shared}>{body}</div>;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(shared, !selected && "hover:border-white/25 hover:bg-white/10")}
    >
      {body}
    </button>
  );
}
