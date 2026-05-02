-- Track which media items are derived from another (e.g., a clean
-- background-removed copy of an original). Lets the library hide
-- originals that have already been processed so the view stays tidy.
alter table media add column if not exists derived_from_media_id uuid
  references media(id) on delete set null;
create index if not exists media_derived_from_idx on media (derived_from_media_id);
