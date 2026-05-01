-- Premium features groundwork.
-- Featured/pinned products show first on the vendor's gallery.
alter table albums add column if not exists is_featured boolean not null default false;
create index if not exists albums_featured_idx on albums (vendor_id, is_featured) where is_featured;

-- Watermarking: vendor toggles + optional custom text.
-- When enabled, all uploads get a faded text watermark on the bottom-right.
alter table profiles add column if not exists watermark_enabled boolean not null default false;
alter table profiles add column if not exists watermark_text text;
