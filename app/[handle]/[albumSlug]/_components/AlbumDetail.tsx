'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { DisplayAlbum, GalleryAlbum } from '@/lib/albums';
import { buildContacts, type ContactSource } from '@/lib/contacts';
import { AlbumGrid } from '@/components/AlbumGrid';
import { ContactPills } from '@/components/ContactPills';
import { AddToCartForm } from '@/components/AddToCartForm';
import { photoUrl } from '@/lib/storage';

export type RealPhoto = {
  id: string;
  storageKey: string;
  width: number;
  height: number;
  caption: string | null;
};

export function AlbumDetail({
  album,
  photos,
  children,
  sizes,
  colors,
  vendorHandle,
  contactSource,
}: {
  album: DisplayAlbum;
  photos: RealPhoto[];
  children: GalleryAlbum[];
  sizes: string[];
  colors: Array<{ name: string; hex: string }>;
  vendorHandle: string;
  contactSource: ContactSource;
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight')
        setLightboxIdx((i) =>
          i === null ? null : Math.min(photos.length - 1, i + 1),
        );
      if (e.key === 'ArrowLeft')
        setLightboxIdx((i) => (i === null ? null : Math.max(0, i - 1)));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, photos.length]);

  const contacts = buildContacts(contactSource);
  const cover = photos[0];

  return (
    <div className="album">
      <div className="alb-crumbs">
        <Link className="crumb" href={`/${vendorHandle}`}>
          ← {album.vendor}
        </Link>
        <span className="crumb-sep mono">/</span>
        <span className="crumb-id mono">{album.slug}</span>
      </div>

      <section className="alb-top">
        <div
          className="alb-cover"
          onClick={() => cover && setLightboxIdx(0)}
          style={{ cursor: cover ? 'zoom-in' : 'default' }}
        >
          {cover ? (
            <Image
              src={photoUrl(cover.storageKey)}
              alt={album.title}
              fill
              sizes="(max-width: 760px) 100vw, 320px"
              priority
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className="alb-cover-empty mono">no cover</div>
          )}
        </div>

        <div className="alb-info">
          <h1 className="alb-title-row">
            {album.title}
            <span className="alb-title-count mono"> | {photos.length}</span>
          </h1>

          {album.description && (
            <p className="alb-info-desc">{album.description}</p>
          )}

          {album.links.length > 0 && (
            <div className="alb-link-list">
              {album.links.map((l, i) => (
                <div key={i} className="alb-link-row">
                  {l.label && (
                    <span className="alb-link-label mono">{l.label}:</span>
                  )}
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="alb-link-url"
                  >
                    {l.url}
                  </a>
                </div>
              ))}
            </div>
          )}

          <AddToCartForm
            albumId={album.id}
            vendorHandle={vendorHandle}
            productSlug={album.slug}
            productTitle={album.title}
            coverStorageKey={cover?.storageKey ?? null}
            sizes={sizes}
            colors={colors}
          />

          {contacts.length > 0 && (
            <div className="alb-info-contacts">
              <ContactPills contacts={contacts} />
            </div>
          )}

          <div className="alb-info-meta mono">
            <span>{photos.length} photos</span>
            <span className="dot">·</span>
            <span>
              updated {album.updatedDays} day
              {album.updatedDays === 1 ? '' : 's'} ago
            </span>
          </div>
        </div>
      </section>

      {children.length > 0 && (
        <section className="alb-children">
          <div className="vendor-grid-head">
            <div className="grid-title">In this album</div>
            <div className="grid-count mono">{children.length} albums</div>
          </div>
          <AlbumGrid albums={children} vendorHandle={vendorHandle} />
        </section>
      )}

      {photos.length === 0 && children.length === 0 && (
        <div className="alb-empty mono">
          No photos or sub-albums yet — vendor is still setting up.
        </div>
      )}

      {photos.length > 1 && (
        <main className="alb-grid alb-grid-tight">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className="alb-thumb"
              onClick={() => setLightboxIdx(i)}
              aria-label={`Open photo ${i + 1}`}
            >
              <Image
                src={photoUrl(p.storageKey)}
                alt={p.caption ?? album.title}
                fill
                sizes="(max-width: 560px) 33vw, (max-width: 880px) 25vw, (max-width: 1280px) 17vw, 12vw"
                style={{ objectFit: 'cover' }}
                priority={i < 8}
                loading={i < 8 ? 'eager' : 'lazy'}
              />
            </button>
          ))}
        </main>
      )}

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          idx={lightboxIdx}
          album={album}
          onClose={() => setLightboxIdx(null)}
          onPrev={() =>
            setLightboxIdx((i) => (i === null ? null : Math.max(0, i - 1)))
          }
          onNext={() =>
            setLightboxIdx((i) =>
              i === null ? null : Math.min(photos.length - 1, i + 1),
            )
          }
        />
      )}
    </div>
  );
}

function Lightbox({
  photos,
  idx,
  album,
  onClose,
  onPrev,
  onNext,
}: {
  photos: RealPhoto[];
  idx: number;
  album: DisplayAlbum;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const p = photos[idx];
  return (
    <div className="lb" role="dialog" aria-modal="true">
      <div className="lb-bg" onClick={onClose} />

      <div className="lb-top mono">
        <span>
          {album.slug} · {album.label}
        </span>
        <span>
          {String(idx + 1).padStart(2, '0')} /{' '}
          {String(photos.length).padStart(2, '0')}
        </span>
        <button className="lb-close" onClick={onClose} aria-label="Close">
          Close ✕
        </button>
      </div>

      <button
        className="lb-nav lb-prev"
        onClick={onPrev}
        disabled={idx === 0}
        aria-label="Previous"
      >
        ←
      </button>

      <div className="lb-stage" onClick={onClose}>
        <div className="lb-frame" onClick={(e) => e.stopPropagation()}>
          <Image
            src={photoUrl(p.storageKey)}
            alt={p.caption ?? album.title}
            width={p.width}
            height={p.height}
            sizes="(max-width: 880px) 100vw, 80vw"
            priority
            style={{
              maxHeight: 'calc(100vh - 160px)',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      </div>

      <button
        className="lb-nav lb-next"
        onClick={onNext}
        disabled={idx === photos.length - 1}
        aria-label="Next"
      >
        →
      </button>

      <div className="lb-bottom mono">
        {p.caption && (
          <>
            <span>{p.caption}</span>
            <span className="dot">·</span>
          </>
        )}
        <span>
          {p.width}:{p.height}
        </span>
        <span className="dot">·</span>
        <span>{album.vendor}</span>
      </div>
    </div>
  );
}
