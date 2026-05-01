import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { photoUrl } from '@/lib/storage';
import { getActiveGallery } from '@/lib/active-gallery';
import { CopyLinkButton } from './_components/CopyLinkButton';
import { DeleteAlbumButton } from './_components/DeleteAlbumButton';
import { FeatureToggle } from './_components/FeatureToggle';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const active = await getActiveGallery();
  const galleryId = active?.id ?? '';

  const profile = active
    ? { handle: active.handle, display_name: active.display_name }
    : null;

  // Flat list of all this vendor's products (every album they own).
  const { data: products } = await supabase
    .from('albums')
    .select('id, slug, title, photo_count, is_public, is_featured, updated_at')
    .eq('vendor_id', galleryId)
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false });

  // Pull the cover photo (first by sort_order) for each product so the list
  // shows a thumbnail next to the title.
  const productIds = (products ?? []).map((p) => p.id);
  const coverByProduct = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: photos } = await supabase
      .from('photos')
      .select('album_id, storage_key, sort_order, created_at')
      .in('album_id', productIds)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    for (const p of (photos ?? []) as Array<{
      album_id: string;
      storage_key: string;
    }>) {
      if (!coverByProduct.has(p.album_id)) {
        coverByProduct.set(p.album_id, p.storage_key);
      }
    }
  }

  // Category counts so the user can see how many categories they have.
  const { count: categoryCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', galleryId);

  const productCount = products?.length ?? 0;
  const handle = profile?.handle ?? null;

  return (
    <div className="dash-page">
      <header className="dash-head">
        <div className="dash-eyebrow mono">YOUR GALLERY</div>
        <h1 className="dash-h1">Welcome back.</h1>
        <p className="dash-lede">
          Manage your products and categories.
          {handle && (
            <>
              {' '}Your gallery is live at{' '}
              <Link href={`/${handle}`} className="dash-link mono">
                vendoors.co / {handle}
              </Link>
              .
            </>
          )}
        </p>
      </header>

      <section className="dash-quick-grid">
        <Link href="/dashboard/categories" className="dash-quick-card">
          <div className="dash-quick-num mono">{categoryCount ?? 0}</div>
          <div className="dash-quick-label">Categories</div>
          <div className="dash-quick-cta mono">Manage →</div>
        </Link>
        <Link href="/dashboard/media" className="dash-quick-card">
          <div className="dash-quick-num mono">⌫</div>
          <div className="dash-quick-label">Image library</div>
          <div className="dash-quick-cta mono">Open →</div>
        </Link>
        <Link href="/dashboard/profile" className="dash-quick-card">
          <div className="dash-quick-num mono">@</div>
          <div className="dash-quick-label">Profile &amp; contacts</div>
          <div className="dash-quick-cta mono">Edit →</div>
        </Link>
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <h2 className="dash-h2">
            Your products{' '}
            <span className="mono dash-count">({productCount})</span>
          </h2>
          <Link href="/dashboard/albums/new" className="btn-primary">
            New product +
          </Link>
        </div>

        {productCount === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">◇</div>
            <div className="dash-empty-h mono">NO PRODUCTS YET</div>
            <p className="dash-empty-sub">
              Create your first product. Once it has photos, you can assign
              it to one or more categories.
            </p>
            <Link href="/dashboard/albums/new" className="btn-primary btn-lg">
              Create your first product →
            </Link>
          </div>
        ) : (
          <ul className="dash-album-list">
            {products!.map((p) => {
              const cover = coverByProduct.get(p.id);
              return (
                <li key={p.id} className="dash-album-row">
                  <Link
                    href={`/dashboard/albums/${p.id}`}
                    className="dash-album-thumb"
                    aria-label={`Edit ${p.title}`}
                  >
                    {cover ? (
                      <Image
                        src={photoUrl(cover)}
                        alt={p.title}
                        fill
                        sizes="64px"
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <span className="dash-album-thumb-empty mono">—</span>
                    )}
                  </Link>
                  <div className="dash-album-meta">
                    <Link
                      href={`/dashboard/albums/${p.id}`}
                      className="dash-album-title-link"
                    >
                      <div className="dash-album-title">{p.title}</div>
                    </Link>
                    <div className="dash-album-sub mono">
                      {handle ? `vendoors.co / ${handle} / ${p.slug}` : p.slug} ·{' '}
                      {p.photo_count} photos ·{' '}
                      {p.is_public ? 'public' : 'private'}
                    </div>
                  </div>
                  <div className="dash-album-actions">
                    <FeatureToggle albumId={p.id} initial={p.is_featured} />
                    {handle && (
                      <>
                        <CopyLinkButton url={`/${handle}/${p.slug}`} />
                        <Link
                          href={`/${handle}/${p.slug}`}
                          className="dash-link mono"
                          target="_blank"
                        >
                          view ↗
                        </Link>
                      </>
                    )}
                    <Link
                      href={`/dashboard/albums/${p.id}`}
                      className="dash-link mono"
                    >
                      edit
                    </Link>
                    <DeleteAlbumButton
                      albumId={p.id}
                      albumTitle={p.title}
                      kind="product"
                      variant="link"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
