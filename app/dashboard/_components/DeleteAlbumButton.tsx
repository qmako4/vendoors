'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Variant = 'button' | 'link';

type Props = {
  albumId: string;
  albumTitle: string;
  /** Noun shown in the confirm dialog (e.g., "category", "product"). Defaults to "item". */
  kind?: string;
  /** "button" → big red button, "link" → small inline action. */
  variant?: Variant;
  /** Where to send the user after a successful delete. */
  redirectTo?: string;
};

export function DeleteAlbumButton({
  albumId,
  albumTitle,
  kind = 'item',
  variant = 'button',
  redirectTo,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Delete ${kind} "${albumTitle}"?\n\n` +
          `This permanently removes the ${kind}, all its photos, and anything nested inside.\n` +
          'This cannot be undone.',
      )
    ) {
      return;
    }

    setBusy(true);
    const supabase = createClient();

    // 1) Walk descendants so we can clean up storage for all of them.
    const allIds: string[] = [albumId];
    let frontier: string[] = [albumId];
    while (frontier.length > 0) {
      const { data: next } = await supabase
        .from('albums')
        .select('id')
        .in('parent_id', frontier);
      const newIds = (next ?? []).map((r) => r.id);
      if (newIds.length === 0) break;
      allIds.push(...newIds);
      frontier = newIds;
    }

    // 2) Collect storage keys for every photo in those albums.
    const { data: photos } = await supabase
      .from('photos')
      .select('storage_key')
      .in('album_id', allIds);

    // 3) Remove storage objects (Supabase storage doesn't cascade with DB).
    const keys = (photos ?? []).map((p) => p.storage_key);
    if (keys.length > 0) {
      await supabase.storage.from('photos').remove(keys);
    }

    // 4) Delete the album row. FK cascades handle child albums and photo rows.
    const { error } = await supabase.from('albums').delete().eq('id', albumId);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      setBusy(false);
      return;
    }

    router.refresh();
    if (redirectTo) router.push(redirectTo);
  }

  if (variant === 'link') {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="dash-link dash-link-danger mono"
      >
        {busy ? 'deleting…' : 'delete'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="btn-danger"
    >
      {busy ? 'Deleting…' : `Delete ${kind}`}
    </button>
  );
}
