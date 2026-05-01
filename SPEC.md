# Vendoors — Build Spec

> A complete spec for building **vendoors.co** — a Yupoo-style photo gallery marketplace where independent vendors host albums and buyers browse + message direct.
>
> This document is optimized for an AI coding agent (Claude Code, Cursor, Aider). Read it top to bottom, then build in the order under "Build order." Reference HTML prototypes in this project as the visual source of truth: `Home.html`, `Vendoors.html`, `Locked Album.html`.

---

## 1. Stack

- **Framework:** Next.js 15 (App Router, TypeScript, Tailwind CSS)
- **Database + Auth:** Supabase (Postgres, Row Level Security, Auth, Storage)
- **File storage:** Cloudflare R2 for originals, Cloudflare Images for resized variants
- **Email:** Resend (signup confirmations, magic links, inquiry notifications)
- **Payments:** Stripe Checkout + Stripe Connect (Express) for paid tiers
- **Anti-spam:** Cloudflare Turnstile on signup + inquiry forms
- **Hosting:** Vercel (frontend) — connect to GitHub for auto-deploy
- **Domain + DNS:** Cloudflare
- **Analytics:** Plausible or Vercel Analytics

---

## 2. Project structure

```
vendoors/
├── app/
│   ├── (marketing)/
│   │   └── page.tsx                 # Home.html landing
│   ├── (app)/
│   │   ├── archive/page.tsx         # Vendoors.html (the archive grid)
│   │   ├── a/[albumId]/page.tsx     # Album detail (public)
│   │   └── locked/[token]/page.tsx  # Locked album buyer view
│   ├── (vendor)/
│   │   ├── dashboard/page.tsx       # Vendor home
│   │   ├── albums/new/page.tsx      # Album upload
│   │   ├── albums/[id]/edit/page.tsx
│   │   ├── inquiries/page.tsx       # Inbox
│   │   └── access/page.tsx          # Magic link / password manager
│   ├── api/
│   │   ├── upload/route.ts          # Signed-URL upload to R2
│   │   ├── inquiries/route.ts
│   │   ├── access/grant/route.ts
│   │   └── stripe/webhook/route.ts
│   └── auth/
│       ├── sign-in/page.tsx
│       └── sign-up/page.tsx
├── components/
│   ├── AlbumCard.tsx
│   ├── ContactPills.tsx
│   ├── Lightbox.tsx
│   ├── StripedPlaceholder.tsx       # Fallback for missing images
│   └── ui/...
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── cloudflare-images.ts
│   ├── stripe.ts
│   └── auth.ts
├── styles/globals.css                # Carry over CSS variables from styles.css
└── supabase/migrations/              # SQL migrations
```

---

## 3. Database schema (Supabase / Postgres)

```sql
-- Users (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  city text,
  plan text not null default 'free' check (plan in ('free','studio','atelier')),
  stripe_customer_id text,
  stripe_subscription_id text,
  contact_whatsapp text,
  contact_wechat text,
  contact_telegram text,
  contact_email text,
  created_at timestamptz default now()
);

create table albums (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references profiles(id) on delete cascade,
  slug text not null,                            -- vd-1042
  title text not null,
  category text not null,
  is_public boolean not null default true,
  password_hash text,                            -- bcrypt; null = no password
  cover_photo_id uuid,
  photo_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (vendor_id, slug)
);
create index on albums (category) where is_public;
create index on albums (vendor_id);

create table photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  storage_key text not null,                     -- R2 object key
  cf_image_id text,                              -- Cloudflare Images id
  width int not null,
  height int not null,
  sort_order int not null default 0,
  caption text,
  created_at timestamptz default now()
);
create index on photos (album_id, sort_order);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  buyer_name text,
  buyer_contact text not null,
  buyer_channel text not null check (buyer_channel in ('whatsapp','wechat','telegram','email')),
  message text,
  status text not null default 'new' check (status in ('new','replied','closed')),
  created_at timestamptz default now()
);
create index on inquiries (album_id, created_at desc);

create table access_grants (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  buyer_email text not null,
  buyer_name text,
  token text unique not null,                    -- random 32-byte hex
  expires_at timestamptz not null,
  opens int not null default 0,
  last_opened_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);
create index on access_grants (token);
create index on access_grants (album_id);
```

