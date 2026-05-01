-- Media library: per-vendor pool of uploaded images that can be reused
-- across multiple products. Photos in the `photos` table become assignments
-- of a media item to a particular album.

create table media (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references profiles(id) on delete cascade,
  storage_key text not null,
  width int not null,
  height int not null,
  filename text,
  created_at timestamptz default now()
);
create index on media (vendor_id, created_at desc);

alter table media enable row level security;

create policy "vendor reads own media"
  on media for select using (vendor_id = auth.uid());
create policy "vendor inserts own media"
  on media for insert with check (vendor_id = auth.uid());
create policy "vendor updates own media"
  on media for update using (vendor_id = auth.uid());
create policy "vendor deletes own media"
  on media for delete using (vendor_id = auth.uid());

-- Track which media a photo references. NULL for legacy uploads that
-- predate the library.
alter table photos add column if not exists media_id uuid
  references media(id) on delete cascade;
