// Auth modal — sign in / create vendor gallery, with fake success state
const { useState: useAS, useEffect: useAE, useRef: useAR } = React;

function AuthModal({ open, mode, onClose, onSuccess }) {
  const [tab, setTab] = useAS(mode || 'signup'); // 'signin' | 'signup'
  const [phase, setPhase] = useAS('form'); // 'form' | 'loading' | 'success'
  const [handle, setHandle] = useAS('');
  const [email, setEmail] = useAS('');
  const [pw, setPw] = useAS('');

  useAE(() => { if (open) { setTab(mode || 'signup'); setPhase('form'); } }, [open, mode]);

  useAE(() => {
    function onKey(e) { if (e.key === 'Escape' && open) onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    setPhase('loading');
    setTimeout(() => setPhase('success'), 900);
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>

        {phase !== 'success' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign in</button>
            <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Create gallery</button>
          </div>
        )}

        {phase === 'form' && tab === 'signin' && (
          <form className="auth-form" onSubmit={submit}>
            <div className="auth-eyebrow mono">WELCOME BACK</div>
            <h3 className="auth-h">Sign in to your gallery.</h3>
            <label className="auth-field">
              <span className="mono">EMAIL</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
            </label>
            <label className="auth-field">
              <span className="mono">PASSWORD</span>
              <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
            </label>
            <button type="submit" className="btn-primary btn-lg auth-submit">Sign in →</button>
            <div className="auth-foot mono">No account? <a onClick={() => setTab('signup')}>Create one →</a></div>
          </form>
        )}

        {phase === 'form' && tab === 'signup' && (
          <form className="auth-form" onSubmit={submit}>
            <div className="auth-eyebrow mono">CLAIM YOUR HANDLE</div>
            <h3 className="auth-h">Create your gallery.</h3>
            <label className="auth-field">
              <span className="mono">YOUR URL</span>
              <div className="auth-handle">
                <span className="auth-handle-prefix mono">vendoors.co /</span>
                <input type="text" required value={handle} onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9-]/g, ''))} placeholder="your-studio" />
              </div>
            </label>
            <label className="auth-field">
              <span className="mono">EMAIL</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
            </label>
            <label className="auth-field">
              <span className="mono">PASSWORD</span>
              <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
            </label>
            <button type="submit" className="btn-primary btn-lg auth-submit">Create gallery →</button>
            <div className="auth-foot mono">By signing up you agree to the <a>Terms</a>.</div>
          </form>
        )}

        {phase === 'loading' && (
          <div className="auth-loading">
            <div className="auth-spin" />
            <div className="mono">{tab === 'signin' ? 'Signing you in…' : 'Reserving your handle…'}</div>
          </div>
        )}

        {phase === 'success' && (
          <div className="auth-success">
            <div className="auth-check">✓</div>
            <div className="auth-eyebrow mono">{tab === 'signin' ? 'WELCOME BACK' : 'GALLERY CREATED'}</div>
            <h3 className="auth-h">
              {tab === 'signin'
                ? <>You're <em>in.</em></>
                : <>Welcome to <em>Vendoors.</em></>}
            </h3>
            <p className="auth-success-sub">
              {tab === 'signin'
                ? 'Heading you to the archive — your dashboard link is in the menu.'
                : <>Your gallery is live at <span className="mono">vendoors.co/{handle || 'your-studio'}</span>. Browse the archive to see what good ones look like.</>}
            </p>
            <div className="auth-success-ctas">
              <a className="btn-primary btn-lg" href="Vendoors.html">Enter the archive →</a>
              <button className="btn-ghost" onClick={onClose}>Stay here</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.AuthModal = AuthModal;
