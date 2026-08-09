"use client";

import { useState } from "react";
import { MapPin, Plus, Repeat } from "lucide-react";
import { Button, LoadingState, Textarea } from "@/components/ui";
import type { CheckoutAddressState } from "../hooks/useCheckoutAddress";
import { LocationSection } from "./LocationSection";
import { NewAddressForm } from "./NewAddressForm";
import { SavedAddressCard } from "./SavedAddressCard";

/**
 * Where this order is going.
 *
 * The address book drives it: the default is chosen before the customer does
 * anything, and the map pin sits with the address it belongs to rather than in
 * a section of its own, so it is obvious which address a pin move affects.
 */
export function ShippingAddressSection({ state }: { state: CheckoutAddressState }) {
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);

  const { addresses, selected, loading, loadError } = state;
  const empty = addresses.length === 0;

  return (
    <section className="glass flex flex-col gap-4 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-mist">
        <MapPin size={18} className="text-wave" /> Delivery Address
      </h2>

      {loading && <LoadingState message="Loading your saved addresses…" compact />}

      {/* Address book unreachable. A typed address still places the order — the
          backend accepts shipping_address on its own — so the cart is never
          held hostage by this one request. */}
      {!loading && loadError && (
        <>
          <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Your saved addresses could not be loaded ({loadError}). Type where we
            should deliver and we will still take the order.
          </p>
          <Textarea
            label="Shipping address"
            requirement="required"
            value={state.fallbackAddress}
            onChange={(e) => state.setFallbackAddress(e.target.value)}
            rows={3}
            placeholder="House #, portion, block, area…"
          />
        </>
      )}

      {!loading && !loadError && empty && (
        <>
          <p className="text-sm text-mist/60">
            Save where we should deliver. It becomes your default, so the next
            order is one tap.
          </p>
          <NewAddressForm firstAddress onSaved={state.adopt} />
        </>
      )}

      {!loading && !loadError && !empty && (
        <>
          {picking ? (
            <div className="flex flex-col gap-2">
              {addresses.map((address) => (
                <SavedAddressCard
                  key={address.id}
                  address={address}
                  selected={address.id === selected?.id}
                  onSelect={() => {
                    state.select(address.id);
                    setPicking(false);
                  }}
                />
              ))}
            </div>
          ) : (
            selected && <SavedAddressCard address={selected} selected />
          )}

          <div className="flex flex-wrap gap-2">
            {addresses.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => setPicking((open) => !open)}
                className="px-3 py-2 text-sm"
              >
                <Repeat size={15} /> {picking ? "Keep this address" : "Change address"}
              </Button>
            )}
            {!adding && (
              <Button
                variant="ghost"
                onClick={() => setAdding(true)}
                className="px-3 py-2 text-sm"
              >
                <Plus size={15} /> Add new address
              </Button>
            )}
          </div>

          {adding && (
            <NewAddressForm
              firstAddress={false}
              onSaved={(created) => {
                state.adopt(created);
                setAdding(false);
                setPicking(false);
              }}
              onCancel={() => setAdding(false)}
            />
          )}

          {/* Hidden while adding, so the two pin editors on screen at once
              cannot be mistaken for each other. */}
          {selected && !adding && (
            <div className="border-t border-white/10 pt-4">
              <LocationSection
                coords={state.pin}
                onChange={state.setPin}
                recenterKey={selected.id}
              />

              {state.pinDirty && (
                <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  This pin is not saved yet. Placing the order will save it to
                  “{selected.display_label}” — an order always carries the pin
                  stored on the address.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
