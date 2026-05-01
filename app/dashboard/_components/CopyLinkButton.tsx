'use client';

import { useState } from 'react';

export function CopyLinkButton({ url, label = 'copy link' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const full = url.startsWith('http')
      ? url
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`;
    navigator.clipboard?.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button type="button" onClick={copy} className="dash-link mono">
      {copied ? 'copied ✓' : label}
    </button>
  );
}
