import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveGallery } from '@/lib/active-gallery';
import { MediaLibrary, type LibItem } from './_components/MediaLibrary';

export const metadata: Metadata = { title: 'Library' };

export default async function Page() {
  const supabase = await createClient();
  const active = await getActiveGallery();
  const galleryId = active?.id ?? '';

  const { data: items } = await supabase
    .from('media')
    .select('id, storage_key, width, height, filename, created_at')
    .eq('vendor_id', galleryId)
    .order('created_at', { ascending: false });

  const all = (items ?? []) as LibItem[];

  // Build a map: media_id → list of products it's attached to.
  // We need product titles for the hover tooltip, so we join photos → albums.
  const { data: usedRows } = await supabase
    .from('photos')
    .select('media_id, albums!inner(id, title)')
    .not('media_id', 'is', null)
    .eq('albums.vendor_id', galleryId);

  type UsageRow = {
    media_id: string;
    albums: { id: string; title: string } | { id: string; title: string }[];
  };
  const usageByMedia = new Map<string, Array<{ id: string; title: string }>>();
  for (const row of (usedRows ?? []) as UsageRow[]) {
    if (!row.media_id) continue;
    // Supabase types this as either a single obj or an array depending on FK shape.
    const albums = Array.isArray(row.albums) ? row.albums : [row.albums];
    const list = usageByMedia.get(row.media_id) ?? [];
    for (const a of albums) {
      // De-dupe (a media item attached twice to the same album shouldn't double-count).
      if (!list.find((x) => x.id === a.id)) list.push(a);
    }
    usageByMedia.set(row.media_id, list);
  }

  const usage: Record<string, Array<{ id: string; title: string }>> =
    Object.fromEntries(usageByMedia);
  const unassignedCount = all.filter((m) => !usageByMedia.has(m.id)).length;

  return (
    <div className="dash-page">
      <header className="dash-head">
        <Link href="/dashboard" className="dash-back mono">
          ← Dashboard
        </Link>
        <div className="dash-eyebrow mono">YOUR LIBRARY</div>
        <h1 className="dash-h1">Image library</h1>
        <p className="dash-lede">
          Upload images here once, then pick them when you create or edit
          products. Photos uploaded directly to a product also land here
          automatically.
        </p>
      </header>

      <section className="dash-section">
        <MediaLibrary
          vendorId={galleryId}
          initial={all}
          unassignedCount={unassignedCount}
          usage={usage}
        />
      </section>
    </div>
  );
}
