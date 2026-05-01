import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { CartView } from './_components/CartView';

export const metadata: Metadata = { title: 'Your inquiry cart' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <div className="cart-page">
        <header className="cart-head">
          <Link href="/" className="dash-back mono">
            ← Home
          </Link>
          <div className="dash-eyebrow mono">YOUR INQUIRY</div>
          <h1 className="cart-h1">Cart</h1>
          <p className="cart-lede">
            Build a list, then send it to the vendor as one inquiry. No
            checkout — they reply on WhatsApp, Telegram, or however you both
            prefer.
          </p>
        </header>
        <CartView />
      </div>
    </>
  );
}