### Row Level Security policies (essential)

```sql
alter table profiles enable row level security;
alter table albums enable row level security;
alter table photos enable row level security;
alter table inquiries enable row level security;
alter table access_grants enable row level security;

-- Public can read public profiles and public albums
create policy "public profiles readable" on profiles for select using (true);
create policy "public albums readable"  on albums   for select using (is_public = true);
create policy "photos of public albums readable" on photos for select
  using (exists (select 1 from albums a where a.id = album_id and a.is_public));

-- Vendors manage their own
create policy "own albums"  on albums   for all using (vendor_id = auth.uid());
create policy "own photos"  on photos   for all using (
  exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
);
create policy "own profile" on profiles for update using (id = auth.uid());

-- Inquiries: vendor reads, anyone inserts (rate-limit at API layer)
create policy "vendor reads inquiries" on inquiries for select using (
  exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
);
create policy "anyone inserts inquiry" on inquiries for insert with check (true);

-- Access grants: vendor only
create policy "vendor manages access" on access_grants for all using (
  exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
);
```

---

## 4. Routes — what each page does

| Route | Source prototype | What it does |
|---|---|---|
| `/` | `Home.html` | Marketing landing |
| `/sign-up`, `/sign-in` | auth modal in `Home.html` | Supabase Auth (email + password, magic link) |
| `/archive` | `Vendoors.html` (home view) | Public album grid, sidebar of categories, search |
| `/a/[id]` | `Vendoors.html` (album view) | Public album detail, contact pills, lightbox |
| `/locked/[token]` | `Locked Album.html` (state F) | Magic-link gated album. Token validates → renders album with viewer-name watermark |
| `/locked/[id]` | `Locked Album.html` (states A/B) | Password-gated album |
| `/locked/[id]/request` | state D | Request access form |
| `/dashboard` | new | Vendor home — recent inquiries, album list, plan/upgrade CTA |
| `/dashboard/albums/new` | new | Drag-drop upload → resumable to R2 → register in DB |
| `/dashboard/albums/[id]` | new | Edit album: reorder photos, captions, privacy |
| `/dashboard/inquiries` | new | Inbox of buyer messages, mark replied |
| `/dashboard/access` | new | Manage password + per-buyer magic links per album |
| `/dashboard/billing` | new | Stripe customer portal redirect |

---

## 5. Image pipeline (the part most underestimate)

