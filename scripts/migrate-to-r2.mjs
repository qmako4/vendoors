// One-off backfill: copy every photo object from Supabase Storage (bucket
// "photos") into Cloudflare R2 under the SAME key. Because keys are
// identical, the read-side cutover is just setting NEXT_PUBLIC_R2_PUBLIC_URL.
//
// Safe to re-run: it HEADs R2 first and skips objects already copied.
//
// Run:  node scripts/migrate-to-r2.mjs
// Reads credentials from .env.local in the project root.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

// --- load .env.local ---------------------------------------------------
function loadEnv() {
  let raw = '';
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch {
    console.error('Missing .env.local in project root.');
    process.exit(1);
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnv();

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_BUCKET = 'vendoors-photos',
} = process.env;

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY,
})) {
  if (!v) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
}

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

function contentType(key) {
  const ext = key.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'avif') return 'image/avif';
  return 'image/jpeg';
}

// Collect every distinct storage key referenced by the DB.
async function collectKeys() {
  const keys = new Set();
  for (const table of ['media', 'photos']) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(table)
        .select('storage_key, thumb_storage_key')
        .range(from, from + 999);
      if (error) {
        console.error(`Query ${table} failed:`, error.message);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      for (const row of data) {
        if (row.storage_key) keys.add(row.storage_key);
        if (row.thumb_storage_key) keys.add(row.thumb_storage_key);
      }
      if (data.length < 1000) break;
    }
  }
  return [...keys];
}

async function existsInR2(key) {
  try {
    await r2.send(
      new HeadObjectCommand({ Bucket: CLOUDFLARE_R2_BUCKET, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

async function copyOne(key) {
  if (await existsInR2(key)) return 'skip';
  const { data, error } = await supabase.storage.from('photos').download(key);
  if (error || !data) throw new Error(`download failed: ${error?.message}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  await r2.send(
    new PutObjectCommand({
      Bucket: CLOUDFLARE_R2_BUCKET,
      Key: key,
      Body: bytes,
      ContentType: contentType(key),
    }),
  );
  return 'copied';
}

async function main() {
  console.log('Collecting keys from DB…');
  const keys = await collectKeys();
  console.log(`${keys.length} objects to check.`);

  let copied = 0;
  let skipped = 0;
  let failed = 0;
  const CONCURRENCY = 8;
  let i = 0;

  async function worker() {
    while (i < keys.length) {
      const idx = i++;
      const key = keys[idx];
      try {
        const r = await copyOne(key);
        if (r === 'copied') copied++;
        else skipped++;
      } catch (e) {
        failed++;
        console.error(`FAIL ${key}: ${e.message}`);
      }
      const done = copied + skipped + failed;
      if (done % 25 === 0 || done === keys.length) {
        console.log(
          `  ${done}/${keys.length}  copied=${copied} skipped=${skipped} failed=${failed}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker()),
  );

  console.log(
    `\nDone. copied=${copied} skipped=${skipped} failed=${failed} total=${keys.length}`,
  );
  if (failed > 0) process.exit(1);
}

main();
