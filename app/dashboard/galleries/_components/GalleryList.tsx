import Link from 'next/link';
import { switchGallery, deleteGallery } from '../actions';
import type { Gallery } from '@/lib/active-gallery';

export function GalleryList({
  galleries,
  activeId,
}: {
  galleries: Gallery[];
  activeId: string | null;
}) {
  return (
    <ul className="gallery-list">
      {galleries.map((g) => {
        const isActive = g.id === activeId;
        return (
          <li key={g.id} className={`gallery-row ${isActive ? 'active' : ''}`}>
            <div className="gallery-meta">
              <div className="gallery-name">{g.display_name}</div>
              <div className="gallery-handle mono">vendoors.co / {g.handle}</div>
            </div>
            <div className="gallery-actions">
              <Link
                href={`/${g.handle}`}
                className="dash-link mono"
                target="_blank"
              >
                view ↗
              </Link>
              {isActive ? (
                <span className="gallery-active-badge mono">ACTIVE</span>
              ) : (
                <form action={switchGalleryAction.bind(null, g.id)}>
                  <button type="submit" className="dash-link mono">
                    switch to
                  </button>
                </form>
              )}
              {!isActive && galleries.length > 1 && (
                <form action={deleteGalleryAction.bind(null, g.id)}>
                  <button
                    type="submit"
                    className="dash-link dash-link-danger mono"
                  >
                    delete
                  </button>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function switchGalleryAction(id: string) {
  'use server';
  await switchGallery(id);
}

async function deleteGalleryAction(id: string) {
  'use server';
  if (!confirm) return;
  await deleteGallery(id);
}
