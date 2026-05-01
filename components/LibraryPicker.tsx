'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { photoUrl } from '@/lib/storage';

export type LibraryItem = {
  id: string;
  storage_key: string;
  width: number;
  height: number;
  filename: string | null;
};

type Props = {
  vendorId: string;
  open: boolean;
  onClose: () => void;
  /** Receives the picked items. Resolve to commit, throw to keep modal open. */
  onSelect: (items: LibraryItem[]) => void | Promise<void>;
};

type Usage = Record<string, Array<{ id: string; title: string }>>;

export function LibraryPicker({ vendorId, open, onClose, onSelect }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [usage, setUsage] = useState<Usage>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hideUsed, setHideUsed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setErr(null);
    (async () => {
      setLoading(true);
      const supabase = createClient();
      // Run media + usage queries in parallel — both scoped to this vendor.
      const [mediaRes, usageRes] = await Promise.all([
        supabase
          .from('media')
          .select('id, storage_key, width, height, filename')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: false }),
        supabase
          .from('photos')
          .select('media_id, albums!inner(id, title, vendor_id)')
          .not('media_id', 'is', null)
          .eq('albums.vendor_id', vendorId),
      ]);

      if (mediaRes.error) setErr(mediaRes.error.message);
      setItems(mediaRes.data ?? []);

      // Build usage map: media_id → [{ id, title }]
      type UsageRow = {
        media_id: string;
        albums:
          | { id: string; title: string }
          | { id: string; title: string }[];
      };
      const map: Usage = {};
      for (const row of (usageRes.data ?? []) as UsageRow[]) {
        if (!row.media_id) continue;
        const albums = Array.isArray(row.albums) ? row.albums : [row.albums];
        const list = map[row.media_id] ?? [];
        for (const a of albums) {
          if (!list.find((x) => x.id === a.id)) list.push(a);
        }
        map[row.media_id] = list;
      }
      setUsage(map);
      setLoading(false);
    })();
  }, [open, vendorId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    if (selected.size === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const picked = items.filter((i) => selected.has(i.id));
      await onSelect(picked);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add photos');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <div className="mono">PICK FROM LIBRARY</div>
          <div className="picker-head-right mono">
            <label className="picker-filter-toggle">
              <input
                type="checkbox"
                checked={hideUsed}
                onChange={(e) => setHideUsed(e.target.checked)}
              />
              <span>Hide already-used</span>
            </label>
            {selected.size > 0 && <span>{selected.size} selected</span>}
            <button
              type="button"
              className="picker-close"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="picker-body">
          {loading ? (
            <div className="picker-loading mono">Loading library…</div>
          ) : items.length === 0 ? (
            <div className="picker-empty mono">
              No media in your library yet. Upload some at{' '}
              <a href="/dashboard/media" target="_blank">
                /dashboard/media
              </a>
              .
            </div>
          ) : (() => {
              const visible = hideUsed
                ? items.filter((m) => !usage[m.id]?.length)
                : items;
              if (visible.length === 0) {
                return (
                  <div className="picker-empty mono">
                    No matching media (toggle off &ldquo;hide already-used&rdquo; to see all).
                  </div>
                );
              }
              return (
                <div className="picker-grid">
                  {visible.map((m) => {
                    const inProducts = usage[m.id] ?? [];
                    const isUsed = inProducts.length > 0;
                    const tooltip = isUsed
                      ? `Already in: ${inProducts.map((a) => a.title).join(', ')}`
                      : 'Not yet used in any product';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`picker-item ${selected.has(m.id) ? 'selected' : ''} ${isUsed ? 'is-used' : ''}`}
                        onClick={() => toggle(m.id)}
                        title={tooltip}
                      >
                        <Image
                          src={photoUrl(m.storage_key)}
                          alt={m.filename ?? ''}
                          fill
                          sizes="120px"
                          style={{ objectFit: 'cover' }}
                        />
                        {isUsed && (
                          <div className="picker-used-badge mono">
                            ✓ in {inProducts.length}
                          </div>
                        )}
                        {selected.has(m.id) && (
                          <div className="picker-check">✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
        </div>

        {err && <div className="auth-err mono picker-err">{err}</div>}

        <div className="picker-foot">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            className="btn-primary"
            disabled={busy || selected.size === 0}
          >
            {busy
              ? 'Adding…'
              : `Add ${selected.size} photo${selected.size === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
