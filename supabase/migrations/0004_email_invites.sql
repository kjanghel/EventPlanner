-- 0004_email_invites.sql
-- Switch event sharing from phone-based to email-based invites.
--   - rename event_invites.invited_phone -> invited_email
--   - replace link trigger: fires on auth.users instead of profiles, matches by email
--   - add a co-member profile select policy so the Members UI can render names

-- =========================================================================
-- 1) event_invites: invited_phone -> invited_email
-- =========================================================================

alter table public.event_invites
  rename column invited_phone to invited_email;

drop index if exists event_invites_phone_idx;

create index event_invites_email_idx
  on public.event_invites(lower(invited_email))
  where status = 'pending' and deleted_at is null;

-- =========================================================================
-- 2) Replace link trigger: fire on auth.users insert/update, match by email
-- =========================================================================

drop trigger if exists trg_link_invites_for_profile on public.profiles;
drop function if exists public.link_invites_for_profile() cascade;

create or replace function public.link_invites_for_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_record record;
begin
  if new.email is null then
    return new;
  end if;

  if (tg_op = 'UPDATE')
     and old.email is not null
     and lower(old.email) = lower(new.email) then
    return new;
  end if;

  for invite_record in
    select id, event_id
    from public.event_invites
    where lower(invited_email) = lower(new.email)
      and status = 'pending'
      and deleted_at is null
  loop
    insert into public.event_members (event_id, user_id, role)
    values (invite_record.event_id, new.id, 'editor')
    on conflict (event_id, user_id) do nothing;

    update public.event_invites
       set status = 'accepted'
     where id = invite_record.id;
  end loop;

  return new;
end;
$$;

create trigger trg_link_invites_for_user
after insert or update of email on auth.users
for each row execute function public.link_invites_for_user();

-- =========================================================================
-- 3) Profiles: allow co-members to see each other (display name) so the
--    Members screen can render names instead of user IDs.
-- =========================================================================

drop policy if exists "profiles_select_for_co_members" on public.profiles;

create policy "profiles_select_for_co_members"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.event_members me
    join public.event_members other
      on other.event_id = me.event_id
    where me.user_id = auth.uid()
      and other.user_id = profiles.id
      and me.deleted_at is null
      and other.deleted_at is null
  )
);
