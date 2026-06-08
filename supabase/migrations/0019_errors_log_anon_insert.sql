-- 0019_errors_log_anon_insert.sql
-- Broaden the errors_log insert policy so unauthenticated (anon) callers
-- can write too. We were silently dropping pre-auth errors — timeouts on
-- sign-in, network failures before a session exists, JS errors on the
-- landing page — because RLS only let `authenticated` insert.
--
-- The user_id-check in the policy still ensures anon callers can't
-- impersonate a real user (they must pass user_id = null).

drop policy if exists "errors_log_insert_for_authenticated" on public.errors_log;

create policy "errors_log_insert_for_anyone" on public.errors_log
  for insert to anon, authenticated
  with check (
    user_id is null
    or user_id = auth.uid()
  );
