'use client';

import { useState } from 'react';
import { SIZE_SETS, PRESET_COLORS, buildVariants } from '@/lib/variants';
import type { AlbumColor } from '@/lib/supabase/types';

type Props = {
  sizes: string[];
  colors: AlbumColor[];
  onChange: (next: { sizes: string[]; colors: AlbumColor[] }) => void;
};

export function VariantsForm({ sizes, colors, onChange }: Props) {
  const [activeSetId, setActiveSetId] = useState<string>(SIZE_SETS[0].id);
  const [customSize, setCustomSize] = useState('');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#888888');

  const activeSet = SIZE_SETS.find((s) => s.id === activeSetId) ?? SIZE_SETS[0];
  const sizeSet = new Set(sizes);
  const colorNameSet = new Set(colors.map((c) => c.name.toLowerCase()));

  function toggleSize(s: string) {
    const next = new Set(sizes);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({ sizes: Array.from(next), colors });
  }

  function selectAllSizesInSet() {
    const merged = Array.from(new Set([...sizes, ...activeSet.sizes]));
    onChange({ sizes: merged, colors });
  }

  function clearSizes() {
    onChange({ sizes: [], colors });
  }

  function addCustomSize() {
    const v = customSize.trim();
    if (!v) return;
    if (!sizes.includes(v)) {
      onChange({ sizes: [...sizes, v], colors });
    }
    setCustomSize('');
  }

  function toggleColor(c: AlbumColor) {
    const isActive = colorNameSet.has(c.name.toLowerCase());
    if (isActive) {
      onChange({
        sizes,
        colors: colors.filter(
          (x) => x.name.toLowerCase() !== c.name.toLowerCase(),
        ),
      });
    } else {
      onChange({ sizes, colors: [...colors, c] });
    }
  }

  function selectAllPresetColors() {
    const existing = new Map(colors.map((c) => [c.name.toLowerCase(), c]));
    for (const c of PRESET_COLORS) existing.set(c.name.toLowerCase(), c);
    onChange({ sizes, colors: Array.from(existing.values()) });
  }

  function clearColors() {
    onChange({ sizes, colors: [] });
  }

  function addCustomColor() {
    const name = customColorName.trim();
    if (!name) return;
    if (colorNameSet.has(name.toLowerCase())) {
      setCustomColorName('');
      return;
    }
    onChange({
      sizes,
      colors: [...colors, { name, hex: customColorHex }],
    });
    setCustomColorName('');
    setCustomColorHex('#888888');
  }

  const variants = buildVariants(sizes, colors);

  return (
    <div className="variants-form">
      {/* Sizes */}
      <div className="dash-field">
        <span className="mono">SIZES</span>

        <div className="vf-tabs">
          {SIZE_SETS.map((set) => (
            <button
              key={set.id}
              type="button"
              className={`vf-tab ${activeSetId === set.id ? 'active' : ''}`}
              onClick={() => setActiveSetId(set.id)}
            >
              {set.label}
            </button>
          ))}
        </div>

        <div className="vf-chips">
          {activeSet.sizes.map((s) => (
            <button
              key={s}
              type="button"
              className={`vf-chip ${sizeSet.has(s) ? 'active' : ''}`}
              onClick={() => toggleSize(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="vf-actions mono">
          <button type="button" className="vf-action" onClick={selectAllSizesInSet}>
            Select all {activeSet.label}
          </button>
          {sizes.length > 0 && (
            <button type="button" className="vf-action" onClick={clearSizes}>
              Clear all sizes
            </button>
          )}
        </div>

        {/* Custom + selected sizes outside the active set */}
        {(() => {
          const extra = sizes.filter((s) => !activeSet.sizes.includes(s));
          if (extra.length === 0) return null;
          return (
            <div className="vf-extra">
              <span className="vf-extra-label mono">Custom / other:</span>
              <div className="vf-chips">
                {extra.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="vf-chip active"
                    onClick={() => toggleSize(s)}
                  >
                    {s} ✕
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="vf-add">
          <input
            type="text"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            placeholder="Add custom size (e.g. One Size, 32R)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomSize();
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={addCustomSize}
            disabled={!customSize.trim()}
          >
            Add
          </button>
        </div>
      </div>

      {/* Colors */}
      <div className="dash-field">
        <span className="mono">COLORS</span>

        <div className="vf-swatches">
          {PRESET_COLORS.map((c) => {
            const active = colorNameSet.has(c.name.toLowerCase());
            return (
              <button
                key={c.name}
                type="button"
                className={`vf-swatch ${active ? 'active' : ''}`}
                onClick={() => toggleColor(c)}
                title={c.name}
              >
                <span
                  className="vf-swatch-dot"
                  style={{ background: c.hex }}
                />
                <span className="vf-swatch-name">{c.name}</span>
              </button>
            );
          })}
        </div>

        <div className="vf-actions mono">
          <button type="button" className="vf-action" onClick={selectAllPresetColors}>
            Select all colors
          </button>
          {colors.length > 0 && (
            <button type="button" className="vf-action" onClick={clearColors}>
              Clear all colors
            </button>
          )}
        </div>

        {/* Custom-named colors not in preset list */}
        {(() => {
          const presetNames = new Set(
            PRESET_COLORS.map((c) => c.name.toLowerCase()),
          );
          const customs = colors.filter(
            (c) => !presetNames.has(c.name.toLowerCase()),
          );
          if (customs.length === 0) return null;
          return (
            <div className="vf-extra">
              <span className="vf-extra-label mono">Custom:</span>
              <div className="vf-swatches">
                {customs.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="vf-swatch active"
                    onClick={() => toggleColor(c)}
                  >
                    <span
                      className="vf-swatch-dot"
                      style={{ background: c.hex }}
                    />
                    <span className="vf-swatch-name">{c.name} ✕</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="vf-add">
          <input
            type="text"
            value={customColorName}
            onChange={(e) => setCustomColorName(e.target.value)}
            placeholder="Add custom color name (e.g. Olive)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomColor();
              }
            }}
          />
          <input
            type="color"
            value={customColorHex}
            onChange={(e) => setCustomColorHex(e.target.value)}
            className="vf-color-input"
            aria-label="Custom color hex"
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={addCustomColor}
            disabled={!customColorName.trim()}
          >
            Add
          </button>
        </div>
      </div>

      {/* Preview */}
      {variants.length > 0 && (
        <div className="dash-field">
          <span className="mono">
            VARIANTS ({variants.length})
          </span>
          <div className="vf-preview mono">
            {variants.slice(0, 50).map((v, i) => (
              <span key={i} className="vf-preview-row">
                {v.color && (
                  <span
                    className="vf-preview-dot"
                    style={{ background: v.color.hex }}
                  />
                )}
                {[v.size, v.color?.name].filter(Boolean).join(' / ')}
              </span>
            ))}
            {variants.length > 50 && (
              <span className="vf-preview-row" style={{ opacity: 0.5 }}>
                +{variants.length - 50} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
