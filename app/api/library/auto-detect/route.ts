import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  classifyImages,
  groupClassifications,
  defaultSizesFor,
  type ClassifyResult,
  type VendorCategory,
} from '@/lib/auto-detect';
import type { MediaClassification } from '@/lib/supabase/types';

export const runtime = 'nodejs';
// Vision calls + grouping can take 30-60s for a batch.
export const maxDuration = 300;

// Cap how many fresh classifications we attempt per call so we finish inside
// maxDuration even on a rate-limited Anthropic tier (50K input tokens/min on
// Tier 1 → ~25 vision calls/min). Larger libraries are processed across
// multiple clicks; cached classifications are free on re-runs.
const MAX_FRESH_PER_CALL = 40;

// Cap how many candidates go into the grouping pass. Even with everything
// cached, dumping 200+ photos into one tool-use call hurts reliability.
const MAX_GROUP_PER_CALL = 50;

type Body = {
  /** Specific media ids to process. If omitted, processes all unassigned + unprocessed. */
  mediaIds?: string[];
};

type MediaRow = {
  id: string;
  storage_key: string;
  classification: MediaClassification | null;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'product';
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // Empty body is fine — defaults to all unprocessed.
  }

  // 0) Cleanup: clear any cached "Untitled product" fallbacks left behind by a
  //    previous failed run so they get re-classified instead of silently skipped.
  await supabase
    .from('media')
    .update({ classification: null, processed_at: null })
    .eq('vendor_id', user.id)
    .eq('classification->>title', 'Untitled product');

  // 1) Pick the media to process.
  //    Default: media that have no photo row referencing them AND no cached classification.
  let query = supabase
    .from('media')
    .select('id, storage_key, classification')
    .eq('vendor_id', user.id);

  if (body.mediaIds && body.mediaIds.length > 0) {
    query = query.in('id', body.mediaIds);
  }

  const { data: mediaRows, error: mediaErr } = await query;
  if (mediaErr) {
    return NextResponse.json({ error: mediaErr.message }, { status: 500 });
  }
  const all = (mediaRows ?? []) as MediaRow[];

  if (all.length === 0) {
    return NextResponse.json({ groups: [], albumIds: [], processed: 0 });
  }

  // Filter out media that are already attached to an album (have a photo row).
  const { data: existingPhotos } = await supabase
    .from('photos')
    .select('media_id')
    .in(
      'media_id',
      all.map((m) => m.id),
    )
    .not('media_id', 'is', null);

  const attached = new Set(
    ((existingPhotos ?? []) as Array<{ media_id: string | null }>)
      .map((p) => p.media_id)
      .filter((x): x is string => x !== null),
  );

  const candidates = all.filter((m) => !attached.has(m.id));
  if (candidates.length === 0) {
    return NextResponse.json({ groups: [], albumIds: [], processed: 0 });
  }

  // 2) Classify any candidates without a cached classification, capped per call.
  const needClassifyAll = candidates.filter((m) => !m.classification);
  const needClassify = needClassifyAll.slice(0, MAX_FRESH_PER_CALL);
  const remainingAfterCap = needClassifyAll.length - needClassify.length;

  const cached: ClassifyResult[] = candidates
    .filter((m) => m.classification)
    .map((m) => ({ mediaId: m.id, classification: m.classification! }));

  let fresh: ClassifyResult[] = [];
  if (needClassify.length > 0) {
    fresh = await classifyImages(
      needClassify.map((m) => ({ id: m.id, storage_key: m.storage_key })),
    );

    // Only cache successful classifications — failed ones (rate limit, network,
    // etc.) should be retried on the next click rather than poisoning the cache.
    const successful = fresh.filter((r) => !r.failed);
    if (successful.length > 0) {
      await Promise.all(
        successful.map((r) =>
          supabase
            .from('media')
            .update({
              classification: r.classification,
              processed_at: new Date().toISOString(),
            })
            .eq('id', r.mediaId),
        ),
      );
    }
  }

  // Drop failed results from the grouping/album-creation pipeline — better to
  // leave those images unprocessed than to create albums with bogus titles.
  const allResults = [...cached, ...fresh.filter((r) => !r.failed)];
  const failedCount = fresh.filter((r) => r.failed).length;

  // 3) Drop "other" — these are likely lookbook / packaging / non-product shots.
  // Then cap at MAX_GROUP_PER_CALL so the grouping LLM stays reliable.
  const productResultsAll = allResults.filter(
    (r) => r.classification.category !== 'other',
  );
  const productResults = productResultsAll.slice(0, MAX_GROUP_PER_CALL);
  const groupingDeferred = productResultsAll.length - productResults.length;

  if (productResults.length === 0) {
    return NextResponse.json({
      groups: 0,
      albumIds: [],
      processed: allResults.length,
      skipped: allResults.length,
      remaining: remainingAfterCap,
    });
  }

  // 4) Pull the vendor's categories so the AI can assign each group to one.
  const { data: catRows } = await supabase
    .from('categories')
    .select('id, name, parent_id')
    .eq('vendor_id', user.id);
  const catList = (catRows ?? []) as Array<{
    id: string;
    name: string;
    parent_id: string | null;
  }>;
  const nameById = new Map(catList.map((c) => [c.id, c.name]));
  const vendorCategories: VendorCategory[] = catList.map((c) => ({
    id: c.id,
    name: c.name,
    parent: c.parent_id ? nameById.get(c.parent_id) ?? null : null,
  }));

  // 5) Group across products + assign each group to a vendor category.
  const groups = await groupClassifications(productResults, vendorCategories);

  // 6) Pick existing slugs so we can disambiguate collisions.
  const { data: existingAlbums } = await supabase
    .from('albums')
    .select('slug')
    .eq('vendor_id', user.id);
  const usedSlugs = new Set(
    ((existingAlbums ?? []) as Array<{ slug: string }>).map((a) => a.slug),
  );

  // 7) Create one draft album per group + photo rows linking media → album.
  const createdAlbumIds: string[] = [];
  for (const g of groups) {
    let slug = slugify(g.title);
    let n = 1;
    while (usedSlugs.has(slug)) {
      n += 1;
      slug = `${slugify(g.title)}-${n}`;
    }
    usedSlugs.add(slug);

    const { data: album, error: albumErr } = await supabase
      .from('albums')
      .insert({
        vendor_id: user.id,
        title: g.title,
        slug,
        sizes: defaultSizesFor(g.category),
        colors: g.colors,
        is_public: false, // draft
      })
      .select('id')
      .single();

    if (albumErr || !album) {
      console.error('[auto-detect] album insert failed', albumErr);
      continue;
    }

    // Look up media dimensions so we can populate the photo row.
    const groupMedia = candidates.filter((m) => g.photoIds.includes(m.id));
    const { data: dims } = await supabase
      .from('media')
      .select('id, storage_key, width, height')
      .in(
        'id',
        groupMedia.map((m) => m.id),
      );

    const dimsMap = new Map(
      ((dims ?? []) as Array<{
        id: string;
        storage_key: string;
        width: number;
        height: number;
      }>).map((d) => [d.id, d]),
    );

    const photoRows = g.photoIds
      .map((mediaId, i) => {
        const d = dimsMap.get(mediaId);
        if (!d) return null;
        return {
          album_id: album.id,
          media_id: mediaId,
          storage_key: d.storage_key,
          width: d.width,
          height: d.height,
          sort_order: i,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (photoRows.length > 0) {
      await supabase.from('photos').insert(photoRows);
    }

    if (g.categoryId) {
      await supabase.from('product_categories').insert({
        album_id: album.id,
        category_id: g.categoryId,
      });
    }

    createdAlbumIds.push(album.id);
  }

  return NextResponse.json({
    groups: groups.length,
    albumIds: createdAlbumIds,
    processed: allResults.length,
    skipped: allResults.length - productResultsAll.length,
    /** Images we couldn't classify this call (rate-limited / errored). They'll be retried next click. */
    failed: failedCount,
    /** Images deferred to the next click — sum of: classify-cap leftovers + grouping-cap leftovers. */
    remaining: remainingAfterCap + groupingDeferred,
  });
}
