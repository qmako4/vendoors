-- Photo storage: Supabase Storage bucket + RLS policies + auto-maintained photo_count
-- After running, vendors can upload to their own folder under photos/{vendor_id}/{album_id}/...
-- Public can read all photos in the bucket.

-- 1) Create the public bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- 2) Storage RLS — anyone can read; vendors can write to their own folder
drop policy if exists "public read photos" on storage.objects;
create policy "public read photos"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "vendors upload own photos" on storage.objects;
create policy "vendors upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vendors update own photos" on storage.objects;
create policy "vendors update own photos"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "vendors delete own photos" on storage.objects;
create policy "vendors delete own photos"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3) Auto-maintain albums.photo_count + bump updated_at on photo changes
create or replace function public.sync_album_photo_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.albums
       set photo_count = photo_count + 1, updated_at = now()
     where id = new.album_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.albums
       set photo_count = greatest(0, photo_count - 1), updated_at = now()
     where id = old.album_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists photos_count_insert on public.photos;
create trigger photos_count_insert
  after insert on public.photos
  for each row execute function public.sync_album_photo_count();

drop trigger if exists photos_count_delete on public.photos;
create trigger photos_count_delete
  after delete on public.photos
  for each row execute function public.sync_album_photo_count();
