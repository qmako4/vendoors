// Vendoors — Album detail view + lightbox
const { useState: useStateAlb, useEffect: useEffectAlb, useMemo: useMemoAlb } = React;

function Album({ albumId, onBack }) {
  const album = useMemoAlb(() => ALBUMS.find(a => a.id === albumId), [albumId]);
  const photos = useMemoAlb(() => album ? photosForAlbum(album) : [], [album]);
  const [lightboxIdx, setLightboxIdx] = useStateAlb(null);
  const [copied, setCopied] = useStateAlb(null);

  useEffectAlb(() => {
    function onKey(e) {
      if (lightboxIdx === null) return;
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowRight') setLightboxIdx(i => Math.min(photos.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setLightboxIdx(i => Math.max(0, i - 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, photos.length]);

  if (!album) {
    return (
      <div className="alb-missing">
        <div className="mono">Album not found.</div>
        <button className="btn-text" onClick={onBack}>← Back to archive</button>
      </div>
    );
  }

  const contacts = [
    { id: 'wa', label: 'WhatsApp', value: '+852 5512 0937', icon: '◈' },
    { id: 'wc', label: 'WeChat', value: 'vendoors_' + album.id.split('-')[1], icon: '◇' },
    { id: 'tg', label: 'Telegram', value: '@' + album.vendor.toLowerCase().replace(/[^a-z]/g, '') + '_studio', icon: '◉' },
    { id: 'em', label: 'Email', value: album.vendor.toLowerCase().replace(/[^a-z]/g, '') + '@vendoors.co', icon: '◎' },
  ];

  function copyContact(c) {
    navigator.clipboard?.writeText(c.value);
    setCopied(c.id);
    setTimeout(() => setCopied(null), 1400);
  }

  return (
    <div className="album">
      <Header query="" setQuery={() => {}} />

      <div className="alb-crumbs">
        <button className="crumb" onClick={onBack}>← The archive</button>
        <span className="crumb-sep mono">/</span>
        <span className="crumb-cat mono">{(CATEGORIES.find(c => c.id === album.category) || {}).label}</span>
        <span className="crumb-sep mono">/</span>
        <span className="crumb-id mono">{album.id}</span>
      </div>

      <header className="alb-head">
        <div className="alb-head-inner">
          <div className="alb-eyebrow mono">{album.id} · {album.vendor}</div>
          <h1 className="alb-title">{album.title}</h1>
          <div className="alb-meta mono">
            <span>{album.photoCount} photos</span>
            <span className="dot">·</span>
            <span>updated {album.updatedDays} day{album.updatedDays === 1 ? '' : 's'} ago</span>
            <span className="dot">·</span>
            <span>{(CATEGORIES.find(c => c.id === album.category) || {}).label}</span>
          </div>
        </div>
      </header>

      <div className="contact-bar">
        <div className="contact-bar-inner">
          <div className="contact-label mono">Inquire —</div>
          <div className="contact-pills">
            {contacts.map(c => (
              <button
                key={c.id}
                className={`pill ${copied === c.id ? 'pill-copied' : ''}`}
                onClick={() => copyContact(c)}
              >
                <span className="pill-icon" aria-hidden>{c.icon}</span>
                <span className="pill-label">{c.label}</span>
                <span className="pill-value mono">{copied === c.id ? 'copied ✓' : c.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="alb-feed">
        {photos.map((p, i) => (
          <figure key={i} className="alb-photo" onClick={() => setLightboxIdx(i)}>
            <StripedPlaceholder
              swatch={p.swatch}
              ratio={`${p.w} / ${p.h}`}
              label={`${album.label}`}
              sublabel={`${p.caption} — ${album.id}`}
            />
            <figcaption className="mono">
              <span>{p.caption}</span>
              <span className="dot">·</span>
              <span>{p.w}×{p.h}</span>
            </figcaption>
          </figure>
        ))}
        <div className="alb-end mono">— end of album —</div>
      </main>

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          idx={lightboxIdx}
          album={album}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx(i => Math.max(0, i - 1))}
          onNext={() => setLightboxIdx(i => Math.min(photos.length - 1, i + 1))}
        />
      )}
    </div>
  );
}

function Lightbox({ photos, idx, album, onClose, onPrev, onNext }) {
  const p = photos[idx];
  return (
    <div className="lb" role="dialog" aria-modal="true">
      <div className="lb-bg" onClick={onClose} />

      <div className="lb-top mono">
        <span>{album.id} · {album.label}</span>
        <span>{String(idx + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</span>
        <button className="lb-close" onClick={onClose} aria-label="Close">Close ✕</button>
      </div>

      <button className="lb-nav lb-prev" onClick={onPrev} disabled={idx === 0} aria-label="Previous">←</button>

      <div className="lb-stage" onClick={onClose}>
        <div className="lb-frame" onClick={(e) => e.stopPropagation()}>
          <StripedPlaceholder
            swatch={p.swatch}
            ratio={`${p.w} / ${p.h}`}
            label={album.label}
            sublabel={`${p.caption} — ${album.id}`}
          />
        </div>
      </div>

      <button className="lb-nav lb-next" onClick={onNext} disabled={idx === photos.length - 1} aria-label="Next">→</button>

      <div className="lb-bottom mono">
        <span>{p.caption}</span>
        <span className="dot">·</span>
        <span>{p.w}:{p.h}</span>
        <span className="dot">·</span>
        <span>{album.vendor}</span>
      </div>
    </div>
  );
}

window.Album = Album;
