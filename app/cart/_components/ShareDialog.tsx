'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { buildContacts } from '@/lib/contacts';

type VendorContacts = {
  display_name: string;
  contact_whatsapp: string | null;
  contact_telegram: string | null;
  contact_instagram: string | null;
  contact_email: string | null;
  contact_wechat: string | null;
};

export function ShareDialog({
  shareUrl,
  vendorHandle,
  onClose,
}: {
  shareUrl: string;
  vendorHandle: string;
  onClose: () => void;
}) {
  const [vendor, setVendor] = useState<VendorContacts | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select(
          'display_name, contact_whatsapp, contact_telegram, contact_instagram, contact_email, contact_wechat',
        )
        .eq('handle', vendorHandle)
        .maybeSingle();
      if (data) setVendor(data as VendorContacts);
    })();
  }, [vendorHandle]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const message = `Hi ${
    vendor?.display_name ?? ''
  }, I'd like to inquire about these items: ${shareUrl}`.trim();

  const links = vendor && {
    whatsapp: vendor.contact_whatsapp
      ? `https://wa.me/${vendor.contact_whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`
      : null,
    telegram: vendor.contact_telegram
      ? buildTelegramShareUrl(vendor.contact_telegram, message)
      : null,
    email: vendor.contact_email
      ? `mailto:${vendor.contact_email}?subject=${encodeURIComponent('Inquiry')}&body=${encodeURIComponent(message)}`
      : null,
    instagram: vendor.contact_instagram
      ? buildInstagramHref(vendor.contact_instagram)
      : null,
  };

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div
        className="picker-dialog share-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="picker-head">
          <div className="mono">SHARE INQUIRY</div>
          <button
            type="button"
            className="picker-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="share-body">
          <p className="share-lead">
            Send this link to {vendor?.display_name ?? 'the vendor'} via the
            channel they use.
          </p>

          <div className="share-url-row">
            <code className="share-url mono">{shareUrl}</code>
            <button
              type="button"
              className="btn-ghost share-copy"
              onClick={copyLink}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>

          {!vendor && (
            <div className="mono share-loading">Loading vendor contacts…</div>
          )}

          {vendor && links && (
            <div className="share-channels">
              {links.whatsapp && (
                <a
                  href={links.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn share-wa"
                >
                  <span aria-hidden>◈</span>
                  Send via WhatsApp
                </a>
              )}
              {links.telegram && (
                <a
                  href={links.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn share-tg"
                >
                  <span aria-hidden>◉</span>
                  Send via Telegram
                </a>
              )}
              {links.email && (
                <a href={links.email} className="share-btn share-em">
                  <span aria-hidden>◎</span>
                  Send via Email
                </a>
              )}
              {links.instagram && (
                <a
                  href={links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-btn share-ig"
                >
                  <span aria-hidden>◐</span>
                  Open Instagram (paste link)
                </a>
              )}
              {vendor.contact_wechat && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(vendor.contact_wechat ?? '');
                    alert(`Copied WeChat ID: ${vendor.contact_wechat}`);
                  }}
                  className="share-btn share-wc"
                >
                  <span aria-hidden>◇</span>
                  Copy WeChat ID
                </button>
              )}
              {!links.whatsapp &&
                !links.telegram &&
                !links.email &&
                !links.instagram &&
                !vendor.contact_wechat && (
                  <div className="mono share-loading">
                    This vendor hasn&apos;t set up contact channels yet. Use Copy
                    link above and send it however you reach them.
                  </div>
                )}
            </div>
          )}

          <div className="share-foot">
            <Link
              href={shareUrl}
              target="_blank"
              className="dash-link mono"
            >
              preview the inquiry page ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildTelegramShareUrl(telegramRaw: string, text: string): string {
  // Telegram's share helper: https://t.me/share/url?url=...&text=...
  // We embed the inquiry URL via the text so the vendor sees a single message.
  return `https://t.me/share/url?url=${encodeURIComponent(text)}`;
}

function buildInstagramHref(handle: string): string {
  if (/^https?:\/\//i.test(handle)) return handle;
  const u = handle.replace(/^@/, '').trim();
  return `https://instagram.com/${u}`;
}
