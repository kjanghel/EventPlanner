-- 0020_pending_invite_rpcs.sql
-- Consent layer for existing users receiving event invites.
--
-- The original 0004 trigger (link_invites_for_user) fires on auth.users
-- INSERT or email UPDATE — meaning new signups via OTP get linked
-- automatically. Good for that case; explicit click on the magic link IS
-- the consent.
--
-- But existing users who get invited just receive a magic-link sign-in
-- that triggers neither event. They land in the app, no event_member row
-- ever appears, the invite stays 'pending' forever.
--
-- This migration adds three RPCs the client calls to LIST/ACCEPT/DECLINE
-- pending invites for the signed-in user. All three are SECURITY DEFINER
-- with a server-side email check, so a client can't accept an invite
-- meant for someone else by guessing the UUID.

create or replace function public.list_my_pending_invites()
returns table(
  invite_id     uuid,
  event_id      uuid,
  event_name    text,
  invited_email text,
  invited_by    uuid,
  inviter_name  text,
  inviter_email text,
  created_at    timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  my_email text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then
    return;
  end if;

  return query
    select
      ei.id,
      ei.event_id,
      e.name,
      ei.invited_email,
      ei.invited_by,
      p.display_name,
      inviter.email,
      ei.created_at
    from public.event_invites ei
    left join public.events    e       on e.id = ei.event_id and e.deleted_at is null
    left join public.profiles  p       on p.id = ei.invited_by
    left join auth.users       inviter on inviter.id = ei.invited_by
    where lower(ei.invited_email) = lower(my_email)
      and ei.status = 'pending'
      and ei.deleted_at is null
      and e.id is not null;          -- skip invites whose event was deleted
end;
$$;

grant execute on function public.list_my_pending_invites() to authenticated;

create or replace function public.accept_pending_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_record record;
  my_email      text;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then
    raise exception 'not authenticated';
  end if;

  select * into invite_record
  from public.event_invites
  where id = invite_id
    and lower(invited_email) = lower(my_email)
    and status = 'pending'
    and deleted_at is null;

  if not found then
    raise exception 'invite not found or not for this user';
  end if;

  insert into public.event_members (event_id, user_id, role)
  values (invite_record.event_id, auth.uid(), 'editor')
  on conflict (event_id, user_id) do nothing;

  update public.event_invites
     set status = 'accepted'
   where id = invite_id;
end;
$$;

grant execute on function public.accept_pending_invite(uuid) to authenticated;

create or replace function public.decline_pending_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  my_email text;
  affected int;
begin
  select email into my_email from auth.users where id = auth.uid();
  if my_email is null then
    raise exception 'not authenticated';
  end if;

  update public.event_invites
     set status = 'cancelled',
         deleted_at = now()
   where id = invite_id
     and lower(invited_email) = lower(my_email)
     and status = 'pending'
     and deleted_at is null;

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'invite not found or not for this user';
  end if;
end;
$$;

grant execute on function public.decline_pending_invite(uuid) to authenticated;
