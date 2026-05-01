'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AlbumColor } from '@/lib/supabase/types';

export type CreateProductInput = {
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  categoryIds: string[];
  /** Sizes the product is available in (e.g. ["UK 8", "UK 9"] or ["S","M","L"]). */
  sizes: string[];
  /** Available colorways. */
  colors: AlbumColor[];
  /**
   * Media items to attach to the new product. Order is preserved as photo
   * sort_order (first media item becomes the cover).
   */
  mediaIds: string[];
};

export type CreateProductResult =
  | { ok: true; albumId: string }
  | { ok: false; error: string };

/**
 * Create a product (album) + attach photo rows for the chosen media items + link
 * to chosen categories. Returns the album id so the caller can redirect, or an
 * error string for the caller to surface.
 *
 * Not transactional in the strict sense — Supabase JS doesn't expose a
 * transaction primitive. If the photos insert fails, we delete the album to
 * avoid leaving orphan products.
 */
export async function createProduct(
  input: CreateProductInput,
): Promise<CreateProductResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const title = input.title.trim();
  const slug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!title || !slug) {
    return { ok: false, error: 'Title and slug are required' };
  }

  // 1. Insert the album
  const { data: album, error: albumErr } = await supabase
    .from('albums')
    .insert({
      vendor_id: user.id,
      title,
      slug,
      description: input.description?.trim() || null,
      sizes: input.sizes,
      colors: input.colors,
      is_public: input.isPublic,
    })
    .select('id')
    .single();

  if (albumErr || !album) {
    return { ok: false, error: albumErr?.message ?? 'Could not create product' };
  }

  // 2. Attach photos (look up dimensions + storage_key from media)
  if (input.mediaIds.length > 0) {
    const { data: mediaRows, error: mediaErr } = await supabase
      .from('media')
      .select('id, storage_key, width, height')
      .in('id', input.mediaIds)
      .eq('vendor_id', user.id);

    if (mediaErr) {
      await supabase.from('albums').delete().eq('id', album.id);
      return { ok: false, error: `Could not attach photos: ${mediaErr.message}` };
    }

    type MediaRow = { id: string; storage_key: string; width: number; height: number };
    const byId = new Map(((mediaRows ?? []) as MediaRow[]).map((m) => [m.id, m]));

    const photoRows = input.mediaIds
      .map((id, i) => {
        const m = byId.get(id);
        if (!m) return null;
        return {
          album_id: album.id,
          media_id: m.id,
          storage_key: m.storage_key,
          width: m.width,
          height: m.height,
          sort_order: i,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (photoRows.length > 0) {
      const { error: photosErr } = await supabase.from('photos').insert(photoRows);
      if (photosErr) {
        await supabase.from('albums').delete().eq('id', album.id);
        return { ok: false, error: `Could not attach photos: ${photosErr.message}` };
      }
    }
  }

  // 3. Link to categories
  if (input.categoryIds.length > 0) {
    await supabase.from('product_categories').insert(
      input.categoryIds.map((id, i) => ({
        album_id: album.id,
        category_id: id,
        sort_order: i,
      })),
    );
  }

  return { ok: true, albumId: album.id };
}
