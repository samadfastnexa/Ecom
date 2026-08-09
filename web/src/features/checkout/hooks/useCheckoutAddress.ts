"use client";

import { useCallback, useEffect, useState } from "react";
import { addressesApi } from "@/lib/api";
import { coordToString, coordsFrom, type Coords } from "@/lib/geo";
import type { CreateOrderPayload, CustomerAddress } from "@/lib/types";

/** Where an order should go, in the two shapes POST /api/orders/ accepts. */
export type ShippingChoice = Pick<
  CreateOrderPayload,
  "address_id" | "shipping_address"
>;

/**
 * Same spot, allowing for the 6dp the API rounds to. Comparing raw floats
 * would call every reload a change, because what came back from the server is
 * a rounded copy of what went up.
 */
function samePin(a: Coords | null, b: Coords | null): boolean {
  if (!a || !b) return a === b;
  return (
    coordToString(a.lat) === coordToString(b.lat) &&
    coordToString(a.lng) === coordToString(b.lng)
  );
}

export interface CheckoutAddressState {
  loading: boolean;
  /** Non-null once the address book could not be read — see `fallbackAddress`. */
  loadError: string | null;
  addresses: CustomerAddress[];
  selected: CustomerAddress | null;
  select: (id: number) => void;
  /** Adopt an address the customer just created, and make it the choice. */
  adopt: (created: CustomerAddress) => void;
  /** The working pin: what the customer sees, saved or not. */
  pin: Coords | null;
  setPin: (coords: Coords | null) => void;
  /** True while the map pin differs from the one stored on `selected`. */
  pinDirty: boolean;
  /** Free-text address, used only when the address book failed to load. */
  fallbackAddress: string;
  setFallbackAddress: (value: string) => void;
  /**
   * Save whatever still needs saving and return what to send with the order.
   * Rejects with a message meant for the customer.
   */
  resolve: () => Promise<ShippingChoice>;
}

/**
 * The delivery address for one checkout.
 *
 * Owns the address book, the chosen entry and the map pin together, because
 * they are only correct as a set: the pin belongs to an address, and a pin the
 * customer moved is not the same as the pin the order will actually carry.
 */
export function useCheckoutAddress(
  fallbackSeed: string = ""
): CheckoutAddressState {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pin, setPin] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackAddress, setFallbackAddress] = useState(fallbackSeed);

  useEffect(() => {
    let active = true;
    addressesApi
      .list()
      .then((list) => {
        if (!active) return;
        setAddresses(list);
        // The API already sorts default-first, but pick the flag explicitly:
        // pre-selecting without asking is the point of the address book, and
        // it should not quietly depend on server ordering.
        const preferred = list.find((a) => a.is_default) ?? list[0] ?? null;
        setSelectedId(preferred?.id ?? null);
        setPin(preferred ? coordsFrom(preferred.latitude, preferred.longitude) : null);
      })
      .catch((e) => {
        if (!active) return;
        // Not fatal: checkout drops to a typed address rather than trapping a
        // customer with a full cart behind an endpoint that is having a moment.
        setLoadError(
          e instanceof Error ? e.message : "Could not load your saved addresses."
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = addresses.find((a) => a.id === selectedId) ?? null;
  const storedPin = selected
    ? coordsFrom(selected.latitude, selected.longitude)
    : null;
  const pinDirty = selected !== null && !samePin(pin, storedPin);

  const select = useCallback(
    (id: number) => {
      const next = addresses.find((a) => a.id === id);
      if (!next) return;
      setSelectedId(id);
      // Switching address discards an unsaved pin move — it described the
      // address being left behind, not this one.
      setPin(coordsFrom(next.latitude, next.longitude));
    },
    [addresses]
  );

  const adopt = useCallback((created: CustomerAddress) => {
    setAddresses((prev) => {
      // The server demotes the old default when a new one is promoted; mirror
      // that locally so two cards do not both show the Default chip.
      const rest = (created.is_default ? prev.map((a) => ({ ...a, is_default: false })) : prev)
        .filter((a) => a.id !== created.id);
      return [created, ...rest];
    });
    setSelectedId(created.id);
    setPin(coordsFrom(created.latitude, created.longitude));
  }, []);

  const resolve = useCallback(async (): Promise<ShippingChoice> => {
    if (loadError) {
      const typed = fallbackAddress.trim();
      if (!typed) throw new Error("Please enter a shipping address.");
      return { shipping_address: typed };
    }
    if (!selected) throw new Error("Please choose a delivery address.");
    if (!pinDirty) return { address_id: selected.id };

    // The order serializer overwrites shipping_latitude/longitude from the
    // saved address whenever address_id is sent, so sending a moved pin with
    // the order would silently lose it. Save it onto the address first — the
    // customer is told this before they press Place Order.
    const updated = await addressesApi.update(selected.id, {
      // Both halves travel together; both null is how a pin is cleared.
      latitude: pin ? coordToString(pin.lat) : null,
      longitude: pin ? coordToString(pin.lng) : null,
    });
    setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    return { address_id: updated.id };
  }, [loadError, fallbackAddress, selected, pinDirty, pin]);

  return {
    loading,
    loadError,
    addresses,
    selected,
    select,
    adopt,
    pin,
    setPin,
    pinDirty,
    fallbackAddress,
    setFallbackAddress,
    resolve,
  };
}
