-- 0018_profile_reminder_prefs.sql
-- Per-user reminder timing. Replaces the previous global 8 pm IST default
-- with a user-configurable hour in their own timezone.
--
-- reminder_hour: 0–23, the local hour at which to send the daily nudge.
-- reminder_tz:   IANA timezone string (e.g. 'Asia/Kolkata', 'America/Los_Angeles').
--                We capture this from the browser when the user enables
--                notifications via Intl.DateTimeFormat().resolvedOptions().timeZone.
--
-- The send-daily-reminders Edge Function fires hourly, computes each user's
-- local hour from these columns, and sends only when local hour matches.

alter table public.profiles
  add column if not exists reminder_hour int not null default 20
    check (reminder_hour between 0 and 23),
  add column if not exists reminder_tz text not null default 'Asia/Kolkata';
