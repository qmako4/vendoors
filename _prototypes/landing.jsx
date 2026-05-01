// Vendoors — Landing page styles + components
// Aesthetic: soft warm gradients, rounded pills, generous whitespace,
// Instrument Serif italic accents inside friendly sans headlines.

const { useState: useS, useEffect: useE } = React;

// ── Wordmark variants ────────────────────────────────────────────────
function Wordmark({ variant = 'square', size = 26 }) {
  const marks = {
    square: <span style={{ color: 'var(--accent)', fontSize: size * 0.7, lineHeight: 1 }}>▦</span>,
    half:   <span style={{ color: 'var(--accent)', fontSize: size * 0.78, lineHeight: 1 }}>◐</span>,
    stack:  (
      <span style={{
        display: 'inline-grid', placeItems: 'center',
        width: size * 0.95, height: size * 0.95,
        background: 'linear-gradient(135deg, var(--g1), var(--g3))',
        color: '#fff',
        borderRadius: 8,
        fontFamily: 'var(--serif)', fontStyle: 'italic',
        fontSize: size * 0.6, fontWeight: 400,
        lineHeight: 1,
      }}>V</span>
    ),
  };
  return (
    <span className="wordmark-lp" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {marks[variant]}
      <span style={{
        fontFamily: 'var(--serif)', fontStyle: 'italic',
        fontSize: size, letterSpacing: '-0.01em',
        color: 'var(--ink)',
      }}>Vendoors</span>
    </span>
  );
}

// ── Top nav ──────────────────────────────────────────────────────────
function LpNav({ wordmark, onSignIn, onSignUp }) {
  return (
    <nav className="lp-nav">
      <div className="lp-nav-inner">
        <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Wordmark variant={wordmark} />
        </a>
        <div className="lp-nav-links">
          <a href="#vendors">For vendors</a>
          <a href="#buyers">For buyers</a>
          <a href="#how">How it works</a>
          <a href="Vendoors.html">Browse archive ↗</a>
        </div>
        <div className="lp-nav-cta">
          <button className="btn-ghost" onClick={onSignIn}>Sign in</button>
          <button className="btn-primary" onClick={onSignUp}>Start selling</button>
        </div>
      </div>
    </nav>
  );
}

// ── Hero (split, two paths) ──────────────────────────────────────────
function LpHero({ focus, onSignUp, onBrowse }) {
  // focus: 'both' | 'vendor' | 'buyer'
  return (
    <header className="lp-hero" id="top">
      <div className="lp-hero-bg" aria-hidden>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="grain" />
      </div>

      <div className="lp-hero-inner">
        <div className="lp-eyebrow mono">
          <span className="dot-live" /> 38,018 ALBUMS · 2,140 STUDIOS
        </div>

        <h1 className="lp-h1">
          A gallery,<br/>
          <em>not</em> a storefront.
        </h1>

        <p className="lp-sub">
          Vendors host albums. Buyers browse and message direct. No checkout. No middleman.
        </p>

        <div className={`lp-hero-paths focus-${focus}`}>
          <div className="path path-vendor">
            <div className="path-tag mono">FOR VENDORS</div>
            <div className="path-headline">
              Show your work.
            </div>
            <ul className="path-list">
              <li>Free. No listing fees.</li>
              <li>Bulk photo upload.</li>
              <li>WhatsApp · WeChat · Telegram.</li>
            </ul>
            <button className="btn-primary btn-lg" onClick={onSignUp}>
              Create gallery <span className="arrow">→</span>
            </button>
          </div>

          <div className="path-divider" aria-hidden>
            <span className="path-or mono">OR</span>
          </div>

          <div className="path path-buyer">
            <div className="path-tag mono">FOR BUYERS</div>
            <div className="path-headline">
              Browse 38k albums.
            </div>
            <ul className="path-list">
              <li>Indexed by category.</li>
              <li>No account required.</li>
              <li>Message vendors direct.</li>
            </ul>
            <button className="btn-secondary btn-lg" onClick={onBrowse}>
              Enter archive <span className="arrow">→</span>
            </button>
          </div>
        </div>

        <div className="lp-hero-trust mono">
          Studios in
          <span className="trust-pill">Tokyo</span>
          <span className="trust-pill">Seoul</span>
          <span className="trust-pill">Guangzhou</span>
          <span className="trust-pill">Mexico City</span>
          <span className="trust-pill">Berlin</span>
          <span className="trust-pill">+ 41 cities</span>
        </div>
      </div>

      <LpAlbumMosaic />
    </header>
  );
}

