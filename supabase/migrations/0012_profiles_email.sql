-- 0012_profiles_email.sql
-- Surface auth.users.email on the public.profiles row so the Members UI
-- can show a usable identifier when a user has no display_name yet
-- (avoids the "Unnamed" / no contact info problem).

alter table public.profiles add column if not exists email text;

-- Backfill from auth.users for existing rows.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email is distinct from u.email);

-- Keep handle_new_user populating it on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Sync email into profile whenever auth.users.email changes.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email
after update of email on auth.users
for each row execute function public.sync_profile_email();
