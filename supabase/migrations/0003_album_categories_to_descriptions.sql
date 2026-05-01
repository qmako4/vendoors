-- Albums become collections, not single-product cards.
-- Drop the global "category" field (Outerwear/Knitwear/etc.) since
-- categories will live on photos as per-album sections in a later migration.
-- Add a free-text description for the album page.

alter table albums drop column if exists category;
alter table albums add column if not exists description text;
