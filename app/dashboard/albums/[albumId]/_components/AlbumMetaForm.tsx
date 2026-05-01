'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AlbumColor, AlbumLink } from '@/lib/supabase/types';
import { VariantsForm } from './VariantsForm';
import { CategoryPicker, type CategoryOption } from './CategoryPicker';

type Props = {
  albumId: string;
  vendorId: string;
  categoryOptions: CategoryOption[];
  initial: {
    title: string;
    description: string | null;
    links: AlbumLink[];
    sizes: string[];
    colors: AlbumColor[];
    is_public: boolean;
    categoryIds: string[];
  };
};

export function AlbumMetaForm({ albumId, vendorId, categoryOptions, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [links, setLinks] = useState<AlbumLink[]>(
    initial.links.length ? initial.links : [{ label: '', url: '' }],
  );
  const [sizes, setSizes] = useState<string[]>(initial.sizes);
  const [colors, setColors] = useState<AlbumColor[]>(initial.colors);
  const [categoryIds, setCategoryIds] = useState<string[]>(initial.categoryIds);
  const [isPublic, setIsPublic] = useState(initial.is_public);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function updateLink(i: number, patch: Partial<AlbumLink>) {
    setLinks((ls) => ls.map((l, j) => (i === j ? { ...l, ...patch } : l)));
  }
  function addLink() {
    setLinks((ls) => [...ls, { label: '', url: '' }]);
  }
  function removeLink(i: number) {
    setLinks((ls) => ls.filter((_, j) => j !== i));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const supabase = createClient();

    const cleanLinks = links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.url);

    const { error } = await supabase
      .from('albums')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        links: cleanLinks,
        sizes,
        colors,
        is_public: isPublic,
      })
      .eq('id', albumId);

    if (!error) {
      // Sync category assignments: delete then insert.
      await supabase.from('product_categories').delete().eq('album_id', albumId);
      if (categoryIds.length > 0) {
        await supabase.from('product_categories').insert(
          categoryIds.map((id, i) => ({
            album_id: albumId,
            category_id: id,
            sort_order: i,
          })),
        );
      }
    }

    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    router.refresh();
  }

  return (
    <div className="meta-form">
      <label className="dash-field">
        <span className="mono">TITLE</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="dash-field">
        <span className="mono">DESCRIPTION</span>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this is, materials, sizing notes — buyers see this on the album page."
        />
      </label>

      <div className="dash-field">
        <span className="mono">LINKS</span>
        <span className="dash-field-hint mono">
          Buy links, reference posts, anything. Empty rows are skipped.
        </span>
        <div className="links-rows">
          {links.map((l, i) => (
            <div key={i} className="link-row">
              <input
                type="text"
                placeholder="Label (e.g. Buy on Taobao)"
                value={l.label}
                onChange={(e) => updateLink(i, { label: e.target.value })}
                className="link-label-input"
              />
              <input
                type="url"
                placeholder="https://…"
                value={l.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                className="link-url-input"
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="link-del"
                aria-label="Remove link"
              >
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addLink} className="link-add mono">
            + Add link
          </button>
        </div>
      </div>

      <div className="dash-field">
        <span className="mono">CATEGORIES</span>
        <span className="dash-field-hint mono">
          Assign this product to one or more categories so buyers can find it.
        </span>
        <CategoryPicker
          vendorId={vendorId}
          options={categoryOptions}
          selected={categoryIds}
          onChange={setCategoryIds}
        />
      </div>

      <VariantsForm
        sizes={sizes}
        colors={colors}
        onChange={(next) => {
          setSizes(next.sizes);
          setColors(next.colors);
        }}
      />

      <label className="dash-checkbox">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        <span>
          <span className="dash-check-h">Public</span>
          <span className="dash-check-sub mono">
            Visible to anyone with the link
          </span>
        </span>
      </label>

      {err && <div className="auth-err mono">{err}</div>}

      <div className="dash-form-actions">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
