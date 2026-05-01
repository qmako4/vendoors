import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  toDisplayAlbum,
  type AlbumRow,
} from '@/lib/albums';
import { SiteHeader } from '@/components/SiteHeader';
import { AlbumDetail, type RealPhoto } from './_components/AlbumDetail';

type Params = Promise<{ handle: string; albumSlug: string }>;

async function fetchAlbum(handle: string, albumSlug: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, handle, display_name, contact_whatsapp, contact_wechat, contact_telegram, contact_instagram, contact_email',
    )
    .eq('handle', handle)
    .maybeSingle();
  if (!profile) return null;

  const { data: album } = await supabase
    .from('albums')
    .select('id, slug, title, description, links, sizes, colors, photo_count, updated_at')
    .eq('slug', albumSlug)
    .eq('vendor_id', profile.id)
    .eq('is_public', true)
    .maybeSingle();
  if (!album) return null;

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_key, width, height, caption')
    .eq('album_id', album.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  return { profile, album, photos: photos ?? [], children: [] };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle, albumSlug } = await params;
  const result = await fetchAlbum(handle, albumSlug);
  if (!result) return { title: 'Album not found' };
  return {
    title: `${result.album.title} — ${result.profile.display_name}`,
  };
}

export default async function Page({ params }: { params: Params }) {
  const { handle, albumSlug } = await params;
  const result = await fetchAlbum(handle, albumSlug);
  if (!result) notFound();

  const album = toDisplayAlbum({
    ...(result.album as AlbumRow),
    profiles: { display_name: result.profile.display_name },
  });
  const photos: RealPhoto[] = result.photos.map((p) => ({
    id: p.id,
    storageKey: p.storage_key,
    width: p.width,
    height: p.height,
    caption: p.caption,
  }));

  const albumRow = result.album as { sizes?: unknown; colors?: unknown };
  const sizes: string[] = Array.isArray(albumRow.sizes)
    ? (albumRow.sizes as string[])
    : [];
  const colors = Array.isArray(albumRow.colors)
    ? (albumRow.colors as Array<{ name: string; hex: string }>)
    : [];

  return (
    <>
      <SiteHeader />
      <AlbumDetail
        album={album}
        photos={photos}
        children={result.children}
        sizes={sizes}
        colors={colors}
        vendorHandle={result.profile.handle}
        contactSource={{
          contact_whatsapp: result.profile.contact_whatsapp,
          contact_wechat: result.profile.contact_wechat,
          contact_telegram: result.profile.contact_telegram,
          contact_instagram: result.profile.contact_instagram,
          contact_email: result.profile.contact_email,
        }}
      />
    </>
  );
}
