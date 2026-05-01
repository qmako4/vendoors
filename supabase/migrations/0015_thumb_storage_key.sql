-- Each upload now stores both a full-size (1600px) and a thumbnail (480px)
-- so grids/pickers don't pay for full-size downloads.
alter table media add column if not exists thumb_storage_key text;
alter table photos add column if not exists thumb_storage_key text;