1. Vendor drops files in upload UI
2. Frontend requests **signed upload URLs** from `/api/upload` — one per file
3. Frontend uploads originals direct to R2 (browser → R2, server doesn't proxy)
4. After each upload, frontend calls `POST /api/photos` with R2 key + dimensions
5. Server registers row in `photos`, then calls Cloudflare Images to import the R2 object → returns `cf_image_id`
6. Display URLs use the Cloudflare Images variant URL: `https://imagedelivery.net/<account>/<cf_image_id>/<variant>`

**Variants to define in Cloudflare Images:**
- `thumb` — 480×600 (4:5 grid card)
- `feed` — 1080×1350 (album detail scroll)
- `light` — 2160px max (lightbox)
- `wm-thumb`, `wm-feed`, `wm-light` — same sizes with watermark overlay (paid tiers)

For per-buyer name watermarking (Atelier tier), generate on the fly in a Cloudflare Worker that draws the buyer's name onto the variant before serving.

---

## 6. Auth flow

- **Vendor signup:** email + password via Supabase Auth → `profiles` row inserted via DB trigger → onboarding wizard (handle, display name, contact channels) → dashboard
- **Vendor sign-in:** Supabase Auth (email/password + magic link)
- **Buyer flow:** no account required. Buyers identified by their `access_grants.token` for private albums, otherwise anonymous.

Use `@supabase/ssr` package for Next.js App Router cookie-based sessions.

---

## 7. Paid tiers (Stripe)

Three Stripe Products → three Prices. Configure in Stripe Dashboard, store Price IDs in env.

| Plan | Stripe Price | What it unlocks (gate in code) |
|---|---|---|
| Free | none | 3 public albums, Vendoors subdomain, Vendoors watermark on photos |
| Studio | `price_studio_monthly` ($12) | Unlimited albums, custom domain, no Vendoors watermark, 5 password-locked albums |
| Atelier | `price_atelier_monthly` ($39) | Everything + magic links, per-buyer watermark, expiring links, multi-seat |

Use Stripe Customer Portal for plan changes / cancellations. Stripe webhook (`/api/stripe/webhook`) updates `profiles.plan` on `customer.subscription.updated`.

Gate every paid feature with a single helper:
```ts
function requirePlan(profile, minPlan: 'studio'|'atelier') { ... }
```

---

## 8. Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=vendoors-photos
CLOUDFLARE_IMAGES_TOKEN=
CLOUDFLARE_IMAGES_HASH=                # for delivery URLs

RESEND_API_KEY=
RESEND_FROM=hello@vendoors.co

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STUDIO=
STRIPE_PRICE_ATELIER=

NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

NEXT_PUBLIC_SITE_URL=https://vendoors.co
```

---

## 9. Build order (do in this sequence)

1. **Scaffold** — `create-next-app`, Tailwind, Supabase client wired up, push to Vercel. Verify deploy works.
2. **Schema** — apply migrations from §3, RLS policies, seed 3 demo profiles + 20 albums + 200 photos. Run locally with `supabase start`.
3. **Public pages** — port `Home.html` to `/`, `Vendoors.html` to `/archive` and `/a/[id]`. Read from Supabase. Use existing CSS as much as possible — copy variables from `styles.css`.
4. **Auth** — `/sign-up`, `/sign-in`, onboarding wizard. Test creating a profile end-to-end.
5. **Vendor dashboard** — `/dashboard`, album list, create-album form (no uploads yet, just metadata).
6. **Image upload** — wire R2 + Cloudflare Images. Get one photo from drag-drop to displayed in archive grid.
7. **Inquiries** — public inquiry form on album page → inbox at `/dashboard/inquiries` → email notification via Resend.
8. **Locked albums** — port `Locked Album.html` states. Implement password gate + magic link flow.
9. **Stripe** — products, checkout, webhook, plan gating.
10. **Polish** — Turnstile, Terms/Privacy pages, 404, loading states, error boundaries.
11. **Launch** — point `vendoors.co` at Vercel, invite first 10 vendors.

---

## 10. Things that will bite you (build with these in mind from day one)

- **Moderation:** Add `flagged_at` column to albums + a `/admin` view (only your own user id) to bulk-suspend. Build before launch, not after first abuse report.
- **DMCA:** Page at `/legal/dmca` with email + 24-hour takedown SLA. Required for safe-harbor protection.
- **Rate limits:** Inquiry endpoint = 3/min/IP. Signup = 5/hour/IP. Upload = 100/hour/user. Use Vercel Edge Config or Upstash.
- **Image hot-linking:** Cloudflare Images supports signed URLs that expire — use them for paid-tier private photos.
- **Bandwidth:** R2 has zero egress fees, but Cloudflare Images bills per delivery. Cache aggressively (`cache-control: public, max-age=31536000, immutable`).
- **Backups:** Turn on Supabase daily backups (paid tier — $25/mo, do it).

---

## 11. First-day checklist before public launch

- [ ] Domain points at Vercel, HTTPS works
- [ ] `robots.txt` + `sitemap.xml`
- [ ] OpenGraph image + meta tags on every page
- [ ] Plausible / Vercel Analytics installed
- [ ] Terms, Privacy, DMCA, Cookie banner (if EU)
- [ ] Resend domain verified, test email delivers
- [ ] Stripe live keys swapped in, test checkout completes
- [ ] One real vendor account created with one real album as smoke test
- [ ] Status page (`status.vendoors.co` via BetterStack) — optional but professional

---

## Reference: prototypes in this project

- `Home.html` — landing page with hero, mosaic, how it works, FAQ, auth modal
- `Vendoors.html` — archive grid + album detail + lightbox
- `Locked Album.html` — six states for private/expired/magic-link albums
- `styles.css` — color tokens, type scale, density modifiers (carry CSS vars into `globals.css`)
- `data.jsx` — the shape of `ALBUMS` and `CATEGORIES` mirrors the Postgres schema

These prototypes are the visual + interaction source of truth. Match them pixel-for-pixel in the React port.
