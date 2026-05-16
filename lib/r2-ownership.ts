// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

/**
 * A storage key is `${galleryId}/library/...`. A user may touch a key only
 * if they own the gallery (profiles.id = galleryId AND owner_id = user) —
 * the same check as the "owner manages media" RLS policy. Returns true iff
 * the user owns every gallery referenced by the given keys.
 */
export async function assertOwnsKeys(
  supabase: SupabaseLike,
  userId: string,
  keys: string[],
): Promise<boolean> {
  const galleryIds = [...new Set(keys.map((k) => k.split('/')[0]))];
  if (galleryIds.some((id) => !id)) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', userId)
    .in('id', galleryIds);
  if (error) return false;
  const owned = new Set((data ?? []).map((r: { id: string }) => r.id));
  return galleryIds.every((id) => owned.has(id));
}
