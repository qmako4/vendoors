-- Cache vision-classifier output on each media row so we don't pay to
-- re-classify the same image every time the vendor runs auto-detect.
--
-- `classification` shape:
--   { category: 'footwear' | 'clothing' | 'accessory' | 'other',
--     title: string,
--     dominant_colors: [{ name: string, hex: string }],
--     descriptors: string[]   -- short tokens used for grouping
--   }
--
-- Set when the image is classified. NULL means "not yet processed".
alter table media add column if not exists classification jsonb;
alter table media add column if not exists processed_at timestamptz;

create index if not exists media_unprocessed_idx
  on media (vendor_id)
  where processed_at is null;
