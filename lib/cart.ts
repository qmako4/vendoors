// Client-side cart stored in localStorage. Persists across page loads.
// When the user clicks "Share", we POST these items into the `carts` table
// and get back a permanent shareable URL.

export type CartColor = { name: string; hex: string };

export type CartItem = {
  album_id: string;
  vendor_handle: string;
  product_slug: string;
  product_title: string;
  cover_storage_key: string | null;
  size: string | null;
  color: CartColor | null;
  quantity: number;
};

const KEY = 'vendoors-cart';
const EVENT = 'vendoors:cart-changed';

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  if (items.length === 0) {
    window.localStorage.removeItem(KEY);
  } else {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  }
  window.dispatchEvent(new Event(EVENT));
}

function variantKey(i: CartItem): string {
  return `${i.album_id}|${i.size ?? ''}|${i.color?.name ?? ''}`;
}

/** Returns the new cart length OR a string error if the vendor switched. */
export function addToCart(item: CartItem): { ok: true; count: number } | { ok: false; error: 'different-vendor' } {
  const items = readCart();
  if (items.length > 0 && items[0].vendor_handle !== item.vendor_handle) {
    return { ok: false, error: 'different-vendor' };
  }
  const key = variantKey(item);
  const existing = items.find((i) => variantKey(i) === key);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + item.quantity);
  } else {
    items.push(item);
  }
  writeCart(items);
  return { ok: true, count: items.reduce((s, i) => s + i.quantity, 0) };
}

export function clearCart(): void {
  writeCart([]);
}

export function removeAt(idx: number): void {
  const items = readCart();
  if (idx < 0 || idx >= items.length) return;
  items.splice(idx, 1);
  writeCart(items);
}

export function setQuantity(idx: number, qty: number): void {
  const items = readCart();
  if (idx < 0 || idx >= items.length) return;
  items[idx].quantity = Math.max(1, Math.min(99, Math.floor(qty)));
  writeCart(items);
}

export function totalQuantity(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}

export function subscribeCart(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
