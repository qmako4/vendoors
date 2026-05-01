'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  email: string;
  handle: string | null;
  displayName: string | null;
};

export function DashboardNav({ email, handle, displayName }: Props) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  return (
    <header className="dash-nav">
      <div className="dash-nav-inner">
        <Link href="/dashboard" className="wordmark">
          <span className="wm-mark">▦</span>
          <span className="wm-text">Vendoors</span>
        </Link>

        <nav className="dash-nav-links mono">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/categories">Categories</Link>
          <Link href="/dashboard/media">Library</Link>
          <Link href="/dashboard/profile">Profile</Link>
          <Link href="/dashboard/albums/new">New</Link>
          {handle && (
            <Link href={`/${handle}`} target="_blank">
              View gallery ↗
            </Link>
          )}
        </nav>

        <div className="dash-nav-right">
          <div className="dash-who mono">
            <div className="dash-who-name">
              {displayName ?? email.split('@')[0]}
            </div>
            <div className="dash-who-handle">
              {handle ? `vendoors.co / ${handle}` : email}
            </div>
          </div>
          <button className="btn-ghost dash-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
