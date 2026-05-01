'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Gallery } from '@/lib/active-gallery';
import { switchGallery } from '../galleries/actions';

type Props = {
  email: string;
  galleries: Gallery[];
  activeId: string | null;
};

export function DashboardNav({ email, galleries, activeId }: Props) {
  const router = useRouter();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const active = galleries.find((g) => g.id === activeId) ?? galleries[0] ?? null;
  const handle = active?.handle ?? null;
  const displayName = active?.display_name ?? null;

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  async function switchTo(id: string) {
    setSwitcherOpen(false);
    await switchGallery(id);
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
              View ↗
            </Link>
          )}
        </nav>

        <div className="dash-nav-right">
          {galleries.length > 0 && (
            <div className="gallery-switcher">
              <button
                type="button"
                className="gallery-switcher-btn mono"
                onClick={() => setSwitcherOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={switcherOpen}
              >
                <div className="gallery-switcher-name">
                  {displayName ?? email.split('@')[0]}
                </div>
                <div className="gallery-switcher-handle">
                  {handle ? `/ ${handle}` : email}
                </div>
                <span className="gallery-switcher-chev">▾</span>
              </button>
              {switcherOpen && (
                <div className="gallery-switcher-menu">
                  <div className="gallery-switcher-head mono">
                    SWITCH GALLERY
                  </div>
                  {galleries.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`gallery-switcher-item ${g.id === activeId ? 'active' : ''}`}
                      onClick={() => switchTo(g.id)}
                    >
                      <div>
                        <div>{g.display_name}</div>
                        <div className="mono gallery-switcher-item-sub">
                          / {g.handle}
                        </div>
                      </div>
                      {g.id === activeId && <span className="mono">✓</span>}
                    </button>
                  ))}
                  <div className="gallery-switcher-foot">
                    <Link
                      href="/dashboard/galleries"
                      className="dash-link mono"
                      onClick={() => setSwitcherOpen(false)}
                    >
                      + new gallery / manage
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
          <button className="btn-ghost dash-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
