export type ContactChannel =
  | 'whatsapp'
  | 'wechat'
  | 'telegram'
  | 'instagram'
  | 'email';

export type Contact = {
  channel: ContactChannel;
  label: string;
  value: string;
  icon: string;
  /** Clickable URL. `null` means "copy-only" (e.g. WeChat). */
  href: string | null;
};

const ICONS: Record<ContactChannel, string> = {
  whatsapp: '◈',
  wechat: '◇',
  telegram: '◉',
  instagram: '◐',
  email: '◎',
};

const LABELS: Record<ContactChannel, string> = {
  whatsapp: 'WhatsApp',
  wechat: 'WeChat',
  telegram: 'Telegram',
  instagram: 'Instagram',
  email: 'Email',
};

function hrefFor(channel: ContactChannel, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  switch (channel) {
    case 'whatsapp': {
      // wa.me wants digits only, no leading +
      const digits = v.replace(/[^\d]/g, '');
      return digits ? `https://wa.me/${digits}` : null;
    }
    case 'telegram': {
      if (/^https?:\/\//i.test(v)) return v;
      const u = v.replace(/^@/, '').trim();
      return u ? `https://t.me/${u}` : null;
    }
    case 'instagram': {
      if (/^https?:\/\//i.test(v)) return v;
      const u = v.replace(/^@/, '').trim();
      return u ? `https://instagram.com/${u}` : null;
    }
    case 'email':
      return `mailto:${v}`;
    case 'wechat':
      return null;
  }
}

export type ContactSource = {
  contact_whatsapp: string | null;
  contact_wechat: string | null;
  contact_telegram: string | null;
  contact_instagram: string | null;
  contact_email: string | null;
};

export function buildContacts(profile: ContactSource): Contact[] {
  const pairs: Array<[ContactChannel, string | null]> = [
    ['whatsapp', profile.contact_whatsapp],
    ['wechat', profile.contact_wechat],
    ['telegram', profile.contact_telegram],
    ['instagram', profile.contact_instagram],
    ['email', profile.contact_email],
  ];
  return pairs
    .filter((p): p is [ContactChannel, string] => Boolean(p[1] && p[1].trim()))
    .map(([channel, value]) => ({
      channel,
      label: LABELS[channel],
      value,
      icon: ICONS[channel],
      href: hrefFor(channel, value),
    }));
}
