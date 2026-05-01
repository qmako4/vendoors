'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GalleryAlbum } from '@/lib/albums';
import { buildContacts, type ContactSource } from '@/lib/contacts';
import { AlbumGrid } from '@/components/AlbumGrid';
import { ContactPills } from '@/components/ContactPills';

type Profile = ContactSource & {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  city: string | null;
};

export type Category = {
  id: string;
  slug: string;
  title: string;
  parent_id: string | null;
};

type Product = GalleryAlbum & { categoryIds: string[] };

export type Section = {
  category: Category;
  products: Product[];
  totalCount: number;
};

export function VendorGallery({
  profile,
  categories,
  sections,
  activeCategoryId,
}: {
  profile: Profile;
  categories: Category[];
  sections: Section[];
  activeCategoryId: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const contacts = buildContacts(profile);

  // When a category is active OR the user is searching, render a single flat
  // grid filtered to those products. Otherwise render the sectioned home view.
  const isFiltered = Boolean(activeCategoryId) || query.trim().length > 0;

  const filteredProducts = useMemo(() => {
    // Deduplicate (a product can appear in multiple sections).
    const seen = new Set<string>();
    let list: Product[] = [];
    for (const s of sections) {
      for (const p of s.products) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }
    }
    if (activeCategoryId) {
      list = list.filter((p) => p.categoryIds.includes(activeCategoryId));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [sections, activeCategoryId, query]);

  function navigateToCategory(catId: string | null) {
    if (catId === null) router.push(`/${profile.handle}`);
    else router.push(`/${profile.handle}?cat=${catId}`);
  }

  const activeCategoryTitle =
    activeCategoryId &&
    (categories.find((c) => c.id === activeCategoryId)?.title ??
      sections.find((s) => s.category.id === activeCategoryId)?.category.title ??
      'Category');

  return (
    <>
      <section className="vh-hero">
        <div className="vh-hero-inner">
          <div className="vh-eyebrow mono">
            VENDOR · vendoors.co / {profile.handle}
          </div>
          <h1 className="vh-title">{profile.display_name}</h1>
          {profile.bio && <p className="vh-bio">{profile.bio}</p>}
          {contacts.length > 0 && (
            <div className="vh-contacts">
              <ContactPills contacts={contacts} />
            </div>
          )}
        </div>
      </section>

      {(categories.length > 0 || sections.length > 0) && (
        <nav className="vh-nav">
          <div className="vh-nav-inner">
            <div className="vh-nav-tabs">
              <button
                className={`vh-nav-tab ${!activeCategoryId ? 'active' : ''}`}
                onClick={() => navigateToCategory(null)}
              >
                Home
              </button>
              {sections.map((s) => (
                <button
                  key={s.category.id}
                  className={`vh-nav-tab ${
                    activeCategoryId === s.category.id ? 'active' : ''
                  }`}
                  onClick={() => navigateToCategory(s.category.id)}
                >
                  {s.category.title}
                </button>
              ))}
            </div>
            {sections.length > 0 && (
              <div className="search-pill vh-search">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle
                    cx="7"
                    cy="7"
                    r="5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M11 11L14 14"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search this gallery"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    className="clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>
      )}

      <section className="vh-body">
        {filteredProducts.length === 0 ? (
          <div className="empty mono">
            {isFiltered
              ? 'No products match.'
              : 'No products yet — vendor is still setting up.'}
          </div>
        ) : (
          <>
            <div className="vh-section-head">
              <div className="vh-section-title">
                {query.trim()
                  ? `Search · "${query}"`
                  : (activeCategoryTitle ?? 'All products')}
              </div>
              <div className="vh-section-count mono">
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1 ? 'item' : 'items'}
              </div>
            </div>
            <AlbumGrid
              albums={filteredProducts}
              vendorHandle={profile.handle}
            />
          </>
        )}
      </section>
    </>
  );
}
