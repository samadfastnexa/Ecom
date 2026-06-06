"use client";

import { MapPin } from "lucide-react";
import { Textarea } from "@/components/ui";

interface AddressFormProps {
  value: string;
  onChange: (value: string) => void;
}

export function AddressForm({ value, onChange }: AddressFormProps) {
  return (
    <section className="glass p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-mist">
        <MapPin size={18} className="text-wave" /> Shipping Address
      </h2>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="House #, street, area, city…"
      />
    </section>
  );
}
