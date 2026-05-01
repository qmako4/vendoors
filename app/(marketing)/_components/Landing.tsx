'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ALBUMS } from '@/lib/data';
import { StripedPlaceholder } from '@/components/StripedPlaceholder';
import { AuthModal, type AuthMode } from './AuthModal';

type WordmarkVariant = 'square' | 'half' | 'stack';
type Palette = 'default' | 'cool' | 'warm' | 'mono';

const TWEAKS = {
  wordmark: 'stack' as WordmarkVariant,
  palette: 'mono' as Palette,
};

export function Landing() {
  const [auth, setAuth] = useState<{ open: boolean; mode: AuthMode }>({
    open: false,
    mode: 'signup',
  });

  useEffect(() => {
    document.documentElement.dataset.palette = TWEAKS.palette;
    return () => {
      delete document.documentElement.dataset.palette;
    };
  }, []);

  const openSignIn = () => setAuth({ open: true, mode: 'signin' });
  const openSignUp = () => setAuth({ open: true, mode: 'signup' });
  const closeAuth = () => setAuth((a) => ({ ...a, open: false }));

  return (
    <div className="lp">
      <LpNav
        wordmark={TWEAKS.wordmark}
        onSignIn={openSignIn}
        onSignUp={openSignUp}
      />
      <LpHero onSignUp={openSignUp} />
      <LpRibbon />
      <LpHowItWorks />
      <LpVendorProps />
      <LpStats />
      <LpFAQ />
      <LpFinalCTA onSignUp={openSignUp} />
      <LpFooter />

      <AuthModal open={auth.open} mode={auth.mode} onClose={closeAuth} />
    </div>
  );
}

// ── Wordmark ──────────────────────────────────────────────────────────
function Wordmark({
  variant = 'square',
  size = 26,
}: {
  variant?: WordmarkVariant;
  size?: number;
}) {
  const marks: Record<WordmarkVariant, React.ReactNode> = {
    square: (
      <span style={{ color: 'var(--accent)', fontSize: size * 0.7, lineHeight: 1 }}>▦</span>
    ),
    half: (
      <span style={{ color: 'var(--accent)', fontSize: size * 0.78, lineHeight: 1 }}>◐</span>
    ),
    stack: (
      <span
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: size * 0.95,
          height: size * 0.95,
          background: 'linear-gradient(135deg, var(--g1), var(--g3))',
          color: '#fff',
          borderRadius: 8,
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: size * 0.6,
          fontWeight: 400,
          lineHeight: 1,
        }}
      >
        V
      </span>
    ),
  };
  return (
    <span className="wordmark-lp" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {marks[variant]}
      <span
        style={{
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
          fontSize: size,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}
      >
        Vendoors
      </span>
    </span>
  );
}

