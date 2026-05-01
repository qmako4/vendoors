-- External links per album (e.g., buy link, reference link, related social post).
-- Stored as JSON array: [{"label": "Buy on Taobao", "url": "https://..."}, ...]
alter table albums add column if not exists links jsonb not null default '[]'::jsonb;
