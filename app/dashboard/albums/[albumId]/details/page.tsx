import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AlbumColor, AlbumLink } from '@/lib/supabase/types';
import { AlbumMetaForm } from '../_components/AlbumMetaForm';
import { DeleteAlbumButton } from '../../../_components/DeleteAlbumButton';

export const metadata: Metadata = { title: 'Album details' };

type Params = Promise<{ albumId: string }>;

export default async function Page({ params }: { params: Params }) {
  const { albumId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: album } = await supabase
    .from('albums')
    .select('id, slug, title, description, links, sizes, colors, is_public')
    .eq('id', albumId)
    .eq('vendor_id', user!.id)
    .maybeSingle();

  if (!album) notFound();

  const links: AlbumLink[] = Array.isArray(album.links) ? album.links : [];
  const sizes: string[] = Array.isArray(album.sizes) ? (album.sizes as string[]) : [];
  const colors: AlbumColor[] = Array.isArray(album.colors)
    ? (album.colors as AlbumColor[])
    : [];

  // Fetch all of this vendor's categories + which ones this product is in.
  const [{ data: cats }, { data: assigned }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, parent_id')
      .eq('vendor_id', user!.id)
      .order('name'),
    supabase
      .from('product_categories')
      .select('category_id')
      .eq('album_id', album.id),
  ]);
  const categoryOptions = (cats ?? []) as Array<{
    id: string;
    name: string;
    parent_id: string | null;
  }>;
  const categoryIds = (assigned ?? []).map((r) => r.category_id);
  const kind = 'product';

  return (
    <div className="dash-page dash-page-narrow">
      <header className="dash-head">
        <Link href={`/dashboard/albums/${album.id}`} className="dash-back mono">
          ← {album.title}
        </Link>
        <div className="dash-eyebrow mono">{album.slug}</div>
        <h1 className="dash-h1">Edit details</h1>
        <p className="dash-lede">
          Title, description, links, and visibility for this album.
        </p>
      </header>

      <section className="dash-section">
        <AlbumMetaForm
          albumId={album.id}
          vendorId={user!.id}
          categoryOptions={categoryOptions}
          initial={{
            title: album.title,
            description: album.description,
            links,
            sizes,
            colors,
            categoryIds,
            is_public: album.is_public,
          }}
        />
      </section>

      <section className="dash-section dash-danger-zone">
        <div className="dash-section-head">
          <h2 className="dash-h2">Danger zone</h2>
        </div>
        <p
          className="dash-empty-sub"
          style={{ textAlign: 'left', margin: '0 0 16px' }}
        >
          Deleting removes the album, all its photos, and any nested child
          albums. This cannot be undone.
        </p>
        <DeleteAlbumButton
          albumId={album.id}
          albumTitle={album.title}
          kind={kind}
          variant="button"
          redirectTo="/dashboard"
        />
      </section>
    </div>
  );
}
