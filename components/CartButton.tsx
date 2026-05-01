'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readCart, subscribeCart, totalQuantity } from '@/lib/cart';

export function CartButton() {
  const [count, setCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    function update() {
      setCount(totalQuantity(readCart()));
    }
    update();
    return subscribeCart(update);
  }, []);

  // During SSR + initial hydration, render the link but no badge to avoid mismatch.
  return (
    <Link href="/cart" className="cart-btn mono" aria-label="Cart">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M2 3H4L4.5 5M4.5 5L5.5 11C5.5 11.55 5.95 12 6.5 12H12.5C13.05 12 13.5 11.55 13.5 11L14.5 5H4.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <circle cx="6.5" cy="14" r="0.6" fill="currentColor" />
        <circle cx="12" cy="14" r="0.6" fill="currentColor" />
      </svg>
      <span>Cart</span>
      {hydrated && count > 0 && <span className="cart-count">{count}</span>}
    </Link>
  );
}
