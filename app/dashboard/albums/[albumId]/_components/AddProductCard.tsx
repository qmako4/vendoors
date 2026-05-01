'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { uploadToLibrary } from '@/lib/upload';
import { LibraryPicker, type LibraryItem } from '@/components/LibraryPicker';
import { useWatermarkText } from '@/components/useWatermarkText';

export type AddKind = 'category' | 'product' | 'variant';

type KindConfig = {
  buttonLabel: string;
  formTitle: string;
  placeholder: string;
  submitLabel: string;
  /** When true, the form skips the photo drop zone (categories don't hold photos themselves). */
  skipPhotos: boolean;
};

const KIND_CONFIG: Record<AddKind, KindConfig> = {
  category: {
    buttonLabel: 'Add category',
    formTitle: 'NEW CATEGORY',
    placeholder: 'Category name (e.g. Hoodies)',
    submitLabel: 'Create category →',
    skipPhotos: true,
  },
  product: {
    buttonLabel: 'Add product',
    formTitle: 'NEW PRODUCT',
    placeholder: 'Product name (e.g. Bape tee)',
    submitLabel: 'Create product →',
    skipPhotos: false,
  },
  variant: {
    buttonLabel: 'Add variant',
    formTitle: 'NEW VARIANT',
    placeholder: 'Variant name (e.g. black)',
    submitLabel: 'Create variant →',
    skipPhotos: false,
  },
};

type Props = {
  parentAlbumId: string;
  vendorId: string;
  kind?: AddKind;
};


export function AddProductCard({
  parentAlbumId,
  vendorId,
  kind = 'product',
}: Props) {
  const cfg = KIND_CONFIG[kind];
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const watermark = useWatermarkText(vendorId);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [libraryPicks, setLibraryPicks] = useState<LibraryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  function reset() {
    setTitle('');
    setFiles([]);
    setLibraryPicks([]);
    setErr(null);
    setProgress(null);
    setBusy(false);
  }

  async function create() {
    const trimmed = title.trim();
    if (!trimmed) {
      setErr('Name required');
      return;
    }

    setBusy(true);
    setErr(null);
    const supabase = createClient();

    const base =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || kind;
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;

    const { data: album, error } = await supabase
      .from('albums')
      .insert({
        vendor_id: vendorId,
        parent_id: parentAlbumId,
        title: trimmed,
        slug,
        is_public: true,
      })
      .select('id')
      .single();

    if (error || !album) {
      setErr(error?.message ?? 'Could not create');
      setBusy(false);
      return;
    }

    const failures: string[] = [];
    let sortCursor = 0;

    // First, link any items already picked from the library.
    if (!cfg.skipPhotos && libraryPicks.length > 0) {
      const inserts = libraryPicks.map((m, i) => ({
        album_id: album.id,
        media_id: m.id,
        storage_key: m.storage_key,
        width: m.width,
        height: m.height,
        sort_order: sortCursor + i,
      }));
      const { error: linkErr } = await supabase.from('photos').insert(inserts);
      if (linkErr) {
        failures.push(`library link failed: ${linkErr.message}`);
      } else {
        sortCursor += libraryPicks.length;
      }
    }

    // Then upload any new files (each lands in the library AND on the product).
    if (!cfg.skipPhotos && files.length > 0) {
      setProgress({ done: 0, total: files.length });
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const { mediaId, storageKey, width, height } = await uploadToLibrary(
            supabase,
            file,
            vendorId,
          );
          const { error: insErr } = await supabase.from('photos').insert({
            album_id: album.id,
            media_id: mediaId,
            storage_key: storageKey,
            width,
            height,
            sort_order: sortCursor + i,
          });
          if (insErr) throw insErr;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          failures.push(`${file.name}: ${msg}`);
          console.error('photo upload failed', file.name, e);
        }
        setProgress({ done: i + 1, total: files.length });
      }
    }

    if (failures.length > 0) {
      // Surface errors so the user knows why photos didn't appear.
      const head = `${failures.length}/${files.length} photo${
        failures.length === 1 ? '' : 's'
      } failed to upload. The ${kind} was created — open it to retry.`;
      const detail = failures.slice(0, 5).join('\n');
      alert(`${head}\n\n${detail}${failures.length > 5 ? '\n…' : ''}`);
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        className="dash-add-card"
        onClick={() => setOpen(true)}
        aria-label={cfg.buttonLabel}
      >
        <span className="dash-add-plus">+</span>
        <span className="dash-add-label mono">{cfg.buttonLabel}</span>
      </button>
    );
  }

  return (
    <div className="dash-add-form">
      <div className="dash-add-form-head">
        <div className="mono">{cfg.formTitle}</div>
        <button
          type="button"
          className="dash-add-close"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          disabled={busy}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <input
        type="text"
        placeholder={cfg.placeholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        disabled={busy}
        className="dash-add-input"
      />

      {!cfg.skipPhotos && (
        <>
          <div
            className="dash-add-drop"
            onClick={() => !busy && inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (busy) return;
              if (e.dataTransfer.files.length > 0) {
                setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)]);
              }
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
                  setFiles((f) => [...f, ...Array.from(e.target.files!)]);
                  e.target.value = '';
                }
              }}
            />
            <div className="dash-add-drop-label mono">
              {files.length > 0
                ? `${files.length} new · click to add more`
                : 'Drop photos or click to pick'}
            </div>
            <div className="dash-add-drop-sub mono">
              {libraryPicks.length > 0
                ? `+ ${libraryPicks.length} from library`
                : 'New uploads also go to your library.'}
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPickerOpen(true)}
            disabled={busy}
          >
            From library →
          </button>
        </>
      )}

      {progress && (
        <div className="dash-add-progress mono">
          Uploading {progress.done} / {progress.total}…
        </div>
      )}
      {err && <div className="auth-err mono">{err}</div>}

      <div className="dash-add-actions">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          disabled={busy}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={create}
          disabled={busy || !title.trim()}
          className="btn-primary"
        >
          {busy ? 'Creating…' : cfg.submitLabel}
        </button>
      </div>

      <LibraryPicker
        vendorId={vendorId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(picked) => setLibraryPicks((prev) => [...prev, ...picked])}
      />
    </div>
  );
}
