-- Albums can nest. Top-level albums (parent_id is null) act like categories,
-- child albums act like products. Photos attach to whichever album holds them.
alter table albums add column if not exists parent_id uuid
  references albums(id) on delete cascade;
create index if not exists albums_parent_id_idx on albums(parent_id);
