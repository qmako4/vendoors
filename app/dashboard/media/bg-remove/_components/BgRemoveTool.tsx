'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { thumbUrl, photoUrl, makeThumb } from '@/lib/storage';
import { removeBackground, compositeOnColor } from '@/lib/bg-remove';

type LibItem = {
  id: string;
  storage_key: string;
  thumb_storage_key: string | null;
  width: number;
  height: number;
  filename: string | null;
};

type ItemState = 'pending' | 'processing' | 'done' | 'error';

const PRESET_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Off-white', hex: '#F5F2EE' },
  { name: 'Light grey', hex: '#E5E5E5' },
  { name: 'Dark grey', hex: '#222222' },
  { name: 'Black', hex: '#000000' },
  { name: 'Cream', hex: '#FBEFD9' },
  { name: 'Sand', hex: '#D9CFC0' },
];

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BgRemoveTool({
  vendorId,
  initial,
}: {
  vendorId: string;
  initial: LibItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [customHex, setCustomHex] = useState('#FFFFFF');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [statuses, setStatuses] = useState<Record<string, { state: ItemState; error?: string }>>(
    {},
  );

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(initial.map((i) => i.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function process() {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    setStatuses({});
    const items = initial.filter((i) => selected.has(i.id));
    setProgress({ done: 0, total: items.length });
    const supabase = createClient();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setStatuses((s) => ({ ...s, [item.id]: { state: 'processing' } }));

      try {
        // 1) Run the model on the full-size image (transparent PNG out).
        const transparent = await removeBackground(photoUrl(item.storage_key));

        // 2) Composite onto the chosen color → JPEG.
        const { blob: full, width, height } = await compositeOnColor(
          transparent,
          bgColor,
        );

        // 3) Make a thumbnail too.
        let thumbStorageKey: string | null = null;
        const thumb = await makeThumb(full).catch(() => null);

        // 4) Upload full + thumb to storage.
        const baseId = randomId();
        const fullKey = `${vendorId}/library/${baseId}.jpg`;
        const thumbKey = `${vendorId}/library/${baseId}-thumb.jpg`;

        const { error: upErr } = await supabase.storage
          .from('photos')
          .upload(fullKey, full, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;

        if (thumb) {
          const { error: thumbErr } = await supabase.storage
            .from('photos')
            .upload(thumbKey, thumb.blob, { contentType: 'image/jpeg' });
          if (!thumbErr) thumbStorageKey = thumbKey;
        }

        // 5) Insert media row for the new image.
        const baseName = item.filename?.replace(/\.[^.]+$/, '') ?? 'photo';
        const { error: insErr } = await supabase.from('media').insert({
          vendor_id: vendorId,
          storage_key: fullKey,
          thumb_storage_key: thumbStorageKey,
          width,
          height,
          filename: `${baseName}-clean.jpg`,
        });
        if (insErr) {
          await supabase.storage.from('photos').remove(
            thumbStorageKey ? [fullKey, thumbStorageKey] : [fullKey],
          );
          throw insErr;
        }

        setStatuses((s) => ({ ...s, [item.id]: { state: 'done' } }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatuses((s) => ({ ...s, [item.id]: { state: 'error', error: msg } }));
      }
      setProgress({ done: i + 1, total: items.length });
    }

    setBusy(false);
    router.refresh();
  }

  const colorIsPreset = PRESET_COLORS.some((c) => c.hex.toLowerCase() === bgColor.toLowerCase());

  return (
    <div className="bgr-tool">
      <section className="bgr-controls">
        <div className="bgr-controls-row">
          <div>
            <div className="mono bgr-label">BACKGROUND COLOR</div>
            <div className="bgr-color-row">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className={`bgr-color-chip ${bgColor.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setBgColor(c.hex)}
                  title={c.name}
                  style={{ background: c.hex }}
                />
              ))}
              <label
                className={`bgr-color-chip bgr-color-custom ${!colorIsPreset ? 'active' : ''}`}
                style={{ background: customHex }}
                title="Custom"
              >
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    setBgColor(e.target.value);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="bgr-actions">
            <button
              type="button"
              className="dash-link mono"
              onClick={selected.size === initial.length ? clearSelection : selectAll}
              disabled={busy || initial.length === 0}
            >
              {selected.size === initial.length && initial.length > 0
                ? 'clear selection'
                : 'select all'}
            </button>
            <button
              type="button"
              className="btn-primary btn-lg"
              onClick={process}
              disabled={busy || selected.size === 0}
            >
              {busy
                ? `Processing ${progress?.done}/${progress?.total}…`
                : `Process ${selected.size} image${selected.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>

        <p className="dash-section-hint mono">
          First run downloads a ~30MB model (one-time). Each image takes 5-15
          seconds depending on your device. Originals are kept untouched —
          processed copies are added to your library as new images.
        </p>
      </section>

      {initial.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">◇</div>
          <div className="dash-empty-h mono">LIBRARY EMPTY</div>
          <p className="dash-empty-sub">
            Upload images at{' '}
            <Link href="/dashboard/media" className="dash-link">
              /dashboard/media
            </Link>{' '}
            first.
          </p>
        </div>
      ) : (
        <div className="bgr-grid">
          {initial.map((m) => {
            const status = statuses[m.id]?.state;
            const sel = selected.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={`bgr-tile ${sel ? 'selected' : ''} bgr-${status ?? 'idle'}`}
                onClick={() => !busy && toggle(m.id)}
                disabled={busy}
                style={{ ['--bgr-bg' as string]: bgColor }}
              >
                <Image
                  src={thumbUrl(m.storage_key, m.thumb_storage_key)}
                  alt={m.filename ?? ''}
                  fill
                  sizes="160px"
                  style={{ objectFit: 'cover' }}
                />
                {sel && <div className="bgr-check mono">✓</div>}
                {status === 'processing' && (
                  <div className="bgr-overlay mono">
                    <span className="bgr-spinner" />
                    Processing…
                  </div>
                )}
                {status === 'done' && (
                  <div className="bgr-overlay bgr-done mono">✓ Done</div>
                )}
                {status === 'error' && (
                  <div className="bgr-overlay bgr-err mono">
                    ✕ {statuses[m.id]?.error?.slice(0, 30) ?? 'Failed'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
