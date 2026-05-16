// Single source of truth for the storage cutover. When
// NEXT_PUBLIC_R2_PUBLIC_URL is set, the whole app (reads, uploads, deletes)
// uses Cloudflare R2; otherwise it stays on Supabase Storage. Flipping this
// one env var in Vercel is the entire cutover, and unsetting it reverts.
export const USING_R2 = !!(
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''
).trim();
