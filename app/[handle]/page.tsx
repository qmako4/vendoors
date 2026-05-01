import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { toDisplayAlbum, type AlbumRow, type GalleryAlbum } from '@/lib/albums';
import { SiteHeader } from '@/components/SiteHeader';
import { VendorGallery, type Category, type Section } from './_components/VendorGallery';

type Params = Promise<{ handle: string }>;
type SearchParams = Promise<{ cat?: string }>;

type ProductWithCategories = GalleryAlbum & {
  categoryIds: string[];
  isFeatured: boolean;
};

async function fetchVendor(handle: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, handle, display_name, bio, city, contact_whatsapp, contact_wechat, contact_telegram, contact_instagram, contact_email',
    )
    .eq('handle', handle)
    .maybeSingle();
  if (!profile) return null;

  // Products = every album the vendor owns that is public + has photos.
  const { data: rows } = await supabase
    .from('albums')
    .select(
      'id, slug, title, description, links, photo_count, updated_at, is_featured',
    )
    .eq('vendor_id', profile.id)
    .eq('is_public', true)
    .gt('photo_count', 0)
    .order('updated_at', { ascending: false });

  const productRows = (rows ?? []) as Array<AlbumRow & { is_featured: boolean }>;

  // Pull first 5 photos for each product (cover + 4 thumb strip).
  const ids = productRows.map((r) => r.id);
  const photosByAlbum = new Map<string, Array<{ key: string; thumb: string | null }>>();
  if (ids.length > 0) {
    const { data: photos } = await supabase
      .from('photos')
      .select('album_id, storage_key, thumb_storage_key, sort_order, created_at')
      .in('album_id', ids)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    for (const p of (photos ?? []) as Array<{
      album_id: string;
      storage_key: string;
      thumb_storage_key: string | null;
    }>) {
      const arr = photosByAlbum.get(p.album_id) ?? [];
      if (arr.length < 5) arr.push({ key: p.storage_key, thumb: p.thumb_storage_key });
      photosByAlbum.set(p.album_id, arr);
    }
  }

  // Category assignments
  const categoryIdsByProduct = new Map<string, string[]>();
  if (ids.length > 0) {
    const { data: pcs } = await supabase
      .from('product_categories')
      .select('album_id, category_id')
      .in('album_id', ids);
    for (const pc of (pcs ?? []) as Array<{
      album_id: string;
      category_id: string;
    }>) {
      const arr = categoryIdsByProduct.get(pc.album_id) ?? [];
      arr.push(pc.category_id);
      categoryIdsByProduct.set(pc.album_id, arr);
    }
  }

  const products: ProductWithCategories[] = productRows.map((row) => {
    const photos = photosByAlbum.get(row.id) ?? [];
    return {
      ...toDisplayAlbum({
        ...row,
        profiles: { display_name: profile.display_name },
      }),
      coverStorageKey: photos[0]?.key ?? null,
      coverThumbKey: photos[0]?.thumb ?? null,
      thumbStorageKeys: photos.slice(1, 5).map((p) => p.key),
      thumbStripThumbKeys: photos.slice(1, 5).map((p) => p.thumb),
      categoryIds: categoryIdsByProduct.get(row.id) ?? [],
      isFeatured: row.is_featured,
    };
  });

  // All categories owned by this vendor.
  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug, name, parent_id, sort_order')
    .eq('vendor_id', profile.id)
    .order('sort_order')
    .order('name');
  const categories: Category[] = ((cats ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    parent_id: string | null;
  }>).map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.name,
    parent_id: c.parent_id,
  }));

  return { profile, products, categories };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { handle } = await params;
  const result = await fetchVendor(handle);
  if (!result) return { title: 'Vendor not found' };
  return {
    title: result.profile.display_name,
    description:
      result.profile.bio ??
      `${result.profile.display_name}'s gallery on Vendoors`,
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { handle } = await params;
  const { cat } = await searchParams;
  const result = await fetchVendor(handle);
  if (!result) notFound();

  // Build sections — one per category that has products.
  const productsByCategory = new Map<string, ProductWithCategories[]>();
  const uncategorized: ProductWithCategories[] = [];
  for (const p of result.products) {
    if (p.categoryIds.length === 0) {
      uncategorized.push(p);
      continue;
    }
    for (const cid of p.categoryIds) {
      const arr = productsByCategory.get(cid) ?? [];
      arr.push(p);
      productsByCategory.set(cid, arr);
    }
  }

  const sections: Section[] = [];

  // Featured section first if any products are pinned.
  const featured = result.products.filter((p) => p.isFeatured);
  if (featured.length > 0 && !cat) {
    sections.push({
      category: {
        id: '__featured',
        slug: '__featured',
        title: 'Featured',
        parent_id: null,
      },
      products: featured,
      totalCount: featured.length,
    });
  }

  for (const c of result.categories) {
    const products = productsByCategory.get(c.id) ?? [];
    if (products.length === 0) continue;
    sections.push({
      category: c,
      products,
      totalCount: products.length,
    });
  }

  if (uncategorized.length > 0) {
    sections.push({
      category: {
        id: '__uncat',
        slug: '__uncat',
        title: 'Uncategorized',
        parent_id: null,
      },
      products: uncategorized,
      totalCount: uncategorized.length,
    });
  }

  return (
    <>
      <SiteHeader />
      <VendorGallery
        profile={result.profile}
        categories={result.categories}
        sections={sections}
        activeCategoryId={cat ?? null}
      />
    </>
  );
}
