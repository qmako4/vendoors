'use client';

export type R2Upload = { key: string; blob: Blob; contentType: string };

/**
 * Upload blobs to R2 via short-lived presigned PUT URLs (browser → R2
 * directly, no Vercel proxy). Throws if any object fails.
 */
export async function r2Upload(uploads: R2Upload[]): Promise<void> {
  const res = await fetch('/api/r2-presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploads: uploads.map((u) => ({
        key: u.key,
        contentType: u.contentType,
      })),
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    throw new Error(j?.error || `Could not get upload URL (${res.status})`);
  }
  const { urls } = (await res.json()) as { urls: Record<string, string> };

  for (const u of uploads) {
    const putUrl = urls[u.key];
    if (!putUrl) throw new Error(`No upload URL for ${u.key}`);
    const put = await fetch(putUrl, {
      method: 'PUT',
      body: u.blob,
      headers: { 'Content-Type': u.contentType },
    });
    if (!put.ok) {
      throw new Error(`Upload failed for ${u.key} (${put.status})`);
    }
  }
}

/** Best-effort bulk delete of R2 objects. Never throws. */
export async function r2Remove(keys: string[]): Promise<void> {
  const clean = keys.filter(Boolean);
  if (clean.length === 0) return;
  try {
    await fetch('/api/r2-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: clean }),
    });
  } catch {
    // orphaned objects are cheap; a cleanup pass can sweep them later
  }
}
