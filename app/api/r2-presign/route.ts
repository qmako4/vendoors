import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@/lib/supabase/server';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { assertOwnsKeys } from '@/lib/r2-ownership';

type ReqItem = { key?: unknown; contentType?: unknown };

// Mints short-lived presigned PUT URLs for R2. Keys are prefixed with a
// gallery id (profiles.id); a user may only write keys for galleries they
// own — same rule as the media RLS policy "owner manages media".
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    uploads?: ReqItem[];
  } | null;
  const items = body?.uploads;
  if (!Array.isArray(items) || items.length === 0 || items.length > 4) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const parsed = items.map((it) => ({
    key: typeof it?.key === 'string' ? it.key : '',
    contentType:
      typeof it?.contentType === 'string'
        ? it.contentType
        : 'application/octet-stream',
  }));
  if (parsed.some((p) => !p.key || p.key.includes('..'))) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const ok = await assertOwnsKeys(
    supabase,
    user.id,
    parsed.map((p) => p.key),
  );
  if (!ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = r2Client();
  const urls: Record<string, string> = {};
  for (const { key, contentType } of parsed) {
    urls[key] = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 600 },
    );
  }

  return NextResponse.json({ urls });
}
