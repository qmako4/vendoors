import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CartButton } from './CartButton';

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="hdr">
      <div className="hdr-inner">
        <Link href="/" className="wordmark">
          <span className="wm-mark">▦</span>
          <span className="wm-text">Vendoors</span>
        </Link>
        <div className="hdr-right">
          <CartButton />
          {user ? (
            <Link className="menu-link" href="/dashboard">
              Dashboard
            </Link>
          ) : (
            <Link className="menu-link" href="/">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
