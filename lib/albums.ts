import type { Swatch, Photo } from './data';

const SWATCHES: Swatch[] = [
  ['#1c1c1a', '#2a2a27'],
  ['#e9e3d6', '#dcd4c2'],
  ['#3a2f25', '#4a3c2e'],
  ['#7a3b2c', '#5e2c20'],
  ['#2d3a3a', '#1f2a2a'],
  ['#c9b89a', '#b9a684'],
  ['#48402f', '#352d20'],
  ['#8a8478', '#6f6a5f'],
  ['#a85a3c', '#8c4a30'],
  ['#1f2933', '#141c24'],
  ['#d9cdb4', '#c4b89c'],
  ['#5d4a36', '#473828'],
];

const PHOTO_RATIOS: Array<[number, number]> = [
  [4, 5], [4, 5], [3, 2], [4, 5], [1, 1],
  [4, 5], [3, 4], [2, 3], [4, 5], [3, 2],
  [4, 5], [1, 1], [4, 5], [4, 5],
];

// Stable hash → small int. Same string → same swatch every render.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type AlbumLink = { label: string; url: string };

export type DisplayAlbum = {
  id: string;          // DB uuid
  slug: string;        // url-stable (vendor's local id, e.g., vd-1042)
  title: string;
  description: string | null;
  links: AlbumLink[];
  vendor: string;      // joined from profiles.display_name
  photoCount: number;
  updatedDays: number;
  swatch: Swatch;
  label: string;
};

// A DisplayAlbum + the storage keys needed to render a gallery card.
export type GalleryAlbum = DisplayAlbum & {
  coverStorageKey: string | null;
  coverThumbKey: string | null;
  thumbStorageKeys: string[];
  thumbStripThumbKeys: (string | null)[];
};

// Server helper: fetch albums under a parent (or null for top-level) and the
// first 5 photos of each album (cover + 4 thumb-strip previews).
//
// Pass a Supabase client (server or service-role); RLS handles visibility.
type SupabaseQueryClient = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export async function fetchAlbumsWithThumbs(
  supabase: SupabaseQueryClient,
  opts: {
    vendorId: string;
    vendorName: string;
    parentId: string | null;
    isPublic?: boolean;
  },
): Promise<GalleryAlbum[]> {
  let query = supabase
    .from('albums')
    .select('id, slug, title, description, links, photo_count, updated_at')
    .eq('vendor_id', opts.vendorId);

  if (opts.parentId === null) query = query.is('parent_id', null);
  else query = query.eq('parent_id', opts.parentId);

  if (opts.isPublic) query = query.eq('is_public', true);

  query = query.order('updated_at', { ascending: false });

  const { data: rows } = await query;
  const albumRows = (rows ?? []) as AlbumRow[];

  const ids = albumRows.map((r) => r.id);
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

  return albumRows.map((row) => {
    const photos = photosByAlbum.get(row.id) ?? [];
    return {
      ...toDisplayAlbum({
        ...row,
        profiles: { display_name: opts.vendorName },
      }),
      coverStorageKey: photos[0]?.key ?? null,
      coverThumbKey: photos[0]?.thumb ?? null,
      thumbStorageKeys: photos.slice(1, 5).map((p) => p.key),
      thumbStripThumbKeys: photos.slice(1, 5).map((p) => p.thumb),
    };
  });
}

// Shape the Supabase row (with optional joined profile) into a DisplayAlbum.
export type AlbumRow = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  links?: AlbumLink[] | null;
  photo_count: number;
  updated_at: string;
  profiles?: { display_name: string | null } | null;
};

export function toDisplayAlbum(row: AlbumRow): DisplayAlbum {
  const swatch = SWATCHES[hash(row.id) % SWATCHES.length];
  const label = row.title.split(' / ')[1] ?? row.title;
  const updatedDays = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(row.updated_at).getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    links: row.links ?? [],
    vendor: row.profiles?.display_name ?? 'Vendor',
    photoCount: row.photo_count,
    updatedDays,
    swatch,
    label,
  };
}

// Generate procedural photos until real uploads exist.
export function placeholderPhotosFor(album: DisplayAlbum): Photo[] {
  const baseIdx = SWATCHES.findIndex(
    (s) => s[0] === album.swatch[0] && s[1] === album.swatch[1],
  );
  return Array.from({ length: album.photoCount }).map((_, i) => {
    const [w, h] = PHOTO_RATIOS[i % PHOTO_RATIOS.length];
    return {
      idx: i + 1,
      w,
      h,
      swatch: SWATCHES[(baseIdx + i) % SWATCHES.length],
      caption: `Plate ${String(i + 1).padStart(2, '0')}`,
    };
  });
}
