import { resizeForUpload, makeThumb } from './storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type UploadedMedia = {
  mediaId: string;
  storageKey: string;
  thumbStorageKey: string | null;
  width: number;
  height: number;
};

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Upload an image to Supabase Storage AND create a `media` row for it
 * (the vendor's library). Generates BOTH a full-size (1600px) and a
 * thumbnail (480px) so grids load fast without depending on Vercel's
 * paid image optimization.
 *
 * Throws on failure.
 */
export async function uploadToLibrary(
  supabase: SupabaseLike,
  file: File,
  vendorId: string,
  watermarkText?: string | null,
): Promise<UploadedMedia> {
  const looksLikeImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name);
  if (!looksLikeImage) throw new Error('Not an image');

  const { blob, width, height, type } = await resizeForUpload(file, {
    watermarkText,
  });
  const ext =
    type === 'image/jpeg'
      ? 'jpg'
      : (file.name.split('.').pop()?.toLowerCase() ?? 'jpg');
  const baseId = randomId();
  const fullKey = `${vendorId}/library/${baseId}.${ext}`;
  const thumbKey = `${vendorId}/library/${baseId}-thumb.jpg`;

  // Upload full size first.
  const { error: upErr } = await supabase.storage
    .from('photos')
    .upload(fullKey, blob, { contentType: type });
  if (upErr) throw upErr;

  // Generate + upload thumbnail. If it fails, log and continue — the full
  // image still works, the grid just falls back to it.
  let thumbStorageKey: string | null = null;
  try {
    const thumb = await makeThumb(blob);
    const { error: thumbErr } = await supabase.storage
      .from('photos')
      .upload(thumbKey, thumb.blob, { contentType: thumb.type });
    if (!thumbErr) thumbStorageKey = thumbKey;
  } catch (e) {
    console.warn('thumbnail generation failed; falling back to full size', e);
  }

  const { data: media, error: insErr } = await supabase
    .from('media')
    .insert({
      vendor_id: vendorId,
      storage_key: fullKey,
      thumb_storage_key: thumbStorageKey,
      width,
      height,
      filename: file.name,
    })
    .select('id')
    .single();

  if (insErr || !media) {
    await supabase.storage.from('photos').remove(
      thumbStorageKey ? [fullKey, thumbStorageKey] : [fullKey],
    );
    throw insErr ?? new Error('Could not save to library');
  }

  return {
    mediaId: media.id,
    storageKey: fullKey,
    thumbStorageKey,
    width,
    height,
  };
}
