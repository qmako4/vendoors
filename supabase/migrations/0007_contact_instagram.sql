-- Add Instagram as a vendor contact channel.
alter table profiles add column if not exists contact_instagram text;
