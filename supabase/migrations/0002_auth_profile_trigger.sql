-- Auto-create a profiles row when a new auth.users row is inserted.
-- Reads handle / display_name from raw_user_meta_data passed in supabase.auth.signUp(options.data).
-- Falls back to email-prefix when not provided.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.profiles (id, handle, display_name, contact_email)
  values (new.id, v_handle, v_display, new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
