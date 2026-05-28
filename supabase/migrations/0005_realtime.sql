-- 0005_realtime.sql
-- Enable Postgres logical replication broadcasts on the tables that drive
-- the EventHome screens so collaborators see each other's changes live.
-- Realtime delivery still respects RLS (a user only receives rows their
-- policies let them read), so no extra access control is needed here.

alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.scheduled_payments;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.people;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_members;
