'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  readCart,
  removeAt,
  setQuantity,
  clearCart,
  subscribeCart,
  totalQuantity,
  type CartItem,
} from '@/lib/cart';
import { photoUrl } from '@/lib/storage';
import { ShareDialog } from './ShareDialog';
import { createClient } from '@/lib/supabase/client';

export function CartView() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null); // null until hydrated
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<{ id: string; url: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(readCart());
    return subscribeCart(() => setItems(readCart()));
  }, []);

  async function generateLink() {
    if (!items || items.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('carts')
        .insert({
          vendor_handle: items[0].vendor_handle,
          items,
          buyer_note: note.trim() || null,
          buyer_name: name.trim() || null,
        })
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('Could not create link');
      const url = `${window.location.origin}/cart/${data.id}`;
      setShare({ id: data.id, url });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  if (items === null) {
    return <div className="cart-loading mono">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="dash-empty">
        <div className="dash-empty-icon">◇</div>
        <div className="dash-empty-h mono">CART EMPTY</div>
        <p className="dash-empty-sub">
          Browse a vendor&apos;s gallery and tap &ldquo;Add to inquiry&rdquo; on the
          products you&apos;re interested in. Then come back here to share your
          cart with the vendor.
        </p>
        <Link href="/" className="btn-primary">
          Back home
        </Link>
      </div>
    );
  }

  const vendorHandle = items[0].vendor_handle;

  return (
    <>
      <div className="cart-list">
        {items.map((it, idx) => (
          <div key={`${it.album_id}-${it.size ?? ''}-${it.color?.name ?? ''}`} className="cart-row">
            <div className="cart-thumb">
              {it.cover_storage_key ? (
                <Image
                  src={photoUrl(it.cover_storage_key)}
                  alt={it.product_title}
                  fill
                  sizes="80px"
                  style={{ objectFit: 'cover' }}
                />
              ) : null}
            </div>
            <div className="cart-meta">
              <Link
                href={`/${it.vendor_handle}/${it.product_slug}`}
                className="cart-title"
              >
                {it.product_title}
              </Link>
              <div className="cart-variant mono">
                {[it.size, it.color?.name].filter(Boolean).join(' / ') || 'No variants'}
              </div>
            </div>
            <div className="cart-qty">
              <button
                type="button"
                onClick={() => setQuantity(idx, it.quantity - 1)}
                aria-label="Decrease"
              >
                −
              </button>
              <span className="mono">{it.quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(idx, it.quantity + 1)}
                aria-label="Increase"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="cart-remove mono"
              onClick={() => removeAt(idx)}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-summary-row mono">
          <span>{items.length} items · {totalQuantity(items)} units total</span>
          <button
            type="button"
            className="dash-link mono"
            onClick={() => {
              if (confirm('Empty your cart?')) clearCart();
            }}
          >
            empty cart
          </button>
        </div>

        <label className="dash-field">
          <span className="mono">YOUR NAME (OPTIONAL)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="So the vendor knows who's asking"
          />
        </label>

        <label className="dash-field">
          <span className="mono">NOTE (OPTIONAL)</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything else? (sizing, ship-by date, etc.)"
            maxLength={500}
          />
        </label>

        {err && <div className="auth-err mono">{err}</div>}

        <button
          type="button"
          className="btn-primary btn-lg"
          onClick={generateLink}
          disabled={busy}
        >
          {busy ? 'Generating link…' : 'Share inquiry →'}
        </button>
      </div>

      {share && (
        <ShareDialog
          shareUrl={share.url}
          vendorHandle={vendorHandle}
          onClose={() => {
            setShare(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
