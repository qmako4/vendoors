'use client';

import { useState } from 'react';
import { addToCart, type CartColor } from '@/lib/cart';

type Props = {
  albumId: string;
  vendorHandle: string;
  productSlug: string;
  productTitle: string;
  coverStorageKey: string | null;
  sizes: string[];
  colors: CartColor[];
};

export function AddToCartForm({
  albumId,
  vendorHandle,
  productSlug,
  productTitle,
  coverStorageKey,
  sizes,
  colors,
}: Props) {
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<CartColor | null>(null);
  const [qty, setQty] = useState(1);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  function add() {
    if (sizes.length > 0 && !size) {
      setFeedback({ kind: 'err', msg: 'Pick a size' });
      return;
    }
    if (colors.length > 0 && !color) {
      setFeedback({ kind: 'err', msg: 'Pick a color' });
      return;
    }

    const result = addToCart({
      album_id: albumId,
      vendor_handle: vendorHandle,
      product_slug: productSlug,
      product_title: productTitle,
      cover_storage_key: coverStorageKey,
      size,
      color,
      quantity: qty,
    });

    if (!result.ok) {
      if (result.error === 'different-vendor') {
        if (
          confirm(
            'Your cart has items from a different vendor. Replace them with this one?',
          )
        ) {
          // Force-clear and add fresh.
          window.localStorage.removeItem('vendoors-cart');
          window.dispatchEvent(new Event('vendoors:cart-changed'));
          add();
          return;
        }
      }
      return;
    }

    setFeedback({ kind: 'ok', msg: `Added · cart has ${result.count}` });
    setTimeout(() => setFeedback(null), 1800);
  }

  return (
    <div className="atc">
      {sizes.length > 0 && (
        <div className="atc-row">
          <span className="atc-label mono">SIZE</span>
          <div className="atc-chips">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={`atc-chip ${size === s ? 'active' : ''}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <div className="atc-row">
          <span className="atc-label mono">COLOR</span>
          <div className="atc-swatches">
            {colors.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`atc-swatch ${color?.name === c.name ? 'active' : ''}`}
                onClick={() => setColor(c)}
                title={c.name}
              >
                <span
                  className="atc-swatch-dot"
                  style={{ background: c.hex }}
                />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="atc-row atc-row-action">
        <div className="atc-qty">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="mono">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button type="button" className="btn-primary atc-add" onClick={add}>
          Add to inquiry
        </button>
      </div>

      {feedback && (
        <div className={`atc-feedback mono ${feedback.kind}`}>
          {feedback.kind === 'ok' ? '✓ ' : '✕ '}
          {feedback.msg}
        </div>
      )}
    </div>
  );
}
