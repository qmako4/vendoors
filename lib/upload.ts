import { resizeForUpload, makeThumb } from './storage';
import { r2Upload, r2Remove } from './r2-client';
import { USING_R2 } from './storage-backend';

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

  // Build the thumbnail up front so full + thumb upload in one presign call.
  // If thumbnailing fails, the grid just falls back to the full image.
  let thumb: Awaited<ReturnType<typeof makeThumb>> | null = null;
  try {
    thumb = await makeThumb(blob);
  } catch (e) {
    console.warn('thumbnail generation failed; falling back to full size', e);
  }

  const uploads = [{ key: fullKey, blob, contentType: type }];
  if (thumb) {
    uploads.push({ key: thumbKey, blob: thumb.blob, contentType: thumb.type });
  }
  if (USING_R2) {
    await r2Upload(uploads);
  } else {
    for (const u of uploads) {
      const { error: upErr } = await supabase.storage
        .from('photos')
        .upload(u.key, u.blob, { contentType: u.contentType });
      if (upErr) throw upErr;
    }
  }
  const thumbStorageKey: string | null = thumb ? thumbKey : null;

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
    const orphans = thumbStorageKey ? [fullKey, thumbStorageKey] : [fullKey];
    if (USING_R2) await r2Remove(orphans);
    else await supabase.storage.from('photos').remove(orphans);
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
