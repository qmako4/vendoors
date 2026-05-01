import Link from 'next/link';
import Image from 'next/image';
import { StripedPlaceholder } from './StripedPlaceholder';
import { photoUrl } from '@/lib/storage';
import type { DisplayAlbum } from '@/lib/albums';

export type GalleryAlbum = DisplayAlbum & {
  coverStorageKey: string | null;
  thumbStorageKeys: string[];
};

// At 7 cols on a ~1480px screen, each cover is roughly 200px. On mobile
// (3 cols, ~375px viewport) it's ~120px. Each strip cell is ~25px / ~30px.
const COVER_SIZES = '(max-width: 560px) 33vw, (max-width: 880px) 33vw, (max-width: 1280px) 20vw, 14vw';
const STRIP_SIZES = '(max-width: 880px) 8vw, 3vw';

export function AlbumGrid({
  albums,
  vendorHandle,
}: {
  albums: GalleryAlbum[];
  vendorHandle: string;
}) {
  if (albums.length === 0) {
    return <div className="empty mono">No albums yet.</div>;
  }
  return (
    <div className="gal-grid">
      {albums.map((a, i) => (
        <Link
          key={a.id}
          href={`/${vendorHandle}/${a.slug}`}
          className="gal-card"
        >
          <div className="gal-cover">
            {a.coverStorageKey ? (
              <Image
                src={photoUrl(a.coverStorageKey)}
                alt={a.title}
                fill
                sizes={COVER_SIZES}
                style={{ objectFit: 'cover' }}
                priority={i < 6}
                loading={i < 6 ? 'eager' : 'lazy'}
              />
            ) : (
              <StripedPlaceholder
                swatch={a.swatch}
                ratio="1 / 1"
                label={a.label}
                sublabel={a.slug}
              />
            )}
            {a.photoCount > 0 && (
              <div className="gal-count mono">{a.photoCount}</div>
            )}
          </div>
          <div className="gal-strip">
            {Array.from({ length: 4 }).map((_, j) => {
              const key = a.thumbStorageKeys[j];
              return (
                <div key={j} className="gal-strip-cell">
                  {key ? (
                    <Image
                      src={photoUrl(key)}
                      alt=""
                      fill
                      sizes={STRIP_SIZES}
                      style={{ objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="gal-title">{a.title}</div>
        </Link>
      ))}
    </div>
  );
}
