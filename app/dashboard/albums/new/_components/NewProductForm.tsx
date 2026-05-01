'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { photoUrl } from '@/lib/storage';
import { uploadToLibrary } from '@/lib/upload';
import { LibraryPicker, type LibraryItem } from '@/components/LibraryPicker';
import { VariantsForm } from '../../[albumId]/_components/VariantsForm';
import type { AlbumColor } from '@/lib/supabase/types';
import { createProduct } from '../actions';

type Category = { id: string; name: string };

/** Photo attached to the not-yet-saved product. Holds enough to render a thumb. */
type StagedPhoto = {
  mediaId: string;
  storageKey: string;
  width: number;
  height: number;
  filename: string | null;
};

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'category';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export function NewProductForm({
  vendorId,
  categories: initialCategories,
}: {
  vendorId: string;
  categories: Category[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<AlbumColor[]>([]);

  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Auto-generate the slug from the title until the user types into the slug field.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugManuallyEdited) {
      setSlug(
        v
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60),
      );
    }
  }

  function toggleCategory(id: string) {
    setCategoryIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createCategoryInline() {
    const name = newCategoryName.trim();
    if (!name || creatingCategory) return;
    setCreatingCategory(true);
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        vendor_id: vendorId,
        name,
        slug: makeSlug(name),
      })
      .select('id, name')
      .single();
    setCreatingCategory(false);
    if (error || !data) {
      setErr(`Could not add category: ${error?.message ?? 'unknown'}`);
      return;
    }
    const created = data as Category;
    setCategories((prev) => [...prev, created]);
    setCategoryIds((prev) => {
      const next = new Set(prev);
      next.add(created.id);
      return next;
    });
    setNewCategoryName('');
  }

  async function handleUpload(files: FileList) {
    setUploading(true);
    setErr(null);
    const list = Array.from(files);
    const supabase = createClient();
    const newOnes: StagedPhoto[] = [];

    for (const file of list) {
      try {
        const { mediaId, storageKey, width, height } = await uploadToLibrary(
          supabase,
          file,
          vendorId,
        );
        newOnes.push({
          mediaId,
          storageKey,
          width,
          height,
          filename: file.name,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setErr(`${file.name}: ${msg}`);
      }
    }

    setPhotos((prev) => [...prev, ...newOnes]);
    setUploading(false);
  }

  function addFromPicker(picked: LibraryItem[]) {
    const existing = new Set(photos.map((p) => p.mediaId));
    const additions = picked
      .filter((p) => !existing.has(p.id))
      .map<StagedPhoto>((p) => ({
        mediaId: p.id,
        storageKey: p.storage_key,
        width: p.width,
        height: p.height,
        filename: p.filename,
      }));
    setPhotos((prev) => [...prev, ...additions]);
  }

  function removePhoto(mediaId: string) {
    setPhotos((prev) => prev.filter((p) => p.mediaId !== mediaId));
  }

  function moveToFront(mediaId: string) {
    setPhotos((prev) => {
      const idx = prev.findIndex((p) => p.mediaId === mediaId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.unshift(moved);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    setSubmitting(true);

    const result = await createProduct({
      title,
      slug,
      description: description || null,
      isPublic,
      categoryIds: Array.from(categoryIds),
      sizes,
      colors,
      mediaIds: photos.map((p) => p.mediaId),
    });

    if (result.ok) {
      router.push(`/dashboard/albums/${result.albumId}`);
    } else {
      setErr(result.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="dash-form">
      <label className="dash-field">
        <span className="mono">TITLE</span>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          placeholder="Bape tee"
        />
      </label>

      <label className="dash-field">
        <span className="mono">URL SLUG</span>
        <div className="dash-slug">
          <span className="dash-slug-prefix mono">vendoors.co /</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManuallyEdited(true);
            }}
            required
            minLength={2}
            pattern="[a-z0-9-]+"
            placeholder="bape-tee"
          />
        </div>
        <span className="dash-field-hint mono">
          Lowercase letters, numbers, dashes. This becomes the shareable
          product link.
        </span>
      </label>

      <div className="dash-field">
        <span className="mono">CATEGORIES (OPTIONAL)</span>
        <span className="dash-field-hint mono">
          {categories.length > 0
            ? 'Tick one or more, or add a new category below.'
            : 'No categories yet — add your first one below.'}
        </span>

        {categories.length > 0 && (
          <div className="cat-picker-chips">
            {categories.map((c) => (
              <label key={c.id} className="vf-chip vf-chip-checkbox">
                <input
                  type="checkbox"
                  checked={categoryIds.has(c.id)}
                  onChange={() => toggleCategory(c.id)}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        )}

        <div className="vf-add cat-picker-create">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name (e.g. Brands, Footwear, Casablanca)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createCategoryInline();
              }
            }}
            disabled={creatingCategory}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={createCategoryInline}
            disabled={creatingCategory || !newCategoryName.trim()}
          >
            {creatingCategory ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>

      <label className="dash-field">
        <span className="mono">DESCRIPTION (OPTIONAL)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Materials, sizing notes, anything buyers should know."
        />
      </label>

      {/* Sizes + colors */}
      <VariantsForm
        sizes={sizes}
        colors={colors}
        onChange={(next) => {
          setSizes(next.sizes);
          setColors(next.colors);
        }}
      />

      {/* Photos section — pick from library, drag-drop new, or click to upload */}
      <div className="dash-field">
        <span className="mono">PHOTOS</span>
        <span className="dash-field-hint mono">
          The first photo becomes your cover. You can reorder later in the
          edit page.
        </span>

        <div className="uploader-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPickerOpen(true)}
            disabled={uploading || submitting}
          >
            From library →
          </button>
        </div>

        <div
          className={`uploader-drop ${uploading ? 'busy' : ''}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (uploading) return;
            if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleUpload(e.target.files);
                e.target.value = '';
              }
            }}
          />
          <div className="uploader-drop-label mono">
            {uploading ? 'UPLOADING…' : 'DROP PHOTOS OR CLICK TO PICK'}
          </div>
          <div className="uploader-drop-sub mono">
            JPG, PNG, WebP · multiple at once · auto-saved to your library
          </div>
        </div>

        {photos.length > 0 && (
          <div className="uploader-grid">
            {photos.map((p, i) => (
              <div key={p.mediaId} className="upl-thumb">
                <Image
                  src={photoUrl(p.storageKey)}
                  alt={p.filename ?? ''}
                  fill
                  sizes="160px"
                  style={{ objectFit: 'cover' }}
                />
                {i === 0 && <div className="upl-cover-badge mono">COVER</div>}
                <div className="upl-thumb-actions">
                  {i !== 0 && (
                    <button
                      type="button"
                      className="upl-action"
                      onClick={() => moveToFront(p.mediaId)}
                      title="Set as cover"
                      aria-label="Set as cover"
                    >
                      ★
                    </button>
                  )}
                  <button
                    type="button"
                    className="upl-action upl-action-del"
                    onClick={() => removePhoto(p.mediaId)}
                    title="Remove"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="dash-checkbox">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <span>
          <span className="dash-check-h">Public</span>
          <span className="dash-check-sub mono">
            Visible on your gallery to anyone with the link
          </span>
        </span>
      </label>

      {err && <div className="auth-err mono">{err}</div>}

      <div className="dash-form-actions">
        <Link href="/dashboard" className="btn-ghost">
          Cancel
        </Link>
        <button
          type="submit"
          className="btn-primary btn-lg"
          disabled={submitting || uploading || !title.trim() || !slug.trim()}
        >
          {submitting ? 'Creating…' : 'Create product →'}
        </button>
      </div>

      <LibraryPicker
        vendorId={vendorId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(picked) => addFromPicker(picked)}
      />
    </form>
  );
}
