// Locked album — buyer-facing states
const { useState: useLS } = React;

function LockedShell({ children, album, showHeader = true }) {
  return (
    <div className="locked-shell">
      {showHeader && (
        <div className="lck-hdr">
          <div className="lck-hdr-inner">
            <a href="Vendoors.html" className="lck-back mono">← Archive</a>
            <div className="lck-hdr-title">
              <span className="wm-mark" style={{ color: 'var(--accent)' }}>▦</span>
              <span className="wm-text" style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22 }}>Vendoors</span>
            </div>
            <div className="lck-hdr-id mono">{album?.id || ''}</div>
          </div>
        </div>
      )}
      <div className="lck-body">{children}</div>
    </div>
  );
}

// A · Clean lock
function LockedClean({ album, onSubmit }) {
  const [pw, setPw] = useLS('');
  return (
    <LockedShell album={album}>
      <div className="lck-card">
        <div className="lck-icon-wrap">
          <div className="lck-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
        </div>
        <div className="lck-eyebrow mono">PRIVATE · {album.id}</div>
        <h1 className="lck-h1"><em>Private</em> album.</h1>
        <p className="lck-sub">Shared by {album.vendor}.</p>
        <form className="lck-form" onSubmit={(e) => { e.preventDefault(); onSubmit?.(pw); }}>
          <div className="lck-input-wrap">
            <span className="lck-input-icon mono">PW</span>
            <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
            <button type="submit" className="lck-input-go">→</button>
          </div>
          <div className="lck-form-foot mono">
            <a href="#request">Request access →</a>
          </div>
        </form>
        <div className="lck-card-base mono">
          <span>{album.photoCount} photos</span>
        </div>
      </div>
    </LockedShell>
  );
}

// B · Wrong
function LockedWrong({ album }) {
  const [pw, setPw] = useLS('hunter2');
  return (
    <LockedShell album={album}>
      <div className="lck-card lck-card-error">
        <div className="lck-icon-wrap">
          <div className="lck-icon lck-icon-error">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M9 16l6 0M12 13v6" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
        </div>
        <div className="lck-eyebrow mono lck-eyebrow-error">WRONG · 2 LEFT</div>
        <h1 className="lck-h1">Try <em>again.</em></h1>
        <p className="lck-sub">3 wrong = 10-min lockout.</p>
        <form className="lck-form" onSubmit={(e) => e.preventDefault()}>
          <div className="lck-input-wrap lck-input-wrap-error">
            <span className="lck-input-icon mono">PW</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="submit" className="lck-input-go">→</button>
          </div>
          <div className="lck-form-foot mono">
            <a href="#request">Request access →</a>
          </div>
        </form>
      </div>
    </LockedShell>
  );
}

// C · Unlocking
function LockedUnlocking({ album }) {
  return (
    <LockedShell album={album}>
      <div className="lck-card lck-card-success">
        <div className="lck-icon-wrap">
          <div className="lck-icon lck-icon-success">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 12 10 17 19 7" />
            </svg>
          </div>
        </div>
        <div className="lck-eyebrow mono lck-eyebrow-success">UNLOCKED</div>
        <h1 className="lck-h1"><em>In.</em></h1>
        <p className="lck-sub">Loading {album.photoCount} photos.</p>
        <div className="lck-progress"><div className="lck-progress-bar" /></div>
        <div className="lck-card-base mono">
          <span>signed · 60 min</span>
        </div>
      </div>
    </LockedShell>
  );
}

