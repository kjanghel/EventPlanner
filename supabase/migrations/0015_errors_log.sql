-- 0015_errors_log.sql
-- Client-side error capture. Authenticated users insert; nobody selects from
-- the client. The Supabase dashboard is the read surface for debugging real
-- user failures (transaction save errors etc.).

create table public.errors_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  event_id    uuid references public.events(id) on delete set null,
  context     text not null,
  message     text not null,
  stack       text,
  metadata    jsonb,
  user_agent  text,
  app_version text,
  created_at  timestamptz not null default now()
);

create index errors_log_created_idx on public.errors_log(created_at desc);
create index errors_log_user_idx on public.errors_log(user_id, created_at desc);
create index errors_log_context_idx on public.errors_log(context);

alter table public.errors_log enable row level security;

-- Anyone authenticated can write an error report. We deliberately do NOT
-- grant select to the client; reads happen only via the Supabase dashboard
-- or service-role queries.
create policy "errors_log_insert_for_authenticated" on public.errors_log
  for insert to authenticated
  with check (
    user_id is null
    or user_id = auth.uid()
  );
