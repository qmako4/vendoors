import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteHeader } from '@/components/SiteHeader';
import { photoUrl } from '@/lib/storage';
import type { CartItem } from '@/lib/cart';

type Params = Promise<{ cartId: string }>;

export const metadata: Metadata = { title: 'Inquiry' };

export default async function Page({ params }: { params: Params }) {
  const { cartId } = await params;
  const supabase = await createClient();
  const { data: cart } = await supabase
    .from('carts')
    .select('id, vendor_handle, items, buyer_note, buyer_name, created_at')
    .eq('id', cartId)
    .maybeSingle();

  if (!cart) notFound();

  const items: CartItem[] = Array.isArray(cart.items)
    ? (cart.items as CartItem[])
    : [];
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const created = new Date(cart.created_at as string).toLocaleString();

  return (
    <>
      <SiteHeader />
      <div className="cart-page cart-shared">
        <header className="cart-head">
          {cart.vendor_handle && (
            <Link href={`/${cart.vendor_handle}`} className="dash-back mono">
              ← {cart.vendor_handle}
            </Link>
          )}
          <div className="dash-eyebrow mono">INQUIRY</div>
          <h1 className="cart-h1">
            {cart.buyer_name ? `${cart.buyer_name}'s` : 'Customer'} cart
          </h1>
          <div className="cart-meta-row mono">
            <span>{items.length} items · {totalUnits} units</span>
            <span className="dot">·</span>
            <span>received {created}</span>
          </div>
        </header>

        {cart.buyer_note && (
          <div className="cart-note">
            <div className="mono cart-note-label">NOTE FROM BUYER</div>
            <p>{cart.buyer_note}</p>
          </div>
        )}

        <div className="cart-list cart-list-readonly">
          {items.map((it, idx) => (
            <div
              key={`${it.album_id}-${idx}`}
              className="cart-row cart-row-readonly"
            >
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
                  target="_blank"
                >
                  {it.product_title} ↗
                </Link>
                <div className="cart-variant mono">
                  {[it.size, it.color?.name].filter(Boolean).join(' / ') ||
                    'No variants'}
                </div>
              </div>
              <div className="cart-qty cart-qty-readonly mono">
                ×{it.quantity}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