// Floating album mosaic under the hero — reuses the home page's swatches
function LpAlbumMosaic() {
  const picks = [0, 3, 7, 11, 14, 18, 21, 25, 29].map(i => ALBUMS[i]);
  return (
    <a className="lp-mosaic" href="Vendoors.html" aria-label="Browse the archive">
      <div className="mosaic-frame">
        <div className="mosaic-chrome">
          <span className="dotc" /><span className="dotc" /><span className="dotc" />
          <span className="mosaic-url mono">vendoors.co / archive</span>
        </div>
        <div className="mosaic-grid">
          {picks.map((a, i) => (
            <div key={a.id} className="mosaic-cell" style={{ animationDelay: `${i * 0.12}s` }}>
              <StripedPlaceholder swatch={a.swatch} ratio="4 / 5" label={a.label} sublabel={a.id} />
              <div className="mosaic-meta mono">
                <span>{a.vendor}</span>
                <span>{a.photoCount}ph</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mosaic-cta mono">
          All 38,018 →
        </div>
      </div>
    </a>
  );
}

// ── Logo ribbon ──────────────────────────────────────────────────────
function LpRibbon() {
  const labels = ['ATELIER MORI', 'STUDIO HEXA', 'NORTH/SOUTH', 'MAISON VERRE', 'TABULA RASA', 'FOLIO & CO.', 'COMMON GOODS', 'WORKROOM 9', 'HEMLOCK', 'PLAIN INDEX'];
  return (
    <section className="lp-ribbon">
      <div className="ribbon-label mono">Studios on Vendoors</div>
      <div className="ribbon-track">
        {[...labels, ...labels].map((l, i) => (
          <span key={i} className="ribbon-item">{l}</span>
        ))}
      </div>
    </section>
  );
}

// ── How it works ─────────────────────────────────────────────────────
function LpHowItWorks() {
  const steps = [
    { n: '01', t: 'Claim a handle', d: 'Pick a URL. vendoors.co / your-studio.' },
    { n: '02', t: 'Drop photos', d: 'Bulk upload. Auto-cropped to 4:5.' },
    { n: '03', t: 'Get inquiries', d: 'Buyers message you direct. We stay out.' },
  ];
  return (
    <section className="lp-section" id="how">
      <div className="lp-section-head">
        <div className="section-eyebrow mono">HOW IT WORKS</div>
        <h2 className="section-h2">
          Live <em>in an afternoon.</em>
        </h2>
      </div>
      <div className="how-grid">
        {steps.map((s, i) => (
          <div key={s.n} className="how-card">
            <div className="how-num mono">{s.n}</div>
            <div className="how-title">{s.t}</div>
            <div className="how-desc">{s.d}</div>
            <HowIllustration step={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HowIllustration({ step }) {
  if (step === 0) return (
    <div className="how-illo">
      <div className="ill-input">
        <span className="mono">vendoors.co /</span>
        <span className="ill-input-text">your-studio</span>
        <span className="ill-cursor" />
      </div>
      <div className="ill-checks mono">
        <span>✓ available</span>
      </div>
    </div>
  );
  if (step === 1) return (
    <div className="how-illo">
      <div className="ill-drop">
        <div className="ill-drop-label mono">DROP PHOTOS</div>
        <div className="ill-drop-thumbs">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="ill-thumb" style={{ background: `linear-gradient(135deg, var(--g${(i%3)+1}), var(--g${((i+1)%3)+1}))` }} />
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <div className="how-illo">
      <div className="ill-msg ill-msg-them">
        <span className="ill-msg-name mono">BUYER · TOKYO</span>
        <span>No.142 still in M?</span>
      </div>
      <div className="ill-msg ill-msg-you">
        <span className="ill-msg-name mono">YOU</span>
        <span>Yes — ships today ✓</span>
      </div>
    </div>
  );
}

// ── Vendor value props ───────────────────────────────────────────────
function LpVendorProps() {
  const props_ = [
    { icon: '◇', t: 'Free to start',     d: 'No fees. No commission.' },
    { icon: '◈', t: 'Bulk upload',       d: 'Drop 500 photos. Auto-cropped.' },
    { icon: '◉', t: 'Direct contact',    d: 'Buyers message you, not us.' },
    { icon: '◎', t: 'Custom URL',        d: 'vendoors.co / your-handle.' },
    { icon: '◐', t: 'Watermarking',      d: 'Auto-watermark every upload.' },
    { icon: '◍', t: 'Analytics',         d: 'See what converts.' },
  ];
  return (
    <section className="lp-section lp-section-tinted" id="vendors">
      <div className="lp-section-head">
        <div className="section-eyebrow mono">FOR VENDORS</div>
        <h2 className="section-h2">
          Everything you need.<br/>
          <em>Nothing you don't.</em>
        </h2>
        <p className="section-lede">
          Photos and a way to reach you. That's it.
        </p>
      </div>
      <div className="props-grid">
        {props_.map(p => (
          <div key={p.t} className="prop-card">
            <div className="prop-icon">{p.icon}</div>
            <div className="prop-title">{p.t}</div>
            <div className="prop-desc">{p.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Stats ribbon ─────────────────────────────────────────────────────
function LpStats() {
  const stats = [
    { n: '38,018', l: 'albums' },
    { n: '2,140',  l: 'studios' },
    { n: '1.4M',   l: 'photos / mo' },
    { n: '46',     l: 'cities' },
  ];
  return (
    <section className="lp-stats">
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.l} className="stat">
            <div className="stat-n">{s.n}</div>
            <div className="stat-l mono">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Buyer section ────────────────────────────────────────────────────
function LpBuyers({ onBrowse }) {
  const samples = [4, 8, 12, 16].map(i => ALBUMS[i]);
  return (
    <section className="lp-section lp-buyers" id="buyers">
      <div className="buyers-grid">
        <div className="buyers-copy">
          <div className="section-eyebrow mono">FOR BUYERS</div>
          <h2 className="section-h2">
            <em>Good things,</em><br/>made well.
          </h2>
          <p className="section-lede">
            Browse by category. Message direct. No carts.
          </p>
          <button className="btn-primary btn-lg" onClick={onBrowse}>
            Enter archive <span className="arrow">→</span>
          </button>
          <div className="buyers-sub mono">
            38,018 albums · free · no signup
          </div>
        </div>

        <div className="buyers-cards">
          {samples.map((a, i) => (
            <a key={a.id} href="Vendoors.html" className="buyers-card" style={{ '--i': i }}>
              <StripedPlaceholder swatch={a.swatch} ratio="4 / 5" label={a.label} sublabel={a.id} />
              <div className="buyers-card-meta">
                <span className="mono">{a.vendor}</span>
                <span className="mono">→</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────
function LpFAQ() {
  const items = [
    { q: 'Is it free?', a: 'Yes. Unlimited albums on the free tier. Paid add-ons for custom domains and analytics.' },
    { q: 'Do you take a cut?', a: 'No. Buyers pay you direct.' },
    { q: 'Who is this for?', a: 'Independent makers, vintage dealers, tailors, footwear studios — anyone whose work is photographs.' },
    { q: 'Can I migrate from Yupoo?', a: 'Yes. Send a link, we import your albums in under an hour.' },
    { q: 'What about scraping?', a: 'Auto-watermarking, right-click protection, per-album privacy.' },
  ];
  const [open, setOpen] = useS(0);
  return (
    <section className="lp-section" id="faq">
      <div className="lp-section-head lp-section-head-narrow">
        <div className="section-eyebrow mono">FAQ</div>
        <h2 className="section-h2"><em>Questions.</em></h2>
      </div>
      <div className="faq-list">
        {items.map((it, i) => (
          <button key={i} className={`faq-row ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
            <div className="faq-q">
              <span className="faq-num mono">{String(i+1).padStart(2,'0')}</span>
              <span>{it.q}</span>
              <span className="faq-toggle">{open === i ? '–' : '+'}</span>
            </div>
            {open === i && <div className="faq-a">{it.a}</div>}
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Final CTA ────────────────────────────────────────────────────────
function LpFinalCTA({ onSignUp, onBrowse }) {
  return (
    <section className="lp-final">
      <div className="final-bg" aria-hidden>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>
      <div className="final-inner">
        <h2 className="final-h">
          A <em>better home</em><br/>for your catalog.
        </h2>
        <p className="final-sub">
          One minute to sign up. One album to start.
        </p>
        <div className="final-ctas">
          <button className="btn-primary btn-lg" onClick={onSignUp}>
            Create gallery <span className="arrow">→</span>
          </button>
          <button className="btn-ghost btn-lg" onClick={onBrowse}>
            Browse archive
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────
function LpFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <Wordmark variant="square" size={22} />
          <p className="mono">Vendor albums.<br/>Est. 2024.</p>
        </div>
        <div className="lp-footer-cols">
          <div>
            <div className="ftc-h mono">PRODUCT</div>
            <a href="#how">How it works</a>
            <a href="#vendors">For vendors</a>
            <a href="#buyers">For buyers</a>
            <a href="Vendoors.html">Archive</a>
          </div>
          <div>
            <div className="ftc-h mono">COMPANY</div>
            <a href="#">About</a>
            <a href="#">Studios we love</a>
            <a href="#">Press</a>
            <a href="#">Contact</a>
          </div>
          <div>
            <div className="ftc-h mono">LEGAL</div>
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Cookies</a>
            <a href="#">DMCA</a>
          </div>
        </div>
      </div>
      <div className="lp-footer-base mono">
        © 2026 Vendoors
      </div>
    </footer>
  );
}

Object.assign(window, {
  Wordmark, LpNav, LpHero, LpRibbon, LpHowItWorks, LpVendorProps,
  LpStats, LpBuyers, LpFAQ, LpFinalCTA, LpFooter,
});
