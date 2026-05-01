import { resizeForUpload } from './storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type UploadedMedia = {
  mediaId: string;
  storageKey: string;
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
 * (the vendor's library). Returns the new media id and storage key so the
 * caller can also create a `photos` row that links to it.
 *
 * Throws on failure.
 */
export async function uploadToLibrary(
  supabase: SupabaseLike,
  file: File,
  vendorId: string,
): Promise<UploadedMedia> {
  // Detect images even when the browser leaves file.type empty (iPhone HEIC).
  const looksLikeImage =
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name);
  if (!looksLikeImage) throw new Error('Not an image');

  const { blob, width, height, type } = await resizeForUpload(file);
  const ext =
    type === 'image/jpeg'
      ? 'jpg'
      : (file.name.split('.').pop()?.toLowerCase() ?? 'jpg');
  const key = `${vendorId}/library/${randomId()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('photos')
    .upload(key, blob, { contentType: type });
  if (upErr) throw upErr;

  const { data: media, error: insErr } = await supabase
    .from('media')
    .insert({
      vendor_id: vendorId,
      storage_key: key,
      width,
      height,
      filename: file.name,
    })
    .select('id')
    .single();

  if (insErr || !media) {
    await supabase.storage.from('photos').remove([key]);
    throw insErr ?? new Error('Could not save to library');
  }

  return { mediaId: media.id, storageKey: key, width, height };
}
