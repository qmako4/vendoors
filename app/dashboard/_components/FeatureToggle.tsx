'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function FeatureToggle({
  albumId,
  initial,
}: {
  albumId: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !active;
    setActive(next); // optimistic
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('albums')
      .update({ is_featured: next })
      .eq('id', albumId);
    setBusy(false);
    if (error) {
      // Roll back on failure
      setActive(!next);
      alert(`Couldn't update: ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`feat-toggle mono ${active ? 'active' : ''}`}
      title={active ? 'Unpin from gallery' : 'Pin to gallery'}
      aria-label={active ? 'Unpin from gallery' : 'Pin to gallery'}
    >
      {active ? '★ pinned' : '☆ pin'}
    </button>
  );
}
