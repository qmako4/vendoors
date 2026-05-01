'use client';

import { useState } from 'react';
import type { Contact } from '@/lib/contacts';

export function ContactPills({ contacts }: { contacts: Contact[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (contacts.length === 0) return null;

  function copy(c: Contact) {
    navigator.clipboard?.writeText(c.value);
    setCopied(c.label);
    setTimeout(() => setCopied(null), 1400);
  }

  return (
    <>
      {contacts.map((c) => {
        const inner = (
          <>
            <span className="pill-icon" aria-hidden>
              {c.icon}
            </span>
            <span className="pill-label">{c.label}</span>
            <span className="pill-value mono">
              {copied === c.label ? 'copied ✓' : c.value}
            </span>
          </>
        );

        if (c.href) {
          return (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="pill"
            >
              {inner}
            </a>
          );
        }

        // No public URL (WeChat) — fall back to click-to-copy.
        return (
          <button
            key={c.label}
            type="button"
            className={`pill ${copied === c.label ? 'pill-copied' : ''}`}
            onClick={() => copy(c)}
          >
            {inner}
          </button>
        );
      })}
    </>
  );
}
