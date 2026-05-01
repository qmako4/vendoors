-- Vendoors initial schema
-- Source of truth: SPEC.md sections 3 (schema) and 3 (RLS policies).
-- Apply once, then regenerate types: npx supabase gen types typescript --linked > lib/supabase/types.ts

-- ─────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────

-- Vendor profiles (extends auth.users)
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

-- Albums (a vendor's photo collection, e.g. vd-1042)
create table albums (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references profiles(id) on delete cascade,
  slug text not null,
  title text not null,
  category text not null,
  is_public boolean not null default true,
  password_hash text,
  cover_photo_id uuid,
  photo_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (vendor_id, slug)
);
create index on albums (category) where is_public;
create index on albums (vendor_id);

-- Photos within an album
create table photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  storage_key text not null,
  cf_image_id text,
  width int not null,
  height int not null,
  sort_order int not null default 0,
  caption text,
  created_at timestamptz default now()
);
create index on photos (album_id, sort_order);

-- Buyer inquiries (sent direct to vendor)
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

-- Magic-link access grants for private albums
create table access_grants (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  buyer_email text not null,
  buyer_name text,
  token text unique not null,
  expires_at timestamptz not null,
  opens int not null default 0,
  last_opened_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);
create index on access_grants (token);
create index on access_grants (album_id);

-- ─────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────

alter table profiles      enable row level security;
alter table albums        enable row level security;
alter table photos        enable row level security;
alter table inquiries     enable row level security;
alter table access_grants enable row level security;

-- Public reads
create policy "public profiles readable"
  on profiles for select using (true);

create policy "public albums readable"
  on albums for select using (is_public = true);

create policy "photos of public albums readable"
  on photos for select using (
    exists (select 1 from albums a where a.id = album_id and a.is_public)
  );

-- Vendors manage their own
create policy "own albums"
  on albums for all using (vendor_id = auth.uid());

create policy "own photos"
  on photos for all using (
    exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
  );

create policy "own profile update"
  on profiles for update using (id = auth.uid());

create policy "own profile insert"
  on profiles for insert with check (id = auth.uid());

-- Inquiries: vendor reads, anyone can insert
create policy "vendor reads inquiries"
  on inquiries for select using (
    exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
  );

create policy "anyone inserts inquiry"
  on inquiries for insert with check (true);

-- Access grants: vendor only
create policy "vendor manages access"
  on access_grants for all using (
    exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────────────

-- Keep albums.updated_at fresh
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger albums_set_updated_at
  before update on albums
  for each row execute function set_updated_at();
