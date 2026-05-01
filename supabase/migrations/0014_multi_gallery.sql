-- Multi-gallery support: each auth user can own MANY profiles (galleries).
-- Backfill: every existing profile becomes self-owned.

alter table profiles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
update profiles set owner_id = id where owner_id is null;
alter table profiles alter column owner_id set not null;
create index if not exists profiles_owner_idx on profiles (owner_id);

-- profiles.id used to FK auth.users.id (1:1). Drop that constraint so new
-- galleries can be created with their own random uuid.
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles alter column id set default gen_random_uuid();

-- Replace profile RLS with owner-based access (anyone can still read).
drop policy if exists "own profile insert" on profiles;
drop policy if exists "own profile update" on profiles;
drop policy if exists "owner inserts gallery" on profiles;
drop policy if exists "owner updates gallery" on profiles;
drop policy if exists "owner deletes gallery" on profiles;

create policy "owner inserts gallery"
  on profiles for insert with check (owner_id = auth.uid());
create policy "owner updates gallery"
  on profiles for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner deletes gallery"
  on profiles for delete using (owner_id = auth.uid());

-- Auto-create-on-signup: still creates first profile with id = owner_id = auth.users.id
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_handle text;
  v_display text;
begin
  v_handle := coalesce(
    new.raw_user_meta_data->>'handle',
    split_part(new.email, '@', 1)
  );
  v_display := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'handle',
    split_part(new.email, '@', 1)
  );
  insert into public.profiles (id, owner_id, handle, display_name, contact_email)
  values (new.id, new.id, v_handle, v_display, new.email);
  return new;
end;
$$;

-- Update RLS on dependent tables: ownership now flows through profiles.owner_id.
drop policy if exists "own albums" on albums;
create policy "owner manages albums" on albums for all
  using (exists (select 1 from profiles where id = vendor_id and owner_id = auth.uid()))
  with check (exists (select 1 from profiles where id = vendor_id and owner_id = auth.uid()));

drop policy if exists "own photos" on photos;
create policy "owner manages photos" on photos for all
  using (
    exists (
      select 1 from albums a
      join profiles p on p.id = a.vendor_id
      where a.id = album_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "vendor reads inquiries" on inquiries;
create policy "owner reads inquiries" on inquiries for select
  using (
    exists (
      select 1 from albums a
      join profiles p on p.id = a.vendor_id
      where a.id = album_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "vendor manages access" on access_grants;
create policy "owner manages access" on access_grants for all
  using (
    exists (
      select 1 from albums a
      join profiles p on p.id = a.vendor_id
      where a.id = album_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "vendor writes own categories" on categories;
create policy "owner writes categories" on categories for all
  using (exists (select 1 from profiles where id = vendor_id and owner_id = auth.uid()))
  with check (exists (select 1 from profiles where id = vendor_id and owner_id = auth.uid()));

drop policy if exists "vendor writes pc" on product_categories;
create policy "owner writes pc" on product_categories for all
  using (
    exists (
      select 1 from albums a
      join profiles p on p.id = a.vendor_id
      where a.id = album_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from albums a
      join profiles p on p.id = a.vendor_id
      where a.id = album_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "vendor reads own media" on media;
drop policy if exists "vendor inserts own media" on media;
drop policy if exists "vendor updates own media" on media;
drop policy if exists "vendor deletes own media" on media;
create policy "owner manages media" on media for all
  using (exists (select 1 from profiles where id = vendor_id and owner_id = auth.uid()))
  with check (exists (select 1 from profiles where id = vendor_id and owner_id = auth.uid()));

-- Storage RLS: first folder of the path must be a profile owned by auth.uid().
drop policy if exists "vendors upload own photos" on storage.objects;
drop policy if exists "vendors update own photos" on storage.objects;
drop policy if exists "vendors delete own photos" on storage.objects;

create policy "owner uploads photos" on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and exists (
      select 1 from public.profiles
      where id::text = (storage.foldername(name))[1] and owner_id = auth.uid()
    )
  );
create policy "owner updates photos" on storage.objects for update
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.profiles
      where id::text = (storage.foldername(name))[1] and owner_id = auth.uid()
    )
  );
create policy "owner deletes photos" on storage.objects for delete
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.profiles
      where id::text = (storage.foldername(name))[1] and owner_id = auth.uid()
    )
  );
