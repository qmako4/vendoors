import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 (S3-compatible) — server-only. Photos live here instead of
 * Supabase Storage so we don't pay egress per view (R2 egress is free).
 *
 * Public reads go through the R2.dev public URL (see lib/storage.ts).
 * Writes/deletes go through short-lived presigned URLs minted by
 * /api/r2-presign so the secret never reaches the browser.
 */

export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'vendoors-photos';

let cached: S3Client | null = null;

export function r2Client(): S3Client {
  if (cached) return cached;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 not configured: set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    );
  }
  cached = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}
