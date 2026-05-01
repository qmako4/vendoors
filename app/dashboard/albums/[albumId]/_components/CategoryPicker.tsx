'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type CategoryOption = {
  id: string;
  name: string;
  parent_id: string | null;
};

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'category';
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export function CategoryPicker({
  vendorId,
  options,
  selected,
  onChange,
}: {
  vendorId: string;
  options: CategoryOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [list, setList] = useState<CategoryOption[]>(options);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedSet = new Set(selected);

  function toggle(id: string) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  async function createNew() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        vendor_id: vendorId,
        name,
        slug: makeSlug(name),
      })
      .select('id, name, parent_id')
      .single();
    setBusy(false);
    if (error || !data) {
      alert(`Couldn't create: ${error?.message ?? 'unknown'}`);
      return;
    }
    setList((prev) => [...prev, data as CategoryOption]);
    onChange([...selected, data.id]);
    setNewName('');
    setCreating(false);
  }

  return (
    <div className="cat-picker">
      <div className="cat-picker-chips">
        {list.length === 0 && (
          <span className="cat-picker-empty mono">
            No categories yet — create one below.
          </span>
        )}
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`vf-chip ${selectedSet.has(c.id) ? 'active' : ''}`}
            onClick={() => toggle(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {creating ? (
        <div className="cat-picker-create">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                createNew();
              }
              if (e.key === 'Escape') {
                setCreating(false);
                setNewName('');
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setCreating(false);
              setNewName('');
            }}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={createNew}
            disabled={busy || !newName.trim()}
          >
            {busy ? 'Creating…' : 'Create + select'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="link-add mono"
          onClick={() => setCreating(true)}
        >
          + Create new category
        </button>
      )}
    </div>
  );
}
