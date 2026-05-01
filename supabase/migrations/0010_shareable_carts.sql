-- Shareable cart links: a buyer creates a cart and shares the URL with a vendor.
-- No checkout — this is just an inquiry summary the vendor can act on.
create table carts (
  id uuid primary key default gen_random_uuid(),
  vendor_handle text,
  items jsonb not null default '[]'::jsonb,
  buyer_note text,
  buyer_name text,
  created_at timestamptz default now()
);
create index on carts (created_at desc);

alter table carts enable row level security;

-- The cart UUID acts as the access token. Anyone with the link can read.
create policy "anyone reads carts" on carts for select using (true);

-- Anyone can create a cart (the buyer is anonymous).
create policy "anyone creates carts" on carts for insert with check (true);
