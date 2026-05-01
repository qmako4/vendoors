// Vendoors — Home view
const { useState, useMemo } = React;

function Home({ tweaks, setTweak, onOpenAlbum, activeCat, setActiveCat, query, setQuery }) {
  const filtered = useMemo(() => {
    let list = ALBUMS;
    if (activeCat !== 'all') list = list.filter(a => a.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.vendor.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeCat, query]);

  const totalCount = ALBUMS.length;
  const shownCount = filtered.length;

  return (
    <div className="home">
      <Header query={query} setQuery={setQuery} />

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow mono">VENDOORS — VENDOR ARCHIVE / 2026</div>
          <h1 className="hero-title">The archive.</h1>
          <div className="hero-meta mono">
            <span>{totalCount.toLocaleString()} albums</span>
            <span className="dot">·</span>
            <span>{CATEGORIES.length - 1} categories</span>
            <span className="dot">·</span>
            <span>updated daily</span>
          </div>
        </div>
      </section>

      <section className="body">
        <aside className="sidebar">
          <div className="side-label mono">Browse</div>
          <ul className="cats">
            {CATEGORIES.map(c => (
              <li key={c.id}>
                <button
                  className={`cat ${activeCat === c.id ? 'active' : ''}`}
                  onClick={() => setActiveCat(c.id)}
                >
                  <span className="cat-label">{c.label}</span>
                  <span className="cat-count mono">{c.count.toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="grid-wrap">
          <div className="grid-head">
            <div className="grid-title">
              {CATEGORIES.find(c => c.id === activeCat)?.label}
              {query && <span className="mono grid-q"> · “{query}”</span>}
            </div>
            <div className="grid-count mono">
              {shownCount.toString().padStart(3, '0')} / {totalCount.toLocaleString()}
            </div>
          </div>

          <div className="grid">
            {filtered.map(a => (
              <AlbumCard key={a.id} album={a} onOpen={() => onOpenAlbum(a.id)} />
            ))}
            {filtered.length === 0 && (
              <div className="empty mono">No albums match. Try another category or term.</div>
            )}
          </div>

          <Footer />
        </div>
      </section>
    </div>
  );
}

function Header({ query, setQuery }) {
  return (
    <header className="hdr">
      <div className="hdr-inner">
        <a href="#/" className="wordmark" onClick={(e) => { e.preventDefault(); window.location.hash = '#/'; }}>
          <span className="wm-mark">▦</span>
          <span className="wm-text">Vendoors</span>
        </a>

        <div className="hdr-right">
          <div className="search-pill">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search albums, vendors, SKUs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="clear" onClick={() => setQuery('')} aria-label="Clear">×</button>
            )}
          </div>
          <a className="menu-link" href="#menu" onClick={(e) => e.preventDefault()}>Menu</a>
        </div>
      </div>
    </header>
  );
}

function AlbumCard({ album, onOpen }) {
  return (
    <button className="card" onClick={onOpen}>
      <div className="card-media">
        <StripedPlaceholder
          swatch={album.swatch}
          ratio="4 / 5"
          label={album.label}
          sublabel={album.id}
        />
        <div className="card-tag mono">{album.photoCount} ph</div>
      </div>
      <div className="card-meta">
        <div className="card-title">{album.title}</div>
        <div className="card-sub mono">
          <span>{album.vendor}</span>
          <span className="dot">·</span>
          <span>{album.updatedDays}d</span>
        </div>
      </div>
    </button>
  );
}

function Footer() {
  return (
    <footer className="ftr">
      <div className="ftr-row">
        <div className="mono">© Vendoors 2026 — an editorial index of vendor albums</div>
        <div className="ftr-links mono">
          <a href="#about" onClick={(e) => e.preventDefault()}>About</a>
          <a href="#submit" onClick={(e) => e.preventDefault()}>Submit a vendor</a>
          <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
        </div>
      </div>
    </footer>
  );
}

window.Home = Home;
window.Header = Header;
