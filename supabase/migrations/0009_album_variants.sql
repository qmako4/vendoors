-- Per-product available sizes and colors. Variants are computed as the
-- cross-product (sizes × colors) on display. Stock/price override are
-- deferred until there's a real checkout flow.
alter table albums add column if not exists sizes jsonb not null default '[]'::jsonb;
alter table albums add column if not exists colors jsonb not null default '[]'::jsonb;
