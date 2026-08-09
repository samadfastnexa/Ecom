import { API_URL } from '../constants/config';
import { getAuthToken } from './authService';

/**
 * The signed-in customer's own address book (`/api/auth/addresses/`).
 *
 * Customers used to have exactly one address stored on their profile, so
 * checkout had to guess from past orders. This is the real thing: several
 * labelled addresses, one of them the default, each with an optional delivery
 * pin. Every endpoint here is scoped to `request.user` server-side, so there is
 * no customer id to pass — the token IS the scope.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddressLabel = 'home' | 'office' | 'shop' | 'warehouse' | 'other';

/** Mirrors CustomerAddress.LABEL_CHOICES; the API rejects anything else. */
export const ADDRESS_LABEL_OPTIONS: { value: AddressLabel; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'office', label: 'Office' },
  { value: 'shop', label: 'Shop' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'other', label: 'Other' },
];

export interface CustomerAddress {
  id: number;
  label: AddressLabel;
  /** Only meaningful when `label` is 'other'. */
  custom_label: string;
  /** Server-resolved display name — 'Home', 'Farmhouse', … Read-only. */
  display_label: string;
  house_number: string;
  /** Canonical portion key (`ground`, `first_floor`, …) or ''. */
  portion: string;
  block: string;
  area: string;
  /** READ-ONLY: composed by the server from the four parts. */
  address: string;
  /** Decimal strings at 6dp, or null when no pin was ever dropped. */
  latitude: string | null;
  longitude: string | null;
  has_pin: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * What a create/update accepts. `address` is absent on purpose — the server
 * composes it, and sending it would be silently ignored.
 */
export interface AddressPayload {
  label?: AddressLabel;
  custom_label?: string;
  house_number?: string;
  portion?: string;
  block?: string;
  area?: string;
  /** Send both or neither: half a pin is a 400. Use `pinPayload()`. */
  latitude?: string | null;
  longitude?: string | null;
  is_default?: boolean;
}

export interface Pin {
  latitude: number;
  longitude: number;
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────

/** The API stores 6dp; rounding here keeps comparisons honest. */
export const toCoordinateString = (value: number): string => value.toFixed(6);

/** The saved pin as numbers, or null when this address has none. */
export const pinOf = (address: CustomerAddress | null | undefined): Pin | null => {
  if (!address || address.latitude == null || address.longitude == null) return null;
  const latitude = Number(address.latitude);
  const longitude = Number(address.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
};

/**
 * Turn a pin into request fields. Both coordinates travel together or neither
 * does — the serializer rejects a lone latitude, and a half-written pin would
 * point a rider at the equator.
 */
export const pinPayload = (pin: Pin | null): Pick<AddressPayload, 'latitude' | 'longitude'> =>
  pin
    ? { latitude: toCoordinateString(pin.latitude), longitude: toCoordinateString(pin.longitude) }
    : {};

/** True when two pins differ enough to be worth saving (≈0.1 m at 6dp). */
export const pinsDiffer = (a: Pin | null, b: Pin | null): boolean => {
  if (!a || !b) return a !== b;
  return (
    toCoordinateString(a.latitude) !== toCoordinateString(b.latitude) ||
    toCoordinateString(a.longitude) !== toCoordinateString(b.longitude)
  );
};

/** Human-readable coordinate pair for the "Pin: 31.520400, 74.358700" line. */
export const formatPin = (pin: Pin): string =>
  `${toCoordinateString(pin.latitude)}, ${toCoordinateString(pin.longitude)}`;

// ─── Fetch helper ─────────────────────────────────────────────────────────────

/** Turn an error response into a human-readable message, unwrapping DRF's
 *  `{ field: ["message", …] }` / `{ detail: "…" }` shapes when present. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  let text = '';
  try { text = await res.text(); } catch { /* body already consumed / empty */ }
  if (!text) return fallback;
  try {
    const data = JSON.parse(text);
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  } catch {
    // Response body wasn't JSON — fall through to the raw text.
  }
  return text;
}

async function addressFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed: ${res.status}`));
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const addressService = {
  /** Default first, then most recently updated — the order checkout shows. */
  list(): Promise<CustomerAddress[]> {
    return addressFetch('/auth/addresses/');
  },

  /** The customer's FIRST address becomes their default automatically. */
  create(payload: AddressPayload): Promise<CustomerAddress> {
    return addressFetch('/auth/addresses/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: number, payload: AddressPayload): Promise<CustomerAddress> {
    return addressFetch(`/auth/addresses/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: number): Promise<void> {
    return addressFetch(`/auth/addresses/${id}/`, { method: 'DELETE' });
  },

  /** Promotes this address and demotes whichever held the default. */
  setDefault(id: number): Promise<CustomerAddress> {
    return addressFetch(`/auth/addresses/${id}/set_default/`, { method: 'POST' });
  },

  /** Convenience for "the customer dragged the marker" — pin only, nothing else. */
  updatePin(id: number, pin: Pin): Promise<CustomerAddress> {
    return addressFetch(`/auth/addresses/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(pinPayload(pin)),
    });
  },
};
