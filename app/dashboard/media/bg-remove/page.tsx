import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveGallery } from '@/lib/active-gallery';
import { BgRemoveTool } from './_components/BgRemoveTool';

export const metadata: Metadata = { title: 'Remove backgrounds' };

export default async function Page() {
  const supabase = await createClient();
  const active = await getActiveGallery();
  const galleryId = active?.id ?? '';

  const { data: items } = await supabase
    .from('media')
    .select('id, storage_key, thumb_storage_key, width, height, filename')
    .eq('vendor_id', galleryId)
    .order('created_at', { ascending: false });

  return (
    <div className="dash-page">
      <header className="dash-head">
        <Link href="/dashboard/media" className="dash-back mono">
          ← Library
        </Link>
        <div className="dash-eyebrow mono">BULK BACKGROUND REMOVAL</div>
        <h1 className="dash-h1">Remove backgrounds.</h1>
        <p className="dash-lede">
          Pick images, choose a background color, hit process. Each image gets
          a clean copy saved to your library — originals untouched.
        </p>
      </header>

      <section className="dash-section">
        <BgRemoveTool
          vendorId={galleryId}
          initial={(items ?? []) as Array<{
            id: string;
            storage_key: string;
            thumb_storage_key: string | null;
            width: number;
            height: number;
            filename: string | null;
          }>}
        />
      </section>
    </div>
  );
}
