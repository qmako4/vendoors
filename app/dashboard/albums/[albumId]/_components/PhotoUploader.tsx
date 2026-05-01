'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { photoUrl } from '@/lib/storage';
import { uploadToLibrary } from '@/lib/upload';
import { LibraryPicker, type LibraryItem } from '@/components/LibraryPicker';
import { useWatermarkText } from '@/components/useWatermarkText';

type ExistingPhoto = {
  id: string;
  storage_key: string;
  width: number;
  height: number;
  caption: string | null;
};

type Props = {
  albumId: string;
  vendorId: string;
  photos: ExistingPhoto[];
};

type UploadStatus = {
  filename: string;
  progress: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

export function PhotoUploader({ albumId, vendorId, photos: initialPhotos }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const watermark = useWatermarkText(vendorId);

  const [items, setItems] = useState<ExistingPhoto[]>(initialPhotos);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    setItems(initialPhotos);
  }, [initialPhotos]);

  async function handleFiles(files: FileList) {
    setBusy(true);
    const supabase = createClient();
    const list = Array.from(files);
    const initial: UploadStatus[] = list.map((f) => ({
      filename: f.name,
      progress: 'pending',
    }));
    setUploads(initial);

    let i = 0;
    for (const file of list) {
      const idx = i++;
      const baseSort = items.length + idx;
      setUploads((u) =>
        u.map((s, j) => (j === idx ? { ...s, progress: 'uploading' } : s)),
      );

      try {
        // Upload to storage + create media row in library.
        const { mediaId, storageKey, width, height } = await uploadToLibrary(
          supabase,
          file,
          vendorId,
          watermark,
        );

        // Link the media into this product as a photo.
        const { data: inserted, error: insErr } = await supabase
          .from('photos')
          .insert({
            album_id: albumId,
            media_id: mediaId,
            storage_key: storageKey,
            width,
            height,
            sort_order: baseSort,
          })
          .select('id, storage_key, width, height, caption')
          .single();
        if (insErr) throw insErr;

        setItems((prev) => [...prev, inserted as ExistingPhoto]);
        setUploads((u) =>
          u.map((s, j) => (j === idx ? { ...s, progress: 'done' } : s)),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setUploads((u) =>
          u.map((s, j) =>
            j === idx ? { ...s, progress: 'error', error: msg } : s,
          ),
        );
      }
    }

    setBusy(false);
    router.refresh();
  }

  async function addFromLibrary(picked: LibraryItem[]) {
    if (picked.length === 0) return;
    const supabase = createClient();
    const baseSort = items.length;
    const inserts = picked.map((m, i) => ({
      album_id: albumId,
      media_id: m.id,
      storage_key: m.storage_key,
      width: m.width,
      height: m.height,
      sort_order: baseSort + i,
    }));
    const { data: inserted, error } = await supabase
      .from('photos')
      .insert(inserts)
      .select('id, storage_key, width, height, caption');
    if (error) throw error;
    setItems((prev) => [...prev, ...(inserted as ExistingPhoto[])]);
    router.refresh();
  }

  async function deletePhoto(p: ExistingPhoto) {
    if (
      !confirm(
        'Remove this photo from the product?\n\n(The original stays in your library — re-add it any time.)',
      )
    ) {
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== p.id));
    const supabase = createClient();
    const { error: delErr } = await supabase
      .from('photos')
      .delete()
      .eq('id', p.id);
    if (delErr) {
      alert(`Delete failed: ${delErr.message}`);
      router.refresh();
      return;
    }
    // Note: don't remove the file from storage. It belongs to the library
    // (`media` table) and may still be used in other products. To delete the
    // file itself, the vendor uses /dashboard/media.
    router.refresh();
  }

  function reorderLocal(fromIdx: number, toIdx: number): ExistingPhoto[] {
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    return next;
  }

  async function persistOrder(ordered: ExistingPhoto[]) {
    const supabase = createClient();
    await Promise.all(
      ordered.map((p, i) =>
        supabase.from('photos').update({ sort_order: i }).eq('id', p.id),
      ),
    );
    router.refresh();
  }

  function reorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const next = reorderLocal(fromIdx, toIdx);
    setItems(next);
    persistOrder(next);
  }

  function setAsCover(idx: number) {
    if (idx === 0) return;
    reorder(idx, 0);
  }

  return (
    <div className="uploader">
      <div className="uploader-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPickerOpen(true)}
          disabled={busy}
        >
          From library →
        </button>
      </div>

      <div
        className={`uploader-drop ${busy ? 'busy' : ''}`}
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (busy) return;
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
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
              handleFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <div className="uploader-drop-label mono">
          {busy ? 'UPLOADING…' : 'DROP PHOTOS OR CLICK TO PICK'}
        </div>
        <div className="uploader-drop-sub mono">
          JPG, PNG, WebP · multiple at once · auto-saved to your library
        </div>
      </div>

      {uploads.length > 0 && (
        <ul className="uploader-status mono">
          {uploads.map((u, i) => (
            <li key={i} className={`upl-row upl-${u.progress}`}>
              <span className="upl-name">{u.filename}</span>
              <span className="upl-state">
                {u.progress === 'pending' && 'queued'}
                {u.progress === 'uploading' && 'uploading…'}
                {u.progress === 'done' && '✓ done'}
                {u.progress === 'error' && `✕ ${u.error ?? 'failed'}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="uploader-grid">
          {items.map((p, i) => (
            <div
              key={p.id}
              className={`upl-thumb ${draggingIdx === i ? 'is-dragging' : ''} ${
                dragOverIdx === i && draggingIdx !== i ? 'is-drag-over' : ''
              }`}
              draggable
              onDragStart={(e) => {
                setDraggingIdx(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverIdx(i);
              }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingIdx !== null && draggingIdx !== i) {
                  reorder(draggingIdx, i);
                }
                setDraggingIdx(null);
                setDragOverIdx(null);
              }}
              onDragEnd={() => {
                setDraggingIdx(null);
                setDragOverIdx(null);
              }}
            >
              <Image
                src={photoUrl(p.storage_key)}
                alt={p.caption ?? ''}
                fill
                sizes="160px"
                style={{ objectFit: 'cover' }}
                draggable={false}
              />
              {i === 0 && <div className="upl-cover-badge mono">COVER</div>}
              <div className="upl-thumb-actions">
                {i !== 0 && (
                  <button
                    type="button"
                    className="upl-action"
                    onClick={() => setAsCover(i)}
                    title="Set as cover"
                    aria-label="Set as cover"
                  >
                    ★
                  </button>
                )}
                <button
                  type="button"
                  className="upl-action upl-action-del"
                  onClick={() => deletePhoto(p)}
                  title="Remove from product"
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LibraryPicker
        vendorId={vendorId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addFromLibrary}
      />
    </div>
  );
}
