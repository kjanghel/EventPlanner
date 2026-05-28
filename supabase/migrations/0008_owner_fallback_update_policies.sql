-- 0008_owner_fallback_update_policies.sql
-- The original update policies on events/transactions/categories/people/
-- scheduled_payments relied entirely on is_event_member(...), which queries
-- event_members. If the auto-add trigger ever fails to populate that row
-- for an event's owner (e.g. seed inserts that skip JWT context), the
-- owner can still SELECT (events_select_for_members also accepts owner_id
-- = auth.uid()) but every UPDATE — including soft-delete — silently fails
-- or trips WITH CHECK. Add an owner_id = auth.uid() fallback so the owner
-- can always update their own event's rows.

drop policy if exists "events_update_for_members" on public.events;
create policy "events_update_for_owner_or_members"
on public.events for update to authenticated
using (owner_id = auth.uid() or is_event_member(id))
with check (owner_id = auth.uid() or is_event_member(id));

drop policy if exists "events_delete_for_owner" on public.events;
create policy "events_delete_for_owner"
on public.events for delete to authenticated
using (owner_id = auth.uid() or is_event_owner(id));

drop policy if exists "transactions_update_for_members" on public.transactions;
create policy "transactions_update_for_members"
on public.transactions for update to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
)
with check (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

drop policy if exists "categories_update_for_members" on public.categories;
create policy "categories_update_for_members"
on public.categories for update to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
)
with check (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

drop policy if exists "scheduled_payments_update_for_members" on public.scheduled_payments;
create policy "scheduled_payments_update_for_members"
on public.scheduled_payments for update to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
)
with check (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);

drop policy if exists "people_update_for_members" on public.people;
create policy "people_update_for_members"
on public.people for update to authenticated
using (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
)
with check (
  is_event_member(event_id)
  or exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
);
