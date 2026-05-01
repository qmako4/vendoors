'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Initial = {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  city: string | null;
  contact_whatsapp: string | null;
  contact_wechat: string | null;
  contact_telegram: string | null;
  contact_instagram: string | null;
  contact_email: string | null;
  watermark_enabled: boolean;
  watermark_text: string | null;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [whatsapp, setWhatsapp] = useState(initial.contact_whatsapp ?? '');
  const [wechat, setWechat] = useState(initial.contact_wechat ?? '');
  const [telegram, setTelegram] = useState(initial.contact_telegram ?? '');
  const [instagram, setInstagram] = useState(initial.contact_instagram ?? '');
  const [email, setEmail] = useState(initial.contact_email ?? '');
  const [watermarkEnabled, setWatermarkEnabled] = useState(
    initial.watermark_enabled,
  );
  const [watermarkText, setWatermarkText] = useState(
    initial.watermark_text ?? '',
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setSaved(false);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || initial.handle,
        bio: bio.trim() || null,
        city: city.trim() || null,
        contact_whatsapp: whatsapp.trim() || null,
        contact_wechat: wechat.trim() || null,
        contact_telegram: telegram.trim() || null,
        contact_instagram: instagram.trim() || null,
        contact_email: email.trim() || null,
        watermark_enabled: watermarkEnabled,
        watermark_text: watermarkText.trim() || null,
      })
      .eq('id', initial.id);

    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    router.refresh();
  }

  return (
    <form className="dash-form" onSubmit={save}>
      <h2 className="dash-h2 dash-form-section">About</h2>

      <label className="dash-field">
        <span className="mono">DISPLAY NAME</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your studio name"
        />
        <span className="dash-field-hint mono">
          Shown on your gallery page. Different from your handle (URL).
        </span>
      </label>

      <label className="dash-field">
        <span className="mono">HANDLE (URL)</span>
        <div className="dash-slug">
          <span className="dash-slug-prefix mono">vendoors.co /</span>
          <input
            type="text"
            value={initial.handle}
            disabled
            readOnly
          />
        </div>
        <span className="dash-field-hint mono">
          Handles can&apos;t be changed yet — message support if you need to.
        </span>
      </label>

      <label className="dash-field">
        <span className="mono">BIO (OPTIONAL)</span>
        <textarea
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="One or two sentences. What you make, where you ship from."
          maxLength={400}
        />
      </label>

      <label className="dash-field">
        <span className="mono">CITY (OPTIONAL)</span>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Tokyo"
        />
      </label>

      <h2 className="dash-h2 dash-form-section">Contact channels</h2>
      <p className="dash-section-hint mono">
        Buyers see these as buttons on your gallery and can copy your contact
        with one click. Leave any blank to hide it.
      </p>

      <label className="dash-field">
        <span className="mono">WHATSAPP</span>
        <input
          type="text"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+44 7488 813811"
        />
      </label>

      <label className="dash-field">
        <span className="mono">WECHAT</span>
        <input
          type="text"
          value={wechat}
          onChange={(e) => setWechat(e.target.value)}
          placeholder="your_wechat_id"
        />
      </label>

      <label className="dash-field">
        <span className="mono">TELEGRAM</span>
        <input
          type="text"
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="@your_username  or  https://t.me/your_username"
        />
      </label>

      <label className="dash-field">
        <span className="mono">INSTAGRAM</span>
        <input
          type="text"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@your_handle  or  https://instagram.com/your_handle"
        />
      </label>

      <label className="dash-field">
        <span className="mono">EMAIL</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.com"
        />
      </label>

      <h2 className="dash-h2 dash-form-section">Watermark</h2>
      <p className="dash-section-hint mono">
        Burn a faded text watermark onto every photo you upload. Helps deter
        scrapers from reposting your shots.
      </p>

      <label className="dash-checkbox">
        <input
          type="checkbox"
          checked={watermarkEnabled}
          onChange={(e) => setWatermarkEnabled(e.target.checked)}
        />
        <span>
          <span className="dash-check-h">Watermark new uploads</span>
          <span className="dash-check-sub mono">
            Applies to new photos only — existing ones aren&apos;t re-processed
          </span>
        </span>
      </label>

      {watermarkEnabled && (
        <label className="dash-field">
          <span className="mono">WATERMARK TEXT (OPTIONAL)</span>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder={initial.display_name || initial.handle}
            maxLength={40}
          />
          <span className="dash-field-hint mono">
            Leave blank to use your display name. Goes in the bottom-right
            corner of every photo.
          </span>
        </label>
      )}

      {err && <div className="auth-err mono">{err}</div>}

      <div className="dash-form-actions">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary btn-lg"
        >
          {busy ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
