import { NextResponse } from 'next/server';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { createClient } from '@/lib/supabase/server';
import { r2Client, R2_BUCKET } from '@/lib/r2';
import { assertOwnsKeys } from '@/lib/r2-ownership';

// Server-side bulk delete (one round trip for album deletes). Ownership-
// gated the same way as uploads.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    keys?: unknown;
  } | null;
  const keys = Array.isArray(body?.keys)
    ? body.keys.filter((k): k is string => typeof k === 'string' && !!k)
    : [];
  if (keys.length === 0 || keys.length > 1000) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (keys.some((k) => k.includes('..'))) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const ok = await assertOwnsKeys(supabase, user.id, keys);
  if (!ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await r2Client().send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  );

  return NextResponse.json({ ok: true });
}