// D · Request
function LockedRequestAccess({ album }) {
  const [name, setName] = useLS('');
  const [contact, setContact] = useLS('');
  const [reason, setReason] = useLS('');
  const [channel, setChannel] = useLS('whatsapp');
  return (
    <LockedShell album={album}>
      <div className="lck-card lck-card-wide">
        <div className="lck-eyebrow mono">REQUEST · {album.id}</div>
        <h1 className="lck-h1">Ask <em>{album.vendor}.</em></h1>
        <p className="lck-sub">Most reply within 4 hours.</p>

        <form className="lck-req-form" onSubmit={(e) => e.preventDefault()}>
          <label className="lck-field">
            <span className="mono">NAME</span>
            <input type="text" placeholder="Maya · Folio Tokyo" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="lck-field">
            <span className="mono">CONTACT</span>
            <input type="text" placeholder="@handle, +44…, email" value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>

          <div className="lck-field">
            <span className="mono">CHANNEL</span>
            <div className="lck-channels">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: '◈' },
                { id: 'wechat',   label: 'WeChat',   icon: '◇' },
                { id: 'telegram', label: 'Telegram', icon: '◉' },
                { id: 'email',    label: 'Email',    icon: '◎' },
              ].map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`lck-chan ${channel === c.id ? 'active' : ''}`}
                  onClick={() => setChannel(c.id)}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="lck-field">
            <span className="mono">NOTE (OPTIONAL)</span>
            <textarea rows={3} placeholder="Who referred you, what you're after." value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>

          <div className="lck-req-actions">
            <button type="submit" className="lck-btn-primary">Send →</button>
            <a href="#back" className="lck-btn-text">Back</a>
          </div>

          <div className="lck-req-foot mono">
            ONLY {album.vendor.toUpperCase()} SEES THIS
          </div>
        </form>
      </div>
    </LockedShell>
  );
}

// E · Expired
function LockedExpired({ album }) {
  return (
    <LockedShell album={album}>
      <div className="lck-card lck-card-expired">
        <div className="lck-icon-wrap">
          <div className="lck-icon lck-icon-muted">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
        </div>
        <div className="lck-eyebrow mono lck-eyebrow-muted">EXPIRED · 14D AGO</div>
        <h1 className="lck-h1">Link <em>expired.</em></h1>
        <p className="lck-sub">Ask for a fresh one.</p>

        <div className="lck-expired-meta">
          <div className="lck-meta-row">
            <span className="mono">ALBUM</span>
            <span>{album.label}</span>
          </div>
          <div className="lck-meta-row">
            <span className="mono">SHARED</span>
            <span>44d ago</span>
          </div>
          <div className="lck-meta-row">
            <span className="mono">EXPIRED</span>
            <span>14d ago</span>
          </div>
          <div className="lck-meta-row">
            <span className="mono">OPENS</span>
            <span>3 before expiry</span>
          </div>
        </div>

        <div className="lck-form-foot lck-form-foot-center mono">
          <a className="lck-btn-primary" href="#renew">Request new link →</a>
        </div>
      </div>
    </LockedShell>
  );
}

// F · Magic link
function LockedMagicLink({ album }) {
  return (
    <LockedShell album={album}>
      <div className="lck-card lck-card-magic">
        <div className="lck-magic-ribbon mono">SIGNED · MAYA · 12:14</div>
        <div className="lck-icon-wrap">
          <div className="lck-icon lck-icon-magic">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
        </div>
        <div className="lck-eyebrow mono">SIGNED · {album.id}</div>
        <h1 className="lck-h1">Hi, <em>Maya.</em></h1>
        <p className="lck-sub">Watermarked with your name.</p>

        <div className="lck-magic-meta">
          <div className="lck-meta-row">
            <span className="mono">FOR</span>
            <span>maya@foliotokyo.jp</span>
          </div>
          <div className="lck-meta-row">
            <span className="mono">EXPIRES</span>
            <span>6d · Mar 12</span>
          </div>
          <div className="lck-meta-row">
            <span className="mono">PHOTOS</span>
            <span>{album.photoCount} · watermarked</span>
          </div>
          <div className="lck-meta-row">
            <span className="mono">DOWNLOADS</span>
            <span>off</span>
          </div>
        </div>

        <div className="lck-form-foot lck-form-foot-center mono">
          <a className="lck-btn-primary" href="#enter">Open · {album.photoCount} photos →</a>
        </div>

        <div className="lck-magic-foot mono">
          Every open is logged.
        </div>
      </div>
    </LockedShell>
  );
}

Object.assign(window, {
  LockedClean, LockedWrong, LockedUnlocking,
  LockedRequestAccess, LockedExpired, LockedMagicLink,
});
