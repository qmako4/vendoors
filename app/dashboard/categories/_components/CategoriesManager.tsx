'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'category';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export function CategoriesManager({
  vendorId,
  initial,
}: {
  vendorId: string;
  initial: CategoryRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<CategoryRow[]>(initial);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        vendor_id: vendorId,
        name: trimmed,
        slug: makeSlug(trimmed),
        parent_id: parentId || null,
      })
      .select('id, name, slug, parent_id, sort_order')
      .single();
    setBusy(false);
    if (error || !data) {
      setErr(error?.message ?? 'Could not create');
      return;
    }
    setItems((prev) => [...prev, data as CategoryRow]);
    setName('');
    setParentId('');
    router.refresh();
  }

  async function rename(id: string, current: string) {
    const next = prompt('Rename category', current);
    if (!next || !next.trim() || next === current) return;
    const supabase = createClient();
    const { error } = await supabase
      .from('categories')
      .update({ name: next.trim() })
      .eq('id', id);
    if (error) {
      alert(`Rename failed: ${error.message}`);
      return;
    }
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: next.trim() } : c)),
    );
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (
      !confirm(
        `Delete category "${name}"?\n\nProducts in this category aren't deleted — they just lose this label.`,
      )
    )
      return;
    const supabase = createClient();
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    setItems((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  // Build tree (top-level + their children)
  const topLevel = items.filter((c) => !c.parent_id);
  const childrenOf = new Map<string, CategoryRow[]>();
  for (const c of items) {
    if (!c.parent_id) continue;
    const arr = childrenOf.get(c.parent_id) ?? [];
    arr.push(c);
    childrenOf.set(c.parent_id, arr);
  }

  return (
    <div className="cat-mgr">
      <div className="cat-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name (e.g. Hoodies)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
          }}
        />
        <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Top level</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.id}>
              ↳ inside &ldquo;{c.name}&rdquo;
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary"
          onClick={create}
          disabled={busy || !name.trim()}
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </div>

      {err && <div className="auth-err mono">{err}</div>}

      {items.length === 0 ? (
        <div className="dash-empty">
          <div className="dash-empty-icon">◇</div>
          <div className="dash-empty-h mono">NO CATEGORIES YET</div>
          <p className="dash-empty-sub">
            Create categories to organise your products. Buyers see them as
            tabs on your gallery.
          </p>
        </div>
      ) : (
        <ul className="cat-list">
          {topLevel.map((c) => (
            <CategoryNode
              key={c.id}
              cat={c}
              childrenOf={childrenOf}
              onRename={rename}
              onDelete={remove}
              depth={0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryNode({
  cat,
  childrenOf,
  onRename,
  onDelete,
  depth,
}: {
  cat: CategoryRow;
  childrenOf: Map<string, CategoryRow[]>;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  depth: number;
}) {
  const kids = childrenOf.get(cat.id) ?? [];
  return (
    <>
      <li className="cat-row" style={{ paddingLeft: depth * 20 }}>
        <div className="cat-name">
          {depth > 0 && <span className="cat-indent">↳ </span>}
          {cat.name}
        </div>
        <div className="cat-actions">
          <button
            type="button"
            onClick={() => onRename(cat.id, cat.name)}
            className="dash-link mono"
          >
            rename
          </button>
          <button
            type="button"
            onClick={() => onDelete(cat.id, cat.name)}
            className="dash-link dash-link-danger mono"
          >
            delete
          </button>
        </div>
      </li>
      {kids.map((k) => (
        <CategoryNode
          key={k.id}
          cat={k}
          childrenOf={childrenOf}
          onRename={onRename}
          onDelete={onDelete}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
