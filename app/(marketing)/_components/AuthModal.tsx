'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export type AuthMode = 'signin' | 'signup';
type Phase = 'form' | 'loading' | 'success';

type Props = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
};

export function AuthModal({ open, mode, onClose }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthMode>(mode);
  const [phase, setPhase] = useState<Phase>('form');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(mode);
      setPhase('form');
      setErr(null);
      setNeedsEmailConfirm(false);
    }
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPhase('loading');
    setErr(null);
    const supabase = createClient();

    if (tab === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      if (error) {
        setErr(error.message);
        setPhase('form');
        return;
      }
      setPhase('success');
      router.refresh();
      setTimeout(() => router.push('/dashboard'), 400);
      return;
    }

    // signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { handle, display_name: handle } },
    });
    if (error) {
      setErr(error.message);
      setPhase('form');
      return;
    }
    // If email confirmation is enabled (default), session will be null.
    setNeedsEmailConfirm(!data.session);
    setPhase('success');
    if (data.session) {
      router.refresh();
      setTimeout(() => router.push('/dashboard'), 800);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {phase !== 'success' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setTab('signin');
                setErr(null);
              }}
            >
              Sign in
            </button>
            <button
              className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setTab('signup');
                setErr(null);
              }}
            >
              Create gallery
            </button>
          </div>
        )}

        {phase === 'form' && tab === 'signin' && (
          <form className="auth-form" onSubmit={submit}>
            <div className="auth-eyebrow mono">WELCOME BACK</div>
            <h3 className="auth-h">Sign in to your gallery.</h3>
            <label className="auth-field">
              <span className="mono">EMAIL</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
              />
            </label>
            <label className="auth-field">
              <span className="mono">PASSWORD</span>
              <input
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {err && <div className="auth-err mono">{err}</div>}
            <button type="submit" className="btn-primary btn-lg auth-submit">
              Sign in →
            </button>
            <div className="auth-foot mono">
              No account?{' '}
              <a onClick={() => setTab('signup')}>Create one →</a>
            </div>
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
                <input
                  type="text"
                  required
                  minLength={2}
                  value={handle}
                  onChange={(e) =>
                    setHandle(e.target.value.replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="your-studio"
                />
              </div>
            </label>
            <label className="auth-field">
              <span className="mono">EMAIL</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
              />
            </label>
            <label className="auth-field">
              <span className="mono">PASSWORD</span>
              <input
                type="password"
                required
                minLength={8}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
            {err && <div className="auth-err mono">{err}</div>}
            <button type="submit" className="btn-primary btn-lg auth-submit">
              Create gallery →
            </button>
            <div className="auth-foot mono">
              By signing up you agree to the <a>Terms</a>.
            </div>
          </form>
        )}

        {phase === 'loading' && (
          <div className="auth-loading">
            <div className="auth-spin" />
            <div className="mono">
              {tab === 'signin' ? 'Signing you in…' : 'Reserving your handle…'}
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="auth-success">
            <div className="auth-check">✓</div>
            <div className="auth-eyebrow mono">
              {tab === 'signin'
                ? 'WELCOME BACK'
                : needsEmailConfirm
                  ? 'CHECK YOUR EMAIL'
                  : 'GALLERY CREATED'}
            </div>
            <h3 className="auth-h">
              {tab === 'signin' ? (
                <>
                  You&apos;re <em>in.</em>
                </>
              ) : needsEmailConfirm ? (
                <>
                  Confirm your <em>email.</em>
                </>
              ) : (
                <>
                  Welcome to <em>Vendoors.</em>
                </>
              )}
            </h3>
            <p className="auth-success-sub">
              {tab === 'signin' ? (
                'Heading you to your dashboard…'
              ) : needsEmailConfirm ? (
                <>
                  We sent a confirmation link to{' '}
                  <span className="mono">{email}</span>. Click it to activate
                  your gallery.
                </>
              ) : (
                <>
                  Your gallery handle is reserved at{' '}
                  <span className="mono">
                    vendoors.co/{handle || 'your-studio'}
                  </span>
                  . Heading you to your dashboard…
                </>
              )}
            </p>
            {needsEmailConfirm && (
              <div className="auth-success-ctas">
                <button className="btn-ghost" onClick={onClose}>
                  Close
                </button>
              </div>
            )}
            {tab === 'signin' && (
              <div className="auth-success-ctas">
                <Link className="btn-primary" href="/dashboard">
                  Go to dashboard →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
