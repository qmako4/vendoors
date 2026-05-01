import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CopyLinkButton } from '../../_components/CopyLinkButton';
import { PhotoUploader } from './_components/PhotoUploader';

export const metadata: Metadata = { title: 'Edit product' };

type Params = Promise<{ albumId: string }>;

export default async function Page({ params }: { params: Params }) {
  const { albumId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS restricts to albums owned by this user's galleries — no need to
  // filter by vendor_id (which is the gallery id, not the user id).
  const { data: album } = await supabase
    .from('albums')
    .select('id, slug, title, photo_count, is_public, vendor_id')
    .eq('id', albumId)
    .maybeSingle();

  // Fetch the gallery's profile (for the share URL handle).
  const { data: profile } = album
    ? await supabase
        .from('profiles')
        .select('handle')
        .eq('id', album.vendor_id)
        .maybeSingle()
    : { data: null };

  if (!album) notFound();

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_key, width, height, caption')
    .eq('album_id', album.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  const albumUrl = profile?.handle ? `/${profile.handle}/${album.slug}` : null;

  return (
    <div className="dash-page">
      <header className="dash-head">
        <Link href="/dashboard" className="dash-back mono">
          ← Dashboard
        </Link>
        <div className="dash-eyebrow mono">PRODUCT · {album.slug}</div>
        <h1 className="dash-h1">{album.title}</h1>
        <div className="dash-meta-row mono">
          <span>{album.photo_count} photos</span>
          <span className="dot">·</span>
          <span>{album.is_public ? 'public' : 'private'}</span>
          {albumUrl && (
            <>
              <span className="dot">·</span>
              <CopyLinkButton url={albumUrl} label="copy share link" />
              <span className="dot">·</span>
              <Link href={albumUrl} target="_blank" className="dash-link mono">
                preview ↗
              </Link>
            </>
          )}
        </div>
        <div className="dash-meta-actions">
          <Link
            href={`/dashboard/albums/${album.id}/details`}
            className="btn-ghost"
          >
            Edit details · sizes · colors · categories
          </Link>
        </div>
      </header>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2 className="dash-h2">
            Photos{' '}
            <span className="mono dash-count">({album.photo_count})</span>
          </h2>
        </div>
        <PhotoUploader
          albumId={album.id}
          vendorId={user!.id}
          photos={photos ?? []}
        />
      </section>
    </div>
  );
}
