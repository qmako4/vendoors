'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { thumbUrl, photoUrl, makeThumb } from '@/lib/storage';
import { removeBackground, composite, type Background } from '@/lib/bg-remove';
import { LibraryPicker } from '@/components/LibraryPicker';

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
  const bgFileRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; active: boolean } | null>(null);
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bgMode, setBgMode] = useState<'color' | 'image'>('color');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [customHex, setCustomHex] = useState('#FFFFFF');
  const [bgImageBlob, setBgImageBlob] = useState<Blob | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [statuses, setStatuses] = useState<Record<string, { state: ItemState; error?: string }>>(
    {},
  );

  useEffect(() => {
    if (!bgImageBlob) {
      setBgImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(bgImageBlob);
    setBgImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bgImageBlob]);

  // Drag-to-select: hold mouse button down and drag a rectangle across tiles
  // to select them all at once.
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      // Only kick into "drag mode" after moving a few pixels — preserves
      // single-click toggling for taps.
      if (!drag.active && Math.hypot(dx, dy) < 5) return;
      drag.active = true;
      e.preventDefault();

      const grid = gridRef.current;
      if (!grid) return;
      const gr = grid.getBoundingClientRect();
      const x1 = drag.startX - gr.left + grid.scrollLeft;
      const y1 = drag.startY - gr.top + grid.scrollTop;
      const x2 = e.clientX - gr.left + grid.scrollLeft;
      const y2 = e.clientY - gr.top + grid.scrollTop;
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      setDragRect({ x, y, w, h });

      // Find tiles whose bounding rect intersects the drag rect.
      const tiles = grid.querySelectorAll<HTMLElement>('[data-tile-id]');
      const next = new Set<string>();
      tiles.forEach((tile) => {
        const tr = tile.getBoundingClientRect();
        const tl = tr.left - gr.left + grid.scrollLeft;
        const tt = tr.top - gr.top + grid.scrollTop;
        const tright = tl + tr.width;
        const tbottom = tt + tr.height;
        if (tl < x + w && tright > x && tt < y + h && tbottom > y) {
          const id = tile.dataset.tileId;
          if (id) next.add(id);
        }
      });
      setSelected(next);
    }

    function onUp() {
      const drag = dragStateRef.current;
      // Keep the active flag a tick longer so the click handler on a tile
      // (fired by the same pointer event sequence) can be suppressed.
      if (drag?.active) {
        setTimeout(() => {
          dragStateRef.current = null;
        }, 0);
      } else {
        dragStateRef.current = null;
      }
      setDragRect(null);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function onGridMouseDown(e: React.MouseEvent) {
    if (busy) return;
    if (e.button !== 0) return; // left-click only
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      active: false,
    };
  }

  function toggle(id: string) {
    // Suppress the click that follows a drag-select.
    if (dragStateRef.current?.active) return;
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
    if (bgMode === 'image' && !bgImageBlob) {
      alert('Pick a background image first (or switch to a color).');
      return;
    }
    setBusy(true);
    setStatuses({});
    const items = initial.filter((i) => selected.has(i.id));
    setProgress({ done: 0, total: items.length });
    const supabase = createClient();

    const background: Background =
      bgMode === 'color'
        ? { kind: 'color', hex: bgColor }
        : { kind: 'image', blob: bgImageBlob! };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setStatuses((s) => ({ ...s, [item.id]: { state: 'processing' } }));

      try {
        // 1) Run the model on the full-size image (transparent PNG out).
        const transparent = await removeBackground(photoUrl(item.storage_key));

        // 2) Composite onto the chosen background → JPEG.
        const { blob: full, width, height } = await composite(
          transparent,
          background,
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

        // 5) Insert media row for the new image. Track the derivation so
        // the library can hide originals that have been processed.
        const baseName = item.filename?.replace(/\.[^.]+$/, '') ?? 'photo';
        const { error: insErr } = await supabase.from('media').insert({
          vendor_id: vendorId,
          storage_key: fullKey,
          thumb_storage_key: thumbStorageKey,
          width,
          height,
          filename: `${baseName}-clean.jpg`,
          derived_from_media_id: item.id,
        });
        if (insErr) {
          await supabase.storage.from('photos').remove(
            thumbStorageKey ? [fullKey, thumbStorageKey] : [fullKey],
          );
          throw insErr;
        }

        // 6) Optionally remove the original (DB row + storage files).
        if (deleteOriginals) {
          await supabase.from('media').delete().eq('id', item.id);
          const keysToRemove = [item.storage_key];
          if (item.thumb_storage_key) keysToRemove.push(item.thumb_storage_key);
          await supabase.storage.from('photos').remove(keysToRemove);
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
        <div className="bgr-mode-tabs">
          <button
            type="button"
            className={`bgr-mode-tab ${bgMode === 'color' ? 'active' : ''}`}
            onClick={() => setBgMode('color')}
          >
            Solid color
          </button>
          <button
            type="button"
            className={`bgr-mode-tab ${bgMode === 'image' ? 'active' : ''}`}
            onClick={() => setBgMode('image')}
          >
            Image
          </button>
        </div>

        <div className="bgr-controls-row">
          <div>
            <div className="mono bgr-label">
              {bgMode === 'color' ? 'BACKGROUND COLOR' : 'BACKGROUND IMAGE'}
            </div>

            {bgMode === 'color' && (
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
            )}

            {bgMode === 'image' && (
              <div className="bgr-image-picker">
                <input
                  ref={bgFileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setBgImageBlob(f);
                    e.target.value = '';
                  }}
                />
                {bgImagePreview ? (
                  <button
                    type="button"
                    className="bgr-image-preview"
                    onClick={() => bgFileRef.current?.click()}
                    aria-label="Replace background image"
                  >
                    <img src={bgImagePreview} alt="" />
                    <span className="bgr-image-replace mono">replace ↗</span>
                  </button>
                ) : (
                  <div className="bgr-image-options">
                    <button
                      type="button"
                      className="bgr-image-pick"
                      onClick={() => bgFileRef.current?.click()}
                    >
                      <span className="bgr-image-plus">+</span>
                      <span className="mono">Upload new image</span>
                    </button>
                    <button
                      type="button"
                      className="bgr-image-pick"
                      onClick={() => setBgPickerOpen(true)}
                    >
                      <span className="bgr-image-plus">⌫</span>
                      <span className="mono">From library</span>
                    </button>
                  </div>
                )}
                {bgImageBlob && (
                  <button
                    type="button"
                    className="dash-link mono"
                    onClick={() => setBgImageBlob(null)}
                  >
                    remove
                  </button>
                )}
              </div>
            )}
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

        <label className="dash-checkbox bgr-delete-toggle">
          <input
            type="checkbox"
            checked={deleteOriginals}
            onChange={(e) => setDeleteOriginals(e.target.checked)}
            disabled={busy}
          />
          <span>
            <span className="dash-check-h">Delete originals after processing</span>
            <span className="dash-check-sub mono">
              Removes the source images permanently. Off by default — keep
              originals as backup in case you want to re-process later.
            </span>
          </span>
        </label>

        <p className="dash-section-hint mono">
          First run downloads a ~30MB model (one-time). Each image takes 5-15
          seconds depending on your device. {deleteOriginals
            ? 'Originals will be deleted as each processes successfully.'
            : 'Originals stay in your library — toggle "Delete originals" above to remove them automatically.'}
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
        <div
          className="bgr-grid"
          ref={gridRef}
          onMouseDown={onGridMouseDown}
        >
          {dragRect && (
            <div
              className="bgr-drag-rect"
              style={{
                left: dragRect.x,
                top: dragRect.y,
                width: dragRect.w,
                height: dragRect.h,
              }}
            />
          )}
          {initial.map((m) => {
            const status = statuses[m.id]?.state;
            const sel = selected.has(m.id);
            const tileBg =
              bgMode === 'image' && bgImagePreview
                ? `center / cover url("${bgImagePreview}")`
                : bgColor;
            return (
              <button
                key={m.id}
                type="button"
                data-tile-id={m.id}
                className={`bgr-tile ${sel ? 'selected' : ''} bgr-${status ?? 'idle'}`}
                onClick={() => !busy && toggle(m.id)}
                disabled={busy}
                style={{ background: tileBg }}
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

      <LibraryPicker
        vendorId={vendorId}
        open={bgPickerOpen}
        onClose={() => setBgPickerOpen(false)}
        onSelect={async (items) => {
          const pick = items[0];
          if (!pick) return;
          // Fetch the chosen image from storage and stash as a blob.
          const res = await fetch(photoUrl(pick.storage_key));
          if (!res.ok) throw new Error('Could not load that image');
          const blob = await res.blob();
          setBgImageBlob(blob);
        }}
      />
    </div>
  );
}
