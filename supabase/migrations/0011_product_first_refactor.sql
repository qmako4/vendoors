-- Refactor: categories live in their own table, products (still stored in
-- the `albums` table for backwards compat) are flat and assigned to many
-- categories via the `product_categories` join.
--
-- ⚠ This migration MOVES rows out of `albums`. Specifically: any album with
-- photo_count = 0 becomes a category and is deleted from `albums`.

-- 1) New tables
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  parent_id uuid references categories(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (vendor_id, slug)
);
create index if not exists categories_vendor_idx on categories (vendor_id);
create index if not exists categories_parent_idx on categories (parent_id);

create table if not exists product_categories (
  album_id uuid not null references albums(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  sort_order int not null default 0,
  primary key (album_id, category_id)
);
create index if not exists product_categories_category_idx on product_categories (category_id);

-- 2) Migrate every container album (no photos) into the categories table.
--    Reuse the same id so any incoming foreign key from a child album still
--    resolves correctly.
insert into categories (id, vendor_id, name, slug, parent_id, created_at)
select id, vendor_id, title, slug, parent_id, created_at
from albums
where photo_count = 0
on conflict (id) do nothing;

-- Some categories might point at parents that themselves had photos
-- (treated as products). Null those out so we don't reference a non-existent
-- category row.
update categories c
set parent_id = null
where parent_id is not null
  and not exists (select 1 from categories p where p.id = c.parent_id);

-- 3) Link each product to whichever category was its previous parent_id.
insert into product_categories (album_id, category_id)
select a.id, a.parent_id
from albums a
where a.photo_count > 0
  and a.parent_id is not null
  and exists (select 1 from categories c where c.id = a.parent_id)
on conflict do nothing;

-- 4) Drop the migrated container albums.
delete from albums where photo_count = 0;

-- 5) RLS
alter table categories enable row level security;
drop policy if exists "anyone reads categories" on categories;
create policy "anyone reads categories" on categories for select using (true);
drop policy if exists "vendor writes own categories" on categories;
create policy "vendor writes own categories" on categories for all
  using (vendor_id = auth.uid()) with check (vendor_id = auth.uid());

alter table product_categories enable row level security;
drop policy if exists "anyone reads pc" on product_categories;
create policy "anyone reads pc" on product_categories for select using (true);
drop policy if exists "vendor writes pc" on product_categories;
create policy "vendor writes pc" on product_categories for all
  using (
    exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
  )
  with check (
    exists (select 1 from albums a where a.id = album_id and a.vendor_id = auth.uid())
  );