// ── Top nav ───────────────────────────────────────────────────────────
function LpNav({
  wordmark,
  onSignIn,
  onSignUp,
}: {
  wordmark: WordmarkVariant;
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  return (
    <nav className="lp-nav">
      <div className="lp-nav-inner">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Wordmark variant={wordmark} />
        </a>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="lp-nav-cta">
          <button className="btn-ghost" onClick={onSignIn}>
            Sign in
          </button>
          <button className="btn-primary" onClick={onSignUp}>
            Start your gallery
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────
function LpHero({ onSignUp }: { onSignUp: () => void }) {
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
          <span className="dot-live" /> A GALLERY URL FOR YOUR CATALOG
        </div>

        <h1 className="lp-h1">
          Your catalog,
          <br />
          <em>your URL.</em>
        </h1>

        <p className="lp-sub">
          Host your album pages on Vendoors. Share one clean URL with buyers.
          They browse, they message you direct. No marketplace, no middleman.
        </p>

        <div className="lp-hero-cta">
          <button className="btn-primary btn-lg" onClick={onSignUp}>
            Create gallery <span className="arrow">→</span>
          </button>
          <span className="lp-hero-cta-sub mono">
            Free · vendoors.co / your-handle
          </span>
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

function LpAlbumMosaic() {
  const picks = [0, 3, 7, 11, 14, 18, 21, 25, 29].map((i) => ALBUMS[i]);
  return (
    <div className="lp-mosaic" aria-hidden>
      <div className="mosaic-frame">
        <div className="mosaic-chrome">
          <span className="dotc" />
          <span className="dotc" />
          <span className="dotc" />
          <span className="mosaic-url mono">vendoors.co / your-studio</span>
        </div>
        <div className="mosaic-grid">
          {picks.map((a, i) => (
            <div
              key={a.id}
              className="mosaic-cell"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <StripedPlaceholder
                swatch={a.swatch}
                ratio="4 / 5"
                label={a.label}
                sublabel={a.id}
              />
              <div className="mosaic-meta mono">
                <span>{a.vendor}</span>
                <span>{a.photoCount}ph</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Logo ribbon ───────────────────────────────────────────────────────
function LpRibbon() {
  const labels = [
    'ATELIER MORI', 'STUDIO HEXA', 'NORTH/SOUTH', 'MAISON VERRE',
    'TABULA RASA', 'FOLIO & CO.', 'COMMON GOODS', 'WORKROOM 9',
    'HEMLOCK', 'PLAIN INDEX',
  ];
  return (
    <section className="lp-ribbon">
      <div className="ribbon-label mono">Studios on Vendoors</div>
      <div className="ribbon-track">
        {[...labels, ...labels].map((l, i) => (
          <span key={i} className="ribbon-item">
            {l}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────
function LpHowItWorks() {
  const steps = [
    { n: '01', t: 'Claim a handle', d: 'Pick a URL. vendoors.co / your-studio.' },
    { n: '02', t: 'Drop photos', d: 'Bulk upload. Auto-cropped to 4:5.' },
    { n: '03', t: 'Share the link', d: 'Buyers browse your gallery and message you direct.' },
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

function HowIllustration({ step }: { step: number }) {
  if (step === 0)
    return (
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
  if (step === 1)
    return (
      <div className="how-illo">
        <div className="ill-drop">
          <div className="ill-drop-label mono">DROP PHOTOS</div>
          <div className="ill-drop-thumbs">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="ill-thumb"
                style={{
                  background: `linear-gradient(135deg, var(--g${(i % 3) + 1}), var(--g${((i + 1) % 3) + 1}))`,
                }}
              />
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

// ── Features ──────────────────────────────────────────────────────────
function LpVendorProps() {
  const props = [
    { icon: '◇', t: 'Free to start', d: 'No fees. No commission.' },
    { icon: '◈', t: 'Bulk upload', d: 'Drop 500 photos. Auto-cropped.' },
    { icon: '◉', t: 'Direct contact', d: 'Buyers message you, not us.' },
    { icon: '◎', t: 'Custom URL', d: 'vendoors.co / your-handle.' },
    { icon: '◐', t: 'Watermarking', d: 'Auto-watermark every upload.' },
    { icon: '◍', t: 'Analytics', d: 'See what converts.' },
  ];
  return (
    <section className="lp-section lp-section-tinted" id="features">
      <div className="lp-section-head">
        <div className="section-eyebrow mono">FEATURES</div>
        <h2 className="section-h2">
          Everything you need.
          <br />
          <em>Nothing you don&apos;t.</em>
        </h2>
        <p className="section-lede">
          Photos and a way to reach you. That&apos;s it.
        </p>
      </div>
      <div className="props-grid">
        {props.map((p) => (
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

// ── Stats ─────────────────────────────────────────────────────────────
function LpStats() {
  const stats = [
    { n: '38,018', l: 'albums hosted' },
    { n: '2,140', l: 'studios' },
    { n: '1.4M', l: 'photos / mo' },
    { n: '46', l: 'cities' },
  ];
  return (
    <section className="lp-stats">
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.l} className="stat">
            <div className="stat-n">{s.n}</div>
            <div className="stat-l mono">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────
function LpFAQ() {
  const items = [
    {
      q: 'Is it free?',
      a: 'Yes. Unlimited albums on the free tier. Paid add-ons for custom domains and analytics.',
    },
    { q: 'Do you take a cut?', a: 'No. Buyers pay you direct.' },
    {
      q: 'How do buyers find me?',
      a: 'You share your gallery URL — Instagram bio, WhatsApp status, business cards. Vendoors hosts; you do the marketing.',
    },
    {
      q: 'Can I migrate from Yupoo?',
      a: 'Yes. Send a link, we import your albums in under an hour.',
    },
    {
      q: 'What about scraping?',
      a: 'Auto-watermarking, right-click protection, per-album privacy.',
    },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="lp-section" id="faq">
      <div className="lp-section-head lp-section-head-narrow">
        <div className="section-eyebrow mono">FAQ</div>
        <h2 className="section-h2">
          <em>Questions.</em>
        </h2>
      </div>
      <div className="faq-list">
        {items.map((it, i) => (
          <button
            key={i}
            className={`faq-row ${open === i ? 'open' : ''}`}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <div className="faq-q">
              <span className="faq-num mono">
                {String(i + 1).padStart(2, '0')}
              </span>
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

// ── Final CTA ─────────────────────────────────────────────────────────
function LpFinalCTA({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section className="lp-final">
      <div className="final-bg" aria-hidden>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>
      <div className="final-inner">
        <h2 className="final-h">
          A <em>better home</em>
          <br />
          for your catalog.
        </h2>
        <p className="final-sub">
          One minute to sign up. One album to start.
        </p>
        <div className="final-ctas">
          <button className="btn-primary btn-lg" onClick={onSignUp}>
            Create gallery <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────
function LpFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <Wordmark variant="square" size={22} />
          <p className="mono">
            Vendor galleries.
            <br />
            Est. 2024.
          </p>
        </div>
        <div className="lp-footer-cols">
          <div>
            <div className="ftc-h mono">PRODUCT</div>
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
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
      <div className="lp-footer-base mono">© 2026 Vendoors</div>
    </footer>
  );
}
