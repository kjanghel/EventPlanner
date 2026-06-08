-- 0017_push_subscriptions.sql
-- Web Push subscriptions for the daily 'don't forget to log spends' reminder.
-- Each row is one (user, browser/device) pair — a user can be subscribed on
-- their phone PWA AND a laptop browser; both rows get notified.
--
-- The Edge Function send-daily-reminders reads these rows hourly and uses
-- the web-push protocol + a VAPID keypair to deliver notifications.

create table public.push_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  endpoint       text not null,
  p256dh         text not null,
  auth           text not null,
  user_agent     text,
  locale         text default 'en',
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create index push_subs_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Users manage only their own subscriptions. The Edge Function reads via
-- service_role (bypasses RLS) so it can fan out to all subscribers.
create policy "push_subs_select_own" on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy "push_subs_insert_own" on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "push_subs_delete_own" on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

create policy "push_subs_update_own" on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
