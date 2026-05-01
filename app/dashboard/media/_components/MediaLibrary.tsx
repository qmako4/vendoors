'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { thumbUrl } from '@/lib/storage';
import { uploadToLibrary } from '@/lib/upload';
import { useWatermarkText } from '@/components/useWatermarkText';

// Hide the auto-detect entry point until we revisit grouping reliability.
// The /api/library/auto-detect route handler stays deployed and works on its
// own; flip this to true (and redeploy) to bring the button back.
const AUTO_DETECT_ENABLED = false;

export type LibItem = {
  id: string;
  storage_key: string;
  thumb_storage_key: string | null;
  width: number;
  height: number;
  filename: string | null;
  created_at: string;
};

export type LibUsage = Record<string, Array<{ id: string; title: string }>>;

export function MediaLibrary({
  vendorId,
  initial,
  unassignedCount,
  usage,
}: {
  vendorId: string;
  initial: LibItem[];
  unassignedCount: number;
  usage: LibUsage;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const watermark = useWatermarkText(vendorId);
  const [items, setItems] = useState<LibItem[]>(initial);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<string | null>(null);

  async function upload(files: FileList) {
    setBusy(true);
    setErr(null);
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    const supabase = createClient();
    const failures: string[] = [];
    const inserted: LibItem[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        const { mediaId, storageKey, thumbStorageKey, width, height } = await uploadToLibrary(
          supabase,
          file,
          vendorId,
          watermark,
        );
        inserted.push({
          id: mediaId,
          storage_key: storageKey,
          thumb_storage_key: thumbStorageKey,
          width,
          height,
          filename: file.name,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        failures.push(`${file.name}: ${msg}`);
      }
      setProgress({ done: i + 1, total: list.length });
    }

    if (inserted.length > 0) {
      setItems((prev) => [...inserted, ...prev]);
    }
    if (failures.length > 0) {
      setErr(`${failures.length} failed:\n${failures.slice(0, 3).join('\n')}`);
    }
    setBusy(false);
    setProgress(null);
    router.refresh();
  }

  async function autoDetect() {
    if (detecting) return;
    if (
      !confirm(
        `Auto-detect products from ${unassignedCount} unused image${unassignedCount === 1 ? '' : 's'}?\n\nClaude will look at each image, group photos of the same product/colorway together, and create one draft product per group with the right size set (UK 5–13 for footwear, XS–XL for clothing). Drafts are private until you publish them. This may take a minute.`,
      )
    ) {
      return;
    }
    setDetecting(true);
    setDetectResult(null);
    setErr(null);
    try {
      const res = await fetch('/api/library/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = (await res.json()) as {
        groups: number;
        albumIds: string[];
        processed: number;
        skipped?: number;
        failed?: number;
        remaining?: number;
      };
      const created = data.albumIds.length;
      const skipped = data.skipped ?? 0;
      const failed = data.failed ?? 0;
      const remaining = data.remaining ?? 0;

      const parts: string[] = [];
      if (created > 0) {
        parts.push(
          `Created ${created} draft product${created === 1 ? '' : 's'} from ${data.processed} image${data.processed === 1 ? '' : 's'}.`,
        );
      } else if (data.processed > 0) {
        parts.push(
          `Processed ${data.processed} image${data.processed === 1 ? '' : 's'} but didn't create any drafts.`,
        );
      }
      if (skipped > 0) {
        parts.push(`${skipped} non-product image${skipped === 1 ? '' : 's'} skipped.`);
      }
      if (failed > 0) {
        parts.push(
          `${failed} image${failed === 1 ? '' : 's'} couldn't be classified this round (rate limit) — click again to retry.`,
        );
      }
      if (remaining > 0) {
        parts.push(
          `${remaining} more image${remaining === 1 ? '' : 's'} queued — click "Auto-detect products" again to process them.`,
        );
      }
      if (created > 0 && remaining === 0 && failed === 0) {
        parts.push('Review them in your dashboard.');
      }
      setDetectResult(parts.join(' '));
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(`Auto-detect failed: ${msg}`);
    } finally {
      setDetecting(false);
    }
  }

  async function remove(item: LibItem) {
    if (
      !confirm(
        `Delete "${item.filename ?? 'image'}"?\n\nIt will also be removed from any product that uses it. This cannot be undone.`,
      )
    ) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('media').delete().eq('id', item.id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    await supabase.storage.from('photos').remove([item.storage_key]);
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    router.refresh();
  }

  return (
    <div className="media-page">
      <div
        className={`uploader-drop ${busy ? 'busy' : ''}`}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (busy) return;
          if (e.dataTransfer.files.length > 0) upload(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              upload(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <div className="uploader-drop-label mono">
          {busy ? `UPLOADING ${progress?.done}/${progress?.total}…` : 'DROP IMAGES OR CLICK TO PICK'}
        </div>
        <div className="uploader-drop-sub mono">
          Saved to your library. Reuse them across any product.
        </div>
      </div>

      {AUTO_DETECT_ENABLED && unassignedCount > 0 && (
        <div className="auto-detect-bar">
          <div className="auto-detect-bar-text">
            <div className="auto-detect-bar-h">
              {unassignedCount} image{unassignedCount === 1 ? '' : 's'} not yet
              attached to a product
            </div>
            <div className="auto-detect-bar-sub mono">
              Let Claude classify them, group same-product shots, and create
              draft products with sizing pre-filled.
            </div>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={autoDetect}
            disabled={detecting || busy}
          >
            {detecting ? 'Detecting…' : 'Auto-detect products'}
          </button>
        </div>
      )}

      {detectResult && (
        <div className="auto-detect-result mono">{detectResult}</div>
      )}

      {err && <div className="auth-err mono">{err}</div>}

      {items.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">◇</div>
          <div className="dash-empty-h mono">LIBRARY EMPTY</div>
          <p className="dash-empty-sub">
            Upload images here once, then re-use them across many products
            without re-uploading.
          </p>
        </div>
      ) : (
        <div className="media-grid">
          {items.map((m) => {
            const inProducts = usage[m.id] ?? [];
            const isUsed = inProducts.length > 0;
            const tooltipTitle = isUsed
              ? `Used in: ${inProducts.map((a) => a.title).join(', ')}`
              : 'Not yet attached to any product';
            return (
              <div key={m.id} className={`media-tile ${isUsed ? 'is-used' : 'is-unused'}`}>
                <div className="media-tile-cover">
                  <Image
                    src={thumbUrl(m.storage_key, m.thumb_storage_key)}
                    alt={m.filename ?? ''}
                    fill
                    sizes="(max-width: 880px) 33vw, 14vw"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div className={`media-tile-badge mono ${isUsed ? 'used' : 'unused'}`} title={tooltipTitle}>
                    {isUsed
                      ? `✓ in ${inProducts.length} product${inProducts.length === 1 ? '' : 's'}`
                      : 'unused'}
                  </div>
                </div>
                <div className="media-tile-meta mono">
                  <span className="media-filename" title={m.filename ?? ''}>
                    {m.filename ?? 'untitled'}
                  </span>
                  <button
                    type="button"
                    className="media-tile-del"
                    onClick={() => remove(m)}
                    aria-label="Delete"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
